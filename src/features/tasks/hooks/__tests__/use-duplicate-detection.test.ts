import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDuplicateDetection } from '../use-duplicate-detection'
import type { Task } from '../../utils/duplicate-detection'

describe('useDuplicateDetection Hook', () => {
  const mockTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Design UI components',
      project_id: 'project-1',
    },
    {
      id: 'task-2',
      title: 'Design UI Components',
      project_id: 'project-1',
    },
    {
      id: 'task-3',
      title: 'Implement authentication',
      project_id: 'project-1',
    },
    {
      id: 'task-4',
      title: 'Design UI components',
      project_id: 'project-2',
    },
  ]

  beforeEach(() => {
    // Clear any state between tests
  })

  describe('Initial State', () => {
    it('should have empty duplicates initially', () => {
      const { result } = renderHook(() => useDuplicateDetection())

      expect(result.current.duplicates).toEqual([])
      expect(result.current.showDialog).toBe(false)
    })

    it('should have showDialog false initially', () => {
      const { result } = renderHook(() => useDuplicateDetection())

      expect(result.current.showDialog).toBe(false)
    })
  })

  describe('checkDuplicates Function', () => {
    it('should find duplicates with exact match', () => {
      const { result } = renderHook(() => useDuplicateDetection())

      act(() => {
        const hasDuplicates = result.current.checkDuplicates(
          'Design UI components',
          'project-1',
          mockTasks
        )

        expect(hasDuplicates).toBe(true)
      })

      expect(result.current.duplicates.length).toBeGreaterThan(0)
      expect(result.current.showDialog).toBe(true)
    })

    it('should find duplicates with case-insensitive match', () => {
      const { result } = renderHook(() => useDuplicateDetection())

      act(() => {
        const hasDuplicates = result.current.checkDuplicates(
          'design ui components',
          'project-1',
          mockTasks
        )

        expect(hasDuplicates).toBe(true)
      })

      expect(result.current.duplicates.length).toBeGreaterThan(0)
      expect(result.current.showDialog).toBe(true)
    })

    it('should return false and not show dialog when no duplicates found', () => {
      const { result } = renderHook(() => useDuplicateDetection())

      act(() => {
        const hasDuplicates = result.current.checkDuplicates(
          'Completely unique task xyz',
          'project-1',
          mockTasks
        )

        expect(hasDuplicates).toBe(false)
      })

      expect(result.current.duplicates).toEqual([])
      expect(result.current.showDialog).toBe(false)
    })

    it('should be project-scoped', () => {
      const { result } = renderHook(() => useDuplicateDetection())

      act(() => {
        const hasDuplicates = result.current.checkDuplicates(
          'Design UI components',
          'project-2',
          mockTasks
        )

        expect(hasDuplicates).toBe(true)
      })

      // Should find the duplicate in project-2
      expect(result.current.duplicates.length).toBeGreaterThan(0)
      expect(result.current.duplicates[0].task.project_id).toBe('project-2')
    })

    it('should not find duplicates from other projects', () => {
      const { result } = renderHook(() => useDuplicateDetection())

      act(() => {
        const hasDuplicates = result.current.checkDuplicates(
          'Design UI components',
          'project-3',
          mockTasks
        )

        expect(hasDuplicates).toBe(false)
      })

      expect(result.current.duplicates).toEqual([])
      expect(result.current.showDialog).toBe(false)
    })

    it('should respect custom threshold', () => {
      const { result } = renderHook(() => useDuplicateDetection({ threshold: 0.99 }))

      act(() => {
        const hasDuplicates = result.current.checkDuplicates(
          'Design UI components',
          'project-1',
          mockTasks
        )

        expect(hasDuplicates).toBe(true)
      })

      // Should still find exact match with 99% threshold
      expect(result.current.duplicates.length).toBeGreaterThan(0)
    })

    it('should use default threshold of 0.9', () => {
      const { result: result1 } = renderHook(() => useDuplicateDetection())
      const { result: result2 } = renderHook(() =>
        useDuplicateDetection({ threshold: 0.9 })
      )

      act(() => {
        result1.current.checkDuplicates('Design UI', 'project-1', mockTasks)
        result2.current.checkDuplicates('Design UI', 'project-1', mockTasks)
      })

      // Both should have same behavior with default threshold
      expect(result1.current.showDialog).toBe(result2.current.showDialog)
    })

    it('should ignore empty title', () => {
      const { result } = renderHook(() => useDuplicateDetection())

      act(() => {
        const hasDuplicates = result.current.checkDuplicates('', 'project-1', mockTasks)

        expect(hasDuplicates).toBe(false)
      })

      expect(result.current.duplicates).toEqual([])
    })

    it('should ignore whitespace-only title', () => {
      const { result } = renderHook(() => useDuplicateDetection())

      act(() => {
        const hasDuplicates = result.current.checkDuplicates(
          '   ',
          'project-1',
          mockTasks
        )

        expect(hasDuplicates).toBe(false)
      })

      expect(result.current.duplicates).toEqual([])
    })

    it('should ignore empty project ID', () => {
      const { result } = renderHook(() => useDuplicateDetection())

      act(() => {
        const hasDuplicates = result.current.checkDuplicates(
          'Design UI components',
          '',
          mockTasks
        )

        expect(hasDuplicates).toBe(false)
      })

      expect(result.current.duplicates).toEqual([])
    })

    it('should respect enabled flag', () => {
      const { result } = renderHook(() => useDuplicateDetection({ enabled: false }))

      act(() => {
        const hasDuplicates = result.current.checkDuplicates(
          'Design UI components',
          'project-1',
          mockTasks
        )

        expect(hasDuplicates).toBe(false)
      })

      expect(result.current.duplicates).toEqual([])
      expect(result.current.showDialog).toBe(false)
    })
  })

  describe('closeDuplicateDialog Function', () => {
    it('should close the dialog', () => {
      const { result } = renderHook(() => useDuplicateDetection())

      act(() => {
        result.current.checkDuplicates(
          'Design UI components',
          'project-1',
          mockTasks
        )
      })

      expect(result.current.showDialog).toBe(true)

      act(() => {
        result.current.closeDuplicateDialog()
      })

      expect(result.current.showDialog).toBe(false)
    })

    it('should keep duplicates data when closing dialog', () => {
      const { result } = renderHook(() => useDuplicateDetection())

      act(() => {
        result.current.checkDuplicates(
          'Design UI components',
          'project-1',
          mockTasks
        )
      })

      const duplicatesLength = result.current.duplicates.length

      act(() => {
        result.current.closeDuplicateDialog()
      })

      expect(result.current.duplicates.length).toBe(duplicatesLength)
    })
  })

  describe('resetDuplicates Function', () => {
    it('should clear duplicates and close dialog', () => {
      const { result } = renderHook(() => useDuplicateDetection())

      act(() => {
        result.current.checkDuplicates(
          'Design UI components',
          'project-1',
          mockTasks
        )
      })

      expect(result.current.duplicates.length).toBeGreaterThan(0)
      expect(result.current.showDialog).toBe(true)

      act(() => {
        result.current.resetDuplicates()
      })

      expect(result.current.duplicates).toEqual([])
      expect(result.current.showDialog).toBe(false)
    })

    it('should allow rechecking after reset', () => {
      const { result } = renderHook(() => useDuplicateDetection())

      act(() => {
        result.current.checkDuplicates(
          'Design UI components',
          'project-1',
          mockTasks
        )
      })

      act(() => {
        result.current.resetDuplicates()
      })

      act(() => {
        const hasDuplicates = result.current.checkDuplicates(
          'Design UI components',
          'project-1',
          mockTasks
        )
        expect(hasDuplicates).toBe(true)
      })

      expect(result.current.duplicates.length).toBeGreaterThan(0)
      expect(result.current.showDialog).toBe(true)
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle multiple duplicate checks', () => {
      const { result } = renderHook(() => useDuplicateDetection())

      act(() => {
        result.current.checkDuplicates(
          'Design UI components',
          'project-1',
          mockTasks
        )
      })

      const firstCheckDuplicates = result.current.duplicates.length

      act(() => {
        result.current.resetDuplicates()
      })

      act(() => {
        result.current.checkDuplicates(
          'Implement authentication',
          'project-1',
          mockTasks
        )
      })

      expect(result.current.duplicates.length).toBeGreaterThan(0)
    })

    it('should display duplicates sorted by similarity when found', () => {
      const { result } = renderHook(() => useDuplicateDetection())

      act(() => {
        result.current.checkDuplicates(
          'Design UI components',
          'project-1',
          mockTasks
        )
      })

      if (result.current.duplicates.length > 1) {
        for (let i = 0; i < result.current.duplicates.length - 1; i++) {
          expect(result.current.duplicates[i].similarity).toBeGreaterThanOrEqual(
            result.current.duplicates[i + 1].similarity
          )
        }
      }
    })

    it('should work with dynamic task lists', () => {
      const { result, rerender } = renderHook(
        ({ tasks }: { tasks: Task[] }) => useDuplicateDetection(),
        { initialProps: { tasks: mockTasks } }
      )

      act(() => {
        result.current.checkDuplicates(
          'New unique task',
          'project-1',
          mockTasks
        )
      })

      expect(result.current.showDialog).toBe(false)

      // Add a similar task to the list
      const updatedTasks = [
        ...mockTasks,
        {
          id: 'task-5',
          title: 'New unique task',
          project_id: 'project-1',
        },
      ]

      act(() => {
        result.current.resetDuplicates()
        result.current.checkDuplicates('New unique task', 'project-1', updatedTasks)
      })

      expect(result.current.showDialog).toBe(true)
    })
  })
})
