'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TimelineDateMarkerProps {
  date: Date
  isToday?: boolean
  isOverdue?: boolean
  index?: number
  animate?: boolean
  className?: string
}

function formatDateLabel(date: Date): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const dateOnly = new Date(date)
  dateOnly.setHours(0, 0, 0, 0)

  if (dateOnly.getTime() === today.getTime()) {
    return 'Today'
  }

  if (dateOnly.getTime() === tomorrow.getTime()) {
    return 'Tomorrow'
  }

  // Check if within this week
  const daysDiff = Math.ceil((dateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff > 0 && daysDiff <= 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' })
  }

  // Full date for other dates
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  })
}

function formatDateSubtitle(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

function TimelineDateMarkerComponent({
  date,
  isToday = false,
  isOverdue = false,
  index = 0,
  animate = true,
  className,
}: TimelineDateMarkerProps) {
  const label = formatDateLabel(date)
  const subtitle = formatDateSubtitle(date)
  const showSubtitle = label !== subtitle && !['Today', 'Tomorrow'].includes(label)

  return (
    <motion.div
      className={cn(
        'sticky top-0 z-20 flex items-center gap-3 py-3 px-4 -mx-4',
        'bg-background/95 backdrop-blur-sm border-b border-zinc-100 dark:border-zinc-800',
        className
      )}
      initial={animate ? { opacity: 0, y: -8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {/* Date indicator dot */}
      <div className="relative flex items-center justify-center">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            isToday && 'bg-blue-500',
            isOverdue && !isToday && 'bg-red-500',
            !isToday && !isOverdue && 'bg-zinc-300 dark:bg-zinc-600'
          )}
        />
        {isToday && (
          <motion.div
            className="absolute inset-0 rounded-full bg-blue-500"
            initial={{ scale: 1, opacity: 0.4 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        )}
      </div>

      {/* Date label */}
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            'text-sm font-semibold',
            isToday && 'text-blue-600 dark:text-blue-400',
            isOverdue && !isToday && 'text-red-600 dark:text-red-400',
            !isToday && !isOverdue && 'text-zinc-700 dark:text-zinc-300'
          )}
        >
          {label}
        </span>
        {showSubtitle && (
          <span className="ml-2 text-xs text-muted-foreground">
            {subtitle}
          </span>
        )}
      </div>

      {/* Connecting line (decorative) */}
      <div className="hidden sm:block w-16 h-px bg-zinc-200 dark:bg-zinc-700" />
    </motion.div>
  )
}

export const TimelineDateMarker = memo(TimelineDateMarkerComponent)
