'use client'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { useDebounce } from '@/lib/hooks/use-debounce'

describe('useDebounce Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Basic Debouncing', () => {
    it('should not call onChange on every keystroke', () => {
      const onChangeMock = vi.fn()
      const { rerender } = renderHook(
        ({ value, onValueChange }: any) =>
          useDebounce(value, onValueChange, 300),
        {
          initialProps: { value: '', onValueChange: onChangeMock }
        }
      )

      // Simulate rapid keystrokes
      rerender({ value: 't', onValueChange: onChangeMock })
      rerender({ value: 'te', onValueChange: onChangeMock })
      rerender({ value: 'tes', onValueChange: onChangeMock })
      rerender({ value: 'test', onValueChange: onChangeMock })

      // Callback should not be called immediately
      expect(onChangeMock).not.toHaveBeenCalled()

      // Advance time to trigger debounce
      act(() => {
        vi.advanceTimersByTime(300)
      })

      // Callback should be called exactly once with final value
      expect(onChangeMock).toHaveBeenCalledTimes(1)
      expect(onChangeMock).toHaveBeenCalledWith('test')
    })

    it('should debounce API calls only after 300ms of no typing for search fields', async () => {
      const searchFn = vi.fn().mockResolvedValue([])
      const { rerender } = renderHook(
        ({ value }: any) => useDebounce(value, searchFn, 300),
        {
          initialProps: { value: '' }
        }
      )

      // User types quickly
      rerender({ value: 'p' })
      rerender({ value: 'pr' })
      rerender({ value: 'pro' })
      rerender({ value: 'proje' })
      rerender({ value: 'project' })

      // API should not be called during typing
      expect(searchFn).not.toHaveBeenCalled()

      // Wait for debounce to trigger
      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(searchFn).toHaveBeenCalledTimes(1)
        expect(searchFn).toHaveBeenCalledWith('project')
      })
    })

    it('should cancel pending debounce on unmount', () => {
      const onChangeMock = vi.fn()
      const { unmount } = renderHook(
        ({ value, onValueChange }: any) =>
          useDebounce(value, onValueChange, 300),
        {
          initialProps: { value: 'test', onValueChange: onChangeMock }
        }
      )

      // Unmount component before debounce completes
      unmount()

      // Advance time past debounce delay
      act(() => {
        vi.advanceTimersByTime(300)
      })

      // Callback should never be called
      expect(onChangeMock).not.toHaveBeenCalled()
    })

    it('should reset debounce timer on new change', () => {
      const onChangeMock = vi.fn()
      const { rerender } = renderHook(
        ({ value, onValueChange }: any) =>
          useDebounce(value, onValueChange, 300),
        {
          initialProps: { value: '', onValueChange: onChangeMock }
        }
      )

      // First change
      rerender({ value: 'search', onValueChange: onChangeMock })

      // Advance 200ms (not yet at 300ms)
      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(onChangeMock).not.toHaveBeenCalled()

      // Another change resets the timer
      rerender({ value: 'search query', onValueChange: onChangeMock })

      // Advance another 200ms (total 400ms from first change, only 200ms from second)
      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(onChangeMock).not.toHaveBeenCalled()

      // Advance 100ms more (total 500ms from second change)
      act(() => {
        vi.advanceTimersByTime(100)
      })

      expect(onChangeMock).toHaveBeenCalledTimes(1)
      expect(onChangeMock).toHaveBeenCalledWith('search query')
    })

    it('should handle multiple rapid changes resulting in single API call', async () => {
      const apiCall = vi.fn().mockResolvedValue({ results: [] })
      const { rerender } = renderHook(
        ({ value }: any) => useDebounce(value, apiCall, 300),
        {
          initialProps: { value: '' }
        }
      )

      // Rapid successive changes
      rerender({ value: 'a' })
      rerender({ value: 'ab' })
      rerender({ value: 'abc' })
      rerender({ value: 'abcd' })
      rerender({ value: 'abcde' })

      expect(apiCall).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        // Only one API call should be made with final value
        expect(apiCall).toHaveBeenCalledTimes(1)
        expect(apiCall).toHaveBeenCalledWith('abcde')
      })
    })
  })

  describe('Auto-save Debouncing (500ms)', () => {
    it('should debounce auto-save operations with 500ms delay', () => {
      const saveFunction = vi.fn()
      const { rerender } = renderHook(
        ({ value, onValueChange }: any) =>
          useDebounce(value, onValueChange, 500),
        {
          initialProps: { value: '', onValueChange: saveFunction }
        }
      )

      // Simulate form input changes
      rerender({ value: 'Settings', onValueChange: saveFunction })
      rerender({ value: 'Settings value', onValueChange: saveFunction })

      // Before 500ms, save should not happen
      act(() => {
        vi.advanceTimersByTime(400)
      })
      expect(saveFunction).not.toHaveBeenCalled()

      // After 500ms total, save should happen
      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(saveFunction).toHaveBeenCalledTimes(1)
      expect(saveFunction).toHaveBeenCalledWith('Settings value')
    })

    it('should maintain debounce behavior with multiple sequential auto-saves', () => {
      const saveFunction = vi.fn()
      const { rerender } = renderHook(
        ({ value, onValueChange }: any) =>
          useDebounce(value, onValueChange, 500),
        {
          initialProps: { value: '', onValueChange: saveFunction }
        }
      )

      // First save
      rerender({ value: 'First value', onValueChange: saveFunction })
      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(saveFunction).toHaveBeenCalledTimes(1)

      // Reset mocks for second save
      saveFunction.mockClear()

      // Second save
      rerender({ value: 'Second value', onValueChange: saveFunction })
      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(saveFunction).toHaveBeenCalledTimes(1)
      expect(saveFunction).toHaveBeenCalledWith('Second value')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string debouncing', () => {
      const onChangeMock = vi.fn()
      const { rerender } = renderHook(
        ({ value, onValueChange }: any) =>
          useDebounce(value, onValueChange, 300),
        {
          initialProps: { value: 'initial', onValueChange: onChangeMock }
        }
      )

      rerender({ value: '', onValueChange: onChangeMock })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(onChangeMock).toHaveBeenCalledWith('')
    })

    it('should handle custom delay values', () => {
      const onChangeMock = vi.fn()
      const { rerender } = renderHook(
        ({ value, onValueChange, delay }: any) =>
          useDebounce(value, onValueChange, delay),
        {
          initialProps: { value: 'test', onValueChange: onChangeMock, delay: 500 }
        }
      )

      act(() => {
        vi.advanceTimersByTime(400)
      })
      expect(onChangeMock).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(onChangeMock).toHaveBeenCalledTimes(1)
    })

    it('should handle null or undefined values gracefully', () => {
      const onChangeMock = vi.fn()
      const { rerender } = renderHook(
        ({ value, onValueChange }: any) =>
          useDebounce(value, onValueChange, 300),
        {
          initialProps: { value: undefined, onValueChange: onChangeMock }
        }
      )

      rerender({ value: null, onValueChange: onChangeMock })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(onChangeMock).toHaveBeenCalledWith(null)
    })

    it('should handle rapid changes without memory leaks', () => {
      const onChangeMock = vi.fn()
      const { rerender } = renderHook(
        ({ value, onValueChange }: any) =>
          useDebounce(value, onValueChange, 50),
        {
          initialProps: { value: '', onValueChange: onChangeMock }
        }
      )

      // Simulate very rapid changes
      for (let i = 0; i < 100; i++) {
        rerender({ value: `value ${i}`, onValueChange: onChangeMock })
      }

      act(() => {
        vi.advanceTimersByTime(50)
      })

      // Should only call once with final value
      expect(onChangeMock).toHaveBeenCalledTimes(1)
      expect(onChangeMock).toHaveBeenCalledWith('value 99')
    })
  })

  describe('Form Field Integration', () => {
    it('should work with search input fields (project search)', () => {
      const searchProjects = vi.fn().mockResolvedValue([])
      const { rerender } = renderHook(
        ({ projectSearchQuery }: any) =>
          useDebounce(projectSearchQuery, searchProjects, 300),
        {
          initialProps: { projectSearchQuery: '' }
        }
      )

      rerender({ projectSearchQuery: 'my project' })

      expect(searchProjects).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(searchProjects).toHaveBeenCalledWith('my project')
    })

    it('should work with task search fields', () => {
      const searchTasks = vi.fn().mockResolvedValue([])
      const { rerender } = renderHook(
        ({ taskSearchQuery }: any) =>
          useDebounce(taskSearchQuery, searchTasks, 300),
        {
          initialProps: { taskSearchQuery: '' }
        }
      )

      rerender({ taskSearchQuery: 'urgent task' })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(searchTasks).toHaveBeenCalledWith('urgent task')
    })

    it('should work with user search fields', () => {
      const searchUsers = vi.fn().mockResolvedValue([])
      const { rerender } = renderHook(
        ({ userSearchQuery }: any) =>
          useDebounce(userSearchQuery, searchUsers, 300),
        {
          initialProps: { userSearchQuery: '' }
        }
      )

      rerender({ userSearchQuery: 'john' })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(searchUsers).toHaveBeenCalledWith('john')
    })

    it('should work with tag search fields', () => {
      const searchTags = vi.fn().mockResolvedValue([])
      const { rerender } = renderHook(
        ({ tagSearchQuery }: any) =>
          useDebounce(tagSearchQuery, searchTags, 300),
        {
          initialProps: { tagSearchQuery: '' }
        }
      )

      rerender({ tagSearchQuery: 'important' })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(searchTags).toHaveBeenCalledWith('important')
    })
  })

  describe('Callback Invocation', () => {
    it('should invoke callback with correct value after debounce delay', () => {
      const callback = vi.fn()
      const { rerender } = renderHook(
        ({ value, onValueChange }: any) =>
          useDebounce(value, onValueChange, 300),
        {
          initialProps: { value: 'initial', onValueChange: callback }
        }
      )

      rerender({ value: 'updated', onValueChange: callback })

      act(() => {
        vi.advanceTimersByTime(150)
      })

      expect(callback).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(150)
      })

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith('updated')
    })

    it('should only invoke callback once for repeated identical values', () => {
      const callback = vi.fn()
      const { rerender } = renderHook(
        ({ value, onValueChange }: any) =>
          useDebounce(value, onValueChange, 300),
        {
          initialProps: { value: 'test', onValueChange: callback }
        }
      )

      // Same value set multiple times
      rerender({ value: 'test', onValueChange: callback })
      rerender({ value: 'test', onValueChange: callback })
      rerender({ value: 'test', onValueChange: callback })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  describe('Performance', () => {
    it('should properly clean up timers to prevent memory leaks', () => {
      const onChangeMock = vi.fn()
      const { rerender, unmount } = renderHook(
        ({ value, onValueChange }: any) =>
          useDebounce(value, onValueChange, 300),
        {
          initialProps: { value: '', onValueChange: onChangeMock }
        }
      )

      rerender({ value: 'some value', onValueChange: onChangeMock })
      rerender({ value: 'another value', onValueChange: onChangeMock })

      // Unmount before debounce timer fires
      unmount()

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(300)
      })

      // No callback should be invoked
      expect(onChangeMock).not.toHaveBeenCalled()
    })
  })
})
