'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WorkItem, WorkItemStatus } from '@/types/foco';
import { WorkItemCard } from './WorkItemCard';

export function BoardColumn({ status, label, color, items, onDrop, onAddTask, onComplete, onArchive, onQueueToAI }: {
  status: WorkItemStatus;
  label: string;
  color: string;
  items: WorkItem[];
  onDrop?: (taskId: string, newStatus: WorkItemStatus) => void;
  onAddTask?: (status: WorkItemStatus) => void;
  onComplete?: (item: WorkItem) => void;
  onArchive?: (item: WorkItem) => void;
  onQueueToAI?: (taskId: string) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onDrop?.(taskId, status);
    }
  };

  return (
    <div className="flex flex-col w-full md:w-72 min-w-[280px] shrink-0">
      <div className="flex items-center gap-2 px-2 py-2 mb-2">
        <div className={cn('h-1.5 w-1.5 md:h-2 md:w-2 rounded-full shrink-0', color)} />
        <span className="font-medium text-xs md:text-sm text-zinc-900 dark:text-zinc-50 truncate">
          {label}
        </span>
        <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 rounded shrink-0">
          {items.length}
        </span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 md:h-6 md:w-6 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
          aria-label="Add task to column"
          onClick={() => onAddTask?.(status)}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-5 w-5 md:h-6 md:w-6 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0" aria-label="Column options">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex-1 space-y-1 md:space-y-2 min-h-[200px] p-0.5 md:p-1 rounded-lg transition-colors',
          isDragOver
            ? 'bg-secondary/50 dark:bg-secondary/20 border-2 border-dashed border-[color:var(--foco-teal)]'
            : 'bg-zinc-50/50 dark:bg-zinc-800/20'
        )}
      >
        {items.map((item) => (
          <WorkItemCard
            key={item.id}
            item={item}
            onComplete={onComplete}
            onArchive={onArchive}
            onQueueToAI={onQueueToAI}
          />
        ))}

        <Button
          variant="ghost"
          className="w-full justify-start text-zinc-500 h-9 md:h-9 min-h-[44px]"
          size="sm"
          onClick={() => onAddTask?.(status)}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="text-xs md:text-sm">Add task</span>
        </Button>
      </div>
    </div>
  );
}
