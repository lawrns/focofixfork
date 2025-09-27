'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/data-display/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Card, CardContent } from '@/components/ui/card'
import {
  Users,
  User,
  Eye,
  Edit,
  Clock,
  Wifi,
  WifiOff,
  MoreHorizontal
} from 'lucide-react'
import { CollaborationUser, PresenceStatus } from '@/lib/models/realtime-collaboration'
import { cn } from '@/lib/utils'

interface PresenceIndicatorProps {
  users: CollaborationUser[]
  currentUserId: string
  showDetails?: boolean
  compact?: boolean
  className?: string
  onUserClick?: (user: CollaborationUser) => void
}

interface UserActivity {
  user: CollaborationUser
  lastActivity: Date
  isActive: boolean
  activityDescription: string
}

export default function PresenceIndicator({
  users,
  currentUserId,
  showDetails = false,
  compact = false,
  className,
  onUserClick
}: PresenceIndicatorProps) {
  const [userActivities, setUserActivities] = useState<UserActivity[]>([])
  const [showAllUsers, setShowAllUsers] = useState(false)

  useEffect(() => {
    const activities = users
      .filter(user => user.user_id !== currentUserId)
      .map(user => ({
        user,
        lastActivity: new Date(user.last_seen),
        isActive: user.status === 'online',
        activityDescription: getActivityDescription(user)
      }))
      .sort((a, b) => {
        // Sort by status: online first, then by last activity
        if (a.isActive && !b.isActive) return -1
        if (!a.isActive && b.isActive) return 1
        return b.lastActivity.getTime() - a.lastActivity.getTime()
      })

    setUserActivities(activities)
  }, [users, currentUserId])

  const getPresenceIcon = (status: PresenceStatus) => {
    switch (status) {
      case 'online':
        return <Wifi className="w-3 h-3 text-green-500" />
      case 'away':
        return <Clock className="w-3 h-3 text-yellow-500" />
      case 'offline':
        return <WifiOff className="w-3 h-3 text-gray-500" />
      default:
        return <WifiOff className="w-3 h-3 text-gray-500" />
    }
  }

  const getPresenceColor = (status: PresenceStatus) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getActivityDescription = (user: CollaborationUser): string => {
    if (user.status === 'online') {
      if (user.cursor_position) {
        return `Editing (line ${user.cursor_position.line + 1})`
      }
      return 'Online'
    } else if (user.status === 'away') {
      return 'Away'
    } else {
      const lastSeen = new Date(user.last_seen)
      const now = new Date()
      const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60))

      if (diffMinutes < 60) {
        return `Last seen ${diffMinutes}m ago`
      } else if (diffMinutes < 1440) { // 24 hours
        const hours = Math.floor(diffMinutes / 60)
        return `Last seen ${hours}h ago`
      } else {
        const days = Math.floor(diffMinutes / 1440)
        return `Last seen ${days}d ago`
      }
    }
  }

  const getStatusBadge = (status: PresenceStatus) => {
    const statusConfig = {
      online: { label: 'Online', variant: 'default' as const, className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
      away: { label: 'Away', variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
      offline: { label: 'Offline', variant: 'outline' as const, className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300' }
    }

    const config = statusConfig[status] || statusConfig.offline

    return (
      <Badge variant={config.variant} className={cn('text-xs', config.className)}>
        {config.label}
      </Badge>
    )
  }

  const onlineUsers = userActivities.filter(activity => activity.isActive)
  const awayUsers = userActivities.filter(activity => !activity.isActive && activity.user.status === 'away')
  const offlineUsers = userActivities.filter(activity => activity.user.status === 'offline')

  if (userActivities.length === 0) {
    return compact ? null : (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <Users className="w-4 h-4" />
        <span className="text-sm">No one else is here</span>
      </div>
    )
  }

  if (compact) {
    const displayUsers = showAllUsers ? userActivities : userActivities.slice(0, 3)

    return (
      <TooltipProvider>
        <div className={cn('flex items-center gap-2', className)}>
          <div className="flex -space-x-1">
            {displayUsers.map((activity) => (
              <Tooltip key={activity.user.user_id}>
                <TooltipTrigger asChild>
                  <div
                    className="relative cursor-pointer"
                    onClick={() => onUserClick?.(activity.user)}
                  >
                    <Avatar className="w-6 h-6 border-2 border-background hover:scale-110 transition-transform">
                      <AvatarImage src={activity.user.avatar} />
                      <AvatarFallback className="text-xs">
                        {activity.user.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-background',
                        getPresenceColor(activity.user.status)
                      )}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-center">
                    <p className="font-medium">{activity.user.user_name}</p>
                    <p className="text-xs text-muted-foreground">{activity.activityDescription}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}

            {userActivities.length > 3 && !showAllUsers && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => setShowAllUsers(true)}
                  >
                    <MoreHorizontal className="w-3 h-3" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <span>Show all {userActivities.length} users</span>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {onlineUsers.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {onlineUsers.length} online
            </span>
          )}
        </div>
      </TooltipProvider>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <h3 className="font-medium">Who's Here</h3>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{onlineUsers.length} online</span>
            <span>•</span>
            <span>{userActivities.length} total</span>
          </div>
        </div>

        <div className="space-y-3">
          {/* Online Users */}
          {onlineUsers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                Online ({onlineUsers.length})
              </h4>
              <div className="space-y-2">
                {onlineUsers.map((activity) => (
                  <div
                    key={activity.user.user_id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onUserClick?.(activity.user)}
                  >
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={activity.user.avatar} />
                        <AvatarFallback>
                          {activity.user.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{activity.user.user_name}</p>
                      <p className="text-xs text-muted-foreground">{activity.activityDescription}</p>
                    </div>

                    {activity.user.cursor_position && (
                      <div className="text-xs text-muted-foreground">
                        Line {activity.user.cursor_position.line + 1}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Away Users */}
          {awayUsers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Away ({awayUsers.length})
              </h4>
              <div className="space-y-1">
                {awayUsers.slice(0, showDetails ? awayUsers.length : 3).map((activity) => (
                  <div
                    key={activity.user.user_id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors opacity-75"
                    onClick={() => onUserClick?.(activity.user)}
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={activity.user.avatar} />
                      <AvatarFallback className="text-xs">
                        {activity.user.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{activity.user.user_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Offline Users */}
          {offlineUsers.length > 0 && showDetails && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-400 mb-2 flex items-center gap-1">
                <WifiOff className="w-3 h-3" />
                Offline ({offlineUsers.length})
              </h4>
              <div className="space-y-1">
                {offlineUsers.slice(0, 5).map((activity) => (
                  <div
                    key={activity.user.user_id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors opacity-50"
                    onClick={() => onUserClick?.(activity.user)}
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={activity.user.avatar} />
                      <AvatarFallback className="text-xs">
                        {activity.user.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{activity.user.user_name}</p>
                      <p className="text-xs text-muted-foreground">{activity.activityDescription}</p>
                    </div>
                  </div>
                ))}
                {offlineUsers.length > 5 && (
                  <div className="text-center text-xs text-muted-foreground py-2">
                    +{offlineUsers.length - 5} more offline
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {!showDetails && (awayUsers.length > 3 || offlineUsers.length > 0) && (
          <div className="mt-4 pt-3 border-t">
            <button
              onClick={() => setShowAllUsers(!showAllUsers)}
              className="text-sm text-primary hover:underline"
            >
              {showAllUsers ? 'Show less' : 'Show all users'}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


