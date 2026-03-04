import type { WorkItemStatus, PriorityLevel } from '@/types/foco';

export const statusOptions: { value: WorkItemStatus; label: string; color: string }[] = [
  { value: 'backlog', label: 'Backlog', color: 'bg-zinc-400' },
  { value: 'next', label: 'Next', color: 'bg-blue-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-[color:var(--foco-teal)]' },
  { value: 'review', label: 'Review', color: 'bg-amber-500' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-500' },
  { value: 'done', label: 'Done', color: 'bg-green-500' },
];

export const priorityOptions: { value: PriorityLevel; label: string; color: string }[] = [
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500' },
  { value: 'low', label: 'Low', color: 'bg-zinc-400' },
  { value: 'none', label: 'None', color: 'bg-zinc-300' },
];
