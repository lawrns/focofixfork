'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ProposalStatus } from '@/types/proposals'
import {
  FileEdit,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  AlertTriangle,
  Timer,
} from 'lucide-react'

interface ProposalStatusBadgeProps {
  status: ProposalStatus
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
  className?: string
}

const statusConfig: Record<ProposalStatus, {
  label: string
  icon: typeof FileEdit
  color: string
  pulseColor?: string
}> = {
  draft: {
    label: 'Draft',
    icon: FileEdit,
    color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
  },
  pending_review: {
    label: 'Pending Review',
    icon: Clock,
    color: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    pulseColor: 'bg-amber-400',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    color: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800',
  },
  partially_approved: {
    label: 'Partially Approved',
    icon: AlertTriangle,
    color: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  },
  archived: {
    label: 'Archived',
    icon: Timer,
    color: 'bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300 border-gray-200 dark:border-gray-800',
  },
}

const sizeConfig = {
  sm: {
    badge: 'px-2 py-0.5 text-xs',
    icon: 'h-3 w-3',
    gap: 'gap-1',
  },
  md: {
    badge: 'px-2.5 py-1 text-xs',
    icon: 'h-3.5 w-3.5',
    gap: 'gap-1.5',
  },
  lg: {
    badge: 'px-3 py-1.5 text-sm',
    icon: 'h-4 w-4',
    gap: 'gap-2',
  },
}

function ProposalStatusBadgeComponent({
  status,
  showIcon = true,
  size = 'md',
  animate = true,
  className,
}: ProposalStatusBadgeProps) {
  const config = statusConfig[status]
  const sizeStyles = sizeConfig[size]
  const Icon = config.icon

  const isPending = status === 'pending_review'

  return (
    <motion.div
      initial={animate ? { scale: 0.9, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <Badge
        variant="outline"
        className={cn(
          'inline-flex items-center font-medium border transition-all duration-200',
          sizeStyles.badge,
          sizeStyles.gap,
          config.color,
          className
        )}
      >
        {showIcon && (
          <span className="relative flex items-center justify-center">
            <Icon className={cn(sizeStyles.icon, 'flex-shrink-0')} />
            {/* Pulse animation for pending status */}
            {isPending && config.pulseColor && (
              <motion.span
                className={cn(
                  'absolute inset-0 rounded-full',
                  config.pulseColor
                )}
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
            )}
          </span>
        )}
        <span>{config.label}</span>
      </Badge>
    </motion.div>
  )
}

export const ProposalStatusBadge = memo(ProposalStatusBadgeComponent)
