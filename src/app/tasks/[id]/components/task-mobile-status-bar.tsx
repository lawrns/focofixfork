'use client';

import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PriorityIndicator } from '@/features/tasks/components/priority-indicator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Inspector } from './inspector';
import type { WorkItem } from '@/types/foco';

interface StatusOption {
  value: string;
  label: string;
  color: string;
}

interface PriorityOption {
  value: string;
  label: string;
  color: string;
}

interface TaskMobileStatusBarProps {
  workItem: WorkItem;
  currentStatus: StatusOption | undefined;
  currentPriority: PriorityOption | undefined;
  dueDate: Date | undefined;
  sheetOpen: boolean;
  onSheetOpenChange: (open: boolean) => void;
  onUpdate: (updates: Partial<WorkItem>) => Promise<void>;
  teamMembers: Array<{ id: string; full_name: string }>;
}

export function TaskMobileStatusBar({
  workItem,
  currentStatus,
  currentPriority,
  dueDate,
  sheetOpen,
  onSheetOpenChange,
  onUpdate,
  teamMembers,
}: TaskMobileStatusBarProps) {
  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 p-4 cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-900 transition-colors z-20"
        onClick={() => onSheetOpenChange(true)}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn('h-2 w-2 rounded-full flex-shrink-0', currentStatus?.color)} />
            <span className="text-sm font-medium truncate">{currentStatus?.label}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <PriorityIndicator priority={workItem.priority as any} variant="dot" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate">{currentPriority?.label}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <CalendarIcon className="h-4 w-4 text-zinc-400 flex-shrink-0" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
              {dueDate ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}
            </span>
          </div>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={onSheetOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Task Details</SheetTitle></SheetHeader>
          <div className="mt-6">
            <Inspector item={workItem} onUpdate={onUpdate} teamMembers={teamMembers} inSheet={true} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
