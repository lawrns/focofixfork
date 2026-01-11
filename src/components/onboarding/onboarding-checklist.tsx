'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface ChecklistItem {
  id: string
  title: string
  description: string
  completed: boolean
  action?: () => void
  actionLabel?: string
}

const defaultChecklist: ChecklistItem[] = [
  {
    id: 'create-project',
    title: 'Create your first project',
    description: 'Start organizing your work',
    completed: false,
    actionLabel: 'Create project',
  },
  {
    id: 'invite-team',
    title: 'Invite team members',
    description: 'Collaborate with your team',
    completed: false,
    actionLabel: 'Invite people',
  },
  {
    id: 'create-task',
    title: 'Create a task',
    description: 'Break down your work into tasks',
    completed: false,
    actionLabel: 'Create task',
  },
  {
    id: 'set-deadline',
    title: 'Set a deadline',
    description: 'Keep your projects on track',
    completed: false,
  },
  {
    id: 'explore-ai',
    title: 'Try AI features',
    description: 'Use AI to plan your day',
    completed: false,
    actionLabel: 'Explore AI',
  },
]

export function OnboardingChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('onboarding-checklist')
    const dismissed = localStorage.getItem('onboarding-dismissed')
    
    if (dismissed === 'true') {
      setIsDismissed(true)
      return
    }

    if (saved) {
      setItems(JSON.parse(saved))
    } else {
      setItems(defaultChecklist)
    }
  }, [])

  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem('onboarding-checklist', JSON.stringify(items))
    }
  }, [items])

  const toggleItem = (id: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    )
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('onboarding-dismissed', 'true')
  }

  const completedCount = items.filter(i => i.completed).length
  const progress = (completedCount / items.length) * 100
  const allCompleted = completedCount === items.length

  if (isDismissed || allCompleted) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-zinc-900">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>Get started with Foco</span>
                  <span className="text-sm font-normal text-zinc-500">
                    {completedCount}/{items.length}
                  </span>
                </CardTitle>
                <Progress value={progress} className="h-2 mt-2" />
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                >
                  {isCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleDismiss}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent className="space-y-2 pt-0">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg transition-colors',
                        'hover:bg-white/50 dark:hover:bg-zinc-800/50',
                        item.completed && 'opacity-60'
                      )}
                    >
                      <button
                        onClick={() => toggleItem(item.id)}
                        className="shrink-0"
                      >
                        {item.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-zinc-400" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'text-sm font-medium',
                            item.completed && 'line-through'
                          )}
                        >
                          {item.title}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {item.description}
                        </p>
                      </div>
                      {item.actionLabel && !item.completed && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={item.action}
                        >
                          {item.actionLabel}
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}
