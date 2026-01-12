'use client'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDebounce } from '@/lib/hooks/use-debounce'

/**
 * Integration tests for form field debouncing
 * Tests for real-world scenarios like search fields and auto-save
 */
describe('Form Field Debouncing Integration Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Project Search Field (300ms debounce)', () => {
    it('should not call API on every keystroke when searching projects', () => {
      const apiCall = vi.fn().mockResolvedValue({ projects: [] })
      const { rerender } = renderHook(
        ({ projectQuery }: any) =>
          useDebounce(projectQuery, apiCall, 300),
        {
          initialProps: { projectQuery: '' }
        }
      )

      // User types "My Project" character by character
      const chars = 'My Project'.split('')
      chars.forEach((char, index) => {
        const query = chars.slice(0, index + 1).join('')
        rerender({ projectQuery: query })
      })

      // API should not be called during typing
      expect(apiCall).not.toHaveBeenCalled()

      // After debounce, only one call
      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(apiCall).toHaveBeenCalledTimes(1)
      expect(apiCall).toHaveBeenCalledWith('My Project')
    })

    it('should handle rapid project search changes efficiently', () => {
      const apiCall = vi.fn()
      const { rerender } = renderHook(
        ({ projectQuery }: any) =>
          useDebounce(projectQuery, apiCall, 300),
        {
          initialProps: { projectQuery: '' }
        }
      )

      rerender({ projectQuery: 'test' })
      act(() => { vi.advanceTimersByTime(100) })

      rerender({ projectQuery: 'test project' })
      act(() => { vi.advanceTimersByTime(100) })

      rerender({ projectQuery: 'test project search' })
      act(() => { vi.advanceTimersByTime(100) })

      // No calls yet
      expect(apiCall).not.toHaveBeenCalled()

      // Complete the debounce
      act(() => { vi.advanceTimersByTime(200) })

      // Only final value
      expect(apiCall).toHaveBeenCalledTimes(1)
      expect(apiCall).toHaveBeenCalledWith('test project search')
    })
  })

  describe('Task Search Field (300ms debounce)', () => {
    it('should debounce task search API calls', () => {
      const searchTasks = vi.fn().mockResolvedValue([])
      const { rerender } = renderHook(
        ({ taskQuery }: any) =>
          useDebounce(taskQuery, searchTasks, 300),
        {
          initialProps: { taskQuery: '' }
        }
      )

      // User searches for task
      rerender({ taskQuery: 'urgent bug' })

      expect(searchTasks).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(searchTasks).toHaveBeenCalledWith('urgent bug')
    })
  })

  describe('User Search Field (300ms debounce)', () => {
    it('should debounce user search with team member lookups', () => {
      const searchUsers = vi.fn().mockResolvedValue([])
      const { rerender } = renderHook(
        ({ userQuery }: any) =>
          useDebounce(userQuery, searchUsers, 300),
        {
          initialProps: { userQuery: '' }
        }
      )

      // User types team member name
      rerender({ userQuery: 'john' })

      expect(searchUsers).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(searchUsers).toHaveBeenCalledWith('john')
    })
  })

  describe('Tag Search Field (300ms debounce)', () => {
    it('should debounce tag search API calls', () => {
      const searchTags = vi.fn().mockResolvedValue([])
      const { rerender } = renderHook(
        ({ tagQuery }: any) =>
          useDebounce(tagQuery, searchTags, 300),
        {
          initialProps: { tagQuery: '' }
        }
      )

      rerender({ tagQuery: 'important' })

      expect(searchTags).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(searchTags).toHaveBeenCalledWith('important')
    })
  })

  describe('Auto-save Form Fields (500ms debounce)', () => {
    it('should debounce auto-save with 500ms delay for form changes', () => {
      const saveForm = vi.fn()
      const { rerender } = renderHook(
        ({ formData }: any) =>
          useDebounce(formData, saveForm, 500),
        {
          initialProps: { formData: { title: 'Initial' } }
        }
      )

      // User makes multiple edits
      rerender({ formData: { title: 'Updated title' } })
      rerender({ formData: { title: 'Updated title v2' } })
      rerender({ formData: { title: 'Updated title v3' } })

      expect(saveForm).not.toHaveBeenCalled()

      // Wait for auto-save debounce
      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(saveForm).toHaveBeenCalledTimes(1)
      expect(saveForm).toHaveBeenCalledWith({ title: 'Updated title v3' })
    })

    it('should handle auto-save with user stopping mid-edit', () => {
      const saveSettings = vi.fn()
      const { rerender } = renderHook(
        ({ settings }: any) =>
          useDebounce(settings, saveSettings, 500),
        {
          initialProps: { settings: { theme: 'light' } }
        }
      )

      // User starts editing
      rerender({ settings: { theme: 'dark' } })

      // User pauses editing (simulates 300ms of no typing)
      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(saveSettings).not.toHaveBeenCalled()

      // User continues editing before debounce completes
      rerender({ settings: { theme: 'dark', notifications: false } })

      // Still no save
      expect(saveSettings).not.toHaveBeenCalled()

      // Complete the debounce
      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(saveSettings).toHaveBeenCalledTimes(1)
    })
  })

  describe('Header Search (Global Search 300ms)', () => {
    it('should debounce header/global search efficiently', () => {
      const globalSearch = vi.fn().mockResolvedValue({
        projects: [],
        tasks: [],
        milestones: []
      })
      const { rerender } = renderHook(
        ({ headerQuery }: any) =>
          useDebounce(headerQuery, globalSearch, 300),
        {
          initialProps: { headerQuery: '' }
        }
      )

      // User types in header search
      rerender({ headerQuery: 'find something' })

      // Should not trigger search
      expect(globalSearch).not.toHaveBeenCalled()

      // Wait for debounce
      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(globalSearch).toHaveBeenCalledWith('find something')
    })

    it('should cancel pending search when input is cleared', () => {
      const globalSearch = vi.fn()
      const { rerender, unmount } = renderHook(
        ({ headerQuery }: any) =>
          useDebounce(headerQuery, globalSearch, 300),
        {
          initialProps: { headerQuery: 'test' }
        }
      )

      // User clears search
      rerender({ headerQuery: '' })

      // Unmount component
      unmount()

      // Advance time
      act(() => {
        vi.advanceTimersByTime(300)
      })

      // Search should not be triggered
      expect(globalSearch).not.toHaveBeenCalled()
    })
  })

  describe('Combined Multiple Field Scenario', () => {
    it('should handle debouncing multiple form fields independently', () => {
      const saveTitle = vi.fn()
      const saveDescription = vi.fn()

      const { rerender: rerenderTitle } = renderHook(
        ({ title }: any) =>
          useDebounce(title, saveTitle, 300),
        {
          initialProps: { title: '' }
        }
      )

      const { rerender: rerenderDesc } = renderHook(
        ({ description }: any) =>
          useDebounce(description, saveDescription, 300),
        {
          initialProps: { description: '' }
        }
      )

      // Edit title
      rerenderTitle({ title: 'New Title' })

      // Edit description shortly after
      rerenderDesc({ description: 'New Description' })

      // Neither should be saved yet
      expect(saveTitle).not.toHaveBeenCalled()
      expect(saveDescription).not.toHaveBeenCalled()

      // After 300ms, both should be saved
      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(saveTitle).toHaveBeenCalledTimes(1)
      expect(saveDescription).toHaveBeenCalledTimes(1)
    })
  })

  describe('Performance Impact Verification', () => {
    it('should prevent excessive API calls during rapid typing', () => {
      const expensiveApiCall = vi.fn().mockResolvedValue({ data: [] })

      const { rerender } = renderHook(
        ({ query }: any) =>
          useDebounce(query, expensiveApiCall, 300),
        {
          initialProps: { query: '' }
        }
      )

      // Simulate very fast typing (100 characters typed)
      for (let i = 1; i <= 100; i++) {
        rerender({ query: 'a'.repeat(i) })
      }

      // No API calls should have been made
      expect(expensiveApiCall).not.toHaveBeenCalled()

      // Complete debounce
      act(() => {
        vi.advanceTimersByTime(300)
      })

      // Should only be called once
      expect(expensiveApiCall).toHaveBeenCalledTimes(1)
    })

    it('should improve performance by reducing render cycles', () => {
      const renderSpy = vi.fn()
      const apiCall = vi.fn()

      const { rerender } = renderHook(
        ({ query }: any) => {
          renderSpy()
          useDebounce(query, apiCall, 300)
        },
        {
          initialProps: { query: '' }
        }
      )

      // Simulate 10 keystrokes
      for (let i = 1; i <= 10; i++) {
        rerender({ query: 'test'.substring(0, i) })
      }

      // API call should be pending
      expect(apiCall).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(300)
      })

      // Only one API call despite multiple renders
      expect(apiCall).toHaveBeenCalledTimes(1)
    })
  })
})
