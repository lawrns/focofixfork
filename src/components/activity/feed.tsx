'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Plus,
  Edit,
  Trash2,
  MessageCircle,
  Tag,
  UserPlus,
  UserMinus,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/data-display/avatar'
import { useActivityFeed } from '@/lib/hooks/useRealtime'
import type { RealTimeEvent } from '@/lib/models/real-time-events'

interface ActivityFeedProps {
  projectId?: string
  milestoneId?: string
  organizationId?: string
  limit?: number
  showHeader?: boolean
  className?: string
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  projectId,
  milestoneId,
  organizationId,
  limit = 20,
  showHeader = true,
  className
}) => {
  const { events, isSubscribed } = useActivityFeed({
    projectId,
    milestoneId,
    organizationId
  })

  const displayEvents = events.slice(0, limit)

  const getEventIcon = (eventType: RealTimeEvent['event_type']) => {
    switch (eventType) {
      case 'milestone_created':
        return Plus
      case 'milestone_updated':
        return Edit
      case 'milestone_deleted':
        return Trash2
      case 'milestone_completed':
        return CheckCircle
      case 'comment_added':
        return MessageCircle
      case 'comment_deleted':
        return MessageCircle
      case 'label_added':
      case 'label_removed':
        return Tag
      case 'member_assigned':
        return UserPlus
      case 'member_unassigned':
        return UserMinus
      default:
        return Activity
    }
  }

  const getEventColor = (eventType: RealTimeEvent['event_type']) => {
    switch (eventType) {
      case 'milestone_created':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/40'
      case 'milestone_completed':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/40'
      case 'milestone_deleted':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/40'
      case 'comment_added':
        return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/40'
      case 'label_added':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/40'
      case 'member_assigned':
        return 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/40'
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/40'
    }
  }

  const getEventDescription = (event: RealTimeEvent) => {
    const eventType = event.event_type as string
    const data = event.data || {}

    switch (eventType) {
      case 'milestone_created':
        return `created milestone "${data.milestone_name || 'New Milestone'}"`
      case 'milestone_updated':
        return `updated milestone "${data.milestone_name || 'Milestone'}"`
      case 'milestone_deleted':
        return `deleted milestone "${data.milestone_name || 'Milestone'}"`
      case 'milestone_completed':
        return `completed milestone "${data.milestone_name || 'Milestone'}"`
      case 'comment_added':
        return 'added a comment'
      case 'comment_deleted':
        return 'deleted a comment'
      case 'label_added':
        return `added label "${data.label_name || 'Label'}"`
      case 'label_removed':
        return `removed label "${data.label_name || 'Label'}"`
      case 'member_assigned':
        return `assigned "${data.assigned_user_name || 'User'}" to milestone`
      case 'member_unassigned':
        return `unassigned "${data.assigned_user_name || 'User'}" from milestone`
      case 'project_updated':
        return 'updated project settings'
      case 'organization_updated':
        return 'updated organization settings'
      default:
        return eventType.replace(/_/g, ' ')
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const eventTime = new Date(timestamp)
    const diffInSeconds = Math.floor((now.getTime() - eventTime.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return 'just now'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes}m ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours}h ago`
    } else {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days}d ago`
    }
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Feed
            {isSubscribed && (
              <Badge variant="success" className="text-xs">
                Live
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
      )}

      <CardContent>
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {displayEvents.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-muted-foreground"
              >
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No activity yet</p>
                <p className="text-xs">Activity will appear here as changes are made</p>
              </motion.div>
            ) : (
              displayEvents.map((event, index) => {
                const IconComponent = getEventIcon(event.event_type)
                const description = getEventDescription(event)

                return (
                  <motion.div
                    key={`${event.id}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-2 rounded-full ${getEventColor(event.event_type)}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src="" />
                          <AvatarFallback className="text-xs">
                            {event.user_id.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground">
                          User {event.user_id.slice(-4)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(event.created_at)}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {description}
                      </p>

                      {event.data?.changes && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {Object.keys(event.data.changes).length > 0 && (
                            <span>Modified: {Object.keys(event.data.changes).join(', ')}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })
            )}
          </AnimatePresence>
        </div>

        {displayEvents.length >= limit && (
          <div className="text-center pt-4 border-t">
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Load more activity
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ActivityFeed
