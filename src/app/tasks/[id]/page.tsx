'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useFocusModeStore } from '@/lib/stores/foco-store';
import { useRecentItems } from '@/hooks/useRecentItems';
import { useMobile } from '@/lib/hooks/use-mobile';
import { CheckCircle2, Circle } from 'lucide-react';
import { AiPreviewModal } from '@/components/ai/ai-preview-modal';
import type { TaskActionType } from '@/lib/services/task-action-service';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { audioService } from '@/lib/audio/audio-service';
import { hapticService } from '@/lib/audio/haptic-service';
import { apiClient } from '@/lib/api-client';
import type { WorkItem, Comment } from '@/types/foco';
import { TaskHeader } from './components/task-header';
import { Inspector } from './components/inspector';
import { AIPanel } from './components/ai-panel';
import { TaskActivity } from './components/task-activity';
import { TaskDeleteDialog } from './components/task-delete-dialog';
import { TaskMobileStatusBar } from './components/task-mobile-status-bar';
import { TaskVerificationPanel } from './components/task-verification-panel';
import { statusOptions, priorityOptions } from './components/task-constants';

export default function WorkItemPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = typeof params?.id === 'string' ? params.id : '';
  const { activate } = useFocusModeStore();
  const { addItem } = useRecentItems();
  const isMobile = useMobile();
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [workItem, setWorkItem] = useState<WorkItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [metadataSheetOpen, setMetadataSheetOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState<TaskActionType | null>(null);
  const [aiPreview, setAiPreview] = useState<{
    action: TaskActionType;
    preview: { explanation: string; proposed_changes: unknown };
    applyUrl: string;
  } | null>(null);

  const fetchTask = useCallback(async () => {
    if (!taskId) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tasks/${taskId}`);
      const data = await response.json();
      const taskData = data.data || data;
      if ((data.ok || data.success) && taskData) {
        setWorkItem(taskData);
        setActivityLog(taskData.execution_events || []);
        setIsCompleted(taskData.status === 'done');
        addItem({ type: 'task', id: taskData.id, name: taskData.title });
        const commentsResponse = await fetch(`/api/tasks/${taskId}/comments`);
        const commentsPayload = await commentsResponse.json();
        if (commentsResponse.ok) {
          setComments(commentsPayload.data || commentsPayload || []);
        }
        if (taskData.workspace_id) {
          const membersResponse = await fetch(`/api/workspaces/${taskData.workspace_id}/members`);
          const membersData = await membersResponse.json();
          if (membersData.ok || membersData.success) {
            const members = (membersData.data || membersData.members || []).map((m: any) => ({
              id: m.user_id || m.id,
              full_name: m.user?.full_name || m.full_name || 'Unknown'
            }));
            setTeamMembers(members);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch task:', error);
    } finally {
      setIsLoading(false);
    }
  }, [taskId, addItem]);

  useEffect(() => { if (taskId) fetchTask(); }, [taskId, fetchTask]);

  const handleTaskUpdate = useCallback(async (updates: Partial<WorkItem>) => {
    if (!workItem) return;
    try {
      const response = await apiClient.patch(`/api/tasks/${workItem.id}`, updates);
      if (!response.success) {
        audioService.play('error'); hapticService.error();
        throw new Error(response.error || 'Failed to update task');
      }
      const data = response.data;
      if (!data.queued) {
        setWorkItem(prev => prev ? { ...prev, ...(data.data || data) } : null);
        toast.success('Task updated'); audioService.play('sync'); hapticService.light();
      } else {
        toast.info('Update queued for offline sync'); audioService.play('sync'); hapticService.light();
      }
      if (updates.status) setIsCompleted(false);
    } catch (error) {
      console.error('Task update error:', error);
      audioService.play('error'); hapticService.error(); throw error;
    }
  }, [workItem]);

  const handleCommentSubmit = useCallback(async () => {
    if (!workItem || !newComment.trim()) return;
    setCommentSubmitting(true);
    try {
      const response = await apiClient.post(`/api/tasks/${workItem.id}/comments`, { content: newComment.trim() });
      if (response.success && response.data) {
        const data = response.data;
        if (!data.queued) { setComments(prev => [...prev, data.data || data]); toast.success('Comment added'); }
        else { toast.info('Comment queued for offline sync'); }
        audioService.play('sync'); hapticService.light(); setNewComment('');
      } else {
        audioService.play('error'); hapticService.error(); toast.error(response.error || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      audioService.play('error'); hapticService.error(); toast.error('Failed to add comment');
    } finally {
      setCommentSubmitting(false);
    }
  }, [workItem, newComment]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(`${window.location.origin}/tasks/${workItem?.id}`);
    audioService.play('click'); hapticService.light(); toast.success('Link copied to clipboard');
  }, [workItem]);

  const handleDuplicate = useCallback(async () => {
    if (!workItem) return;
    try {
      const response = await apiClient.post('/api/tasks', {
        title: `${workItem.title} (Copy)`, description: workItem.description,
        workspace_id: workItem.workspace_id, project_id: workItem.project_id,
        status: 'backlog', priority: workItem.priority, type: workItem.type
      });
      if (response.success && response.data) {
        audioService.play('complete'); hapticService.success();
        const data = response.data;
        if (!data.queued) { toast.success('Task duplicated'); router.push(`/tasks/${(data.data || data).id}`); }
        else { toast.info('Duplication queued for offline sync'); }
      } else {
        audioService.play('error'); hapticService.error(); toast.error(response.error || 'Failed to duplicate task');
      }
    } catch (error) {
      console.error('Failed to duplicate task:', error);
      audioService.play('error'); hapticService.error(); toast.error('Failed to duplicate task');
    }
  }, [workItem, router]);

  const handleDelete = useCallback(async () => {
    if (!workItem) return;
    setDeleting(true);
    try {
      const response = await apiClient.delete(`/api/tasks/${workItem.id}`);
      if (response.success) {
        audioService.play('error'); hapticService.heavy();
        toast.success(response.data?.queued ? 'Deletion queued for offline sync' : 'Task deleted');
        router.push('/my-work');
      } else {
        audioService.play('error'); hapticService.error(); toast.error(response.error || 'Failed to delete task');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      audioService.play('error'); hapticService.error(); toast.error('Failed to delete task');
    } finally {
      setDeleting(false); setDeleteDialogOpen(false);
    }
  }, [workItem, router]);

  const handleToggleComplete = useCallback(async () => {
    const newStatus = isCompleted ? 'in_progress' : 'done';
    setIsCompleted(!isCompleted);
    try {
      await handleTaskUpdate({ status: newStatus } as Partial<WorkItem>);
      if (newStatus === 'done') { audioService.play('complete'); hapticService.success(); }
      else { audioService.play('sync'); hapticService.light(); }
    } catch {
      setIsCompleted(isCompleted); toast.error('Failed to update status');
    }
  }, [isCompleted, handleTaskUpdate]);

  const handleAiAction = useCallback(async (action: TaskActionType) => {
    if (!workItem) return;
    setAiLoading(action); audioService.play('click'); hapticService.light();
    try {
      const res = await apiClient.post('/api/ai/task-actions', {
        action, task_id: workItem.id, workspace_id: workItem.workspace_id
      });
      if (res.success && res.data) {
        audioService.play('complete');
        setAiPreview({ action, preview: res.data.preview, applyUrl: `/api/ai/task-actions/${res.data.execution_id}/apply` });
      } else {
        audioService.play('error'); hapticService.error(); toast.error(res.error || 'Failed to generate AI preview');
      }
    } catch (error) {
      console.error('AI action error:', error);
      audioService.play('error'); hapticService.error(); toast.error('Failed to connect to AI service');
    } finally {
      setAiLoading(null);
    }
  }, [workItem]);

  const handleApplyPreview = async () => {
    if (!aiPreview) return;
    try {
      const response = await apiClient.post(aiPreview.applyUrl, {});
      if (response.success) {
        audioService.play('complete'); hapticService.success();
        toast.success('Changes applied successfully'); setAiPreview(null); await fetchTask();
      } else {
        audioService.play('error'); hapticService.error(); throw new Error(response.error || 'Failed to apply changes');
      }
    } catch (error) {
      console.error('Failed to apply changes:', error);
      audioService.play('error'); hapticService.error(); toast.error('Failed to apply changes');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--foco-teal)] mx-auto mb-4" />
          <p className="text-zinc-500">Loading task...</p>
        </div>
      </div>
    );
  }

  if (!workItem) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Task not found</h2>
          <p className="text-zinc-500 mb-4">The task you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const currentStatus = statusOptions.find(s => s.value === workItem.status);
  const currentPriority = priorityOptions.find(p => p.value === workItem.priority);
  const dueDate = workItem.due_date ? new Date(workItem.due_date) : undefined;

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="flex-1 overflow-y-auto">
        <div className={cn("p-6 w-full", isMobile ? "pb-24" : "")}>
          <TaskHeader
            workItem={workItem}
            isMobile={isMobile}
            onBack={() => router.back()}
            onFocus={() => { hapticService.light(); activate(workItem); }}
            onCopyLink={handleCopyLink}
            onDuplicate={handleDuplicate}
            onDelete={() => setDeleteDialogOpen(true)}
          />

          <div className="flex items-start gap-3 mb-6">
            <button onClick={handleToggleComplete} className="mt-1">
              {isCompleted
                ? <CheckCircle2 className="h-6 w-6 text-green-500" />
                : <Circle className="h-6 w-6 text-zinc-300 hover:text-zinc-400" />
              }
            </button>
            <h1 className={cn('text-2xl font-semibold', isCompleted && 'line-through text-zinc-400')}>
              {workItem.title}
            </h1>
          </div>

          <div className="prose dark:prose-invert max-w-none mb-8">
            <div className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-300">
              {workItem.description}
            </div>
          </div>

          <div className="mb-8">
            <AIPanel taskId={workItem.id} workspaceId={workItem.workspace_id} aiLoading={aiLoading} onAction={handleAiAction} />
          </div>

          <TaskVerificationPanel
            taskId={workItem.id}
            verifications={workItem.verifications || []}
            onCreated={fetchTask}
          />

          <AiPreviewModal
            open={aiPreview !== null} action={aiPreview?.action || null}
            preview={aiPreview?.preview || null} onApply={handleApplyPreview} onCancel={() => setAiPreview(null)}
          />

          <Separator className="my-8" />

          <TaskActivity
            comments={comments} activityLog={activityLog} newComment={newComment}
            commentSubmitting={commentSubmitting} onCommentChange={setNewComment}
            onCommentSubmit={handleCommentSubmit} onAiAction={handleAiAction}
          />
        </div>
      </div>

      {!isMobile && (
        <Inspector item={workItem} onUpdate={handleTaskUpdate} teamMembers={teamMembers} />
      )}

      {isMobile && (
        <TaskMobileStatusBar
          workItem={workItem} currentStatus={currentStatus} currentPriority={currentPriority}
          dueDate={dueDate} sheetOpen={metadataSheetOpen} onSheetOpenChange={setMetadataSheetOpen}
          onUpdate={handleTaskUpdate} teamMembers={teamMembers}
        />
      )}

      <TaskDeleteDialog
        open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete} isDeleting={deleting}
      />
    </div>
  );
}
