'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Pencil,
  Trash2,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { WorkloadBar, type WorkloadShift } from './workload-bar'
import { ConflictBadge, type ResourceConflict } from './conflict-badge'
import { RiskIndicator } from './risk-indicator'

// Extended impact summary with all dashboard-needed data
export interface ImpactDashboardData {
  // From ProposalImpactSummary
  total_items: number
  items_by_type: {
    create: number
    update: number
    delete: number
  }
  items_by_status: {
    pending: number
    approved: number
    rejected: number
  }
  entities_affected: {
    tasks: number
    projects: number
    milestones: number
  }
  // Extended fields for dashboard
  hours: {
    added: number
    removed: number
    net: number
  }
  workloadShifts: WorkloadShift[]
  deadlineImpacts: DeadlineImpact[]
  resourceConflicts: ResourceConflict[]
  riskScore: number
}

export interface DeadlineImpact {
  id: string
  entityType: 'task' | 'milestone' | 'project'
  entityName: string
  originalDate: string
  proposedDate: string
  daysShift: number
  isDelay: boolean
}

interface ImpactDashboardProps {
  impact: ImpactDashboardData
  isCalculating?: boolean
  className?: string
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
}

// Stat card component
interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  prefix?: string
  suffix?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: number
  color?: 'default' | 'success' | 'warning' | 'error'
  isCalculating?: boolean
}

function StatCard({
  icon: Icon,
  label,
  value,
  prefix = '',
  suffix = '',
  trend,
  trendValue,
  color = 'default',
  isCalculating,
}: StatCardProps) {
  const colorStyles = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
  }

  const iconBgStyles = {
    default: 'bg-gray-100 dark:bg-gray-800',
    success: 'bg-success/10',
    warning: 'bg-warning/10',
    error: 'bg-error/10',
  }

  if (isCalculating) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-12" />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50"
      variants={itemVariants}
    >
      <div className={cn('p-2.5 rounded-lg', iconBgStyles[color])}>
        <Icon className={cn('w-5 h-5', colorStyles[color])} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className="flex items-baseline gap-2">
          <AnimatedCounter
            value={value}
            prefix={prefix}
            suffix={suffix}
            className={cn('text-xl font-bold', colorStyles[color])}
          />
          {trend && trendValue !== undefined && (
            <span
              className={cn(
                'flex items-center text-xs font-medium',
                trend === 'up' ? 'text-error' : trend === 'down' ? 'text-success' : 'text-muted-foreground'
              )}
            >
              {trend === 'up' ? (
                <TrendingUp className="w-3 h-3 mr-0.5" />
              ) : trend === 'down' ? (
                <TrendingDown className="w-3 h-3 mr-0.5" />
              ) : null}
              {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}{Math.abs(trendValue)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Section header component
function SectionHeader({
  icon: Icon,
  title,
  count,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  count?: number
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {count !== undefined && (
        <span className="ml-auto text-xs text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  )
}

// Loading skeleton for the dashboard
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>
        ))}
      </div>

      {/* Content sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ImpactDashboard({
  impact,
  isCalculating = false,
  className,
}: ImpactDashboardProps) {
  const [mounted, setMounted] = useState(false)
  const [dismissedConflicts, setDismissedConflicts] = useState<Set<string>>(new Set())

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleDismissConflict = (id: string) => {
    setDismissedConflicts((prev) => new Set([...prev, id]))
  }

  const visibleConflicts = impact.resourceConflicts.filter(
    (c) => !dismissedConflicts.has(c.id)
  )

  const criticalConflicts = visibleConflicts.filter((c) => c.severity === 'critical')
  const hasDeadlineDelays = impact.deadlineImpacts.some((d) => d.isDelay)

  if (isCalculating) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Calculating impact...</span>
        </div>
        <DashboardSkeleton />
      </Card>
    )
  }

  return (
    <Card className={cn('p-6 overflow-hidden', className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key="dashboard-content"
          variants={containerVariants}
          initial="hidden"
          animate={mounted ? 'visible' : 'hidden'}
          className="space-y-6"
        >
          {/* Summary Stats Row */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
            variants={itemVariants}
          >
            <StatCard
              icon={Plus}
              label="Tasks Added"
              value={impact.items_by_type.create}
              color="success"
            />
            <StatCard
              icon={Pencil}
              label="Tasks Modified"
              value={impact.items_by_type.update}
              color="warning"
            />
            <StatCard
              icon={Trash2}
              label="Tasks Removed"
              value={impact.items_by_type.delete}
              color="error"
            />
            <StatCard
              icon={Clock}
              label="Net Hours"
              value={impact.hours.net}
              prefix={impact.hours.net >= 0 ? '+' : ''}
              suffix="h"
              trend={impact.hours.net > 0 ? 'up' : impact.hours.net < 0 ? 'down' : 'neutral'}
              color={impact.hours.net > 0 ? 'error' : impact.hours.net < 0 ? 'success' : 'default'}
            />
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Workload Shifts */}
            <motion.div className="lg:col-span-2 space-y-4" variants={itemVariants}>
              <SectionHeader
                icon={Users}
                title="Workload Distribution"
                count={impact.workloadShifts.length}
              />
              {impact.workloadShifts.length > 0 ? (
                <div className="space-y-4">
                  {impact.workloadShifts.map((shift, index) => (
                    <motion.div
                      key={shift.memberId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                    >
                      <WorkloadBar shift={shift} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No workload changes
                </p>
              )}
            </motion.div>

            {/* Risk Score */}
            <motion.div
              className="flex flex-col items-center justify-center p-6 rounded-lg bg-gray-50 dark:bg-gray-900/50"
              variants={itemVariants}
            >
              <RiskIndicator
                score={impact.riskScore}
                size="lg"
                showScore
                showLevel
                label="Overall Impact"
              />
            </motion.div>
          </div>

          {/* Deadline Impacts */}
          {impact.deadlineImpacts.length > 0 && (
            <motion.div variants={itemVariants}>
              <SectionHeader
                icon={Calendar}
                title="Deadline Impacts"
                count={impact.deadlineImpacts.length}
              />
              <div className="space-y-2">
                {impact.deadlineImpacts.map((deadline, index) => (
                  <motion.div
                    key={deadline.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border',
                      deadline.isDelay
                        ? 'bg-warning/5 border-warning/20'
                        : 'bg-success/5 border-success/20'
                    )}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                  >
                    <div className="flex items-center gap-3">
                      {deadline.isDelay && (
                        <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {deadline.entityName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {deadline.entityType.charAt(0).toUpperCase() + deadline.entityType.slice(1)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          deadline.isDelay ? 'text-warning' : 'text-success'
                        )}
                      >
                        {deadline.isDelay ? '+' : '-'}{Math.abs(deadline.daysShift)} days
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(deadline.proposedDate).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Resource Conflicts */}
          {visibleConflicts.length > 0 && (
            <motion.div variants={itemVariants}>
              <SectionHeader
                icon={AlertTriangle}
                title="Resource Conflicts"
                count={visibleConflicts.length}
              />
              <div className="space-y-3">
                {visibleConflicts.map((conflict, index) => (
                  <motion.div
                    key={conflict.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <ConflictBadge
                      conflict={conflict}
                      onDismiss={handleDismissConflict}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Critical Alerts Banner */}
          <AnimatePresence>
            {(criticalConflicts.length > 0 || hasDeadlineDelays) && (
              <motion.div
                className="p-4 rounded-lg bg-error/10 border border-error/20"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="flex items-start gap-3">
                  <motion.div
                    initial={{ rotate: -10 }}
                    animate={{ rotate: [0, -5, 5, -5, 0] }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                  >
                    <AlertTriangle className="w-5 h-5 text-error flex-shrink-0" />
                  </motion.div>
                  <div>
                    <p className="text-sm font-medium text-error">
                      Attention Required
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {criticalConflicts.length > 0 && (
                        <span>
                          {criticalConflicts.length} critical conflict{criticalConflicts.length > 1 ? 's' : ''} detected.{' '}
                        </span>
                      )}
                      {hasDeadlineDelays && (
                        <span>
                          {impact.deadlineImpacts.filter((d) => d.isDelay).length} deadline{impact.deadlineImpacts.filter((d) => d.isDelay).length > 1 ? 's' : ''} will be delayed.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </Card>
  )
}

export default ImpactDashboard
