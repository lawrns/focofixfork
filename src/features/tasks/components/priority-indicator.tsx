'use client'

import { Flag, AlertCircle } from 'lucide-react'
import { useMemo } from 'react'

type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none'
type Variant = 'dot' | 'badge' | 'flag'

interface PriorityIndicatorProps {
  priority: Priority
  variant?: Variant
  tooltip?: string
  className?: string
}

const priorityConfig = {
  urgent: {
    dot: 'bg-red-500 dark:bg-red-400',
    badge: 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100 border border-red-300 dark:border-red-600',
    flag: 'text-red-500',
    label: 'Urgent',
  },
  high: {
    dot: 'bg-amber-500 dark:bg-amber-400',
    badge: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100 border border-amber-300 dark:border-amber-600',
    flag: 'text-amber-500',
    label: 'High',
  },
  medium: {
    dot: 'bg-yellow-500 dark:bg-yellow-400',
    badge: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100 border border-yellow-300 dark:border-yellow-600',
    flag: 'text-yellow-500',
    label: 'Medium',
  },
  low: {
    dot: 'bg-blue-500 dark:bg-blue-400',
    badge: 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100 border border-blue-300 dark:border-blue-600',
    flag: 'text-blue-500',
    label: 'Low',
  },
  none: {
    dot: 'bg-gray-500 dark:bg-gray-400',
    badge: 'bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600',
    flag: 'text-gray-500',
    label: 'No Priority',
  },
}

export function PriorityIndicator({
  priority,
  variant = 'badge',
  tooltip,
  className = '',
}: PriorityIndicatorProps) {
  const config = priorityConfig[priority]
  const displayLabel = useMemo(() => config.label, [config])
  const tooltipText = useMemo(() => tooltip || displayLabel, [tooltip, displayLabel])

  switch (variant) {
    case 'dot':
      return (
        <span
          role="status"
          className={`h-2 w-2 rounded-full inline-block ${config.dot} ${className}`}
          aria-label={`${displayLabel} priority`}
          title={tooltipText}
        />
      )

    case 'flag':
      return (
        <span
          role="status"
          className={`inline-flex items-center justify-center ${config.flag} ${className}`}
          aria-label={`${displayLabel} priority indicator`}
          title={tooltipText}
        >
          <Flag className="h-4 w-4" aria-hidden="true" />
        </span>
      )

    case 'badge':
    default:
      return (
        <span
          role="status"
          className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-semibold rounded-full ${config.badge} ${className}`}
          aria-label={`${displayLabel} priority`}
          title={tooltipText}
        >
          {displayLabel}
        </span>
      )
  }
}

export { Priority, Variant }
