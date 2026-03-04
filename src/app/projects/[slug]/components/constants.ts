import type { WorkItemStatus, PriorityLevel } from '@/types/foco';

export const columns: { status: WorkItemStatus; label: string; color: string }[] = [
  { status: 'backlog', label: 'Backlog', color: 'bg-zinc-400' },
  { status: 'next', label: 'Next', color: 'bg-blue-500' },
  { status: 'in_progress', label: 'In Progress', color: 'bg-[color:var(--foco-teal)]' },
  { status: 'review', label: 'Review', color: 'bg-amber-500' },
  { status: 'blocked', label: 'Blocked', color: 'bg-red-500' },
  { status: 'done', label: 'Done', color: 'bg-green-500' },
];

export const priorityColors: Record<PriorityLevel, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-zinc-400',
  none: 'bg-zinc-300',
};

export const DELEGATION_STATUS_COLORS: Record<string, string> = {
  none: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  delegated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  running: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
