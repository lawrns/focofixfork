'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { WorkItem, PriorityLevel } from '@/types/foco';

const priorityColors: Record<PriorityLevel, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-zinc-400',
  none: 'bg-zinc-300',
};

interface TimelineViewProps {
  tasks: WorkItem[];
}

interface DayGroup {
  date: string;
  label: string;
  isOverdue: boolean;
  tasks: WorkItem[];
}

export function TimelineView({ tasks }: TimelineViewProps) {
  const groupedTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const groups: DayGroup[] = [];
    const tasksByDate = new Map<string, WorkItem[]>();
    const noDueDateTasks: WorkItem[] = [];

    // Group tasks by due date
    tasks.forEach(task => {
      if (!task.due_date) {
        noDueDateTasks.push(task);
        return;
      }
      
      const dateKey = task.due_date.split('T')[0];
      if (!tasksByDate.has(dateKey)) {
        tasksByDate.set(dateKey, []);
      }
      tasksByDate.get(dateKey)!.push(task);
    });

    // Sort dates and create groups
    const sortedDates = Array.from(tasksByDate.keys()).sort();
    
    sortedDates.forEach(dateKey => {
      const date = new Date(dateKey);
      const isOverdue = date < today;
      const isToday = date.getTime() === today.getTime();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = date.getTime() === tomorrow.getTime();

      let label: string;
      if (isToday) {
        label = 'Today';
      } else if (isTomorrow) {
        label = 'Tomorrow';
      } else if (isOverdue) {
        label = `Overdue - ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
      } else {
        label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }

      groups.push({
        date: dateKey,
        label,
        isOverdue,
        tasks: tasksByDate.get(dateKey)!,
      });
    });

    // Add no due date group at the end if there are tasks
    if (noDueDateTasks.length > 0) {
      groups.push({
        date: 'no-date',
        label: 'No Due Date',
        isOverdue: false,
        tasks: noDueDateTasks,
      });
    }

    return groups;
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700">
        <Clock className="h-8 w-8 text-zinc-400 mx-auto mb-3" />
        <p className="text-zinc-500">No tasks with due dates</p>
        <p className="text-sm text-zinc-400 mt-1">Add due dates to see tasks on the timeline</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedTasks.map((group) => (
        <div key={group.date} className="relative">
          {/* Date Header */}
          <div className={cn(
            'sticky top-0 z-10 flex items-center gap-2 py-2 px-3 mb-2 rounded-lg',
            group.isOverdue 
              ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50'
              : 'bg-zinc-100 dark:bg-zinc-800'
          )}>
            {group.isOverdue && <AlertTriangle className="h-4 w-4 text-red-500" />}
            <span className={cn(
              'font-medium text-sm',
              group.isOverdue && 'text-red-600'
            )}>
              {group.label}
            </span>
            <Badge variant="secondary" className="text-xs">
              {group.tasks.length}
            </Badge>
          </div>

          {/* Tasks */}
          <div className="space-y-2 pl-4 border-l-2 border-zinc-200 dark:border-zinc-700 ml-4">
            {group.tasks.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className={cn(
                  'block p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800',
                  'hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all',
                  'relative -ml-[17px]'
                )}
              >
                {/* Timeline dot */}
                <div className={cn(
                  'absolute -left-[13px] top-4 h-2 w-2 rounded-full',
                  priorityColors[task.priority]
                )} />
                
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-zinc-900 dark:text-zinc-50 truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
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
                      <span className="text-xs text-zinc-500 capitalize">{task.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  {task.assignee && (
                    <div className="shrink-0 h-6 w-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-medium">
                      {task.assignee.full_name?.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
