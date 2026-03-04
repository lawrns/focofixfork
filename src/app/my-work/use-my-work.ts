'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DropResult } from '@hello-pangea/dnd';
import { audioService } from '@/lib/audio/audio-service';
import { hapticService } from '@/lib/audio/haptic-service';
import { apiClient } from '@/lib/api-client';
import type { WorkItem, WorkItemStatus } from '@/types/foco';
import { useAuth } from '@/lib/hooks/use-auth';
import { toast } from 'sonner';
import { TaskFilters, defaultFilters } from '@/components/filters/task-filter-popover';

type SectionType = 'now' | 'next' | 'later' | 'waiting' | 'done';

const sectionToStatus: Record<SectionType, WorkItemStatus> = {
  now: 'in_progress',
  next: 'next',
  later: 'backlog',
  waiting: 'blocked',
  done: 'done',
};

export const sectionConfig: Record<SectionType, { label: string; badgeColor: string; borderColor: string }> = {
  now: { label: 'Now', badgeColor: 'bg-rose-500', borderColor: 'border-rose-300 dark:border-rose-900' },
  next: { label: 'Next', badgeColor: 'bg-amber-400', borderColor: 'border-amber-300 dark:border-amber-900' },
  later: { label: 'Later', badgeColor: 'bg-blue-500', borderColor: 'border-blue-300 dark:border-blue-900' },
  waiting: { label: 'Waiting', badgeColor: 'bg-slate-400', borderColor: 'border-slate-300 dark:border-slate-900' },
  done: { label: 'Done', badgeColor: 'bg-emerald-500', borderColor: 'border-emerald-300 dark:border-emerald-900' },
};

function mapStatusToSection(status: WorkItemStatus): SectionType {
  switch (status) {
    case 'in_progress': return 'now';
    case 'next': return 'next';
    case 'blocked': return 'waiting';
    case 'done': return 'done';
    default: return 'later';
  }
}

export function useMyWork() {
  const { user } = useAuth();
  const [items, setItems] = useState<(WorkItem & { section: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<TaskFilters>(defaultFilters);
  const [isPlanning, setIsPlanning] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mywork_selected_project_id') || '';
    }
    return '';
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const velocityStats = useMemo(() => {
    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

    const completedThisWeek = items.filter(i => {
      const ts = i.completed_at || (i.status === 'done' ? i.updated_at : null);
      if (!ts) return false;
      const age = now - new Date(ts).getTime();
      return age >= 0 && age < oneWeekMs;
    }).length;

    const lastWeek = items.filter(i => {
      const ts = i.completed_at || (i.status === 'done' ? i.updated_at : null);
      if (!ts) return false;
      const age = now - new Date(ts).getTime();
      return age >= oneWeekMs && age < 2 * oneWeekMs;
    }).length;

    return { completedThisWeek, lastWeek };
  }, [items]);

  const fetchWorkItems = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const response = await fetch('/api/my-work/assigned');
      const data = await response.json();

      if (data.success) {
        setItems((data.data?.tasks || []).map((t: any) => ({
          ...t,
          section: t.section || mapStatusToSection(t.status as WorkItemStatus),
        })));
      }
    } catch (error) {
      console.error('Failed to fetch work items:', error);
      toast.error('Failed to load My Tasks');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchWorkItems(); }, [fetchWorkItems]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/projects', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setProjects(data.data.map((p: any) => ({ id: p.id, name: p.name })));
        }
      })
      .catch(() => {});
  }, [user]);

  const handleProjectChange = (id: string) => {
    setSelectedProjectId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mywork_selected_project_id', id);
    }
  };

  const handlePlanMyDay = async () => {
    if (!user) return;
    setIsPlanning(true);
    try {
      const response = await apiClient.post('/api/my-work/plan-day', {});
      if (response.success) {
        audioService.play('complete');
        hapticService.success();
        toast.success(response.data?.message || 'Day planned successfully!');
        await fetchWorkItems();
      } else {
        audioService.play('error');
        hapticService.error();
        throw new Error(response.error || 'Failed to plan day');
      }
    } catch (error) {
      console.error('Failed to plan day:', error);
      audioService.play('error');
      hapticService.error();
      toast.error('Failed to plan your day');
    } finally {
      setIsPlanning(false);
    }
  };

  const handleQuickAdd = async (title: string, section: SectionType) => {
    if (!selectedProjectId) {
      toast.error('Select a project first before adding a task');
      return;
    }
    try {
      const response = await apiClient.post('/api/tasks', {
        title,
        status: sectionToStatus[section],
        priority: 'medium',
        project_id: selectedProjectId,
      });

      if (!response.success || !response.data) {
        audioService.play('error');
        hapticService.error();
        throw new Error(response.error || 'Failed to create task');
      }

      const data = response.data;
      if (data.queued) {
        toast.info('Task creation queued for offline sync');
      } else {
        setItems(prev => [...prev, { ...data, section }]);
        toast.success('Task created');
      }
      audioService.play('sync');
      hapticService.light();
    } catch (error) {
      console.error('Failed to create task:', error);
      audioService.play('error');
      hapticService.error();
      toast.error('Failed to create task');
      throw error;
    }
  };

  const handleMoveToSection = useCallback(async (itemId: string, targetSection: SectionType) => {
    try {
      const response = await apiClient.patch(`/api/tasks/${itemId}`, { status: sectionToStatus[targetSection] });

      if (!response.success || !response.data) {
        audioService.play('error');
        hapticService.error();
        throw new Error(response.error || 'Failed to move task');
      }

      const data = response.data;
      if (data.queued) {
        toast.info('Move queued for offline sync');
      } else {
        setItems(prev => prev.map(item =>
          item.id === itemId
            ? { ...item, section: targetSection, status: sectionToStatus[targetSection] }
            : item
        ));
        toast.success(`Moved to ${sectionConfig[targetSection].label}`);
      }
      audioService.play('sync');
      hapticService.light();
    } catch (error) {
      console.error('Failed to move task:', error);
      audioService.play('error');
      hapticService.error();
      toast.error('Failed to move task');
    }
  }, []);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const destSection = destination.droppableId as SectionType;
    if (destSection === 'done') return;

    if (source.droppableId !== destination.droppableId) {
      await handleMoveToSection(draggableId, destSection);
    }
  };

  const handleRemoveFromMyWork = useCallback(async (itemId: string) => {
    try {
      const response = await apiClient.patch(`/api/tasks/${itemId}`, { assignee_id: null });

      if (!response.success || !response.data) {
        audioService.play('error');
        hapticService.error();
        throw new Error(response.error || 'Failed to remove task');
      }

      const data = response.data;
      if (data.queued) {
        toast.info('Removal queued for offline sync');
      } else {
        setItems(prev => prev.filter(item => item.id !== itemId));
        toast.success('Removed from My Tasks');
      }
      audioService.play('error');
      hapticService.medium();
    } catch (error) {
      console.error('Failed to remove task:', error);
      audioService.play('error');
      hapticService.error();
      toast.error('Failed to remove task');
    }
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBatchComplete = useCallback(async () => {
    const ids = [...selectedIds];
    await Promise.all(ids.map(id => handleMoveToSection(id, 'done')));
    setSelectedIds(new Set());
    await fetchWorkItems();
  }, [selectedIds, handleMoveToSection, fetchWorkItems]);

  const handleBatchMove = useCallback(async (section: SectionType) => {
    const ids = [...selectedIds];
    await Promise.all(ids.map(id => handleMoveToSection(id, section)));
    setSelectedIds(new Set());
  }, [selectedIds, handleMoveToSection]);

  const getItemsBySection = (section: SectionType) => {
    let filtered = items.filter(item => item.section === section);

    if (filters.status.length > 0) {
      filtered = filtered.filter(item => filters.status.includes(item.status));
    }
    if (filters.priority.length > 0) {
      filtered = filtered.filter(item => filters.priority.includes(item.priority));
    }
    if (filters.assignee.length > 0) {
      filtered = filtered.filter(item => {
        if (filters.assignee.includes('unassigned')) {
          return !item.assignee_id || filters.assignee.includes(item.assignee_id);
        }
        return item.assignee_id && filters.assignee.includes(item.assignee_id);
      });
    }
    if (filters.dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + 7);
      const endOfMonth = new Date(today);
      endOfMonth.setMonth(today.getMonth() + 1);

      filtered = filtered.filter(item => {
        if (!item.due_date && filters.dueDate?.preset === 'none') return true;
        if (!item.due_date) return false;
        const dueDate = new Date(item.due_date);
        dueDate.setHours(0, 0, 0, 0);
        switch (filters.dueDate?.preset) {
          case 'today': return dueDate.getTime() === today.getTime();
          case 'week': return dueDate >= today && dueDate <= endOfWeek;
          case 'month': return dueDate >= today && dueDate <= endOfMonth;
          case 'overdue': return dueDate < today;
          default: return true;
        }
      });
    }

    return filtered;
  };

  return {
    items,
    isLoading,
    filters,
    setFilters,
    isPlanning,
    projects,
    selectedProjectId,
    selectedIds,
    velocityStats,
    fetchWorkItems,
    handleProjectChange,
    handlePlanMyDay,
    handleQuickAdd,
    handleMoveToSection,
    handleDragEnd,
    handleRemoveFromMyWork,
    handleToggleSelect,
    handleClearSelection,
    handleBatchComplete,
    handleBatchMove,
    getItemsBySection,
  };
}
