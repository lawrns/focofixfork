'use client'

import { BaseEmptyState } from './base-empty-state'
import Image from 'next/image'
import { BarChart3, TrendingUp, Activity } from 'lucide-react'

interface AnalyticsEmptyProps {
  context?: string
  dateRange?: string
  onCreateActivity?: () => void
}

export function AnalyticsEmpty({ context = 'data', dateRange, onCreateActivity }: AnalyticsEmptyProps) {
  const illustration = (
    <div className="relative w-full h-full">
      <Image
        src="/images/empty-states/analytics-chart.png"
        alt="No analytics data"
        width={192}
        height={192}
        className="mx-auto dark:opacity-90"
        priority
      />
    </div>
  )

  const getDescription = () => {
    if (dateRange) {
      return `No ${context} available for ${dateRange}. Activity and analytics will appear here as you work.`
    }
    return `No ${context} available yet. Start creating tasks and tracking progress to see insights.`
  }

  return (
    <BaseEmptyState
      title={`No ${context} yet`}
      description={getDescription()}
      illustration={illustration}
      primaryAction={onCreateActivity ? {
        label: 'Create Task',
        onClick: onCreateActivity,
        variant: 'default'
      } : undefined}
    >
      {/* How data is generated */}
      <div className="mt-8 max-w-md mx-auto">
        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">How analytics are generated</h4>
        <div className="space-y-3 text-left">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-950 flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Track activity</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">Create and complete tasks, projects, and milestones</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-950 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Collect data</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">System tracks completion rates, time spent, and trends</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-950 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">View insights</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">See progress, productivity patterns, and team metrics</div>
            </div>
          </div>
        </div>
      </div>
    </BaseEmptyState>
  )
}
