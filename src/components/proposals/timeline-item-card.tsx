'use client'

import { memo } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ProposalItemAction } from '@/types/proposals'
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  User,
  Target,
  CheckCircle2,
  Circle,
  AlertTriangle,
} from 'lucide-react'

export interface TimelineItem {
  id: string
  title: string
  description?: string | null
  type: 'task' | 'milestone'
  status?: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  dueDate?: Date | null
  startDate?: Date | null
  assignee?: {
    id: string
    name: string
    avatarUrl?: string
  } | null
  priority?: 'urgent' | 'high' | 'medium' | 'low' | 'none'
  progress?: number
  metadata?: Record<string, unknown>
}

interface TimelineItemCardProps {
  item: TimelineItem
  changeType?: ProposalItemAction | null
  showDiff?: boolean
  diffFields?: string[]
  index?: number
  animate?: boolean
  onClick?: () => void
  className?: string
}

const changeTypeConfig: Record<ProposalItemAction, {
  label: string
  icon: typeof Plus
  color: string
  bgColor: string
}> = {
  add: {
    label: 'New',
    icon: Plus,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
  },
  modify: {
    label: 'Modified',
    icon: Pencil,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
  },
  remove: {
    label: 'Removed',
    icon: Trash2,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800',
  },
}

const statusConfig: Record<NonNullable<TimelineItem['status']>, {
  icon: typeof Circle
  color: string
}> = {
  planned: {
    icon: Circle,
    color: 'text-zinc-400',
  },
  in_progress: {
    icon: Clock,
    color: 'text-blue-500',
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
  },
  cancelled: {
    icon: AlertTriangle,
    color: 'text-red-500',
  },
}

const priorityColors: Record<NonNullable<TimelineItem['priority']>, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-zinc-400',
  none: 'bg-zinc-300 dark:bg-zinc-600',
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return ''
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function TimelineItemCardComponent({
  item,
  changeType,
  showDiff = false,
  diffFields = [],
  index = 0,
  animate = true,
  onClick,
  className,
}: TimelineItemCardProps) {
  const isDeleted = changeType === 'remove'
  const isNew = changeType === 'add'
  const isModified = changeType === 'modify'
  const StatusIcon = item.status ? statusConfig[item.status]?.icon ?? Circle : Circle

  return (
    <motion.div
      initial={animate ? { opacity: 0, x: isNew ? -20 : 0 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn('relative', className)}
    >
      {/* Change type indicator line */}
      {changeType && (
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 w-1 rounded-l',
            isNew && 'bg-emerald-500',
            isModified && 'bg-amber-500',
            isDeleted && 'bg-red-500'
          )}
        />
      )}

      <Card
        variant={onClick ? 'interactive' : 'default'}
        padding="none"
        className={cn(
          'transition-all duration-200',
          changeType && 'ml-1',
          changeType && changeTypeConfig[changeType].bgColor,
          isDeleted && 'opacity-60',
          onClick && 'cursor-pointer'
        )}
        onClick={onClick}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            {/* Status icon / Priority indicator */}
            <div className="relative flex-shrink-0 mt-0.5">
              <StatusIcon
                className={cn(
                  'h-5 w-5',
                  item.status && statusConfig[item.status]?.color,
                  isDeleted && 'text-zinc-400'
                )}
              />
              {item.priority && item.priority !== 'none' && (
                <div
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-zinc-900',
                    priorityColors[item.priority]
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4
                  className={cn(
                    'text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate',
                    isDeleted && 'line-through text-zinc-500 dark:text-zinc-400'
                  )}
                >
                  {item.title}
                </h4>

                {/* Type badge */}
                {item.type === 'milestone' && (
                  <Badge
                    variant="outline"
                    className="text-xs px-1.5 py-0 h-5 bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800"
                  >
                    <Target className="h-3 w-3 mr-1" />
                    Milestone
                  </Badge>
                )}

                {/* Change type badge */}
                {changeType && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs px-1.5 py-0 h-5',
                      changeTypeConfig[changeType].color,
                      changeTypeConfig[changeType].bgColor
                    )}
                  >
                    {(() => {
                      const Icon = changeTypeConfig[changeType].icon
                      return <Icon className="h-3 w-3 mr-1" />
                    })()}
                    {changeTypeConfig[changeType].label}
                  </Badge>
                )}
              </div>

              {/* Description */}
              {item.description && (
                <p
                  className={cn(
                    'mt-1 text-xs text-muted-foreground line-clamp-2',
                    isDeleted && 'line-through'
                  )}
                >
                  {item.description}
                </p>
              )}

              {/* Metadata row */}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                {/* Due date */}
                {item.dueDate && (
                  <div
                    className={cn(
                      'flex items-center gap-1',
                      showDiff && diffFields.includes('dueDate') && 'text-amber-600 dark:text-amber-400 font-medium'
                    )}
                  >
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(item.dueDate)}</span>
                    {showDiff && diffFields.includes('dueDate') && (
                      <span className="ml-0.5">(changed)</span>
                    )}
                  </div>
                )}

                {/* Assignee */}
                {item.assignee && (
                  <div
                    className={cn(
                      'flex items-center gap-1',
                      showDiff && diffFields.includes('assignee') && 'text-amber-600 dark:text-amber-400 font-medium'
                    )}
                  >
                    {item.assignee.avatarUrl ? (
                      <Image
                        src={item.assignee.avatarUrl}
                        alt={item.assignee.name}
                        width={16}
                        height={16}
                        className="h-4 w-4 rounded-full"
                      />
                    ) : (
                      <User className="h-3 w-3" />
                    )}
                    <span className="truncate max-w-[100px]">{item.assignee.name}</span>
                  </div>
                )}

                {/* Progress for milestones */}
                {item.type === 'milestone' && typeof item.progress === 'number' && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-blue-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${item.progress}%` }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      />
                    </div>
                    <span>{item.progress}%</span>
                  </div>
                )}
              </div>

              {/* Diff indicators */}
              {showDiff && diffFields.length > 0 && !isNew && !isDeleted && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {diffFields.map((field) => (
                    <span
                      key={field}
                      className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                    >
                      {field.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

export const TimelineItemCard = memo(TimelineItemCardComponent)
