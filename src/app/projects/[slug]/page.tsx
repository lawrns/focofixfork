'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { Plus, Zap, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import type { WorkItem, WorkItemStatus } from '@/types/foco';
import { ListView, PeopleView, SettingsView, TimelineView } from '@/components/project';
import { useCreateTaskModal } from '@/features/tasks';
import { toast } from 'sonner';
import { ProjectInsightsPanel } from '@/components/crico/project-insights-panel';
import type { Project } from './components/types';
import { BoardView } from './components/BoardView';
import { OverviewTab } from './components/OverviewTab';
import { FleetTab } from './components/FleetTab';
import { ProjectTabsHeader } from './components/ProjectTabsHeader';
import { useProjectData } from './components/use-project-data';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const slug = params.slug as string;

  const {
    project, setProject,
    tasks, setTasks,
    teamMembers,
    loading, error,
    activeRuns,
    delegationEnabled, setDelegationEnabled,
    agentPool,
  } = useProjectData(user, slug);

  const [activeTab, setActiveTab] = useState('board');
  const [currentColumnIndex, setCurrentColumnIndex] = useState(0);
  const { openTaskModal } = useCreateTaskModal();

  const handleStatusChange = async (taskId: string, status: WorkItemStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t));
    } catch { toast.error('Failed to update task status'); }
  };

  const handleDrop = async (taskId: string, newStatus: WorkItemStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      toast.success('Task moved');
    } catch { toast.error('Failed to move task'); }
  };

  const handleAddTaskToColumn = (status: WorkItemStatus) => {
    const statusToSection: Record<WorkItemStatus, 'now' | 'next' | 'later' | 'waiting' | 'backlog'> = {
      'in_progress': 'now', 'next': 'next', 'backlog': 'backlog',
      'review': 'waiting', 'blocked': 'waiting', 'done': 'backlog'
    };
    openTaskModal({ projectId: project?.id, section: statusToSection[status] || 'backlog' });
  };

  const handleCompleteTask = async (item: WorkItem) => {
    try {
      const res = await fetch(`/api/tasks/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      });
      if (!res.ok) throw new Error();
      setTasks(tasks.map(t => t.id === item.id ? { ...t, status: 'done' } : t));
      toast.success('Task completed');
    } catch { toast.error('Failed to complete task'); }
  };

  const handleArchiveTask = async (item: WorkItem) => {
    try {
      const res = await fetch(`/api/tasks/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setTasks(tasks.filter(t => t.id !== item.id));
      toast.success('Task archived');
    } catch { toast.error('Failed to archive task'); }
  };

  const handleAddMember = async (email: string, role: string) => {
    if (!project?.id) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/team`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error?.message || 'Failed to add member'); return; }
      toast.success('Member added successfully');
    } catch { toast.error('Failed to add member'); }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!project?.id) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/team/${memberId}`, { method: 'DELETE' });
      if (!res.ok) { const data = await res.json(); toast.error(data.error?.message || 'Failed to remove member'); return; }
      toast.success('Member removed successfully');
    } catch { toast.error('Failed to remove member'); }
  };

  const handleUpdateRole = async (memberId: string, role: string) => {
    if (!project?.id) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/team/${memberId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      if (!res.ok) { const data = await res.json(); toast.error(data.error?.message || 'Failed to update role'); return; }
      toast.success('Role updated successfully');
    } catch { toast.error('Failed to update role'); }
  };

  const handleSaveSettings = async (updates: Partial<Project>) => {
    if (!project?.id) throw new Error('Project not loaded');
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload?.error?.message || 'Failed to save project settings');
    }
    setProject(prev => prev ? { ...prev, ...updates } : prev);
  };

  const handleArchiveProject = async () => {
    if (!project?.id) throw new Error('Project not loaded');
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ archived_at: new Date().toISOString() }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload?.error?.message || 'Failed to archive project');
    }
    router.push('/empire/missions');
  };

  const handleDeleteProject = async () => {
    if (!project?.id) throw new Error('Project not loaded');
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload?.error?.message || 'Failed to delete project');
    }
    router.push('/empire/missions');
  };

  const handleGenerateStatus = async () => {
    if (!project?.slug) return;
    router.push(`/reports?generate=status&project_slug=${encodeURIComponent(project.slug)}`);
  };

  if (loading) {
    return (
      <div className="max-w-full">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-4 text-sm text-zinc-500">Loading project...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-full">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">{error || 'Project not found'}</h2>
            <p className="text-sm text-zinc-500 mb-4">The project you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
            <Button asChild><Link href="/empire/missions">Back to Projects</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full">
      {/* Project Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4 md:mb-6">
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
          <div
            className="h-10 w-10 md:h-12 md:w-12 rounded-xl flex items-center justify-center text-white text-base md:text-lg font-bold shrink-0"
            style={{ backgroundColor: project.color || '#6366F1' }}
          >
            {project.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-semibold text-zinc-900 dark:text-zinc-50 truncate">{project.name}</h1>
            <p className="text-zinc-500 mt-0.5 text-sm md:text-base hidden md:block">{project.description || 'No description'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" className="flex-1 md:flex-none min-h-[44px]" onClick={handleGenerateStatus}>
            <Zap className="h-4 w-4" /><span className="hidden md:inline">Generate Status</span>
          </Button>
          <Button size="sm" className="flex-1 md:flex-none min-h-[44px]" onClick={() => openTaskModal({ projectId: project?.id })}>
            <Plus className="h-4 w-4" /><span className="hidden md:inline">Add Task</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ProjectTabsHeader
          activeRuns={activeRuns}
        />

        <TabsContent value="board" className="mt-0">
          <BoardView
            tasks={tasks}
            currentColumnIndex={currentColumnIndex}
            setCurrentColumnIndex={setCurrentColumnIndex}
            onDrop={handleDrop}
            onAddTask={handleAddTaskToColumn}
            onComplete={handleCompleteTask}
            onArchive={handleArchiveTask}
          />
        </TabsContent>

        <TabsContent value="overview">
          <OverviewTab project={project} tasks={tasks} teamMembers={teamMembers} />
        </TabsContent>

        <TabsContent value="list">
          <ListView tasks={tasks} onStatusChange={handleStatusChange} onAddTask={() => openTaskModal({ projectId: project?.id })} />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineView tasks={tasks} />
        </TabsContent>

        <TabsContent value="people">
          <PeopleView
            projectId={project.id}
            members={teamMembers}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
            onUpdateRole={handleUpdateRole}
          />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsView project={project} onSave={handleSaveSettings} onArchive={handleArchiveProject} onDelete={handleDeleteProject} />
        </TabsContent>

        <TabsContent value="fleet">
          <FleetTab
            project={project}
            tasks={tasks}
            activeRuns={activeRuns}
            delegationEnabled={delegationEnabled}
            setDelegationEnabled={setDelegationEnabled}
            agentPool={agentPool}
            setTasks={setTasks}
          />
        </TabsContent>

        <TabsContent value="insights">
          <ProjectInsightsPanel projectId={project.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
