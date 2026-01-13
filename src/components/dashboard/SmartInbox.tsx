/**
 * SmartInbox Component
 *
 * AI-curated priority queue that surfaces only what needs attention RIGHT NOW
 * Replaces notification chaos with intelligent prioritization
 *
 * Features:
 * - AI-powered urgency scoring (GPT-4)
 * - Context-aware categorization (critical/today/this_week)
 * - One-tap actions (Review, Delegate, Snooze)
 * - Real-time updates via Supabase
 * - Minimal, Linear-inspired design
 *
 * Part of Foco's Phase 2: Simplified Mode - The #1 Essential Tool
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Inbox,
  Clock,
  AlertCircle,
  Users,
  CheckCircle2,
  ChevronRight,
  Zap,
  MessageSquare,
  CalendarClock,
  UserX,
  Eye,
  Forward,
  Moon,
  Loader2,
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { inboxService, type InboxItem, type SmartInboxResponse } from '@/lib/services/inbox.service'
import { supabase } from '@/lib/supabase-client'

interface SmartInboxProps {
  userId: string
  className?: string
}

export function SmartInbox({ userId, className }: SmartInboxProps) {
  const [inbox, setInbox] = useState<SmartInboxResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [processingAction, setProcessingAction] = useState<string | null>(null)

  const loadInbox = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await inboxService.getSmartInbox(userId)
      setInbox(data)
    } catch (err: any) {
      console.error('Failed to load Smart Inbox:', err)
      setError(err.message || 'Failed to load inbox')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadInbox()
  }, [loadInbox])

  useEffect(() => {
    const channel = supabase
      .channel('inbox-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        () => {
          loadInbox()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadInbox])

  const handleAction = async (
    item: InboxItem,
    actionType: 'review' | 'delegate' | 'snooze'
  ) => {
    setProcessingAction(item.id)
    try {
      // TODO: Implement action handlers
      switch (actionType) {
        case 'review':
          // Navigate to item detail
          window.location.href = getItemUrl(item)
          break
        case 'delegate':
          // Open delegation dialog
          console.log('Delegate:', item.id)
          break
        case 'snooze':
          // Snooze item for later
          console.log('Snooze:', item.id)
          break
      }
    } catch (err) {
      console.error('Action failed:', err)
    } finally {
      setProcessingAction(null)
    }
  }

  const getItemUrl = (item: InboxItem): string => {
    switch (item.type) {
      case 'task':
        return `/tasks/${item.id}`
      case 'project':
        return `/projects/${(item as any).slug || item.id}`
      case 'comment':
        return `/tasks/${item.id}#comments`
      case 'mention':
        return `/tasks/${item.id}#mentions`
      default:
        return '#'
    }
  }

  const getCategoryIcon = (category: InboxItem['category']) => {
    switch (category) {
      case 'critical':
        return <AlertCircle className="h-4 w-4" />
      case 'today':
        return <Zap className="h-4 w-4" />
      case 'this_week':
        return <CalendarClock className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: InboxItem['category']) => {
    switch (category) {
      case 'critical':
        return 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800'
      case 'today':
        return 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800'
      case 'this_week':
        return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
      default:
        return 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
    }
  }

  const getTypeIcon = (type: InboxItem['type']) => {
    switch (type) {
      case 'task':
        return <CheckCircle2 className="h-4 w-4" />
      case 'project':
        return <Inbox className="h-4 w-4" />
      case 'comment':
        return <MessageSquare className="h-4 w-4" />
      case 'mention':
        return <Users className="h-4 w-4" />
    }
  }

  const renderContextBadges = (item: InboxItem) => {
    const badges = []

    if (item.context.is_blocker) {
      badges.push(
        <Badge key="blocker" variant="destructive" className="text-xs gap-1">
          <AlertCircle className="h-3 w-3" />
          Blocked
        </Badge>
      )
    }

    if (item.context.team_blocked) {
      badges.push(
        <Badge key="team-blocked" variant="destructive" className="text-xs gap-1">
          <UserX className="h-3 w-3" />
          Team Waiting
        </Badge>
      )
    }

    if (item.context.due_soon) {
      badges.push(
        <Badge key="due-soon" variant="outline" className="text-xs gap-1 border-amber-400 text-amber-700">
          <Clock className="h-3 w-3" />
          Due Soon
        </Badge>
      )
    }

    if (item.context.mentions_user) {
      badges.push(
        <Badge key="mention" variant="secondary" className="text-xs gap-1">
          <Users className="h-3 w-3" />
          Mentioned You
        </Badge>
      )
    }

    return badges
  }

  if (isLoading) {
    return (
      <Card className={cn('border-0 shadow-xl', className)}>
        <CardContent className="p-12 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              AI is analyzing your priorities...
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('border-0 shadow-xl', className)}>
        <CardContent className="p-8">
          <div className="flex items-start gap-3 text-rose-600">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium mb-1">Failed to load inbox</h4>
              <p className="text-sm text-rose-600/80">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={loadInbox}
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!inbox) return null

  const visibleItems = showAll
    ? [...inbox.critical, ...inbox.today, ...inbox.this_week]
    : [...inbox.critical, ...inbox.today.slice(0, 2)]

  return (
    <Card className={cn('border-0 shadow-xl', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900 flex items-center justify-center">
              <Inbox className="h-5 w-5 text-rose-600 dark:text-rose-300" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {inbox.greeting}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {inbox.total_count === 0
                  ? 'All caught up!'
                  : `${inbox.total_count} items tracked • ${inbox.critical.length + inbox.today.length} need attention`}
              </p>
            </div>
          </div>

          {inbox.critical.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {inbox.critical.length} critical
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {inbox.total_count === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              All caught up!
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No urgent items need your attention right now.
            </p>
          </div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {visibleItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'p-4 rounded-lg border',
                      getCategoryColor(item.category),
                      processingAction === item.id && 'opacity-50 pointer-events-none'
                    )}
                  >
                    {/* Item Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          item.category === 'critical' && 'bg-rose-200 dark:bg-rose-800',
                          item.category === 'today' && 'bg-amber-200 dark:bg-amber-800',
                          item.category === 'this_week' && 'bg-blue-200 dark:bg-blue-800'
                        )}>
                          {getTypeIcon(item.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 dark:text-white mb-1 truncate">
                            {item.title}
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <Badge variant="outline" className="text-xs">
                          {item.context.age_hours}h old
                        </Badge>
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center',
                          item.category === 'critical' && 'bg-rose-600',
                          item.category === 'today' && 'bg-amber-600',
                          item.category === 'this_week' && 'bg-blue-600'
                        )}>
                          <span className="text-xs font-bold text-white">
                            {item.urgency_score}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Context Badges */}
                    {renderContextBadges(item).length > 0 && (
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {renderContextBadges(item)}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                      {item.actions.map((action) => {
                        const isReview = action.action === 'review' || action.action === 'view'
                        const isDelegate = action.action === 'delegate'
                        const isSnooze = action.action === 'snooze'

                        return (
                          <Button
                            key={action.action}
                            size="sm"
                            variant={isReview ? 'default' : 'outline'}
                            onClick={() =>
                              handleAction(
                                item,
                                isDelegate ? 'delegate' : isSnooze ? 'snooze' : 'review'
                              )
                            }
                            className="gap-2"
                            disabled={processingAction === item.id}
                          >
                            {isReview && <Eye className="h-3 w-3" />}
                            {isDelegate && <Forward className="h-3 w-3" />}
                            {isSnooze && <Moon className="h-3 w-3" />}
                            {action.label}
                          </Button>
                        )
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>

            {/* Show All Toggle */}
            {inbox.later_count > 0 && (
              <div className="text-center py-6 border-t border-slate-200 dark:border-slate-700 mt-6">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  {showAll
                    ? `Showing all ${inbox.total_count} items`
                    : `Everything else can wait (${inbox.later_count + inbox.this_week.length - 2} items)`}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className="gap-2"
                >
                  {showAll ? 'Show Less' : 'Show All'}
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 transition-transform',
                      showAll && 'rotate-90'
                    )}
                  />
                </Button>
              </div>
            )}

            {/* Generated Timestamp */}
            <div className="text-center mt-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Updated {new Date(inbox.generated_at).toLocaleTimeString()}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
