'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useFocusModeStore } from '@/lib/stores/foco-store';
import {
  Play,
  Pause,
  X,
  MoreHorizontal,
  Plus,
  Zap,
  CheckCircle2,
  Circle,
  Timer,
  Loader2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  CheckCheck,
  MoveRight,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { AiPreviewModal } from '@/components/ai/ai-preview-modal';
import type { TaskActionType } from '@/lib/services/task-action-service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { audioService } from '@/lib/audio/audio-service';
import { hapticService } from '@/lib/audio/haptic-service';
import { apiClient } from '@/lib/api-client';
import type { WorkItem, PriorityLevel, WorkItemStatus } from '@/types/foco';
import { PageShell } from '@/components/layout/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/lib/hooks/use-auth';
import { toast } from 'sonner';
import { TaskFilterPopover, TaskFilters, defaultFilters } from '@/components/filters/task-filter-popover';
import { MyWorkEmpty } from '@/components/empty-states/my-work-empty';

type SectionType = 'now' | 'next' | 'later' | 'waiting' | 'done';

const priorityColors: Record<PriorityLevel, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-zinc-400',
  none: 'bg-zinc-300',
};

const sectionConfig: Record<SectionType, { label: string; badgeColor: string; borderColor: string }> = {
  now: { label: 'Now', badgeColor: 'bg-rose-500', borderColor: 'border-rose-300 dark:border-rose-900' },
  next: { label: 'Next', badgeColor: 'bg-amber-400', borderColor: 'border-amber-300 dark:border-amber-900' },
  later: { label: 'Later', badgeColor: 'bg-blue-500', borderColor: 'border-blue-300 dark:border-blue-900' },
  waiting: { label: 'Waiting', badgeColor: 'bg-slate-400', borderColor: 'border-slate-300 dark:border-slate-900' },
  done: { label: 'Done', badgeColor: 'bg-emerald-500', borderColor: 'border-emerald-300 dark:border-emerald-900' },
};

// Section → API Status mapping
const sectionToStatus: Record<SectionType, WorkItemStatus> = {
  now: 'in_progress',
  next: 'next',
  later: 'backlog',
  waiting: 'blocked',
  done: 'done',
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

// ─────────────────────────────────────────────────────
// WorkItemCard
// ─────────────────────────────────────────────────────
function WorkItemCard({
  item,
  onStartFocus,
  onMoveToSection,
  onRemoveFromMyWork,
  isSelected,
  onToggleSelect,
  isReadOnly,
}: {
  item: WorkItem & { section: string };
  onStartFocus: (item: WorkItem) => void;
  onMoveToSection: (itemId: string, section: SectionType) => Promise<void>;
  onRemoveFromMyWork: (itemId: string) => Promise<void>;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  isReadOnly?: boolean;
}) {
  const [isCompleted, setIsCompleted] = useState(item.status === 'done');

  const handleToggleComplete = async () => {
    if (isReadOnly) return;
    const nextStatus = !isCompleted ? 'done' : 'in_progress';
    setIsCompleted(!isCompleted);

    try {
      const response = await apiClient.patch(`/api/tasks/${item.id}`, { status: nextStatus });

      if (!response.success) {
        audioService.play('error');
        hapticService.error();
        throw new Error(response.error || 'Failed to update task');
      }

      const data = response.data;
      if (data?.queued) {
        toast.info('Status update queued for offline sync');
      }

      if (nextStatus === 'done') {
        audioService.play('complete');
        hapticService.success();
      } else {
        audioService.play('sync');
        hapticService.light();
      }
    } catch (error) {
      setIsCompleted(isCompleted);
      audioService.play('error');
      hapticService.error();
      toast.error('Failed to update task status');
    }
  };

  const handleSnooze = () => {
    onMoveToSection(item.id, 'later');
    toast.info('Task snoozed until later');
  };

  return (
    <div
      className={cn(
        'p-3 rounded-lg border bg-white dark:bg-zinc-900 shadow-sm',
        'hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing',
        'group relative',
        isSelected && 'ring-2 ring-[color:var(--foco-teal)] dark:border-[color:var(--foco-teal)]',
        isReadOnly && 'opacity-75'
      )}
    >
      {/* Selection checkbox — visible on hover or when selected */}
      {onToggleSelect && (
        <div
          className={cn(
            'absolute -left-2 -top-2 z-10 transition-opacity',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          <Checkbox
            checked={!!isSelected}
            onCheckedChange={() => onToggleSelect(item.id)}
            className="h-4 w-4 bg-white border-zinc-300 shadow-sm"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="flex items-start gap-2 mb-2">
        {!isReadOnly && (
          <Checkbox
            checked={isCompleted}
            onCheckedChange={handleToggleComplete}
            className="h-4 w-4 mt-0.5"
          />
        )}
        {isReadOnly && (
          <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
        )}

        <div className={cn('h-2 w-2 rounded-full shrink-0 mt-1.5', priorityColors[item.priority])} />

        <Link href={`/tasks/${item.id}`} className="flex-1 min-w-0">
          <span className={cn(
            'text-sm font-medium leading-tight block',
            isCompleted || isReadOnly ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-zinc-50'
          )}>
            {item.title}
          </span>
        </Link>

        {!isReadOnly && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/tasks/${item.id}`}>Edit</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStartFocus(item)}>
                Start focus
              </DropdownMenuItem>
              {item.section !== 'now' && (
                <DropdownMenuItem onClick={() => onMoveToSection(item.id, 'now')}>
                  Move to Now
                </DropdownMenuItem>
              )}
              {item.section !== 'next' && (
                <DropdownMenuItem onClick={() => onMoveToSection(item.id, 'next')}>
                  Move to Next
                </DropdownMenuItem>
              )}
              {item.section !== 'later' && (
                <DropdownMenuItem onClick={() => onMoveToSection(item.id, 'later')}>
                  Move to Later
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSnooze}>Snooze</DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => onRemoveFromMyWork(item.id)}
              >
                Remove from My Tasks
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {isReadOnly && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/tasks/${item.id}`}>View</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onMoveToSection(item.id, 'now')}>
                Reopen → Now
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMoveToSection(item.id, 'next')}>
                Reopen → Next
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-zinc-500">
        {item.project && (
          <span className="flex items-center gap-1">
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: (item.project as any).color }}
            />
            <span className="truncate max-w-[100px]">{(item.project as any).name}</span>
          </span>
        )}

        {item.due_date && (
          <span className={cn(
            'ml-auto',
            new Date(item.due_date) < new Date() ? 'text-red-500' : 'text-zinc-400'
          )}>
            {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// KanbanColumn (editable — Now / Next / Later / Waiting)
// ─────────────────────────────────────────────────────
function KanbanColumn({
  section,
  items,
  onStartFocus,
  onQuickAdd,
  onMoveToSection,
  onRemoveFromMyWork,
  selectedIds,
  onToggleSelect,
}: {
  section: 'now' | 'next' | 'later' | 'waiting';
  items: (WorkItem & { section: string })[];
  onStartFocus: (item: WorkItem) => void;
  onQuickAdd: (title: string, section: SectionType) => Promise<void>;
  onMoveToSection: (itemId: string, section: SectionType) => Promise<void>;
  onRemoveFromMyWork: (itemId: string) => Promise<void>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  const config = sectionConfig[section];
  const [showInlineInput, setShowInlineInput] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showInlineInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInlineInput]);

  const handleSubmit = async () => {
    if (!inputValue.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onQuickAdd(inputValue.trim(), section);
      setInputValue('');
      setShowInlineInput(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setInputValue('');
      setShowInlineInput(false);
    }
  };

  return (
    <div className="flex flex-col min-w-[260px] md:min-w-[280px] flex-1 max-w-[320px]">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn('h-2.5 w-2.5 rounded-full', config.badgeColor)} />
        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">
          {config.label}
        </h3>
        <Badge variant="secondary" className="text-xs ml-auto">
          {items.length}
        </Badge>
      </div>

      <Droppable droppableId={section}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 rounded-lg border-2 border-dashed p-2 space-y-2 transition-colors',
              snapshot.isDraggingOver
                ? cn('border-solid', config.borderColor, 'bg-opacity-5')
                : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/20'
            )}
          >
            {items.length === 0 && !showInlineInput ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-xs text-zinc-400 mb-2">No tasks</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setShowInlineInput(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add task
                </Button>
              </div>
            ) : (
              <>
                {items.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={cn(snapshot.isDragging && 'opacity-50')}
                      >
                        <WorkItemCard
                          item={item}
                          onStartFocus={onStartFocus}
                          onMoveToSection={onMoveToSection}
                          onRemoveFromMyWork={onRemoveFromMyWork}
                          isSelected={selectedIds.has(item.id)}
                          onToggleSelect={onToggleSelect}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}

                {showInlineInput ? (
                  <div className="flex items-center gap-2 p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    <Circle className="h-4 w-4 text-zinc-300 shrink-0" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={() => {
                        if (!inputValue.trim()) setShowInlineInput(false);
                      }}
                      placeholder="Task name..."
                      className="flex-1 bg-transparent text-xs outline-none placeholder:text-zinc-400"
                      disabled={isSubmitting}
                    />
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs text-zinc-500 h-8"
                    onClick={() => setShowInlineInput(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add task
                  </Button>
                )}

                {provided.placeholder}
              </>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// DoneColumn — read-only, drag OUT supported, drag IN blocked
// ─────────────────────────────────────────────────────
function DoneColumn({
  items,
  onStartFocus,
  onMoveToSection,
  onRemoveFromMyWork,
  selectedIds,
  onToggleSelect,
}: {
  items: (WorkItem & { section: string })[];
  onStartFocus: (item: WorkItem) => void;
  onMoveToSection: (itemId: string, section: SectionType) => Promise<void>;
  onRemoveFromMyWork: (itemId: string) => Promise<void>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  const config = sectionConfig.done;

  return (
    <div className="flex flex-col min-w-[260px] md:min-w-[280px] flex-1 max-w-[320px]">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn('h-2.5 w-2.5 rounded-full', config.badgeColor)} />
        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">
          {config.label}
        </h3>
        <Badge variant="secondary" className="text-xs ml-auto">
          {items.length}
        </Badge>
      </div>

      {/* isDropDisabled prevents dropping IN; items inside are still Draggable OUT */}
      <Droppable droppableId="done" isDropDisabled={true}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 rounded-lg border-2 border-dashed p-2 space-y-2 transition-colors',
              'border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/20'
            )}
          >
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-6 w-6 text-zinc-200 dark:text-zinc-700 mb-2" />
                <p className="text-xs text-zinc-400">Nothing completed yet</p>
              </div>
            ) : (
              <>
                {items.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={cn(snapshot.isDragging && 'opacity-50')}
                      >
                        <WorkItemCard
                          item={item}
                          onStartFocus={onStartFocus}
                          onMoveToSection={onMoveToSection}
                          onRemoveFromMyWork={onRemoveFromMyWork}
                          isReadOnly
                          isSelected={selectedIds.has(item.id)}
                          onToggleSelect={onToggleSelect}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// BatchToolbar — appears when items are selected
// ─────────────────────────────────────────────────────
function BatchToolbar({
  selectedIds,
  onClear,
  onBatchComplete,
  onBatchMove,
}: {
  selectedIds: Set<string>;
  onClear: () => void;
  onBatchComplete: () => Promise<void>;
  onBatchMove: (section: SectionType) => Promise<void>;
}) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handle = async (action: string, fn: () => Promise<void>) => {
    setIsLoading(action);
    try {
      await fn();
    } finally {
      setIsLoading(null);
    }
  };

  if (selectedIds.size === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-zinc-800 text-white rounded-xl shadow-2xl border border-zinc-700">
      <span className="text-sm font-medium mr-1">
        {selectedIds.size} selected
      </span>
      <div className="w-px h-4 bg-zinc-600" />

      <Button
        variant="ghost"
        size="sm"
        className="text-white hover:bg-zinc-700 h-7 text-xs"
        disabled={isLoading !== null}
        onClick={() => handle('complete', onBatchComplete)}
      >
        {isLoading === 'complete' ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <CheckCheck className="h-3 w-3 mr-1" />
        )}
        Complete
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-zinc-700 h-7 text-xs"
            disabled={isLoading !== null}
          >
            <MoveRight className="h-3 w-3 mr-1" />
            Move to
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          {(['now', 'next', 'later', 'waiting'] as const).map((s) => (
            <DropdownMenuItem
              key={s}
              onClick={() => handle(`move-${s}`, () => onBatchMove(s))}
            >
              <div className={cn('h-2 w-2 rounded-full mr-2', sectionConfig[s].badgeColor)} />
              {sectionConfig[s].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-4 bg-zinc-600" />
      <Button
        variant="ghost"
        size="sm"
        className="text-zinc-400 hover:bg-zinc-700 hover:text-white h-7 text-xs"
        onClick={onClear}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// FocusMode (unchanged)
// ─────────────────────────────────────────────────────
function FocusMode({
  item,
  onExit,
  onRefresh
}: {
  item: WorkItem;
  onExit: () => void;
  onRefresh?: () => Promise<void>;
}) {
  const {
    isTimerRunning,
    timerStartedAt,
    startTimer,
    stopTimer,
    getElapsedSeconds,
    completeAndSave
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
          workspace_id: item.workspace_id
        })
      });

      const data = await res.json();

      if (data.success) {
        setAiPreview({
          action,
          preview: data.preview,
          applyUrl: `/api/ai/task-actions/${data.execution_id}/apply`
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
                  : 'No due date'
                }
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

// ─────────────────────────────────────────────────────
// MyWorkPage
// ─────────────────────────────────────────────────────
export default function MyWorkPage() {
  const { user } = useAuth();
  const { isActive, currentWorkItem, activate, deactivate } = useFocusModeStore();
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

  // ── Velocity stats ────────────────────────────────
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

  const handleStartFocus = (item: WorkItem) => activate(item);

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

    // Reject drops INTO Done (belt-and-suspenders; isDropDisabled also prevents it)
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

  // ── Selection handlers ────────────────────────────
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

  if (isActive && currentWorkItem) {
    return <FocusMode item={currentWorkItem} onExit={deactivate} onRefresh={fetchWorkItems} />;
  }

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

  const openItems = items.filter(i => i.status !== 'done');
  const blockedCount = items.filter(i => i.status === 'blocked').length;

  // ── Loading skeleton ──────────────────────────────
  if (isLoading) {
    return (
      <PageShell maxWidth="4xl">
        <PageHeader title="Execution Board" subtitle="Loading tasks..." />
        {/* Desktop: 5-column skeleton */}
        <div className="hidden md:flex gap-4 mt-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-1 min-w-[220px] space-y-3">
              <div className="h-5 w-20 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded" />
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-16 w-full bg-zinc-50 dark:bg-zinc-900 animate-pulse rounded-lg" />
              ))}
            </div>
          ))}
        </div>
        {/* Mobile: vertical stack skeleton */}
        <div className="md:hidden space-y-8 mt-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="h-6 w-24 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded" />
              <div className="space-y-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-12 w-full bg-zinc-50 dark:bg-zinc-900 animate-pulse rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Execution Board"
        subtitle={`${openItems.length} open • ${getItemsBySection('done').length} completed`}
        primaryAction={
          <div className="flex items-center gap-2">
            <Select value={selectedProjectId} onValueChange={handleProjectChange}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue placeholder="Project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TaskFilterPopover filters={filters} onFiltersChange={setFilters} />
            {openItems.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlanMyDay}
                disabled={isPlanning}
              >
                <Zap className="h-4 w-4" />
                {isPlanning ? 'Planning...' : 'Plan my day'}
              </Button>
            )}
          </div>
        }
      />

      {/* Velocity strip */}
      <div className="flex items-center gap-3 text-sm text-zinc-500 mb-4 px-1">
        <span className="flex items-center gap-1.5">
          <strong className="text-zinc-900 dark:text-zinc-100">
            {velocityStats.completedThisWeek}
          </strong>{' '}
          this week
          {velocityStats.completedThisWeek > velocityStats.lastWeek ? (
            <span className="flex items-center gap-0.5 text-emerald-500 text-xs">
              <TrendingUp className="h-3 w-3" />
              {velocityStats.completedThisWeek - velocityStats.lastWeek}
            </span>
          ) : velocityStats.completedThisWeek < velocityStats.lastWeek ? (
            <span className="flex items-center gap-0.5 text-rose-500 text-xs">
              <TrendingDown className="h-3 w-3" />
              {velocityStats.lastWeek - velocityStats.completedThisWeek}
            </span>
          ) : (
            <span className="text-zinc-400 text-xs">→ same</span>
          )}
        </span>
        <span className="text-zinc-300 dark:text-zinc-600">·</span>
        <span className="flex items-center gap-1.5">
          <strong className="text-zinc-900 dark:text-zinc-100">{blockedCount}</strong> blocked
        </span>
      </div>

      {/* Desktop kanban layout — 5 columns */}
      <div className="hidden md:block -mx-6 -mb-6 overflow-x-auto">
        <div className="px-6 pb-6">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4">
              {(['now', 'next', 'later', 'waiting'] as const).map(section => (
                <KanbanColumn
                  key={section}
                  section={section}
                  items={getItemsBySection(section)}
                  onStartFocus={handleStartFocus}
                  onQuickAdd={handleQuickAdd}
                  onMoveToSection={handleMoveToSection}
                  onRemoveFromMyWork={handleRemoveFromMyWork}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                />
              ))}
              <DoneColumn
                items={getItemsBySection('done')}
                onStartFocus={handleStartFocus}
                onMoveToSection={handleMoveToSection}
                onRemoveFromMyWork={handleRemoveFromMyWork}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
              />
            </div>
          </DragDropContext>
        </div>
      </div>

      {/* Mobile stacked layout */}
      <div className="md:hidden space-y-6">
        {(['now', 'next', 'later', 'waiting', 'done'] as SectionType[]).map(section => {
          const sectionItems = getItemsBySection(section);
          const config = sectionConfig[section];
          return (
            <div key={section}>
              <div className="flex items-center gap-2 mb-3">
                <div className={cn('h-2.5 w-2.5 rounded-full', config.badgeColor)} />
                <h3 className="font-semibold text-sm">{config.label}</h3>
                <Badge variant="secondary" className="text-xs ml-auto">{sectionItems.length}</Badge>
              </div>
              <div className="space-y-2">
                {sectionItems.map(item => (
                  <WorkItemCard
                    key={item.id}
                    item={item}
                    onStartFocus={handleStartFocus}
                    onMoveToSection={handleMoveToSection}
                    onRemoveFromMyWork={handleRemoveFromMyWork}
                    isReadOnly={section === 'done'}
                    isSelected={selectedIds.has(item.id)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Batch toolbar */}
      <BatchToolbar
        selectedIds={selectedIds}
        onClear={handleClearSelection}
        onBatchComplete={handleBatchComplete}
        onBatchMove={handleBatchMove}
      />
    </PageShell>
  );
}
