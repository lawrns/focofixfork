'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { MoreHorizontal, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { audioService } from '@/lib/audio/audio-service';
import { hapticService } from '@/lib/audio/haptic-service';
import { apiClient } from '@/lib/api-client';
import type { WorkItem } from '@/types/foco';
import { toast } from 'sonner';

type SectionType = 'now' | 'next' | 'later' | 'waiting' | 'done';

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-zinc-400',
  none: 'bg-zinc-300',
};

export function WorkItemCard({
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
