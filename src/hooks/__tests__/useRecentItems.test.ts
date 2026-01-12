import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRecentItems } from '../useRecentItems'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('useRecentItems Hook', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should initialize with empty recent items', () => {
    const { result } = renderHook(() => useRecentItems())

    expect(result.current.items).toEqual([])
  })

  it('should add a new task to recent items', () => {
    const { result } = renderHook(() => useRecentItems())

    act(() => {
      result.current.addItem({
        type: 'task',
        id: 'task-1',
        name: 'Test Task',
      })
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]).toMatchObject({
      type: 'task',
      id: 'task-1',
      name: 'Test Task',
    })
    expect(result.current.items[0].timestamp).toBeDefined()
  })

  it('should add a new project to recent items', () => {
    const { result } = renderHook(() => useRecentItems())

    act(() => {
      result.current.addItem({
        type: 'project',
        id: 'project-1',
        name: 'Test Project',
      })
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]).toMatchObject({
      type: 'project',
      id: 'project-1',
      name: 'Test Project',
    })
  })

  it('should move item to top when added again', () => {
    const { result } = renderHook(() => useRecentItems())

    act(() => {
      result.current.addItem({
        type: 'task',
        id: 'task-1',
        name: 'Test Task 1',
      })
      result.current.addItem({
        type: 'task',
        id: 'task-2',
        name: 'Test Task 2',
      })
    })

    expect(result.current.items).toHaveLength(2)
    expect(result.current.items[0].id).toBe('task-2')

    act(() => {
      result.current.addItem({
        type: 'task',
        id: 'task-1',
        name: 'Test Task 1',
      })
    })

    expect(result.current.items).toHaveLength(2)
    expect(result.current.items[0].id).toBe('task-1')
  })

  it('should enforce max 10 items (FIFO)', () => {
    const { result } = renderHook(() => useRecentItems())

    act(() => {
      for (let i = 1; i <= 12; i++) {
        result.current.addItem({
          type: 'task',
          id: `task-${i}`,
          name: `Test Task ${i}`,
        })
      }
    })

    expect(result.current.items).toHaveLength(10)
    expect(result.current.items[0].id).toBe('task-12')
    expect(result.current.items[9].id).toBe('task-3')
  })

  it('should persist items to localStorage', () => {
    const { result } = renderHook(() => useRecentItems())

    act(() => {
      result.current.addItem({
        type: 'task',
        id: 'task-1',
        name: 'Test Task',
      })
    })

    const stored = localStorage.getItem('recent-items')
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].id).toBe('task-1')
  })

  it('should load items from localStorage on mount', () => {
    const mockItems = [
      {
        type: 'task' as const,
        id: 'task-1',
        name: 'Test Task',
        timestamp: new Date().toISOString(),
      },
    ]
    localStorage.setItem('recent-items', JSON.stringify(mockItems))

    const { result } = renderHook(() => useRecentItems())

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].id).toBe('task-1')
  })

  it('should remove item by id', () => {
    const { result } = renderHook(() => useRecentItems())

    act(() => {
      result.current.addItem({
        type: 'task',
        id: 'task-1',
        name: 'Test Task 1',
      })
      result.current.addItem({
        type: 'task',
        id: 'task-2',
        name: 'Test Task 2',
      })
    })

    expect(result.current.items).toHaveLength(2)

    act(() => {
      result.current.removeItem('task-1')
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].id).toBe('task-2')
  })

  it('should clear all items', () => {
    const { result } = renderHook(() => useRecentItems())

    act(() => {
      result.current.addItem({
        type: 'task',
        id: 'task-1',
        name: 'Test Task 1',
      })
      result.current.addItem({
        type: 'project',
        id: 'project-1',
        name: 'Test Project 1',
      })
    })

    expect(result.current.items).toHaveLength(2)

    act(() => {
      result.current.clearAll()
    })

    expect(result.current.items).toHaveLength(0)
    expect(localStorage.getItem('recent-items')).toBe(null)
  })

  it('should group items by type (task and project)', () => {
    const { result } = renderHook(() => useRecentItems())

    act(() => {
      result.current.addItem({
        type: 'task',
        id: 'task-1',
        name: 'Test Task 1',
      })
      result.current.addItem({
        type: 'project',
        id: 'project-1',
        name: 'Test Project 1',
      })
      result.current.addItem({
        type: 'task',
        id: 'task-2',
        name: 'Test Task 2',
      })
      result.current.addItem({
        type: 'project',
        id: 'project-2',
        name: 'Test Project 2',
      })
    })

    const grouped = result.current.getGrouped()

    expect(grouped.tasks).toHaveLength(2)
    expect(grouped.projects).toHaveLength(2)
    expect(grouped.tasks[0].id).toBe('task-2')
    expect(grouped.projects[0].id).toBe('project-2')
  })

  it('should return grouped items limited to max 3 per type', () => {
    const { result } = renderHook(() => useRecentItems())

    act(() => {
      for (let i = 1; i <= 5; i++) {
        result.current.addItem({
          type: 'task',
          id: `task-${i}`,
          name: `Test Task ${i}`,
        })
      }
      for (let i = 1; i <= 5; i++) {
        result.current.addItem({
          type: 'project',
          id: `project-${i}`,
          name: `Test Project ${i}`,
        })
      }
    })

    const grouped = result.current.getGrouped()

    expect(grouped.tasks).toHaveLength(3)
    expect(grouped.projects).toHaveLength(3)
    expect(grouped.projects[0].id).toBe('project-5')
    expect(grouped.tasks[0].id).toBe('task-5')
  })
})
