'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useFocusModeStore } from '@/lib/stores/foco-store';
import { useRecentItems } from '@/hooks/useRecentItems';
import { useMobile } from '@/lib/hooks/use-mobile';
import { PriorityIndicator } from '@/features/tasks/components/priority-indicator';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Calendar as CalendarIcon,
  User,
  Flag,
  Tag,
  Clock,
  Link2,
  MessageSquare,
  Paperclip,
  Play,
  Zap,
  ChevronDown,
  Plus,
  Send,
  AlertTriangle,
  GitBranch,
  History,
  Loader2,
  Sparkles,
  Copy,
  Trash2,
  FolderInput,
} from 'lucide-react';
import { AiPreviewModal } from '@/components/ai/ai-preview-modal';
import type { TaskActionType } from '@/lib/services/task-action-service';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { WorkItem, WorkItemStatus, PriorityLevel, Comment } from '@/types/foco';

// No mock data - fetch from API

const statusOptions: { value: WorkItemStatus; label: string; color: string }[] = [
  { value: 'backlog', label: 'Backlog', color: 'bg-zinc-400' },
  { value: 'next', label: 'Next', color: 'bg-blue-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-indigo-500' },
  { value: 'review', label: 'Review', color: 'bg-amber-500' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-500' },
  { value: 'done', label: 'Done', color: 'bg-green-500' },
];

const priorityOptions: { value: PriorityLevel; label: string; color: string }[] = [
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500' },
  { value: 'low', label: 'Low', color: 'bg-zinc-400' },
  { value: 'none', label: 'None', color: 'bg-zinc-300' },
];

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div className={cn(
      'flex gap-3 p-3 rounded-lg',
      comment.is_ai_generated && 'bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50'
    )}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={cn(
          'text-xs',
          comment.is_ai_generated && 'bg-indigo-100 text-indigo-600'
        )}>
          {comment.is_ai_generated ? (
            <Zap className="h-4 w-4" />
          ) : (
            comment.user?.full_name?.split(' ').map(n => n[0]).join('')
          )}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {comment.is_ai_generated ? 'Foco AI' : comment.user?.full_name}
          </span>
          {comment.is_ai_generated && (
            <Badge variant="secondary" className="text-[10px] h-4">AI</Badge>
          )}
          <span className="text-xs text-zinc-400">
            {new Date(comment.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
          {comment.content}
        </p>
      </div>
    </div>
  );
}

interface InspectorProps {
  item: WorkItem;
  onUpdate: (updates: Partial<WorkItem>) => Promise<void>;
  teamMembers: Array<{ id: string; full_name: string }>;
  inSheet?: boolean;
}

function Inspector({ item, onUpdate, teamMembers, inSheet = false }: InspectorProps) {
  const [status, setStatus] = useState(item.status);
  const [priority, setPriority] = useState(item.priority);
  const [dueDate, setDueDate] = useState<Date | undefined>(
    item.due_date ? new Date(item.due_date) : undefined
  );
  const [estimateHours, setEstimateHours] = useState<string>(
    item.estimate_hours?.toString() || ''
  );
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const currentStatus = statusOptions.find(s => s.value === status);
  const currentPriority = priorityOptions.find(p => p.value === priority);

  // Update local state when item changes
  useEffect(() => {
    setStatus(item.status);
    setPriority(item.priority);
    setDueDate(item.due_date ? new Date(item.due_date) : undefined);
    setEstimateHours(item.estimate_hours?.toString() || '');
  }, [item]);

  const handleStatusChange = async (newStatus: WorkItemStatus) => {
    setStatus(newStatus);
    setUpdating('status');
    try {
      await onUpdate({ status: newStatus });
      toast.success('Status updated');
    } catch (error) {
      setStatus(item.status); // Revert on error
      toast.error('Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const handlePriorityChange = async (newPriority: PriorityLevel) => {
    setPriority(newPriority);
    setUpdating('priority');
    try {
      await onUpdate({ priority: newPriority });
      toast.success('Priority updated');
    } catch (error) {
      setPriority(item.priority); // Revert on error
      toast.error('Failed to update priority');
    } finally {
      setUpdating(null);
    }
  };

  const handleDueDateChange = async (date: Date | undefined) => {
    setDueDate(date);
    setDueDateOpen(false);
    setUpdating('due_date');
    try {
      await onUpdate({ due_date: date ? date.toISOString().split('T')[0] : null } as Partial<WorkItem>);
      toast.success(date ? 'Due date updated' : 'Due date cleared');
    } catch (error) {
      setDueDate(item.due_date ? new Date(item.due_date) : undefined); // Revert on error
      toast.error('Failed to update due date');
    } finally {
      setUpdating(null);
    }
  };

  const handleAssigneeChange = async (assigneeId: string | null) => {
    setAssigneeOpen(false);
    setUpdating('assignee');
    try {
      await onUpdate({ assignee_id: assigneeId } as Partial<WorkItem>);
      toast.success(assigneeId ? 'Assignee updated' : 'Assignee removed');
    } catch (error) {
      toast.error('Failed to update assignee');
    } finally {
      setUpdating(null);
    }
  };

  const handleEstimateSubmit = async () => {
    setEstimateOpen(false);
    const hours = estimateHours ? parseFloat(estimateHours) : null;
    if (estimateHours && isNaN(hours as number)) {
      toast.error('Please enter a valid number');
      return;
    }
    setUpdating('estimate');
    try {
      await onUpdate({ estimate_hours: hours } as Partial<WorkItem>);
      toast.success(hours ? 'Estimate updated' : 'Estimate cleared');
    } catch (error) {
      setEstimateHours(item.estimate_hours?.toString() || '');
      toast.error('Failed to update estimate');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className={cn(
      "space-y-6 overflow-y-auto",
      inSheet ? "w-full p-0" : "w-80 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4"
    )}>
      {/* Status */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
          Status
        </label>
        <Select
          value={status}
          onValueChange={(v) => handleStatusChange(v as WorkItemStatus)}
          disabled={updating === 'status'}
        >
          <SelectTrigger>
            <div className="flex items-center gap-2">
              {updating === 'status' && <Loader2 className="h-3 w-3 animate-spin" />}
              <div className={cn('h-2 w-2 rounded-full', currentStatus?.color)} />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <div className={cn('h-2 w-2 rounded-full', option.color)} />
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Assignee */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
          Assignee
        </label>
        <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start"
              disabled={updating === 'assignee'}
            >
              {updating === 'assignee' && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
              {item.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px]">
                      {item.assignee.full_name?.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {item.assignee.full_name}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-zinc-400">
                  <User className="h-4 w-4" />
                  Unassigned
                </div>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2">
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleAssigneeChange(null)}
              >
                <User className="h-4 w-4 mr-2 text-zinc-400" />
                Unassigned
              </Button>
              {teamMembers.map((member) => (
                <Button
                  key={member.id}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleAssigneeChange(member.id)}
                >
                  <Avatar className="h-5 w-5 mr-2">
                    <AvatarFallback className="text-[10px]">
                      {member.full_name?.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {member.full_name}
                </Button>
              ))}
              {teamMembers.length === 0 && (
                <p className="text-xs text-zinc-400 p-2">No team members found</p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Priority */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
          Priority
        </label>
        <div className="flex items-center gap-2 mb-2">
          <PriorityIndicator
            priority={priority as any}
            variant="badge"
          />
        </div>
        <Select
          value={priority}
          onValueChange={(v) => handlePriorityChange(v as PriorityLevel)}
          disabled={updating === 'priority'}
        >
          <SelectTrigger>
            {updating === 'priority' && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {priorityOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <PriorityIndicator
                    priority={option.value as any}
                    variant="dot"
                  />
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Due Date */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
          Due Date
        </label>
        <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start"
              disabled={updating === 'due_date'}
            >
              {updating === 'due_date' && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
              <CalendarIcon className="h-4 w-4 mr-2" />
              {dueDate
                ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'No due date'
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={handleDueDateChange}
              initialFocus
            />
            {dueDate && (
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-600"
                  onClick={() => handleDueDateChange(undefined)}
                >
                  Clear due date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Labels */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
          Labels
        </label>
        <div className="flex flex-wrap gap-1">
          {item.labels?.map((label) => (
            <Badge
              key={label.id}
              variant="outline"
              style={{ borderColor: label.color, backgroundColor: `${label.color}20` }}
            >
              {label.name}
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={() => toast.info('Labels management coming soon')}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Estimate */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
          Estimate
        </label>
        <Popover open={estimateOpen} onOpenChange={setEstimateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start"
              disabled={updating === 'estimate'}
            >
              {updating === 'estimate' && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
              <Clock className="h-4 w-4 mr-2" />
              {item.estimate_hours ? `${item.estimate_hours}h estimated` : 'No estimate'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-3" align="start">
            <div className="space-y-2">
              <label className="text-xs font-medium">Hours</label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                placeholder="e.g., 4"
                value={estimateHours}
                onChange={(e) => setEstimateHours(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEstimateSubmit()}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEstimateSubmit}>
                  Save
                </Button>
                {estimateHours && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEstimateHours('');
                      handleEstimateSubmit();
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Time Tracked */}
      {item.actual_hours && (
        <div>
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
            Time Tracked
          </label>
          <div className="text-sm">
            {item.actual_hours}h / {item.estimate_hours}h
          </div>
        </div>
      )}

      <Separator />

      {/* Project */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
          Project
        </label>
        <Link 
          href={`/projects/${(item.project as any)?.slug}`}
          className="flex items-center gap-2 text-sm hover:text-indigo-600 transition-colors"
        >
          <div 
            className="h-3 w-3 rounded"
            style={{ backgroundColor: (item.project as any)?.color }}
          />
          {(item.project as any)?.name}
        </Link>
      </div>

      {/* Reporter */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
          Reporter
        </label>
        <div className="flex items-center gap-2 text-sm">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[10px]">
              {item.reporter?.full_name?.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          {item.reporter?.full_name}
        </div>
      </div>

      {/* Created */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
          Created
        </label>
        <div className="text-sm text-zinc-600">
          {new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
      </div>
    </div>
  );
}

interface AIPanelProps {
  taskId: string;
  workspaceId: string;
  aiLoading: TaskActionType | null;
  onAction: (action: TaskActionType) => void;
}

function AIPanel({ taskId, workspaceId, aiLoading, onAction }: AIPanelProps) {
  const actions: { action: TaskActionType; label: string }[] = [
    { action: 'suggest_subtasks', label: 'Suggest subtasks' },
    { action: 'draft_acceptance', label: 'Draft acceptance criteria' },
    { action: 'summarize_thread', label: 'Summarize thread' },
    { action: 'propose_next_step', label: 'Propose next step' },
    { action: 'detect_blockers', label: 'Detect blockers' },
  ];

  return (
    <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-indigo-600" />
        <span className="font-medium text-sm">AI Actions</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map(({ action, label }) => (
          <Button
            key={action}
            variant="outline"
            size="sm"
            disabled={aiLoading !== null}
            onClick={() => onAction(action)}
          >
            {aiLoading === action ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
            ) : (
              <Sparkles className="h-3 w-3 mr-1.5" />
            )}
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function WorkItemPage() {
  const params = useParams();
  const router = useRouter();
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

  // AI Action state
  const [aiLoading, setAiLoading] = useState<TaskActionType | null>(null);
  const [aiPreview, setAiPreview] = useState<{
    action: TaskActionType;
    preview: { explanation: string; proposed_changes: unknown };
    applyUrl: string;
  } | null>(null);

  // Fetch task data
  const fetchTask = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tasks/${params.id}`);
      const data = await response.json();

      // API returns { ok: true, data: {...} } format
      const taskData = data.data || data;
      if ((data.ok || data.success) && taskData) {
        setWorkItem(taskData);
        setIsCompleted(taskData.status === 'done');

        addItem({
          type: 'task',
          id: taskData.id,
          name: taskData.title,
        });

        // Fetch team members for assignee dropdown
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
  }, [params.id, addItem]);

  useEffect(() => {
    if (params.id) {
      fetchTask();
    }
  }, [params.id, fetchTask]);

  // Update task via API
  const handleTaskUpdate = useCallback(async (updates: Partial<WorkItem>) => {
    if (!workItem) return;

    const response = await fetch(`/api/tasks/${workItem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    const data = await response.json();
    if (!response.ok || (!data.ok && !data.success)) {
      throw new Error(data.error || 'Failed to update task');
    }

    // Update local state with new data
    const updatedTask = data.data || data;
    setWorkItem(prev => prev ? { ...prev, ...updatedTask } : null);
    // Check if the status indicates completion (no 'done' status in WorkItemStatus, completion tracked separately)
    if (updates.status) {
      // If status is explicitly set, task is not completed unless toggled via isCompleted
      setIsCompleted(false);
    }
  }, [workItem]);

  // Handle comment submission
  const handleCommentSubmit = useCallback(async () => {
    if (!workItem || !newComment.trim()) return;

    setCommentSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${workItem.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() })
      });

      const data = await response.json();
      if (response.ok && (data.ok || data.success)) {
        const newCommentData = data.data || data;
        setComments(prev => [...prev, newCommentData]);
        setNewComment('');
        toast.success('Comment added');
      } else {
        toast.error(data.error || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setCommentSubmitting(false);
    }
  }, [workItem, newComment]);

  // Copy link to clipboard
  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/tasks/${workItem?.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  }, [workItem]);

  // Duplicate task
  const handleDuplicate = useCallback(async () => {
    if (!workItem) return;

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${workItem.title} (Copy)`,
          description: workItem.description,
          workspace_id: workItem.workspace_id,
          project_id: workItem.project_id,
          status: 'backlog',
          priority: workItem.priority,
          type: workItem.type
        })
      });

      const data = await response.json();
      if (response.ok && (data.ok || data.success)) {
        const newTask = data.data || data;
        toast.success('Task duplicated');
        router.push(`/tasks/${newTask.id}`);
      } else {
        toast.error(data.error || 'Failed to duplicate task');
      }
    } catch (error) {
      console.error('Failed to duplicate task:', error);
      toast.error('Failed to duplicate task');
    }
  }, [workItem, router]);

  // Delete task
  const handleDelete = useCallback(async () => {
    if (!workItem) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/tasks/${workItem.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (response.ok && (data.ok || data.success)) {
        toast.success('Task deleted');
        router.push('/my-work');
      } else {
        toast.error(data.error || 'Failed to delete task');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  }, [workItem, router]);

  // Toggle task completion
  const handleToggleComplete = useCallback(async () => {
    const newStatus = isCompleted ? 'in_progress' : 'done';
    setIsCompleted(!isCompleted);
    try {
      await handleTaskUpdate({ status: newStatus } as Partial<WorkItem>);
    } catch (error) {
      setIsCompleted(isCompleted); // Revert on error
      toast.error('Failed to update status');
    }
  }, [isCompleted, handleTaskUpdate]);

  const handleStartFocus = () => {
    if (workItem) {
      activate(workItem);
    }
  };

  const handleAiAction = async (action: TaskActionType) => {
    if (!workItem) return;

    setAiLoading(action);
    try {
      const res = await fetch('/api/ai/task-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          task_id: workItem.id,
          workspace_id: workItem.workspace_id
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

    const res = await fetch(aiPreview.applyUrl, { method: 'POST' });
    const data = await res.json();

    if (data.success || data.ok) {
      toast.success('Changes applied successfully');
      // Refresh the task to show any changes
      const taskResponse = await fetch(`/api/tasks/${params.id}`);
      const taskData = await taskResponse.json();
      const refreshedTask = taskData.data || taskData;
      if ((taskData.ok || taskData.success) && refreshedTask) {
        setWorkItem(refreshedTask);
      }
    } else {
      throw new Error(data.error || 'Failed to apply changes');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
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

  // Mobile status bar data
  const currentStatus = statusOptions.find(s => s.value === workItem.status);
  const currentPriority = priorityOptions.find(p => p.value === workItem.priority);
  const dueDate = workItem.due_date ? new Date(workItem.due_date) : undefined;

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className={cn(
          "mx-auto p-6",
          isMobile ? "pb-24" : "max-w-3xl"
        )}>
          {/* Header - Mobile */}
          {isMobile && (
            <div className="sticky top-0 -mx-6 -mt-6 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 mb-6 z-10">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-zinc-500 truncate">
                    TASK-{workItem.id}
                  </div>
                  <div className="text-sm font-medium truncate">
                    {(workItem.project as any)?.name}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleCopyLink}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDuplicate}>
                      <Plus className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.info('Move to project coming soon')}>
                      <FolderInput className="h-4 w-4 mr-2" />
                      Move to project...
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          {/* Header - Desktop */}
          {!isMobile && (
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                  <Link
                    href={`/projects/${(workItem.project as any)?.slug}`}
                    className="hover:text-indigo-600"
                  >
                    {(workItem.project as any)?.name}
                  </Link>
                  <span>/</span>
                  <span>TASK-{workItem.id}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleStartFocus}>
                <Play className="h-4 w-4" />
                Focus
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleCopyLink}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info('Move to project coming soon')}>
                    <FolderInput className="h-4 w-4 mr-2" />
                    Move to project...
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Title */}
          <div className="flex items-start gap-3 mb-6">
            <button
              onClick={handleToggleComplete}
              className="mt-1"
            >
              {isCompleted ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <Circle className="h-6 w-6 text-zinc-300 hover:text-zinc-400" />
              )}
            </button>
            <h1 className={cn(
              'text-2xl font-semibold',
              isCompleted && 'line-through text-zinc-400'
            )}>
              {workItem.title}
            </h1>
          </div>

          {/* Description */}
          <div className="prose dark:prose-invert max-w-none mb-8">
            <div className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-300">
              {workItem.description}
            </div>
          </div>

          {/* AI Panel */}
          <div className="mb-8">
            <AIPanel
              taskId={workItem.id}
              workspaceId={workItem.workspace_id}
              aiLoading={aiLoading}
              onAction={handleAiAction}
            />
          </div>

          {/* AI Preview Modal */}
          <AiPreviewModal
            open={aiPreview !== null}
            action={aiPreview?.action || null}
            preview={aiPreview?.preview || null}
            onApply={handleApplyPreview}
            onCancel={() => setAiPreview(null)}
          />

          <Separator className="my-8" />

          {/* Activity */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-4 w-4 text-zinc-500" />
              <h2 className="font-semibold">Activity</h2>
              <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded">
                {comments.length + activityLog.length}
              </span>
            </div>

            {/* Comments */}
            <div className="space-y-3 mb-6">
              {comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </div>

            {/* New Comment */}
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs">JD</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder="Write a comment... Use @ to mention"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px] mb-2"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toast.info('File attachments coming soon')}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleAiAction('propose_next_step')}
                    >
                      <Zap className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    disabled={!newComment.trim() || commentSubmitting}
                    onClick={handleCommentSubmit}
                  >
                    {commentSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Comment
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <History className="h-4 w-4 text-zinc-500" />
              <h3 className="text-sm font-medium text-zinc-500">History</h3>
            </div>
            <div className="space-y-2">
              {activityLog.map((activity) => (
                <div key={activity.id} className="flex items-center gap-2 text-sm text-zinc-500">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {activity.user}
                  </span>
                  <span>{activity.action}</span>
                  <span className="text-zinc-400">•</span>
                  <span className="text-zinc-400">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Inspector Panel - Desktop Only */}
      {!isMobile && (
        <Inspector item={workItem} onUpdate={handleTaskUpdate} teamMembers={teamMembers} />
      )}

      {/* Mobile Status Bar - Fixed at bottom */}
      {isMobile && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 p-4 cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-900 transition-colors z-20"
          onClick={() => setMetadataSheetOpen(true)}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className={cn('h-2 w-2 rounded-full flex-shrink-0', currentStatus?.color)} />
              <span className="text-sm font-medium truncate">{currentStatus?.label}</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <PriorityIndicator priority={workItem.priority as any} variant="dot" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                {currentPriority?.label}
              </span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <CalendarIcon className="h-4 w-4 text-zinc-400 flex-shrink-0" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                {dueDate
                  ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'No date'
                }
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-zinc-400 flex-shrink-0" />
          </div>
        </div>
      )}

      {/* Mobile Metadata Sheet */}
      {isMobile && (
        <Sheet open={metadataSheetOpen} onOpenChange={setMetadataSheetOpen}>
          <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Task Details</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <Inspector item={workItem} onUpdate={handleTaskUpdate} teamMembers={teamMembers} inSheet={true} />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
