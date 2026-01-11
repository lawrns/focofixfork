'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useFocusModeStore } from '@/lib/stores/foco-store';
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

// Mock data
const workItem: WorkItem = {
  id: '1',
  workspace_id: '1',
  project_id: '1',
  type: 'task',
  title: 'Design homepage mockups',
  description: `Create high-fidelity mockups for the new homepage layout with final colors, typography, and imagery.

## Requirements
- Hero section with animated background
- Featured products carousel
- Testimonials section
- Newsletter signup
- Footer redesign

## Design Notes
- Follow the new brand guidelines
- Mobile-first approach
- Ensure accessibility compliance (WCAG 2.2 AA)`,
  status: 'in_progress',
  priority: 'high',
  assignee_id: '1',
  reporter_id: '2',
  due_date: '2026-01-15',
  start_date: '2026-01-08',
  estimate_hours: 16,
  actual_hours: 8,
  position: 0,
  created_at: '2026-01-05T10:00:00Z',
  updated_at: '2026-01-10T14:30:00Z',
  ai_context_sources: [],
  metadata: {},
  assignee: { id: '1', email: 'sarah@acme.com', full_name: 'Sarah Chen' } as any,
  reporter: { id: '2', email: 'mike@acme.com', full_name: 'Mike Johnson' } as any,
  project: { id: '1', name: 'Website Redesign', color: '#6366F1', slug: 'website-redesign' } as any,
  labels: [
    { id: '1', workspace_id: '1', name: 'design', color: '#EC4899', created_at: '' },
    { id: '2', workspace_id: '1', name: 'frontend', color: '#F59E0B', created_at: '' },
  ],
};

const comments: Comment[] = [
  {
    id: '1',
    work_item_id: '1',
    user_id: '2',
    content: 'Started working on this. The wireframes are approved, moving to high-fidelity.',
    mentions: [],
    attachments: [],
    is_ai_generated: false,
    created_at: '2026-01-08T11:00:00Z',
    updated_at: '2026-01-08T11:00:00Z',
    user: { id: '2', email: '', full_name: 'Mike Johnson' } as any,
  },
  {
    id: '2',
    work_item_id: '1',
    user_id: '1',
    content: 'Looking great! Can we add some micro-interactions to the hero section? Think subtle parallax effects.',
    mentions: [],
    attachments: [],
    is_ai_generated: false,
    created_at: '2026-01-09T15:30:00Z',
    updated_at: '2026-01-09T15:30:00Z',
    user: { id: '1', email: '', full_name: 'Sarah Chen' } as any,
  },
  {
    id: '3',
    work_item_id: '1',
    user_id: '3',
    content: 'AI Summary: This task is 50% complete based on the checklist items. Estimated 2 more days to completion at current velocity.',
    mentions: [],
    attachments: [],
    is_ai_generated: true,
    ai_sources: { tasks: ['1'], comments: ['1', '2'] },
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-01-10T09:00:00Z',
    user: { id: '3', email: '', full_name: 'Foco AI' } as any,
  },
];

const activityLog = [
  { id: '1', action: 'created', user: 'Mike Johnson', time: 'Jan 5, 2026' },
  { id: '2', action: 'assigned to Sarah Chen', user: 'Mike Johnson', time: 'Jan 5, 2026' },
  { id: '3', action: 'moved to In Progress', user: 'Sarah Chen', time: 'Jan 8, 2026' },
  { id: '4', action: 'added label "design"', user: 'Sarah Chen', time: 'Jan 8, 2026' },
];

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
        <Select value={priority} onValueChange={(v) => setPriority(v as PriorityLevel)}>
          <SelectTrigger>
            <div className="flex items-center gap-2">
              <div className={cn('h-2 w-2 rounded-full', currentPriority?.color)} />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {priorityOptions.map((option) => (
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

      {/* Due Date */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
          Due Date
        </label>
        <Button variant="outline" className="w-full justify-start">
          <Calendar className="h-4 w-4 mr-2" />
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
          <Clock className="h-4 w-4 mr-2" />
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
  const [newComment, setNewComment] = useState('');
  const [isCompleted, setIsCompleted] = useState(workItem.status === 'done');

  const handleStartFocus = () => {
    activate(workItem);
  };

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
              <Play className="h-4 w-4 mr-1" />
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
                    <Send className="h-4 w-4 mr-1" />
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
