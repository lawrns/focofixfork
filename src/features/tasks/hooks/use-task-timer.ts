'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface TimeEntry {
  id: string
  startTime: Date
  endTime: Date
  durationSeconds: number
  notes?: string
}

export interface TimerState {
  isRunning: boolean
  elapsedSeconds: number
  startTime: number | null
  entries: TimeEntry[]
}

export function useTaskTimer(taskId: string) {
  const storageKey = `timer:${taskId}`
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const [state, setState] = useState<TimerState>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          ...parsed,
          elapsedSeconds: parsed.isRunning
            ? parsed.elapsedSeconds +
              Math.floor((Date.now() - parsed.startTime) / 1000)
            : parsed.elapsedSeconds,
          startTime: parsed.isRunning ? Date.now() : parsed.startTime
        }
      }
    } catch (error) {
      console.warn('Failed to restore timer state:', error)
    }

    return {
      isRunning: false,
      elapsedSeconds: 0,
      startTime: null,
      entries: []
    }
  })

  // Persist state to localStorage
  const persistState = useCallback((newState: TimerState) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newState))
    } catch (error) {
      console.warn('Failed to persist timer state:', error)
    }
  }, [storageKey])

  // Timer interval effect
  useEffect(() => {
    if (!state.isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      setState(prevState => {
        if (!prevState.isRunning || !prevState.startTime) return prevState

        const elapsed = Math.floor((Date.now() - prevState.startTime) / 1000)
        const newState = {
          ...prevState,
          elapsedSeconds: elapsed
        }

        persistState(newState)
        return newState
      })
    }, 100) // Update every 100ms for smooth display

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [state.isRunning, state.startTime, persistState])

  const start = useCallback(() => {
    setState(prevState => {
      const newState = {
        ...prevState,
        isRunning: true,
        startTime: Date.now(),
        elapsedSeconds: prevState.elapsedSeconds
      }
      persistState(newState)
      return newState
    })
  }, [persistState])

  const pause = useCallback(() => {
    setState(prevState => {
      const newState = {
        ...prevState,
        isRunning: false,
        startTime: null
      }
      persistState(newState)
      return newState
    })
  }, [persistState])

  const resume = useCallback(() => {
    setState(prevState => {
      const newState = {
        ...prevState,
        isRunning: true,
        startTime: Date.now()
      }
      persistState(newState)
      return newState
    })
  }, [persistState])

  const stop = useCallback(() => {
    setState(prevState => {
      if (!prevState.isRunning) return prevState

      // Create time entry
      const newEntry: TimeEntry = {
        id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        startTime: new Date(prevState.startTime!),
        endTime: new Date(),
        durationSeconds: prevState.elapsedSeconds,
        notes: ''
      }

      const newState = {
        ...prevState,
        isRunning: false,
        startTime: null,
        elapsedSeconds: 0,
        entries: [...prevState.entries, newEntry]
      }

      persistState(newState)
      return newState
    })
  }, [persistState])

  const reset = useCallback(() => {
    setState(prevState => {
      const newState = {
        ...prevState,
        isRunning: false,
        startTime: null,
        elapsedSeconds: 0
      }
      persistState(newState)
      return newState
    })
  }, [persistState])

  const deleteEntry = useCallback((entryId: string) => {
    setState(prevState => {
      const newState = {
        ...prevState,
        entries: prevState.entries.filter(e => e.id !== entryId)
      }
      persistState(newState)
      return newState
    })
  }, [persistState])

  const updateEntryNotes = useCallback((entryId: string, notes: string) => {
    setState(prevState => {
      const newState = {
        ...prevState,
        entries: prevState.entries.map(e =>
          e.id === entryId ? { ...e, notes } : e
        )
      }
      persistState(newState)
      return newState
    })
  }, [persistState])

  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return [hours, minutes, secs]
      .map(n => String(n).padStart(2, '0'))
      .join(':')
  }, [])

  const display = formatTime(state.elapsedSeconds)

  const totalSeconds = state.entries.reduce(
    (sum, entry) => sum + entry.durationSeconds,
    0
  )

  return {
    // State
    isRunning: state.isRunning,
    elapsedSeconds: state.elapsedSeconds,
    entries: state.entries,
    totalSeconds,
    display,

    // Actions
    start,
    pause,
    resume,
    stop,
    reset,
    deleteEntry,
    updateEntryNotes,

    // Utilities
    formatTime
  }
}
