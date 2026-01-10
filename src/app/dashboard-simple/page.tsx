/**
 * Simplified Dashboard Page
 *
 * The new default for Foco - 6 essential tools only
 * Following Basecamp's philosophy: "Build half a product exceptionally well"
 *
 * Phase 2: Simplified Mode Implementation
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Inbox,
  Mic,
  FolderKanban,
  Calendar as CalendarIcon,
  Users,
  Zap,
  Sparkles,
  TrendingUp
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Component imports
import { SmartInbox } from '@/components/dashboard/SmartInbox'
import { AIInsights } from '@/components/dashboard/AIInsights'
import { SimpleModeToggle } from '@/components/dashboard/SimpleModeToggle'
// import { QuickCapture } from '@/components/dashboard/QuickCapture'
import { supabase } from '@/lib/supabase-client'

/**
 * The 6 Essential Tools
 *
 * 1. Inbox - AI-curated priority queue
 * 2. Voice Planning - Natural conversation → structured plans
 * 3. Projects - Simple list of active work
 * 4. Calendar - Time-block visualization
 * 5. Team - Who's doing what
 * 6. Quick Capture - Voice memo → auto-processed task
 */

interface DashboardTool {
  id: string
  title: string
  description: string
  icon: React.ElementType
  href: string
  badge?: {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
  }
  color: string
  isNew?: boolean
}

const ESSENTIAL_TOOLS: DashboardTool[] = [
  {
    id: 'inbox',
    title: 'Inbox',
    description: 'What needs your attention right now',
    icon: Inbox,
    href: '/inbox',
    badge: { label: '3 critical', variant: 'destructive' },
    color: 'from-rose-500 to-pink-500',
  },
  {
    id: 'voice-planning',
    title: 'Voice Planning',
    description: 'Talk your ideas into structured plans',
    icon: Mic,
    href: '/voice',
    badge: { label: 'Beta', variant: 'secondary' as const },
    color: 'from-emerald-500 to-teal-500',
    isNew: true,
  },
  {
    id: 'projects',
    title: 'Projects',
    description: 'Active work across your team',
    icon: FolderKanban,
    href: '/projects',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'calendar',
    title: 'Calendar',
    description: 'Time blocks and deadlines',
    icon: CalendarIcon,
    href: '/calendar',
    color: 'from-violet-500 to-purple-500',
  },
  {
    id: 'team',
    title: 'Team',
    description: 'Who is working on what',
    icon: Users,
    href: '/team',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'quick-capture',
    title: 'Quick Capture',
    description: 'Voice memo → task (Cmd+Shift+V)',
    icon: Zap,
    href: '#',
    badge: { label: 'Shortcut', variant: 'outline' },
    color: 'from-indigo-500 to-blue-500',
    isNew: true,
  },
]

export default function SimpleDashboardPage() {
  const [greeting, setGreeting] = useState('Good morning')
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // Set contextual greeting
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')

    // Get current user
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
      setIsLoading(false)
    }

    loadUser()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {greeting}
            </h1>

            <SimpleModeToggle variant="button" />
          </div>

          <p className="text-slate-600 dark:text-slate-400">
            Everything you need, nothing you don&apos;t
          </p>
        </motion.div>

        {/* AI Insights - Contextual intelligence */}
        {userId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <AIInsights userId={userId} />
          </motion.div>
        )}

        {/* Smart Inbox - AI-powered priority queue */}
        {userId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <SmartInbox userId={userId} />
          </motion.div>
        )}

        {/* 6 Essential Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ESSENTIAL_TOOLS.slice(1).map((tool, index) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <Card
                className={cn(
                  'border-0 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer',
                  'hover:scale-105 group relative overflow-hidden'
                )}
                onClick={() => {
                  if (tool.href !== '#') window.location.href = tool.href
                }}
              >
                {/* Gradient background */}
                <div className={cn(
                  'absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity',
                  tool.color
                )} />

                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      'bg-gradient-to-br shadow-lg',
                      tool.color
                    )}>
                      <tool.icon className="h-6 w-6 text-white" />
                    </div>

                    {tool.isNew && (
                      <Badge variant="secondary" className="text-xs">
                        New
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {tool.title}
                  </h3>

                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    {tool.description}
                  </p>

                  {tool.badge && (
                    <Badge variant={tool.badge.variant} className="text-xs">
                      {tool.badge.label}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 text-center"
        >
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Simplified for focus. Need more features?
            </p>
            <SimpleModeToggle variant="button" />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
