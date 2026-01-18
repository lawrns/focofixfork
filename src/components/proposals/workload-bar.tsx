'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export interface WorkloadShift {
  memberId: string
  memberName: string
  currentHours: number
  proposedHours: number
  capacity: number
}

interface WorkloadBarProps {
  shift: WorkloadShift
  className?: string
  showLabels?: boolean
  animate?: boolean
}

export function WorkloadBar({
  shift,
  className,
  showLabels = true,
  animate = true,
}: WorkloadBarProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentPercent = Math.min(100, (shift.currentHours / shift.capacity) * 100)
  const proposedPercent = Math.min(100, (shift.proposedHours / shift.capacity) * 100)
  const delta = shift.proposedHours - shift.currentHours
  const isOverCapacity = shift.proposedHours > shift.capacity

  const getStatusColor = () => {
    if (isOverCapacity) return 'bg-error'
    if (proposedPercent > 80) return 'bg-warning'
    return 'bg-success'
  }

  const getDeltaColor = () => {
    if (delta > 0) return 'text-error'
    if (delta < 0) return 'text-success'
    return 'text-muted-foreground'
  }

  return (
    <TooltipProvider>
      <div className={cn('space-y-1.5', className)}>
        {showLabels && (
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground truncate max-w-[150px]">
              {shift.memberName}
            </span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">
                {shift.currentHours}h
              </span>
              <motion.span
                className={cn('font-medium', getDeltaColor())}
                initial={animate ? { scale: 0.8, opacity: 0 } : false}
                animate={animate && mounted ? { scale: 1, opacity: 1 } : false}
                transition={{ delay: 0.3, type: 'spring', stiffness: 400 }}
              >
                {delta > 0 ? '+' : ''}{delta}h
              </motion.span>
              <span className="text-muted-foreground">
                / {shift.capacity}h
              </span>
            </div>
          </div>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              {/* Current workload (faded) */}
              <div
                className="absolute inset-y-0 left-0 bg-gray-300 dark:bg-gray-600 rounded-full transition-all"
                style={{ width: `${currentPercent}%` }}
              />

              {/* Proposed workload (animated) */}
              <motion.div
                className={cn(
                  'absolute inset-y-0 left-0 rounded-full',
                  getStatusColor()
                )}
                initial={animate ? { width: `${currentPercent}%` } : false}
                animate={animate && mounted ? { width: `${proposedPercent}%` } : { width: `${proposedPercent}%` }}
                transition={{
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.2,
                }}
              />

              {/* Capacity marker */}
              {proposedPercent < 100 && (
                <div
                  className="absolute inset-y-0 w-0.5 bg-gray-400 dark:bg-gray-500"
                  style={{ left: '100%', transform: 'translateX(-2px)' }}
                />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p>Current: {shift.currentHours}h ({currentPercent.toFixed(0)}%)</p>
              <p>Proposed: {shift.proposedHours}h ({proposedPercent.toFixed(0)}%)</p>
              <p>Capacity: {shift.capacity}h</p>
              {isOverCapacity && (
                <p className="text-error font-medium">
                  Over capacity by {(shift.proposedHours - shift.capacity).toFixed(1)}h
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

export default WorkloadBar
