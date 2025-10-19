'use client'

import { BaseEmptyState } from './base-empty-state'
import { CheckSquare, Plus, Target, BarChart3, CheckCircle2 } from 'lucide-react'

interface TasksEmptyProps {
  onCreateTask: () => void
  onCreateMilestone: () => void
  onViewAnalytics: () => void
  variant: 'new-project' | 'all-done' | 'no-tasks'
}

export function TasksEmpty({ 
  onCreateTask, 
  onCreateMilestone, 
  onViewAnalytics,
  variant 
}: TasksEmptyProps) {
  if (variant === 'all-done') {
    const illustration = (
      <div className="relative w-full h-full">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl" />
        
        {/* Celebration elements */}
        <div className="absolute top-8 left-8 w-4 h-4 bg-yellow-400 rounded-full animate-bounce" />
        <div className="absolute top-12 right-8 w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-16 left-12 w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-8 right-12 w-4 h-4 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '1.5s' }} />
        
        {/* Central checkmark */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
        </div>
      </div>
    )

    return (
      <BaseEmptyState
        title="🎉 All tasks completed!"
        description="Congratulations! You've finished all tasks in this project. Ready for the next milestone?"
        illustration={illustration}
        primaryAction={{
          label: 'Create Milestone',
          onClick: onCreateMilestone,
          variant: 'default'
        }}
        secondaryAction={{
          label: 'View Analytics',
          onClick: onViewAnalytics
        }}
      >
        {/* Next steps */}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button
            onClick={onCreateTask}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add more tasks
          </button>
          
          <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            Project milestone achieved
          </div>
        </div>
      </BaseEmptyState>
    )
  }

  const illustration = (
    <div className="relative w-full h-full">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl" />
      
      {/* Task cards */}
      <div className="absolute top-8 left-8 w-20 h-6 bg-white rounded border border-gray-200 shadow-sm transform rotate-6" />
      <div className="absolute top-16 right-8 w-20 h-6 bg-white rounded border border-gray-200 shadow-sm transform -rotate-3" />
      <div className="absolute bottom-12 left-12 w-20 h-6 bg-white rounded border border-gray-200 shadow-sm transform rotate-3" />
      
      {/* Central plus icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-20 h-20 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
          <CheckSquare className="w-10 h-10 text-white" />
        </div>
      </div>
    </div>
  )

  const isNewProject = variant === 'new-project'

  return (
    <BaseEmptyState
      title={isNewProject ? "Add your first task to get started" : "No tasks found"}
      description={isNewProject 
        ? "Break down your project into manageable tasks. You can add them one by one or let AI suggest a task breakdown."
        : "No tasks match your current filters. Try adjusting your search or create a new task."
      }
      illustration={illustration}
      primaryAction={{
        label: 'Add First Task',
        onClick: onCreateTask,
        variant: 'default'
      }}
      secondaryAction={{
        label: 'AI Task Suggestions',
        onClick: onCreateTask
      }}
    >
      {/* Quick actions */}
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <button
          onClick={onCreateMilestone}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Target className="w-4 h-4" />
          Create milestone
        </button>
        
        <button
          onClick={onViewAnalytics}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          View project analytics
        </button>
      </div>

      {/* Task tips */}
      {isNewProject && (
        <div className="mt-8 max-w-lg mx-auto">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Task creation tips</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-blue-600 font-semibold text-sm">1</span>
              </div>
              <span className="text-xs text-gray-600">Be specific</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-purple-600 font-semibold text-sm">2</span>
              </div>
              <span className="text-xs text-gray-600">Set deadlines</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-green-600 font-semibold text-sm">3</span>
              </div>
              <span className="text-xs text-gray-600">Assign owners</span>
            </div>
          </div>
        </div>
      )}
    </BaseEmptyState>
  )
}
