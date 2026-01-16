'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  MoreHorizontal,
  Plus,
  GripVertical,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { WorkItem, WorkItemStatus, PriorityLevel } from '@/types/foco';

const priorityColors: Record<PriorityLevel, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-zinc-400',
  none: 'bg-zinc-300',
};

const statusLabels: Record<WorkItemStatus, string> = {
  backlog: 'Backlog',
  next: 'Next',
  in_progress: 'In Progress',
  review: 'Review',
  blocked: 'Blocked',
  done: 'Done',
};

const statusColors: Record<WorkItemStatus, string> = {
  backlog: 'bg-zinc-400',
  next: 'bg-blue-500',
  in_progress: 'bg-indigo-500',
  review: 'bg-amber-500',
  blocked: 'bg-red-500',
  done: 'bg-green-500',
};

interface ListViewProps {
  tasks: WorkItem[];
  onStatusChange?: (taskId: string, status: WorkItemStatus) => void;
  onAddTask?: () => void;
}

function TaskRow({ 
  task, 
  onStatusChange 
}: { 
  task: WorkItem; 
  onStatusChange?: (taskId: string, status: WorkItemStatus) => void;
}) {
  const [isCompleted, setIsCompleted] = useState(task.status === 'done');

  const handleToggleComplete = async () => {
    const newStatus = isCompleted ? 'next' : 'done';
    setIsCompleted(!isCompleted);
    onStatusChange?.(task.id, newStatus);
  };

  return (
    <TableRow className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <TableCell className="w-8">
        <GripVertical className="h-4 w-4 text-zinc-300 opacity-0 group-hover:opacity-100 cursor-grab" />
      </TableCell>
      <TableCell className="w-8">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={handleToggleComplete}
          className="h-4 w-4"
        />
      </TableCell>
      <TableCell>
        <Link href={`/tasks/${task.id}`} className="flex items-center gap-2 hover:text-indigo-600">
          <div className={cn('h-2 w-2 rounded-full shrink-0', priorityColors[task.priority])} />
          <span className={cn(
            'font-medium text-sm',
            isCompleted && 'line-through text-zinc-400'
          )}>
            {task.title}
          </span>
          {task.type === 'bug' && (
            <Badge variant="outline" className="h-5 text-[10px] text-red-600 border-red-200">
              Bug
            </Badge>
          )}
          {task.type === 'feature' && (
            <Badge variant="outline" className="h-5 text-[10px] text-purple-600 border-purple-200">
              Feature
            </Badge>
          )}
        </Link>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className={cn('h-2 w-2 rounded-full', statusColors[task.status])} />
          <span className="text-sm text-zinc-600">{statusLabels[task.status]}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className={cn('h-2 w-2 rounded-full', priorityColors[task.priority])} />
          <span className="text-sm text-zinc-600 capitalize">{task.priority}</span>
        </div>
      </TableCell>
      <TableCell>
        {task.assignee ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px]">
                {task.assignee.full_name?.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-zinc-600">{task.assignee.full_name}</span>
          </div>
        ) : (
          <span className="text-sm text-zinc-400">Unassigned</span>
        )}
      </TableCell>
      <TableCell>
        {task.due_date ? (
          <span className={cn(
            'text-sm flex items-center gap-1',
            new Date(task.due_date) < new Date() ? 'text-red-500' : 'text-zinc-600'
          )}>
            <Clock className="h-3 w-3" />
            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        ) : (
          <span className="text-sm text-zinc-400">—</span>
        )}
      </TableCell>
      <TableCell className="w-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuItem>Move to project...</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export function ListView({ tasks, onStatusChange, onAddTask }: ListViewProps) {
  const [sortField, setSortField] = useState<'title' | 'status' | 'priority' | 'due_date'>('status');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortedTasks = [...tasks].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'status':
        const statusOrder = ['in_progress', 'next', 'review', 'blocked', 'backlog', 'done'];
        comparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
        break;
      case 'priority':
        const priorityOrder = ['urgent', 'high', 'medium', 'low', 'none'];
        comparison = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
        break;
      case 'due_date':
        if (!a.due_date && !b.due_date) comparison = 0;
        else if (!a.due_date) comparison = 1;
        else if (!b.due_date) comparison = -1;
        else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIndicator = ({ field }: { field: typeof sortField }) => (
    sortField === field ? (
      sortOrder === 'asc' ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3 rotate-90" />
    ) : null
  );

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50 dark:bg-zinc-800/50">
            <TableHead className="w-8"></TableHead>
            <TableHead className="w-8"></TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700"
              onClick={() => handleSort('title')}
            >
              <div className="flex items-center gap-1">
                Title
                <SortIndicator field="title" />
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700"
              onClick={() => handleSort('status')}
            >
              <div className="flex items-center gap-1">
                Status
                <SortIndicator field="status" />
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700"
              onClick={() => handleSort('priority')}
            >
              <div className="flex items-center gap-1">
                Priority
                <SortIndicator field="priority" />
              </div>
            </TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700"
              onClick={() => handleSort('due_date')}
            >
              <div className="flex items-center gap-1">
                Due Date
                <SortIndicator field="due_date" />
              </div>
            </TableHead>
            <TableHead className="w-8"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.map((task) => (
            <TaskRow 
              key={task.id} 
              task={task} 
              onStatusChange={onStatusChange}
            />
          ))}
          {tasks.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                <p className="text-zinc-500">No tasks yet</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="p-2 border-t border-zinc-200 dark:border-zinc-800">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-zinc-500"
          onClick={onAddTask}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add task
        </Button>
      </div>
    </div>
  );
}
