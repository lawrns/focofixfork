'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useFocusModeStore } from '@/lib/stores/foco-store';
import { useRecentItems } from '@/hooks/useRecentItems';
import { PriorityIndicator } from '@/features/tasks/components/priority-indicator';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Calendar,
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
} from 'lucide-react';
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

function Inspector({ item }: { item: WorkItem }) {
  const [status, setStatus] = useState(item.status);
  const [priority, setPriority] = useState(item.priority);

  const currentStatus = statusOptions.find(s => s.value === status);
  const currentPriority = priorityOptions.find(p => p.value === priority);

  return (
    <div className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 space-y-6 overflow-y-auto">
      {/* Status */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
          Status
        </label>
        <Select value={status} onValueChange={(v) => setStatus(v as WorkItemStatus)}>
          <SelectTrigger>
            <div className="flex items-center gap-2">
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
        <Button variant="outline" className="w-full justify-start">
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
        <Select value={priority} onValueChange={(v) => setPriority(v as PriorityLevel)}>
          <SelectTrigger>
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
        <Button variant="outline" className="w-full justify-start">
          <Calendar className="h-4 w-4" />
          {item.due_date 
            ? new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'No due date'
          }
        </Button>
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
          <Button variant="ghost" size="sm" className="h-6 px-2">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Estimate */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
          Estimate
        </label>
        <Button variant="outline" className="w-full justify-start">
          <Clock className="h-4 w-4" />
          {item.estimate_hours ? `${item.estimate_hours}h estimated` : 'No estimate'}
        </Button>
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

function AIPanel() {
  return (
    <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-indigo-600" />
        <span className="font-medium text-sm">AI Actions</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm">Suggest subtasks</Button>
        <Button variant="outline" size="sm">Draft acceptance criteria</Button>
        <Button variant="outline" size="sm">Summarize thread</Button>
        <Button variant="outline" size="sm">Propose next step</Button>
        <Button variant="outline" size="sm">Detect blockers</Button>
      </div>
    </div>
  );
}

export default function WorkItemPage() {
  const params = useParams();
  const router = useRouter();
  const { activate } = useFocusModeStore();
  const { addItem } = useRecentItems();
  const [newComment, setNewComment] = useState('');
  const [workItem, setWorkItem] = useState<WorkItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/tasks/${params.id}`);
        const data = await response.json();
        
        if (data.success && data.data) {
          setWorkItem(data.data);
          setIsCompleted(data.data.status === 'done');
          
          addItem({
            type: 'task',
            id: data.data.id,
            name: data.data.title,
          });
        }
      } catch (error) {
        console.error('Failed to fetch task:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchTask();
    }
  }, [params.id, addItem]);

  const handleStartFocus = () => {
    if (workItem) {
      activate(workItem);
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
          <p className="text-zinc-500 mb-4">The task you're looking for doesn't exist.</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6">
          {/* Header */}
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
                <DropdownMenuItem>Copy link</DropdownMenuItem>
                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                <DropdownMenuItem>Move to project...</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Title */}
          <div className="flex items-start gap-3 mb-6">
            <button
              onClick={() => setIsCompleted(!isCompleted)}
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
            <AIPanel />
          </div>

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
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Zap className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button size="sm" disabled={!newComment.trim()}>
                    <Send className="h-4 w-4" />
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

      {/* Inspector Panel */}
      <Inspector item={workItem} />
    </div>
  );
}
