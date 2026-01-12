'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, CheckCheck, Archive, Trash2, Settings, X, MoreHorizontal, Filter, Clock, AlertTriangle, UserPlus, MessageCircle, Calendar, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { NotificationsService } from '@/lib/services/notifications'
import { Notification, NotificationSummary, NotificationType } from '@/lib/models/notifications'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/use-auth'
import { useRouter } from 'next/navigation'

interface HeyMenuProps {
  className?: string
  onNotificationClick?: (notification: Notification) => void
}

export function HeyMenu({ className, onNotificationClick }: HeyMenuProps) {
  const { user } = useAuth()
  const router = useRouter()
  
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [summary, setSummary] = useState<NotificationSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'unread' | 'all'>('unread')
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set())

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const [notificationsResult, summaryResult] = await Promise.all([
        NotificationsService.getNotifications(user.id, {
          is_read: activeTab === 'unread' ? [false] : undefined,
          limit: 50
        }),
        NotificationsService.getNotificationSummary(user.id)
      ])

      setNotifications(notificationsResult.notifications)
      setSummary(summaryResult)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user, activeTab])

  // Load notifications on mount and when tab changes
  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    if (!user) return

    try {
      await NotificationsService.markAsRead(notificationId, user.id)
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      )
      loadNotifications() // Refresh summary
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  // Mark multiple notifications as read
  const handleMarkMultipleAsRead = async () => {
    if (!user || selectedNotifications.size === 0) return

    try {
      await NotificationsService.markMultipleAsRead(Array.from(selectedNotifications), user.id)
      setNotifications(prev =>
        prev.map(n =>
          selectedNotifications.has(n.id) ? { ...n, is_read: true } : n
        )
      )
      setSelectedNotifications(new Set())
      loadNotifications() // Refresh summary
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
    }
  }

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification.id)
    
    if (onNotificationClick) {
      onNotificationClick(notification)
    } else if (notification.data.action_url) {
      router.push(notification.data.action_url)
    }
  }

  // Toggle notification selection
  const toggleNotificationSelection = (notificationId: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev)
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId)
      } else {
        newSet.add(notificationId)
      }
      return newSet
    })
  }

  // Get notification type icon
  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'mention': return <UserPlus className="h-4 w-4" />
      case 'comment': return <MessageCircle className="h-4 w-4" />
      case 'assignment': return <Target className="h-4 w-4" />
      case 'due_date': return <Calendar className="h-4 w-4" />
      case 'status_change': return <Clock className="h-4 w-4" />
      case 'invitation': return <UserPlus className="h-4 w-4" />
      case 'system': return <Settings className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  // Get notification type color
  const getTypeColor = (type: NotificationType) => {
    switch (type) {
      case 'mention': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300'
      case 'comment': return 'text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-300'
      case 'assignment': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300'
      case 'due_date': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-300'
      case 'status_change': return 'text-gray-600 bg-gray-100 dark:bg-gray-700/40 dark:text-gray-300'
      case 'invitation': return 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300'
      case 'system': return 'text-gray-600 bg-gray-100 dark:bg-gray-700/40 dark:text-gray-300'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700/40 dark:text-gray-300'
    }
  }

  // Format time ago
  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return 'just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const unreadCount = summary?.total_unread || 0

  return (
    <div className={cn('relative', className)}>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="compact"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-12 w-96 max-h-[80vh] z-50"
          >
            <Card className="shadow-lg border border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Hey!
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {selectedNotifications.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkMultipleAsRead}
                        className="h-8 px-2 text-xs"
                      >
                        <CheckCheck className="h-3 w-3" />
                        Mark Read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'unread' | 'all')}>
                  <TabsList className="grid w-full grid-cols-2 mx-4 mb-4">
                    <TabsTrigger value="unread" className="text-sm">
                      Unread
                      {unreadCount > 0 && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                          {unreadCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="all" className="text-sm">
                      All
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="unread" className="mt-0">
                    <ScrollArea className="h-96">
                      <div className="space-y-1 p-4 pt-0">
                        {isLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">All caught up!</p>
                            <p className="text-xs">No unread notifications</p>
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <motion.div
                              key={notification.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={cn(
                                'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                                'hover:bg-muted/50 border border-transparent hover:border-border/50',
                                !notification.is_read && 'bg-blue-50/50 dark:bg-blue-950/20'
                              )}
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <div className="flex-shrink-0 mt-0.5">
                                <div className={cn('p-2 rounded-full', getTypeColor(notification.type))}>
                                  {getTypeIcon(notification.type)}
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-sm font-medium text-foreground leading-tight">
                                    {notification.title}
                                  </h4>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <span className="text-xs text-muted-foreground">
                                      {formatTimeAgo(notification.created_at)}
                                    </span>
                                    {!notification.is_read && (
                                      <div className="w-2 h-2 bg-primary rounded-full" />
                                    )}
                                  </div>
                                </div>

                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {notification.message}
                                </p>

                                {notification.data.actor_name && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="text-xs">
                                        {notification.data.actor_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground">
                                      {notification.data.actor_name}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex-shrink-0">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-6 w-6 p-0"
                                    >
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleMarkAsRead(notification.id)
                                      }}
                                    >
                                      <Check className="h-3 w-3" />
                                      Mark as read
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="all" className="mt-0">
                    <ScrollArea className="h-96">
                      <div className="space-y-1 p-4 pt-0">
                        {isLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">No notifications yet</p>
                            <p className="text-xs">You&apos;ll see updates here</p>
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <motion.div
                              key={notification.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={cn(
                                'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                                'hover:bg-muted/50 border border-transparent hover:border-border/50',
                                !notification.is_read && 'bg-blue-50/50 dark:bg-blue-950/20'
                              )}
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <div className="flex-shrink-0 mt-0.5">
                                <div className={cn('p-2 rounded-full', getTypeColor(notification.type))}>
                                  {getTypeIcon(notification.type)}
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-sm font-medium text-foreground leading-tight">
                                    {notification.title}
                                  </h4>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <span className="text-xs text-muted-foreground">
                                      {formatTimeAgo(notification.created_at)}
                                    </span>
                                    {!notification.is_read && (
                                      <div className="w-2 h-2 bg-primary rounded-full" />
                                    )}
                                  </div>
                                </div>

                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {notification.message}
                                </p>

                                {notification.data.actor_name && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="text-xs">
                                        {notification.data.actor_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground">
                                      {notification.data.actor_name}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex-shrink-0">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-6 w-6 p-0"
                                    >
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleMarkAsRead(notification.id)
                                      }}
                                    >
                                      <Check className="h-3 w-3" />
                                      Mark as read
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

export default HeyMenu

