'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/data-display/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Archive,
  Trash2,
  Settings,
  AtSign,
  MessageCircle,
  UserPlus,
  Calendar,
  RefreshCw,
  Mail,
  CheckCircle,
  Settings as SettingsIcon,
  Users,
  X,
  MoreHorizontal,
  Filter
} from 'lucide-react'
import { NotificationsService } from '@/lib/services/notifications'
import { Notification, NotificationSummary, NotificationModel } from '@/lib/models/notifications'
import { cn } from '@/lib/utils'

interface NotificationCenterProps {
  currentUserId: string
  className?: string
  compact?: boolean
  onNotificationClick?: (notification: Notification) => void
}

export default function NotificationCenter({
  currentUserId,
  className,
  compact = false,
  onNotificationClick
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [summary, setSummary] = useState<NotificationSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('unread')
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set())

  // Load notifications and summary
  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true)

      const [notificationsResult, summaryResult] = await Promise.all([
        NotificationsService.getNotifications(currentUserId, {
          status: activeTab === 'unread' ? ['unread'] : undefined,
          limit: 50
        }),
        NotificationsService.getNotificationSummary(currentUserId)
      ])

      setNotifications(notificationsResult.notifications)
      setSummary(summaryResult)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentUserId, activeTab])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await NotificationsService.markAsRead(notificationId, currentUserId)
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, status: 'read', read_at: new Date().toISOString() }
            : n
        )
      )
      loadNotifications() // Refresh summary
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  // Mark multiple notifications as read
  const handleMarkMultipleAsRead = async () => {
    if (selectedNotifications.size === 0) return

    try {
      await NotificationsService.markMultipleAsRead(
        Array.from(selectedNotifications),
        currentUserId
      )
      setSelectedNotifications(new Set())
      loadNotifications()
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
    }
  }

  // Archive notification
  const handleArchive = async (notificationId: string) => {
    try {
      await NotificationsService.archiveNotification(notificationId, currentUserId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      loadNotifications() // Refresh summary
    } catch (error) {
      console.error('Failed to archive notification:', error)
    }
  }

  // Dismiss notification
  const handleDismiss = async (notificationId: string) => {
    try {
      await NotificationsService.dismissNotification(notificationId, currentUserId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      loadNotifications() // Refresh summary
    } catch (error) {
      console.error('Failed to dismiss notification:', error)
    }
  }

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (notification.status === 'unread') {
      await handleMarkAsRead(notification.id)
    }

    // Call external handler
    onNotificationClick?.(notification)

    // Navigate to action URL if provided
    if (notification.data.action_url) {
      window.location.href = notification.data.action_url
    }
  }

  // Toggle notification selection
  const toggleNotificationSelection = (notificationId: string) => {
    const newSelected = new Set(selectedNotifications)
    if (newSelected.has(notificationId)) {
      newSelected.delete(notificationId)
    } else {
      newSelected.add(notificationId)
    }
    setSelectedNotifications(newSelected)
  }

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    const iconClass = 'w-4 h-4'
    switch (type) {
      case 'mention': return <AtSign className={iconClass} />
      case 'comment': return <MessageCircle className={iconClass} />
      case 'reply': return <MessageCircle className={iconClass} />
      case 'assignment': return <UserPlus className={iconClass} />
      case 'due_date': return <Calendar className={iconClass} />
      case 'status_change': return <RefreshCw className={iconClass} />
      case 'invitation': return <Mail className={iconClass} />
      case 'approval': return <CheckCircle className={iconClass} />
      case 'system': return <SettingsIcon className={iconClass} />
      case 'collaboration': return <Users className={iconClass} />
      default: return <Bell className={iconClass} />
    }
  }

  // Format notification time
  const formatTime = (timestamp: string) => {
    return NotificationModel.formatAge(timestamp)
  }

  if (compact) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={cn('relative', className)}>
            <Bell className="w-4 h-4" />
            {summary?.total_unread && summary.total_unread > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
              >
                {summary.total_unread > 99 ? '99+' : summary.total_unread}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-80 p-0">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Button
                variant={activeTab === 'unread' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('unread')}
                className="h-7 px-2 text-xs"
              >
                Unread ({summary?.total_unread || 0})
              </Button>
              <Button
                variant={activeTab === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('all')}
                className="h-7 px-2 text-xs"
              >
                All
              </Button>
            </div>
          </div>

          <ScrollArea className="h-96">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {activeTab === 'unread' ? 'No unread notifications' : 'No notifications'}
                </p>
              </div>
            ) : (
              <div className="p-2">
                {notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors',
                      notification.status === 'unread' && 'bg-blue-50/50 dark:bg-blue-950/20'
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>

                      {notification.status === 'unread' && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {summary?.total_unread && summary.total_unread > 0 && (
              <Badge variant="destructive">
                {summary.total_unread}
              </Badge>
            )}
          </CardTitle>

          <div className="flex items-center gap-2">
            {selectedNotifications.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkMultipleAsRead}
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark Read ({selectedNotifications.size})
              </Button>
            )}

            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>

            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'unread')}>
          <TabsList>
            <TabsTrigger value="unread">
              Unread ({summary?.total_unread || 0})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({(summary?.total_read || 0) + (summary?.total_unread || 0)})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {activeTab === 'unread' ? 'No unread notifications' : 'No notifications'}
              </h3>
              <p className="text-sm">
                {activeTab === 'unread'
                  ? "You're all caught up!"
                  : 'Notifications will appear here when you have activity.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'p-4 border rounded-lg hover:shadow-sm transition-all cursor-pointer',
                    notification.status === 'unread' && 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
                    selectedNotifications.has(notification.id) && 'ring-2 ring-primary'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.has(notification.id)}
                      onChange={(e) => {
                        e.stopPropagation()
                        toggleNotificationSelection(notification.id)
                      }}
                      className="mt-1"
                    />

                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm line-clamp-1">
                          {notification.title}
                        </h4>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            NotificationModel.getPriorityColor(notification.priority)
                          )}
                        >
                          {notification.priority}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {notification.message}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(notification.created_at)}
                        </span>

                        <div className="flex items-center gap-1">
                          {notification.status === 'unread' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMarkAsRead(notification.id)
                              }}
                              className="h-6 px-2 text-xs"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Mark Read
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                                className="h-6 w-6 p-0"
                              >
                                <MoreHorizontal className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleArchive(notification.id)
                                }}
                                className="w-full justify-start"
                              >
                                <Archive className="w-3 h-3 mr-2" />
                                Archive
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDismiss(notification.id)
                                }}
                                className="w-full justify-start text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3 mr-2" />
                                Dismiss
                              </Button>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
