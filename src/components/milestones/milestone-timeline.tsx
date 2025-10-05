'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Loader2, Calendar, Clock, CheckCircle, PlayCircle, AlertTriangle, Target } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { motion } from 'framer-motion'

interface Milestone {
  id: string
  title: string
  description: string | null
  status: 'planned' | 'active' | 'completed' | 'cancelled'
  due_date: string | null
  completion_date: string | null
  progress_percentage: number
  created_by: string
  created_at: string
  updated_at: string
  project_id: string
  task_count?: number
  completed_tasks?: number
}

interface MilestoneTimelineProps {
  projectId: string
  onMilestoneClick?: (milestoneId: string) => void
  onCreateMilestone?: () => void
}

const statusConfig = {
  planned: {
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    icon: Clock,
  },
  active: {
    color: 'bg-blue-500 text-white dark:bg-blue-900 dark:text-blue-300',
    icon: PlayCircle,
  },
  completed: {
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    icon: CheckCircle,
  },
  cancelled: {
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: AlertTriangle,
  },
}

export function MilestoneTimeline({
  projectId,
  onMilestoneClick,
  onCreateMilestone
}: MilestoneTimelineProps) {
  const { user } = useAuth()
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedMilestones, setUpdatedMilestones] = useState<Set<string>>(new Set())

  const fetchMilestones = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/milestones?project_id=${projectId}&with_task_counts=true`)

      if (!response.ok) {
        throw new Error('Failed to fetch milestones')
      }

      const data = await response.json()
      setMilestones(data.data || [])
    } catch (err) {
      console.error('Error fetching milestones:', err)
      setError('Failed to load milestones. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user, projectId])

  useEffect(() => {
    fetchMilestones()
  }, [fetchMilestones])

  // Real-time updates for milestones
  useRealtime(
    { projectId },
    (payload) => {
      if (payload.table === 'milestones') {
        if (payload.eventType === 'INSERT') {
          // Add new milestone to the list
          setMilestones(prev => [payload.new, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          // Update existing milestone in the list
          setMilestones(prev =>
            prev.map(milestone =>
              milestone.id === payload.new.id ? { ...milestone, ...payload.new } : milestone
            )
          )
          // Mark as updated for visual feedback
          setUpdatedMilestones(prev => new Set(prev).add(payload.new.id))
          // Reset the updated indicator after 3 seconds
          setTimeout(() => {
            setUpdatedMilestones(prev => {
              const newSet = new Set(prev)
              newSet.delete(payload.new.id)
              return newSet
            })
          }, 3000)
        } else if (payload.eventType === 'DELETE') {
          // Remove deleted milestone from the list
          setMilestones(prev => prev.filter(milestone => milestone.id !== payload.old?.id))
        }
      }
    }
  )

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date set'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getTimelineStatus = (milestone: Milestone) => {
    const daysUntilDue = getDaysUntilDue(milestone.due_date)

    if (milestone.status === 'completed') return 'completed'
    if (milestone.status === 'cancelled') return 'cancelled'
    if (daysUntilDue !== null && daysUntilDue < 0) return 'overdue'
    if (daysUntilDue !== null && daysUntilDue <= 7) return 'due-soon'
    return 'on-track'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading milestones...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <Button onClick={fetchMilestones} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  // Sort milestones by due date
  const sortedMilestones = [...milestones].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Milestone Timeline</h3>
          <p className="text-sm text-muted-foreground">
            Track project progress and deadlines
          </p>
        </div>
        {onCreateMilestone && (
          <Button onClick={onCreateMilestone} size="sm">
            <Target className="mr-2 h-4 w-4" />
            Add Milestone
          </Button>
        )}
      </div>

      {sortedMilestones.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No milestones yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first milestone to start tracking project progress
            </p>
            {onCreateMilestone && (
              <Button onClick={onCreateMilestone}>
                <Target className="mr-2 h-4 w-4" />
                Create First Milestone
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Timeline visualization */}
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border"></div>

            {sortedMilestones.map((milestone, index) => {
              // Defensive check for valid status with fallback to 'planned'
              const validStatus = statusConfig[milestone.status as keyof typeof statusConfig] ? milestone.status : 'planned'
              const StatusIcon = statusConfig[validStatus as keyof typeof statusConfig].icon
              const timelineStatus = getTimelineStatus(milestone)
              const daysUntilDue = getDaysUntilDue(milestone.due_date)

              return (
                <div key={milestone.id} className="relative flex items-start space-x-4 pb-8">
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-background ${
                    validStatus === 'completed'
                      ? 'border-green-500'
                      : validStatus === 'active'
                      ? 'border-blue-500'
                      : 'border-muted-foreground'
                  }`}>
                    <StatusIcon className={`h-5 w-5 ${
                      validStatus === 'completed'
                        ? 'text-green-500'
                        : validStatus === 'active'
                        ? 'text-blue-500'
                        : 'text-muted-foreground'
                    }`} />
                  </div>

                  {/* Milestone card */}
                  <motion.div
                    initial={false}
                    animate={updatedMilestones.has(milestone.id) ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1"
                  >
                    <Card
                      className={`cursor-pointer transition-shadow hover:shadow-md ${
                        timelineStatus === 'overdue' ? 'border-red-200 dark:border-red-800' : ''
                      } ${updatedMilestones.has(milestone.id) ? 'ring-2 ring-primary/20' : ''}`}
                      onClick={() => onMilestoneClick?.(milestone.id)}
                    >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{milestone.title}</CardTitle>
                          {milestone.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {milestone.description}
                            </p>
                          )}
                        </div>
                        <Badge className={statusConfig[validStatus as keyof typeof statusConfig].color}>
                          {validStatus.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>
                            {milestone.completed_tasks || 0} / {milestone.task_count || 0} tasks
                          </span>
                        </div>
                        <Progress value={milestone.progress_percentage} className="h-2" />
                      </div>

                      {/* Dates and status */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          {milestone.due_date && (
                            <div className={`flex items-center space-x-1 ${
                              timelineStatus === 'overdue'
                                ? 'text-red-600 dark:text-red-400'
                                : timelineStatus === 'due-soon'
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-muted-foreground'
                            }`}>
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(milestone.due_date)}</span>
                              {daysUntilDue !== null && daysUntilDue >= 0 && (
                                <span className="text-xs">
                                  ({daysUntilDue === 0 ? 'Due today' : `${daysUntilDue} days`})
                                </span>
                              )}
                            </div>
                          )}

                          {milestone.completion_date && (
                            <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                              <CheckCircle className="h-3 w-3" />
                              <span>Completed {formatDate(milestone.completion_date)}</span>
                            </div>
                          )}
                        </div>

                        {timelineStatus === 'overdue' && milestone.status !== 'completed' && (
                          <Badge variant="destructive" className="text-xs">
                            OVERDUE
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>
                </div>
              )
            })}
          </div>

          {/* Timeline summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {milestones.filter(m => m.status === 'completed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {milestones.filter(m => m.status === 'active').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Active</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {milestones.filter(m => m.status === 'planned').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Planned</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {milestones.filter(m => getTimelineStatus(m) === 'overdue').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Overdue</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}


