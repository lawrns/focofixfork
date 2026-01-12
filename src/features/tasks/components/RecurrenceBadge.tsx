'use client';

import { RecurrencePattern } from '@/lib/validation/schemas/task.schema';
import { getRecurrenceDescription } from '@/features/tasks/services/recurrence.service';

interface RecurrenceBadgeProps {
  pattern?: RecurrencePattern | null;
  className?: string;
}

export function RecurrenceBadge({ pattern, className = '' }: RecurrenceBadgeProps) {
  if (!pattern || !pattern.type) {
    return null;
  }

  const description = getRecurrenceDescription(pattern);
  const shortDescription = getShortDescription(pattern as RecurrencePattern);

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium border border-purple-200 ${className}`}
      title={description}
    >
      <span className="text-sm">🔁</span>
      <span>{shortDescription}</span>
    </div>
  );
}

function getShortDescription(pattern: RecurrencePattern): string {
  switch (pattern.type) {
    case 'daily':
      return pattern.interval === 1 ? 'Daily' : `Every ${pattern.interval}d`;
    case 'weekly':
      return pattern.interval === 1 ? 'Weekly' : `Every ${pattern.interval}w`;
    case 'monthly':
      return pattern.interval === 1 ? 'Monthly' : `Every ${pattern.interval}m`;
    default:
      return 'Recurring';
  }
}
