'use client'

import { useTaskTimer } from '../hooks/use-task-timer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, Square, RotateCcw, Trash2, Clock } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'

interface TaskTimerProps {
  taskId: string
  compact?: boolean
}

export function TaskTimer({
  taskId,
  compact = false
}: TaskTimerProps) {
  const timer = useTaskTimer(taskId)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({})

  const handleSaveNotes = (entryId: string) => {
    const notes = editingNotes[entryId] || ''
    timer.updateEntryNotes(entryId, notes)
    setEditingNotes(prev => {
      const { [entryId]: _, ...rest } = prev
      return rest
    })
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="font-mono">
          <Clock className="h-3 w-3 mr-1" />
          {timer.display}
        </Badge>
        {timer.totalSeconds > 0 && (
          <Badge variant="outline" className="text-xs">
            Total: {timer.formatTime(timer.totalSeconds)}
          </Badge>
        )}
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Time Tracking
        </CardTitle>
        <CardDescription>
          Track time spent on this task
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <motion.div
          className="flex flex-col items-center justify-center gap-4 p-6 bg-primary/5 rounded-lg border"
          animate={timer.isRunning ? { scale: [1, 1.02, 1] } : { scale: 1 }}
          transition={{ duration: 2, repeat: timer.isRunning ? Infinity : 0 }}
        >
          <div className="text-5xl font-mono font-bold tracking-wider text-primary">
            {timer.display}
          </div>
          {timer.totalSeconds > 0 && (
            <div className="text-sm text-muted-foreground">
              Total logged: {timer.formatTime(timer.totalSeconds)}
            </div>
          )}
        </motion.div>

        <div className="flex gap-2 justify-center flex-wrap">
          {!timer.isRunning ? (
            <>
              <Button
                onClick={timer.start}
                variant="default"
                size="lg"
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Start
              </Button>
              {timer.elapsedSeconds > 0 && (
                <Button
                  onClick={timer.reset}
                  variant="outline"
                  size="lg"
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                onClick={timer.pause}
                variant="default"
                size="lg"
                className="gap-2"
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
              <Button
                onClick={timer.stop}
                variant="secondary"
                size="lg"
                className="gap-2"
              >
                <Square className="h-4 w-4" />
                Stop & Save
              </Button>
            </>
          )}
        </div>

        {timer.entries.length > 0 && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                Time Entries ({timer.entries.length})
              </h3>
              <Badge variant="outline">
                {timer.formatTime(timer.totalSeconds)}
              </Badge>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {timer.entries.map((entry, idx) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 bg-muted rounded-lg border space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          Entry {idx + 1}
                        </span>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {timer.formatTime(entry.durationSeconds)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {entry.startTime.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}{' '}
                        -{' '}
                        {entry.endTime.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <Button
                      onClick={() => timer.deleteEntry(entry.id)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <Input
                      placeholder="Add notes about what you worked on..."
                      value={
                        selectedEntryId === entry.id
                          ? editingNotes[entry.id] ?? entry.notes ?? ''
                          : entry.notes ?? ''
                      }
                      onChange={e => {
                        setSelectedEntryId(entry.id)
                        setEditingNotes(prev => ({
                          ...prev,
                          [entry.id]: e.target.value
                        }))
                      }}
                      onBlur={() => {
                        if (selectedEntryId === entry.id) {
                          handleSaveNotes(entry.id)
                          setSelectedEntryId(null)
                        }
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {timer.entries.length === 0 && timer.elapsedSeconds === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Start tracking time by clicking the Start button above
          </div>
        )}
      </CardContent>
    </Card>
  )
}
