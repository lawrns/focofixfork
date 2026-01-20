'use client'

import { BaseEmptyState } from './base-empty-state'
import Image from 'next/image'
import { Plus, CheckCircle2, MessageSquare, FileText } from 'lucide-react'

interface ActivityFeedEnhancedProps {
  onCreateTask?: () => void
}

export function ActivityFeedEnhanced({ onCreateTask }: ActivityFeedEnhancedProps) {
  const illustration = (
    <div className="relative w-full h-full">
      <Image
        src="/images/empty-states/activity-timeline.png"
        alt="No activity"
        width={192}
        height={192}
        className="mx-auto dark:opacity-90"
        priority
      />
    </div>
  )

  const activityTypes = [
    { icon: CheckCircle2, label: 'Complete tasks', color: 'text-success' },
    { icon: MessageSquare, label: 'Add comments', color: 'text-info' },
    { icon: FileText, label: 'Update projects', color: 'text-primary-500' },
    { icon: Plus, label: 'Create items', color: 'text-warning' }
  ]

  return (
    <BaseEmptyState
      title="No activity yet"
      description="Activity will appear here as you and your team work on projects, complete tasks, and collaborate."
      illustration={illustration}
      primaryAction={onCreateTask ? {
        label: 'Create Task',
        onClick: onCreateTask,
        variant: 'default'
      } : undefined}
    >
      {/* Activity types */}
      <div className="mt-8 max-w-md mx-auto">
        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">What generates activity?</h4>
        <div className="grid grid-cols-2 gap-3">
          {activityTypes.map(({ icon: Icon, label, color }) => (
            <div
              key={label}
              className="flex items-center gap-2 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            >
              <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
        Activity is tracked in real-time across all projects and tasks
      </div>
    </BaseEmptyState>
  )
}
