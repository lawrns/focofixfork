'use client'

import { BaseEmptyState } from './base-empty-state'
import { ListChecks, Lightbulb } from 'lucide-react'

interface SubtasksEmptyProps {
  onAddSubtask: () => void
}

export function SubtasksEmpty({ onAddSubtask }: SubtasksEmptyProps) {
  return (
    <BaseEmptyState
      icon={<ListChecks className="w-16 h-16" />}
      title="No subtasks yet"
      description="Break down this task into smaller, manageable steps to track progress more effectively."
      primaryAction={{
        label: 'Add Subtask',
        onClick: onAddSubtask,
        variant: 'default'
      }}
      className="py-12"
    >
      {/* Subtask tips */}
      <div className="mt-6 max-w-md mx-auto">
        <div className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400 text-left">
          <Lightbulb className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Pro tip:</span> Break complex tasks into 3-5 subtasks for better tracking and momentum.
          </div>
        </div>
      </div>
    </BaseEmptyState>
  )
}
