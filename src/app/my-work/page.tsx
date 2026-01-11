'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useFocusModeStore } from '@/lib/stores/foco-store';
import {
  Play,
  Pause,
  X,
  Clock,
  Calendar,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Filter,
  Zap,
  CheckCircle2,
  Circle,
  GripVertical,
  Timer,
  Target,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WorkItem, PriorityLevel } from '@/types/foco';

// Mock data
const myWorkItems: (WorkItem & { section: 'now' | 'next' | 'later' | 'waiting' })[] = [
  // Now
  { id: '1', workspace_id: '1', project_id: '1', type: 'task', title: 'Design homepage mockups', description: 'High-fidelity mockups with final colors, typography, and imagery', status: 'in_progress', priority: 'high', due_date: '2026-01-15', position: 0, section: 'now', created_at: '', updated_at: '', ai_context_sources: [], metadata: {}, project: { name: 'Website Redesign', color: '#6366F1' } as any },
  { id: '2', workspace_id: '1', project_id: '2', type: 'bug', title: 'Fix navigation dropdown on Safari', status: 'review', priority: 'urgent', due_date: '2026-01-12', position: 1, section: 'now', created_at: '', updated_at: '', ai_context_sources: [], metadata: {}, project: { name: 'Mobile App v2', color: '#10B981' } as any },
  
  // Next
  { id: '3', workspace_id: '1', project_id: '1', type: 'task', title: 'Product page templates', status: 'next', priority: 'medium', due_date: '2026-01-18', position: 0, section: 'next', created_at: '', updated_at: '', ai_context_sources: [], metadata: {}, project: { name: 'Website Redesign', color: '#6366F1' } as any },
  { id: '4', workspace_id: '1', project_id: '1', type: 'task', title: 'Checkout flow redesign', status: 'next', priority: 'high', due_date: '2026-01-22', position: 1, section: 'next', created_at: '', updated_at: '', ai_context_sources: [], metadata: {}, project: { name: 'Website Redesign', color: '#6366F1' } as any },
  { id: '5', workspace_id: '1', project_id: '2', type: 'feature', title: 'Push notification system', status: 'next', priority: 'high', due_date: '2026-01-28', position: 2, section: 'next', created_at: '', updated_at: '', ai_context_sources: [], metadata: {}, project: { name: 'Mobile App v2', color: '#10B981' } as any },
  
  // Later
  { id: '6', workspace_id: '1', project_id: '1', type: 'task', title: 'Mobile responsive audit', status: 'backlog', priority: 'medium', due_date: '2026-01-25', position: 0, section: 'later', created_at: '', updated_at: '', ai_context_sources: [], metadata: {}, project: { name: 'Website Redesign', color: '#6366F1' } as any },
  { id: '7', workspace_id: '1', project_id: '1', type: 'feature', title: 'Add dark mode support', status: 'backlog', priority: 'low', due_date: '2026-02-01', position: 1, section: 'later', created_at: '', updated_at: '', ai_context_sources: [], metadata: {}, project: { name: 'Website Redesign', color: '#6366F1' } as any },
  
  // Waiting
  { id: '8', workspace_id: '1', project_id: '3', type: 'task', title: 'Review OAuth2 implementation PR', status: 'review', priority: 'medium', position: 0, section: 'waiting', created_at: '', updated_at: '', ai_context_sources: [], metadata: {}, project: { name: 'API Platform', color: '#F59E0B' } as any },
];

const priorityColors: Record<PriorityLevel, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-zinc-400',
  none: 'bg-zinc-300',
};

const sectionConfig = {
  now: { label: 'Now', icon: Target, description: 'Focus on these today' },
  next: { label: 'Next', icon: Layers, description: 'Coming up soon' },
  later: { label: 'Later', icon: Calendar, description: 'On the backlog' },
  waiting: { label: 'Waiting', icon: Clock, description: 'Blocked or waiting on others' },
};

function WorkItemRow({ 
  item, 
  onStartFocus 
}: { 
  item: WorkItem & { section: string }; 
  onStartFocus: (item: WorkItem) => void;
}) {
  const [isCompleted, setIsCompleted] = useState(item.status === 'done');

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 -mx-2 rounded-lg group',
      'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors'
    )}>
      <GripVertical className="h-4 w-4 text-zinc-300 opacity-0 group-hover:opacity-100 cursor-grab" />
      
      <Checkbox
        checked={isCompleted}
        onCheckedChange={(checked) => setIsCompleted(!!checked)}
        className="h-5 w-5"
      />
      
      <div className={cn('h-2 w-2 rounded-full shrink-0', priorityColors[item.priority])} />
      
      <Link href={`/app/tasks/${item.id}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'font-medium text-sm truncate',
            isCompleted ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-zinc-50'
          )}>
            {item.title}
          </span>
          {item.type === 'bug' && (
            <Badge variant="outline" className="h-5 text-[10px] text-red-600 border-red-200">
              Bug
            </Badge>
          )}
          {item.type === 'feature' && (
            <Badge variant="outline" className="h-5 text-[10px] text-purple-600 border-purple-200">
              Feature
            </Badge>
          )}
        </div>
      </Link>

      <div className="flex items-center gap-2 shrink-0">
        {item.project && (
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <div 
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: (item.project as any).color }}
            />
            {(item.project as any).name}
          </span>
        )}
        
        {item.due_date && (
          <span className={cn(
            'text-xs',
            new Date(item.due_date) < new Date() ? 'text-red-500' : 'text-zinc-500'
          )}>
            {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.preventDefault();
            onStartFocus(item);
          }}
        >
          <Play className="h-3.5 w-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Move to Now</DropdownMenuItem>
            <DropdownMenuItem>Move to Next</DropdownMenuItem>
            <DropdownMenuItem>Move to Later</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Snooze</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">Remove from My Work</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function Section({ 
  section, 
  items,
  onStartFocus,
}: { 
  section: 'now' | 'next' | 'later' | 'waiting';
  items: (WorkItem & { section: string })[];
  onStartFocus: (item: WorkItem) => void;
}) {
  const config = sectionConfig[section];
  const Icon = config.icon;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-zinc-500" />
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          {config.label}
        </h2>
        <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded">
          {items.length}
        </span>
        <span className="text-xs text-zinc-500 ml-2">
          {config.description}
        </span>
      </div>
      
      <div className="space-y-1">
        {items.map((item) => (
          <WorkItemRow key={item.id} item={item} onStartFocus={onStartFocus} />
        ))}
        
        {items.length === 0 && (
          <div className="py-4 text-center text-sm text-zinc-400">
            No items in {config.label.toLowerCase()}
          </div>
        )}
        
        <Button variant="ghost" size="sm" className="w-full justify-start text-zinc-500 mt-2">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add task
        </Button>
      </div>
    </div>
  );
}

function FocusMode({ 
  item, 
  onExit 
}: { 
  item: WorkItem; 
  onExit: () => void;
}) {
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-zinc-950 z-50 flex flex-col">
      {/* Focus Mode Header */}
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
          {/* Timer */}
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <Timer className="h-4 w-4 text-zinc-500" />
            <span className="font-mono text-lg">{formatTime(elapsedSeconds)}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
            >
              {isTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>
          
          <Button onClick={onExit}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Complete & Exit
          </Button>
        </div>
      </div>

      {/* Focus Content */}
      <div className="flex-1 flex">
        {/* Main Content */}
        <div className="flex-1 p-8 max-w-3xl mx-auto">
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-zinc-600 dark:text-zinc-300">
              {item.description || 'No description provided.'}
            </p>
          </div>

          {/* AI Helpers */}
          <div className="mt-8 p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-indigo-600" />
              <span className="font-medium text-sm">AI Helpers</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">Break into subtasks</Button>
              <Button variant="outline" size="sm">Draft update</Button>
              <Button variant="outline" size="sm">Estimate time</Button>
              <Button variant="outline" size="sm">Find similar work</Button>
            </div>
          </div>
        </div>

        {/* Context Sidebar */}
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
                      day: 'numeric' 
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

export default function MyWorkPage() {
  const { isActive, currentWorkItem, activate, deactivate } = useFocusModeStore();

  const handleStartFocus = (item: WorkItem) => {
    activate(item);
  };

  if (isActive && currentWorkItem) {
    return <FocusMode item={currentWorkItem} onExit={deactivate} />;
  }

  const getItemsBySection = (section: 'now' | 'next' | 'later' | 'waiting') =>
    myWorkItems.filter(item => item.section === section);

  const completedToday = 3;
  const totalToday = 8;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            My Work
          </h1>
          <p className="text-zinc-500 mt-1">
            {completedToday} of {totalToday} tasks completed today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Zap className="h-4 w-4 mr-2" />
            Plan my day
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Today's Progress</span>
          <span className="text-sm text-zinc-500">{Math.round((completedToday / totalToday) * 100)}%</span>
        </div>
        <Progress value={(completedToday / totalToday) * 100} className="h-2" />
      </div>

      {/* Sections */}
      <Section section="now" items={getItemsBySection('now')} onStartFocus={handleStartFocus} />
      <Section section="next" items={getItemsBySection('next')} onStartFocus={handleStartFocus} />
      <Section section="later" items={getItemsBySection('later')} onStartFocus={handleStartFocus} />
      <Section section="waiting" items={getItemsBySection('waiting')} onStartFocus={handleStartFocus} />
    </div>
  );
}
