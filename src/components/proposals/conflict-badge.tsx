'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Users, Calendar, Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type ConflictType = 'resource' | 'scheduling' | 'dependency' | 'capacity'

export interface ResourceConflict {
  id: string
  type: ConflictType
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  affectedResources?: string[]
}

interface ConflictBadgeProps {
  conflict: ResourceConflict
  className?: string
  onDismiss?: (id: string) => void
  animate?: boolean
  compact?: boolean
}

const conflictIcons: Record<ConflictType, React.ComponentType<{ className?: string }>> = {
  resource: Users,
  scheduling: Calendar,
  dependency: Clock,
  capacity: AlertTriangle,
}

const severityConfig = {
  low: {
    bg: 'bg-blue-50 dark:bg-blue-950/50',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    icon: 'text-blue-500',
  },
  medium: {
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    text: 'text-warning',
    icon: 'text-warning',
  },
  high: {
    bg: 'bg-orange-50 dark:bg-orange-950/50',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-700 dark:text-orange-300',
    icon: 'text-orange-500',
  },
  critical: {
    bg: 'bg-error/10',
    border: 'border-error/30',
    text: 'text-error',
    icon: 'text-error',
  },
}

export function ConflictBadge({
  conflict,
  className,
  onDismiss,
  animate = true,
  compact = false,
}: ConflictBadgeProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setIsVisible(true), 100)
      return () => clearTimeout(timer)
    }
    setIsVisible(true)
  }, [animate])

  const Icon = conflictIcons[conflict.type]
  const config = severityConfig[conflict.severity]

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDismiss) {
      setIsVisible(false)
      setTimeout(() => onDismiss(conflict.id), 200)
    }
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              className={cn(
                'inline-flex items-center justify-center w-6 h-6 rounded-full border',
                config.bg,
                config.border,
                className
              )}
              initial={animate ? { scale: 0, opacity: 0 } : false}
              animate={isVisible ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 25,
              }}
            >
              <Icon className={cn('w-3.5 h-3.5', config.icon)} />
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">{conflict.title}</p>
              <p className="text-xs text-muted-foreground">{conflict.description}</p>
              {conflict.affectedResources && conflict.affectedResources.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Affected: {conflict.affectedResources.join(', ')}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cn(
            'relative flex items-start gap-3 p-3 rounded-lg border',
            config.bg,
            config.border,
            className
          )}
          initial={animate ? { scale: 0.8, opacity: 0, y: 10 } : false}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: -10 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <motion.div
            initial={animate ? { rotate: -15 } : false}
            animate={{ rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
          >
            <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', config.icon)} />
          </motion.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={cn('text-sm font-medium', config.text)}>
                {conflict.title}
              </p>
              <span
                className={cn(
                  'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide',
                  config.bg,
                  config.text
                )}
              >
                {conflict.severity}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {conflict.description}
            </p>
            {conflict.affectedResources && conflict.affectedResources.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {conflict.affectedResources.map((resource, index) => (
                  <motion.span
                    key={resource}
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-xs text-muted-foreground"
                    initial={animate ? { opacity: 0, x: -5 } : false}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                  >
                    {resource}
                  </motion.span>
                ))}
              </div>
            )}
          </div>

          {onDismiss && (
            <AnimatePresence>
              {isHovered && (
                <motion.button
                  className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  onClick={handleDismiss}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  aria-label="Dismiss conflict"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </motion.button>
              )}
            </AnimatePresence>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ConflictBadge
