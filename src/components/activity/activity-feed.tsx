'use client'

import { useState, useEffect } from 'react'
import { User, Clock, MessageSquare, CheckCircle, Plus, Edit, Trash2, FileText } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ActivityItem {
  id: string
  type: 'task_created' | 'task_updated' | 'task_completed' | 'comment_added' | 'member_joined' | 'member_left' | 'due_date_changed' | 'status_changed' | 'file_attached'
  user: {
    id: string
    name: string
    email: string
    avatar_url?: string
  }
  description: string
  timestamp: string
  metadata?: Record<string, any>
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  onLoadMore?: () => void
  className?: string
  maxHeight?: string
  showAvatars?: boolean
  groupSimilar?: boolean
}

export function ActivityFeed({
  activities,
  onLoadMore,
  className,
  maxHeight = '400px',
  showAvatars = true,
  groupSimilar = true
}: ActivityFeedProps) {
  const [groupedActivities, setGroupedActivities] = useState<ActivityItem[][]>([])

  // Group similar activities
  useEffect(() => {
    if (!groupSimilar) {
      setGroupedActivities(activities.map(activity => [activity]))
      return
    }

    const groups: ActivityItem[][] = []
    let currentGroup: ActivityItem[] = []

    activities.forEach((activity, index) => {
      if (index === 0) {
        currentGroup = [activity]
        return
      }

      const previousActivity = activities[index - 1]
      const timeDiff = new Date(activity.timestamp).getTime() - new Date(previousActivity.timestamp).getTime()
      const isSameUser = activity.user.id === previousActivity.user.id
      const isSameType = activity.type === previousActivity.type
      const isWithinTimeWindow = timeDiff < 5 * 60 * 1000 // 5 minutes

      if (isSameUser && isSameType && isWithinTimeWindow) {
        currentGroup.push(activity)
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup)
        }
        currentGroup = [activity]
      }
    })

    if (currentGroup.length > 0) {
      groups.push(currentGroup)
    }

    setGroupedActivities(groups)
  }, [activities, groupSimilar])

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'task_created':
        return <Plus className="w-4 h-4" />
      case 'task_updated':
        return <Edit className="w-4 h-4" />
      case 'task_completed':
        return <CheckCircle className="w-4 h-4" />
      case 'comment_added':
        return <MessageSquare className="w-4 h-4" />
      case 'member_joined':
      case 'member_left':
        return <User className="w-4 h-4" />
      case 'due_date_changed':
        return <Clock className="w-4 h-4" />
      case 'status_changed':
        return <Edit className="w-4 h-4" />
      case 'file_attached':
        return <FileText className="w-4 h-4" />
      default:
        return <MessageSquare className="w-4 h-4" />
    }
  }

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'task_created':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      case 'task_updated':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
      case 'task_completed':
        return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20'
      case 'comment_added':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20'
      case 'member_joined':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      case 'member_left':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      case 'due_date_changed':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20'
      case 'status_changed':
        return 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/20'
      case 'file_attached':
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) {
      return 'Just now'
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const renderActivityGroup = (group: ActivityItem[], index: number) => {
    const firstActivity = group[0]
    const isMultiple = group.length > 1

    return (
      <div
        key={`group-${index}`}
        className="flex gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors animate-fade-in"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {/* Avatar */}
        {showAvatars && (
          <div className="flex-shrink-0">
            <Avatar className="w-8 h-8">
              <AvatarImage src={firstActivity.user.avatar_url} />
              <AvatarFallback className="text-xs">
                {firstActivity.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            {/* Icon */}
            <div className={cn(
              'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
              getActivityColor(firstActivity.type)
            )}>
              {getActivityIcon(firstActivity.type)}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 dark:text-gray-100">
                <span className="font-medium">{firstActivity.user.name}</span>
                {' '}
                {firstActivity.description}
                {isMultiple && (
                  <span className="text-gray-500 dark:text-gray-400">
                    {' '}and {group.length - 1} more similar action{group.length - 1 !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatTimestamp(firstActivity.timestamp)}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400">No activity yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Activity will appear here as team members work on tasks
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div 
        className="overflow-y-auto space-y-1"
        style={{ maxHeight }}
      >
        {groupedActivities.map((group, index) => renderActivityGroup(group, index))}
      </div>

      {onLoadMore && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            className="w-full"
          >
            Load More Activity
          </Button>
        </div>
      )}
    </div>
  )
}