'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Play,
  Pause,
  X,
  Zap,
  CheckCircle2,
  Timer,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { AiPreviewModal } from '@/components/ai/ai-preview-modal';
import type { TaskActionType } from '@/lib/services/task-action-service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { audioService } from '@/lib/audio/audio-service';
import { hapticService } from '@/lib/audio/haptic-service';
import { apiClient } from '@/lib/api-client';
import type { WorkItem } from '@/types/foco';
import { toast } from 'sonner';
import { useFocusModeStore } from '@/lib/stores/foco-store';

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-zinc-400',
  none: 'bg-zinc-300',
};

export function FocusMode({
  item,
  onExit,
  onRefresh,
}: {
  item: WorkItem;
  onExit: () => void;
  onRefresh?: () => Promise<void>;
}) {
  const {
    isTimerRunning,
    startTimer,
    stopTimer,
    getElapsedSeconds,
    completeAndSave,
  } = useFocusModeStore();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [aiLoading, setAiLoading] = useState<TaskActionType | null>(null);
  const [aiPreview, setAiPreview] = useState<{
    action: TaskActionType;
    preview: { explanation: string; proposed_changes: unknown };
    applyUrl: string;
  } | null>(null);

  const handleAiAction = async (action: TaskActionType) => {
    setAiLoading(action);
    try {
      const res = await fetch('/api/ai/task-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          task_id: item.id,
          workspace_id: item.workspace_id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setAiPreview({
          action,
          preview: data.preview,
          applyUrl: `/api/ai/task-actions/${data.execution_id}/apply`,
        });
      } else {
        toast.error(data.error || 'Failed to generate AI preview');
      }
    } catch (error) {
      console.error('AI action error:', error);
      toast.error('Failed to connect to AI service');
    } finally {
      setAiLoading(null);
    }
  };

  const handleApplyPreview = async () => {
    if (!aiPreview) return;

    try {
      const response = await apiClient.post(aiPreview.applyUrl, {});

      if (response.success) {
        audioService.play('complete');
        hapticService.success();
        toast.success('Changes applied successfully');
        setAiPreview(null);
        await onRefresh?.();
      } else {
        audioService.play('error');
        hapticService.error();
        throw new Error(response.error || 'Failed to apply changes');
      }
    } catch (error) {
      console.error('Failed to apply changes:', error);
      audioService.play('error');
      hapticService.error();
      toast.error('Failed to apply changes');
    }
  };

  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds(getElapsedSeconds());
      }, 1000);
    } else {
      setElapsedSeconds(getElapsedSeconds());
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, getElapsedSeconds]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setElapsedSeconds(getElapsedSeconds());
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [getElapsedSeconds]);

  useEffect(() => {
    setElapsedSeconds(getElapsedSeconds());
  }, [getElapsedSeconds]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleTimer = () => {
    if (isTimerRunning) stopTimer();
    else startTimer();
  };

  const handleCompleteAndExit = async () => {
    try {
      await completeAndSave(async (taskId: string, duration: number) => {
        const timeResponse = await apiClient.post('/api/time-entries', {
          task_id: taskId,
          duration_seconds: duration,
          started_at: new Date(Date.now() - duration * 1000).toISOString(),
          ended_at: new Date().toISOString(),
        });

        if (!timeResponse.success) {
          console.error('Failed to save time entry');
        }

        const taskResponse = await apiClient.patch(`/api/tasks/${taskId}`, { status: 'done' });

        if (taskResponse.success) {
          audioService.play('complete');
          hapticService.success();
        } else {
          audioService.play('error');
          hapticService.error();
        }
      });

      toast.success('Task completed and time saved!');
      onExit();
    } catch (error) {
      console.error('Error completing task:', error);
      audioService.play('error');
      hapticService.error();
      toast.error('Failed to save task completion');
      onExit();
    }
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-zinc-950 z-50 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onExit}>
            <X className="h-5 w-5" />
          </Button>
          <div>
            <Badge variant="secondary" className="mb-1">Focus Mode</Badge>
            <h1 className="text-lg font-semibold">{item.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <Timer className="h-4 w-4 text-zinc-500" />
            <span className="font-mono text-lg">{formatTime(elapsedSeconds)}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleToggleTimer}
            >
              {isTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>

          <Button onClick={handleCompleteAndExit}>
            <CheckCircle2 className="h-4 w-4" />
            Complete & Exit
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 p-8 max-w-3xl mx-auto">
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-zinc-600 dark:text-zinc-300">
              {item.description || 'No description provided.'}
            </p>
          </div>

          <div className="mt-8 p-4 bg-secondary dark:bg-secondary/30 rounded-lg border dark:border-secondary dark:border-secondary/50">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-[color:var(--foco-teal)]" />
              <span className="font-medium text-sm">AI Helpers</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['break_into_subtasks', 'draft_update', 'estimate_time', 'find_similar'] as TaskActionType[]).map((action) => (
                <Button
                  key={action}
                  variant="outline"
                  size="sm"
                  disabled={aiLoading !== null}
                  onClick={() => handleAiAction(action)}
                >
                  {aiLoading === action ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1.5" />
                  )}
                  {action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </Button>
              ))}
            </div>
          </div>

          <AiPreviewModal
            open={aiPreview !== null}
            action={aiPreview?.action || null}
            preview={aiPreview?.preview || null}
            onApply={handleApplyPreview}
            onCancel={() => setAiPreview(null)}
          />
        </div>

        <div className="w-80 border-l border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-900">
          <h3 className="font-medium text-sm mb-4">Context</h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Project</label>
              <p className="text-sm mt-1">{(item.project as any)?.name || 'None'}</p>
            </div>

            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Due Date</label>
              <p className="text-sm mt-1">
                {item.due_date
                  ? new Date(item.due_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'No due date'}
              </p>
            </div>

            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Priority</label>
              <div className="flex items-center gap-2 mt-1">
                <div className={cn('h-2 w-2 rounded-full', priorityColors[item.priority])} />
                <span className="text-sm capitalize">{item.priority}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
