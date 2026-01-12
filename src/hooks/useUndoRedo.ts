'use client'

import { useState, useCallback, useEffect } from 'react'

export interface UndoRedoAction {
  type: string
  undo: () => void | Promise<void>
  redo: () => void | Promise<void>
  metadata: Record<string, any>
}

interface HistoryAction {
  action: UndoRedoAction
  timestamp: number
}

const MAX_UNDO_LEVELS = 20

/**
 * useUndoRedo Hook
 *
 * Provides undo/redo functionality with:
 * - Action history stack (max 20 levels)
 * - Keyboard shortcuts (Cmd/Ctrl+Z for undo, Cmd/Ctrl+Shift+Z for redo)
 * - Metadata storage for toast notifications
 * - Support for delete, move, bulk delete operations
 */
export function useUndoRedo() {
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([])
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([])
  const [lastAction, setLastAction] = useState<UndoRedoAction | null>(null)

  /**
   * Register a new action to the undo stack
   * Automatically clears redo stack when a new action is performed
   */
  const registerAction = useCallback(
    (
      type: string,
      undoFn: () => void | Promise<void>,
      redoFn: () => void | Promise<void>,
      metadata: Record<string, any> = {}
    ) => {
      const action: UndoRedoAction = {
        type,
        undo: undoFn,
        redo: redoFn,
        metadata
      }

      const historyAction: HistoryAction = {
        action,
        timestamp: Date.now()
      }

      setUndoStack(prev => {
        // Enforce max undo levels
        const newStack = [...prev, historyAction]
        if (newStack.length > MAX_UNDO_LEVELS) {
          return newStack.slice(-MAX_UNDO_LEVELS)
        }
        return newStack
      })

      // Update last action reference
      setLastAction(action)

      // Clear redo stack when new action is performed
      setRedoStack([])
    },
    []
  )

  /**
   * Undo the last action
   */
  const undo = useCallback(async () => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev

      const newUndoStack = [...prev]
      const historyAction = newUndoStack.pop()!

      // Execute undo function
      Promise.resolve(historyAction.action.undo()).catch(err => {
        console.error('Undo failed:', err)
      })

      // Move to redo stack
      setRedoStack(prev => [...prev, historyAction])

      // Update last action to the one being undone
      setLastAction(historyAction.action)

      return newUndoStack
    })
  }, [])

  /**
   * Redo the last undone action
   */
  const redo = useCallback(async () => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev

      const newRedoStack = [...prev]
      const historyAction = newRedoStack.pop()!

      // Execute redo function
      Promise.resolve(historyAction.action.redo()).catch(err => {
        console.error('Redo failed:', err)
      })

      // Move back to undo stack
      setUndoStack(prev => [...prev, historyAction])

      // Update last action
      setLastAction(historyAction.action)

      return newRedoStack
    })
  }, [])

  /**
   * Check if undo is available
   */
  const canUndo = useCallback(() => {
    return undoStack.length > 0
  }, [undoStack])

  /**
   * Check if redo is available
   */
  const canRedo = useCallback(() => {
    return redoStack.length > 0
  }, [redoStack])

  /**
   * Get the number of actions in history
   */
  const getHistoryLength = useCallback(() => {
    return undoStack.length
  }, [undoStack])

  /**
   * Get last action of a specific type
   */
  const getLastAction = useCallback(
    (type: string): UndoRedoAction | null => {
      for (let i = undoStack.length - 1; i >= 0; i--) {
        if (undoStack[i].action.type === type) {
          return undoStack[i].action
        }
      }
      return null
    },
    [undoStack]
  )

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setUndoStack([])
    setRedoStack([])
  }, [])

  /**
   * Handle keyboard shortcuts
   * Cmd/Ctrl+Z = undo
   * Cmd/Ctrl+Shift+Z = redo
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey

      if (!isCtrlOrCmd || event.key.toLowerCase() !== 'z') {
        return
      }

      // Prevent default browser behavior
      event.preventDefault()

      if (event.shiftKey) {
        // Ctrl+Shift+Z or Cmd+Shift+Z = redo
        if (canRedo()) {
          redo()
        }
      } else {
        // Ctrl+Z or Cmd+Z = undo
        if (canUndo()) {
          undo()
        }
      }
    },
    [undo, redo, canUndo, canRedo]
  )

  /**
   * Attach keyboard event listener
   */
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return {
    registerAction,
    undo,
    redo,
    canUndo,
    canRedo,
    getHistoryLength,
    getLastAction,
    clearHistory,
    handleKeyDown,
    undoStack,
    redoStack
  }
}
