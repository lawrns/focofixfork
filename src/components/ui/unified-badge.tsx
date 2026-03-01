'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface UnifiedBadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'urgent' | 'high' | 'medium' | 'low'
  pulse?: boolean
  dot?: boolean
}

const variantStyles: Record<string, string> = {
  default: 'bg-primary/10 text-primary border border-primary/20',
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  running: 'bg-primary/10 text-primary border border-primary/30',
  completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  failed: 'bg-destructive/10 text-destructive border border-destructive/20',
  cancelled: 'bg-muted text-muted-foreground border border-border',
  urgent: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
  high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20',
  medium: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
  low: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20',
}

export function UnifiedBadge({
  children,
  className,
  variant = 'default',
  pulse = false,
  dot = false,
}: UnifiedBadgeProps) {
  const showPulse = pulse && (variant === 'running' || variant === 'pending')

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-200',
      variantStyles[variant],
      className
    )}>
      {dot && (
        <motion.span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            variant === 'running' && 'bg-primary',
            variant === 'completed' && 'bg-emerald-500',
            variant === 'failed' && 'bg-destructive',
            variant === 'pending' && 'bg-amber-500',
            (!variant || variant === 'default') && 'bg-primary'
          )}
          animate={showPulse ? {
            scale: [1, 1.3, 1],
            opacity: [1, 0.7, 1],
          } : {}}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
      {children}
    </span>
  )
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const variantMap: Record<string, UnifiedBadgeProps['variant']> = {
    pending: 'pending',
    queued: 'pending',
    running: 'running',
    active: 'running',
    in_progress: 'running',
    processing: 'running',
    completed: 'completed',
    done: 'completed',
    success: 'completed',
    failed: 'failed',
    error: 'failed',
    cancelled: 'cancelled',
    canceled: 'cancelled',
  }

  const normalizedStatus = status?.toLowerCase() || ''
  const variant = variantMap[normalizedStatus] || 'default'
  const shouldPulse = variant === 'running' || variant === 'pending'

  return (
    <UnifiedBadge variant={variant} pulse={shouldPulse} dot={shouldPulse} className={className}>
      {status}
    </UnifiedBadge>
  )
}

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  const variantMap: Record<string, UnifiedBadgeProps['variant']> = {
    urgent: 'urgent',
    high: 'high',
    medium: 'medium',
    low: 'low',
  }

  const normalizedPriority = priority?.toLowerCase() || ''
  const variant = variantMap[normalizedPriority] || 'default'

  return (
    <UnifiedBadge variant={variant} className={className}>
      {priority}
    </UnifiedBadge>
  )
}
