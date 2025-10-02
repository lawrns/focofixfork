'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Play,
  Pause,
  Square,
  Plus,
  Edit,
  Trash2,
  Settings,
  Clock,
  DollarSign,
  Calendar,
  Tag,
  CheckCircle,
  XCircle,
  Timer,
  BarChart,
  Save
} from 'lucide-react'
import { TimeTrackingService } from '@/lib/services/time-tracking'
import { TimeEntry, TimerSession, TimeEntryModel } from '@/lib/models/time-tracking'
import { cn } from '@/lib/utils'

interface TimeTrackerProps {
  userId: string
  projects?: Array<{ id: string; name: string }>
  milestones?: Array<{ id: string; name: string }>
  tasks?: Array<{ id: string; name: string }>
  className?: string
}

export default function TimeTracker({
  userId,
  projects = [],
  milestones = [],
  tasks = [],
  className
}: TimeTrackerProps) {
  const [activeSession, setActiveSession] = useState<TimerSession | null>(null)
  const [currentDuration, setCurrentDuration] = useState(0)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewEntry, setShowNewEntry] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)

  // Timer form state
  const [timerDescription, setTimerDescription] = useState('')
  const [timerProjectId, setTimerProjectId] = useState('')
  const [timerMilestoneId, setTimerMilestoneId] = useState('')
  const [timerTaskId, setTimerTaskId] = useState('')
  const [timerTags, setTimerTags] = useState<string[]>([])

  // Manual entry form state
  const [entryDescription, setEntryDescription] = useState('')
  const [entryProjectId, setEntryProjectId] = useState('')
  const [entryMilestoneId, setEntryMilestoneId] = useState('')
  const [entryTaskId, setEntryTaskId] = useState('')
  const [entryStartTime, setEntryStartTime] = useState('')
  const [entryEndTime, setEntryEndTime] = useState('')
  const [entryDuration, setEntryDuration] = useState('')
  const [entryBillable, setEntryBillable] = useState(false)
  const [entryBillableRate, setEntryBillableRate] = useState('')
  const [entryTags, setEntryTags] = useState<string[]>([])

  // Load data on mount
  useEffect(() => {
    loadData()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [])

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)

      // Load active timer session
      const session = await TimeTrackingService.getActiveTimerSession(userId)
      setActiveSession(session)

      // Load recent time entries
      const { entries } = await TimeTrackingService.getTimeEntries({
        user_id: userId,
        limit: 50
      })
      setTimeEntries(entries)

    } catch (error) {
      console.error('Failed to load time tracking data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId, projects])

  const updateTimer = useCallback(() => {
    if (activeSession) {
      // This would be implemented with real-time updates
      // For now, just recalculate duration
      setCurrentDuration(prev => prev + 1)
    }
  }, [activeSession])

  const handleStartTimer = async () => {
    if (!timerDescription.trim()) {
      alert('Please enter a description')
      return
    }

    try {
      const session = await TimeTrackingService.startTimer({
        user_id: userId,
        project_id: timerProjectId || undefined,
        milestone_id: timerMilestoneId || undefined,
        task_id: timerTaskId || undefined,
        description: timerDescription,
        tags: timerTags
      })

      setActiveSession(session)
      setCurrentDuration(0)

      // Reset form
      setTimerDescription('')
      setTimerProjectId('')
      setTimerMilestoneId('')
      setTimerTaskId('')
      setTimerTags([])

    } catch (error) {
      console.error('Failed to start timer:', error)
      alert('Failed to start timer')
    }
  }

  const handlePauseResumeTimer = async () => {
    if (!activeSession) return

    try {
      if (activeSession.last_pause_start) {
        // Resume
        const session = await TimeTrackingService.resumeTimer(userId)
        setActiveSession(session)
      } else {
        // Pause
        const session = await TimeTrackingService.pauseTimer(userId)
        setActiveSession(session)
      }
    } catch (error) {
      console.error('Failed to pause/resume timer:', error)
      alert('Failed to pause/resume timer')
    }
  }

  const handleStopTimer = async () => {
    if (!activeSession) return

    const description = prompt('Enter a description for this time entry:', activeSession.description)
    if (description === null) return // Cancelled

    try {
      const entry = await TimeTrackingService.stopTimer(userId, description)
      if (entry) {
        setTimeEntries(prev => [entry, ...prev])
      }
      setActiveSession(null)
      setCurrentDuration(0)
      loadData() // Refresh data
    } catch (error) {
      console.error('Failed to stop timer:', error)
      alert('Failed to stop timer')
    }
  }

  const handleCreateManualEntry = async () => {
    if (!entryDescription.trim() || !entryStartTime) {
      alert('Description and start time are required')
      return
    }

    try {
      const entry = await TimeTrackingService.createTimeEntry({
        user_id: userId,
        project_id: entryProjectId || undefined,
        milestone_id: entryMilestoneId || undefined,
        task_id: entryTaskId || undefined,
        description: entryDescription,
        start_time: entryStartTime,
        end_time: entryEndTime || undefined,
        duration_minutes: entryDuration ? parseInt(entryDuration) : undefined,
        billable: entryBillable,
        billable_rate: entryBillableRate ? parseFloat(entryBillableRate) : undefined,
        tags: entryTags
      })

      setTimeEntries(prev => [entry, ...prev])
      setShowNewEntry(false)

      // Reset form
      setEntryDescription('')
      setEntryProjectId('')
      setEntryMilestoneId('')
      setEntryTaskId('')
      setEntryStartTime('')
      setEntryEndTime('')
      setEntryDuration('')
      setEntryBillable(false)
      setEntryBillableRate('')
      setEntryTags([])

    } catch (error) {
      console.error('Failed to create time entry:', error)
      alert(error instanceof Error ? error.message : 'Failed to create time entry')
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this time entry?')) return

    try {
      await TimeTrackingService.deleteTimeEntry(entryId, userId)
      setTimeEntries(prev => prev.filter(entry => entry.id !== entryId))
    } catch (error) {
      console.error('Failed to delete time entry:', error)
      alert('Failed to delete time entry')
    }
  }

  const formatDuration = (minutes: number) => {
    return TimeEntryModel.formatDuration(minutes)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
      case 'active': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
      case 'submitted': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300'
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="animate-pulse space-y-4 w-full">
            <div className="h-8 bg-muted rounded w-48"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Active Timer */}
      <AnimatePresence>
        {activeSession && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-primary" />
                  Active Timer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-mono font-bold text-primary">
                      {formatDuration(currentDuration)}
                    </div>
                    <p className="text-muted-foreground mt-1">{activeSession.description}</p>
                  </div>

                  <div className="flex justify-center gap-2">
                    <Button
                      onClick={handlePauseResumeTimer}
                      variant="outline"
                      size="sm"
                    >
                      {activeSession.last_pause_start ? (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Resume
                        </>
                      ) : (
                        <>
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleStopTimer}
                      variant="destructive"
                      size="sm"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                  </div>

                  {activeSession.project_id && (
                    <div className="text-center text-sm text-muted-foreground">
                      Project: {projects.find(p => p.id === activeSession.project_id)?.name || activeSession.project_id}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Timer Start */}
      {!activeSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Start Timer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="What are you working on?"
                    value={timerDescription}
                    onChange={(e) => setTimerDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Project (Optional)</Label>
                  <Select value={timerProjectId} onValueChange={setTimerProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleStartTimer}
                disabled={!timerDescription.trim()}
                className="w-full"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Timer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Entries */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Time Entries
            </CardTitle>

            <Dialog open={showNewEntry} onOpenChange={setShowNewEntry}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Manual Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Manual Time Entry</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Description *</Label>
                      <Textarea
                        placeholder="What did you work on?"
                        value={entryDescription}
                        onChange={(e) => setEntryDescription(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Project</Label>
                      <Select value={entryProjectId} onValueChange={setEntryProjectId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map(project => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time *</Label>
                      <Input
                        type="datetime-local"
                        value={entryStartTime}
                        onChange={(e) => setEntryStartTime(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="datetime-local"
                        value={entryEndTime}
                        onChange={(e) => setEntryEndTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Duration (minutes)</Label>
                      <Input
                        type="number"
                        placeholder="Auto-calculated if start/end provided"
                        value={entryDuration}
                        onChange={(e) => setEntryDuration(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Billable</Label>
                      <Select value={entryBillable.toString()} onValueChange={(value) => setEntryBillable(value === 'true')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">No</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {entryBillable && (
                      <div className="space-y-2">
                        <Label>Rate ($/hour)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={entryBillableRate}
                          onChange={(e) => setEntryBillableRate(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setShowNewEntry(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateManualEntry}>
                      <Save className="w-4 h-4 mr-2" />
                      Create Entry
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {timeEntries.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No time entries yet</h3>
              <p className="text-muted-foreground mb-4">
                Start tracking your time by using the timer above or adding manual entries.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {timeEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{entry.description}</span>
                      <Badge className={getStatusColor(entry.status)}>
                        {entry.status}
                      </Badge>
                      {entry.billable && (
                        <Badge variant="outline" className="text-green-600">
                          <DollarSign className="w-3 h-3 mr-1" />
                          Billable
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(entry.duration_minutes)}
                      </span>

                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(entry.start_time).toLocaleDateString()}
                      </span>

                      {entry.project_id && (
                        <span>
                          Project: {projects.find(p => p.id === entry.project_id)?.name || entry.project_id}
                        </span>
                      )}

                      {entry.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {entry.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {entry.billable && entry.billable_rate && (
                      <div className="text-sm text-green-600 mt-1">
                        ${TimeEntryModel.calculateBillableAmount(entry.duration_minutes, entry.billable_rate).toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


