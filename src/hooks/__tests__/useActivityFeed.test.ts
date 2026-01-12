import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useActivityFeed } from '../useActivityFeed'

// Mock fetch
global.fetch = vi.fn()

describe('useActivityFeed Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockActivities = [
    {
      id: '1',
      type: 'task_created' as const,
      user: {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
      },
      description: 'created a new task',
      timestamp: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'task_updated' as const,
      user: {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
      },
      description: 'updated the task',
      timestamp: new Date().toISOString(),
    },
  ]

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useActivityFeed({ autoFetch: false }))

    expect(result.current.activities).toEqual([])
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('should fetch activities on mount', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { data: mockActivities, pagination: { total: 2 } },
      }),
    } as any)

    const { result } = renderHook(() => useActivityFeed({ autoFetch: true }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.activities).toEqual(mockActivities)
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch errors', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: 'Server error',
      }),
    } as any)

    const { result } = renderHook(() => useActivityFeed({ autoFetch: true }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
  })

  it('should support project filtering', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { data: mockActivities },
      }),
    } as any)

    renderHook(() => useActivityFeed({ projectId: 'project-1', autoFetch: true }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    const call = mockFetch.mock.calls[0][0] as string
    expect(call).toContain('project_id=project-1')
  })

  it('should support pagination with loadMore', async () => {
    const mockFetch = vi.mocked(global.fetch)

    // First call - initial fetch (full page)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { data: [mockActivities[0], mockActivities[1]], pagination: { total: 3 } },
      }),
    } as any)

    // Second call - load more (partial page = no more)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { data: [mockActivities[0]], pagination: { total: 3 } },
      }),
    } as any)

    const { result } = renderHook(() => useActivityFeed({ limit: 2, autoFetch: true }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.activities).toHaveLength(2)
    expect(result.current.hasMore).toBe(true)

    await result.current.loadMore()

    await waitFor(() => {
      expect(result.current.activities).toHaveLength(3)
      expect(result.current.hasMore).toBe(false)
    })
  })

  it('should support refetch', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { data: mockActivities },
      }),
    } as any)

    const { result } = renderHook(() => useActivityFeed({ autoFetch: true }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const initialCallCount = mockFetch.mock.calls.length

    await result.current.refetch()

    await waitFor(() => {
      expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount)
    })
  })

  it('should respect custom limit', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { data: mockActivities },
      }),
    } as any)

    renderHook(() => useActivityFeed({ limit: 100, autoFetch: true }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    const call = mockFetch.mock.calls[0][0] as string
    expect(call).toContain('limit=100')
  })

  it('should not auto-fetch when autoFetch is false', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { data: mockActivities },
      }),
    } as any)

    const { result } = renderHook(() => useActivityFeed({ autoFetch: false }))

    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.current.loading).toBe(true)
  })
})
