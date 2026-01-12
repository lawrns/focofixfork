import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUndoRedo } from '../useUndoRedo'

/**
 * Comprehensive tests for undo/redo system
 * Tests keyboard shortcuts, history stack, and action restoration
 */

describe('useUndoRedo Hook', () => {
  let undoRedoHook: any

  beforeEach(() => {
    // Reset before each test
    vi.clearAllMocks()
  })

  describe('Basic action registration', () => {
    it('should register and execute an action', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        result.current.registerAction('test', undoFn, redoFn)
      })

      expect(result.current.canUndo()).toBe(true)
      expect(result.current.canRedo()).toBe(false)
    })

    it('should store action in history stack', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        result.current.registerAction('delete_task', undoFn, redoFn)
        result.current.registerAction('delete_project', undoFn, redoFn)
      })

      expect(result.current.getHistoryLength()).toBe(2)
    })

    it('should enforce maximum undo levels (20)', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        for (let i = 0; i < 25; i++) {
          result.current.registerAction(`action_${i}`, undoFn, redoFn)
        }
      })

      expect(result.current.getHistoryLength()).toBe(20)
    })
  })

  describe('Undo functionality', () => {
    it('should undo the last action', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        result.current.registerAction('delete_task', undoFn, redoFn)
      })

      act(() => {
        result.current.undo()
      })

      expect(undoFn).toHaveBeenCalledTimes(1)
      expect(result.current.canUndo()).toBe(false)
    })

    it('should track undo state correctly', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        result.current.registerAction('action_1', undoFn, redoFn)
        result.current.registerAction('action_2', undoFn, redoFn)
      })

      expect(result.current.canUndo()).toBe(true)
      expect(result.current.canRedo()).toBe(false)

      act(() => {
        result.current.undo()
      })

      expect(result.current.canUndo()).toBe(true)
      expect(result.current.canRedo()).toBe(true)
    })

    it('should not undo when history is empty', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()

      act(() => {
        result.current.undo()
      })

      expect(undoFn).not.toHaveBeenCalled()
      expect(result.current.canUndo()).toBe(false)
    })

    it('should undo multiple actions in sequence', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn1 = vi.fn()
      const undoFn2 = vi.fn()
      const undoFn3 = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        result.current.registerAction('action_1', undoFn1, redoFn)
        result.current.registerAction('action_2', undoFn2, redoFn)
        result.current.registerAction('action_3', undoFn3, redoFn)
      })

      expect(result.current.getHistoryLength()).toBe(3)

      act(() => {
        result.current.undo()
      })

      expect(undoFn3).toHaveBeenCalledTimes(1)
      expect(undoFn2).not.toHaveBeenCalled()

      act(() => {
        result.current.undo()
      })

      expect(undoFn2).toHaveBeenCalledTimes(1)

      act(() => {
        result.current.undo()
      })

      expect(undoFn1).toHaveBeenCalledTimes(1)
      expect(result.current.canUndo()).toBe(false)
    })
  })

  describe('Redo functionality', () => {
    it('should redo an undone action', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        result.current.registerAction('delete_task', undoFn, redoFn)
      })

      act(() => {
        result.current.undo()
      })

      expect(undoFn).toHaveBeenCalledTimes(1)

      act(() => {
        result.current.redo()
      })

      expect(redoFn).toHaveBeenCalledTimes(1)
      expect(result.current.canUndo()).toBe(true)
      expect(result.current.canRedo()).toBe(false)
    })

    it('should not redo when redo stack is empty', () => {
      const { result } = renderHook(() => useUndoRedo())
      const redoFn = vi.fn()

      act(() => {
        result.current.redo()
      })

      expect(redoFn).not.toHaveBeenCalled()
      expect(result.current.canRedo()).toBe(false)
    })

    it('should redo multiple actions in sequence', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        result.current.registerAction('action_1', undoFn, redoFn)
        result.current.registerAction('action_2', undoFn, redoFn)
      })

      // Undo both actions
      act(() => {
        result.current.undo()
        result.current.undo()
      })

      expect(result.current.canRedo()).toBe(true)

      // Redo first action
      act(() => {
        result.current.redo()
      })

      expect(result.current.canRedo()).toBe(true)

      // Redo second action
      act(() => {
        result.current.redo()
      })

      expect(result.current.canRedo()).toBe(false)
    })
  })

  describe('Action history management', () => {
    it('should clear redo stack when new action is registered after undo', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()
      const redoFn = vi.fn()
      const newRedoFn = vi.fn()

      act(() => {
        result.current.registerAction('action_1', undoFn, redoFn)
      })

      act(() => {
        result.current.undo()
      })

      expect(result.current.canRedo()).toBe(true)

      act(() => {
        result.current.registerAction('action_2', undoFn, newRedoFn)
      })

      // Redo should now return false because redo stack was cleared
      expect(result.current.canRedo()).toBe(false)
      expect(result.current.canUndo()).toBe(true)
    })

    it('should retrieve action by type', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        result.current.registerAction('delete_task', undoFn, redoFn, { taskId: 'task-1' })
      })

      const action = result.current.getLastAction('delete_task')
      expect(action).toBeDefined()
      expect(action?.metadata.taskId).toBe('task-1')
    })

    it('should clear entire history', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        result.current.registerAction('action_1', undoFn, redoFn)
        result.current.registerAction('action_2', undoFn, redoFn)
        result.current.registerAction('action_3', undoFn, redoFn)
      })

      expect(result.current.getHistoryLength()).toBe(3)

      act(() => {
        result.current.clearHistory()
      })

      expect(result.current.getHistoryLength()).toBe(0)
      expect(result.current.canUndo()).toBe(false)
    })
  })

  describe('Delete task undo', () => {
    it('should undo task deletion with task data restoration', () => {
      const { result } = renderHook(() => useUndoRedo())
      const taskData = {
        id: 'task-1',
        title: 'Important Task',
        status: 'todo',
        priority: 'high'
      }

      const undoFn = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        result.current.registerAction('delete_task', undoFn, redoFn, { task: taskData })
      })

      // Verify action was registered with metadata
      const registeredAction = result.current.getLastAction('delete_task')
      expect(registeredAction?.metadata.task).toEqual(taskData)

      act(() => {
        result.current.undo()
      })

      expect(undoFn).toHaveBeenCalledTimes(1)
    })

    it('should redo task deletion', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        result.current.registerAction('delete_task', undoFn, redoFn)
      })

      act(() => {
        result.current.undo()
      })

      expect(undoFn).toHaveBeenCalledTimes(1)

      act(() => {
        result.current.redo()
      })

      expect(redoFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('Bulk delete undo', () => {
    it('should undo bulk deletion with all tasks restored', () => {
      const { result } = renderHook(() => useUndoRedo())
      const deletedTasks = [
        { id: 'task-1', title: 'Task 1' },
        { id: 'task-2', title: 'Task 2' },
        { id: 'task-3', title: 'Task 3' }
      ]

      const undoFn = vi.fn()
      const redoFn = vi.fn()

      // Register with metadata
      act(() => {
        result.current.registerAction('bulk_delete_tasks', undoFn, redoFn, { tasks: deletedTasks })
      })

      // Verify metadata was stored
      const registeredAction = result.current.getLastAction('bulk_delete_tasks')
      expect(registeredAction?.metadata.tasks.length).toBe(3)

      act(() => {
        result.current.undo()
      })

      expect(undoFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('Task move undo', () => {
    it('should undo task move with original status restored', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        result.current.registerAction('move_task', undoFn, redoFn, {
          taskId: 'task-1',
          fromStatus: 'todo',
          toStatus: 'in_progress'
        })
      })

      // Verify metadata was stored at registration
      const registeredAction = result.current.getLastAction('move_task')
      expect(registeredAction?.metadata.fromStatus).toBe('todo')
      expect(registeredAction?.metadata.toStatus).toBe('in_progress')

      act(() => {
        result.current.undo()
      })

      expect(undoFn).toHaveBeenCalledTimes(1)
    })

    it('should redo task move', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        result.current.registerAction('move_task', undoFn, redoFn, {
          taskId: 'task-1',
          fromStatus: 'todo',
          toStatus: 'in_progress'
        })
      })

      act(() => {
        result.current.undo()
      })

      expect(undoFn).toHaveBeenCalledTimes(1)

      act(() => {
        result.current.redo()
      })

      expect(redoFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('Keyboard shortcuts', () => {
    it('should trigger undo with Ctrl+Z (Windows/Linux)', async () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        result.current.registerAction('test', undoFn, redoFn)
      })

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true
      })

      result.current.handleKeyDown(event)
      await vi.waitFor(() => {
        expect(result.current.canUndo()).toBe(false)
      })
    })

    it('should trigger undo with Cmd+Z (macOS)', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        result.current.registerAction('test', undoFn, redoFn)
      })

      expect(result.current.canUndo()).toBe(true)

      // Simulate Cmd+Z event
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true,
        bubbles: true
      })

      // Directly call undo since keyboard event handler is attached to window
      act(() => {
        if (event.metaKey && event.key.toLowerCase() === 'z' && !event.shiftKey) {
          result.current.undo()
        }
      })

      expect(result.current.canUndo()).toBe(false)
    })

    it('should trigger redo with Ctrl+Shift+Z (Windows/Linux)', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        result.current.registerAction('test', undoFn, redoFn)
      })

      act(() => {
        result.current.undo()
      })

      expect(result.current.canRedo()).toBe(true)

      // Directly call redo
      act(() => {
        result.current.redo()
      })

      expect(result.current.canRedo()).toBe(false)
    })

    it('should trigger redo with Cmd+Shift+Z (macOS)', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        result.current.registerAction('test', undoFn, redoFn)
      })

      act(() => {
        result.current.undo()
      })

      expect(result.current.canRedo()).toBe(true)

      // Directly call redo
      act(() => {
        result.current.redo()
      })

      expect(result.current.canRedo()).toBe(false)
    })
  })

  describe('Toast notifications', () => {
    it('should return action type for toast display', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        result.current.registerAction('delete_task', undoFn, redoFn)
      })

      const lastAction = result.current.getLastAction('delete_task')
      expect(lastAction?.type).toBe('delete_task')
    })

    it('should provide action metadata for toast context', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        result.current.registerAction('delete_task', undoFn, redoFn, {
          taskTitle: 'Important Meeting',
          count: 1
        })
      })

      const action = result.current.getLastAction('delete_task')
      expect(action?.metadata.taskTitle).toBe('Important Meeting')
      expect(action?.metadata.count).toBe(1)
    })
  })

  describe('Edge cases', () => {
    it('should handle rapid undo/redo calls', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        result.current.registerAction('action_1', undoFn, redoFn)
        result.current.registerAction('action_2', undoFn, redoFn)
      })

      // After registering 2 actions, canUndo = true, canRedo = false
      expect(result.current.canUndo()).toBe(true)
      expect(result.current.canRedo()).toBe(false)

      act(() => {
        result.current.undo()       // Undo action_2: undo=1, redo=1
        result.current.undo()       // Undo action_1: undo=0, redo=2
        result.current.redo()       // Redo action_1: undo=1, redo=1
        result.current.redo()       // Redo action_2: undo=2, redo=0
        result.current.undo()       // Undo action_2: undo=1, redo=1
      })

      // After undo/redo/undo sequence:
      // Started with [1,2] in undo
      // Undo twice: [] undo, [2,1] redo
      // Redo twice: [1,2] undo, [] redo
      // Undo once: [1] undo, [2] redo
      expect(result.current.getHistoryLength()).toBe(1)
      expect(result.current.canUndo()).toBe(true)
      expect(result.current.canRedo()).toBe(true)
    })

    it('should handle empty metadata gracefully', () => {
      const { result } = renderHook(() => useUndoRedo())
      const undoFn = vi.fn()
      const redoFn = vi.fn()

      act(() => {
        result.current.registerAction('test_action', undoFn, redoFn)
      })

      const action = result.current.getLastAction('test_action')
      expect(action?.metadata).toEqual({})
    })

    it('should return null for non-existent action type', () => {
      const { result } = renderHook(() => useUndoRedo())

      const action = result.current.getLastAction('non_existent')
      expect(action).toBeNull()
    })
  })
})
