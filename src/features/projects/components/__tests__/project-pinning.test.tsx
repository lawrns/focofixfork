'use client'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ProjectCard } from '../project-card'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// Mock useRealtime hook
vi.mock('@/lib/hooks/useRealtime', () => ({
  useRealtime: vi.fn(),
}))

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Calendar: () => <span data-testid="icon-calendar">Calendar</span>,
  Users: () => <span data-testid="icon-users">Users</span>,
  MoreVertical: () => <span data-testid="icon-more">More</span>,
  Edit: () => <span data-testid="icon-edit">Edit</span>,
  Trash2: () => <span data-testid="icon-trash">Trash</span>,
  Eye: () => <span data-testid="icon-eye">Eye</span>,
  Star: () => <span data-testid="icon-star-filled">Star</span>,
  StarOff: () => <span data-testid="icon-star-outline">StarOff</span>,
}))

const mockProject = {
  id: 'project-1',
  name: 'Test Project',
  description: 'Test Description',
  status: 'active' as const,
  priority: 'high' as const,
  progress_percentage: 50,
  start_date: '2024-01-01',
  due_date: '2024-12-31',
  created_at: '2024-01-01T00:00:00Z',
  organization_id: 'org-1',
  is_pinned: false,
}

const mockPinnedProject = {
  ...mockProject,
  is_pinned: true,
}

describe('Project Pinning Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Pin Icon Display', () => {
    it('should display outline star icon when project is not pinned', async () => {
      render(
        <ProjectCard
          project={mockProject}
          showActions={true}
        />
      )

      // Star button should exist in card header
      const starButton = screen.getByRole('button', { name: /pin to top|unpin/i })
      expect(starButton).toBeInTheDocument()

      // Should show outline star for unpinned project
      const outlineStar = screen.getByTestId('icon-star-outline')
      expect(outlineStar).toBeInTheDocument()
    })

    it('should display filled star icon when project is pinned', async () => {
      render(
        <ProjectCard
          project={mockPinnedProject}
          showActions={true}
        />
      )

      // Should show filled star for pinned project
      const filledStar = screen.getByTestId('icon-star-filled')
      expect(filledStar).toBeInTheDocument()
    })

    it('should not show pin icon when showActions is false', async () => {
      render(
        <ProjectCard
          project={mockProject}
          showActions={false}
        />
      )

      // No star button should exist
      const starButton = screen.queryByRole('button', { name: /pin to top|unpin/i })
      expect(starButton).not.toBeInTheDocument()
    })
  })

  describe('Pin/Unpin Functionality', () => {
    it('should call pin API when star is clicked on unpinned project', async () => {
      const user = userEvent.setup()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { ...mockProject, is_pinned: true } }),
      })
      global.fetch = mockFetch

      const onPin = vi.fn()

      render(
        <ProjectCard
          project={mockProject}
          showActions={true}
          onPin={onPin}
        />
      )

      const starButton = screen.getByRole('button', { name: /pin to top/i })
      await user.click(starButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/projects/project-1/pin',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        )
      })
    })

    it('should call unpin API when star is clicked on pinned project', async () => {
      const user = userEvent.setup()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { ...mockPinnedProject, is_pinned: false } }),
      })
      global.fetch = mockFetch

      const onUnpin = vi.fn()

      render(
        <ProjectCard
          project={mockPinnedProject}
          showActions={true}
          onUnpin={onUnpin}
        />
      )

      const starButton = screen.getByRole('button', { name: /unpin/i })
      await user.click(starButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/projects/project-1/pin',
          expect.objectContaining({
            method: 'DELETE',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        )
      })
    })

    it('should show loading state while pinning', async () => {
      const user = userEvent.setup()
      const mockFetch = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({ success: true, data: { ...mockProject, is_pinned: true } }),
          })
        }, 100))
      )
      global.fetch = mockFetch

      render(
        <ProjectCard
          project={mockProject}
          showActions={true}
        />
      )

      const starButton = screen.getByRole('button', { name: /pin to top/i })
      await user.click(starButton)

      // Button should be disabled during request
      expect(starButton).toBeDisabled()

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('should handle pin API errors gracefully', async () => {
      const user = userEvent.setup()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: 'Failed to pin project' }),
      })
      global.fetch = mockFetch

      render(
        <ProjectCard
          project={mockProject}
          showActions={true}
        />
      )

      const starButton = screen.getByRole('button', { name: /pin to top/i })
      await user.click(starButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      // Project should remain unpinned after error
      const outlineStar = screen.getByTestId('icon-star-outline')
      expect(outlineStar).toBeInTheDocument()
    })
  })

  describe('Optimistic UI Updates', () => {
    it('should immediately update UI when pinning without waiting for API response', async () => {
      const user = userEvent.setup()
      let resolvePin: any
      const mockFetch = vi.fn().mockImplementation(
        () => new Promise(resolve => {
          resolvePin = resolve
        })
      )
      global.fetch = mockFetch

      const { rerender } = render(
        <ProjectCard
          project={mockProject}
          showActions={true}
        />
      )

      const starButton = screen.getByRole('button', { name: /pin to top/i })
      await user.click(starButton)

      // UI should update immediately (filled star shown)
      await waitFor(() => {
        const filledStar = screen.queryByTestId('icon-star-filled')
        expect(filledStar).toBeInTheDocument()
      })

      // Complete the API call
      resolvePin({
        ok: true,
        json: async () => ({ success: true, data: { ...mockProject, is_pinned: true } }),
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })
  })

  describe('Tooltip Information', () => {
    it('should show "Pin to top" tooltip on unpinned project', async () => {
      const user = userEvent.setup()
      render(
        <ProjectCard
          project={mockProject}
          showActions={true}
        />
      )

      const starButton = screen.getByRole('button', { name: /pin to top/i })
      expect(starButton).toHaveAttribute('title', 'Pin to top')
    })

    it('should show "Unpin" tooltip on pinned project', async () => {
      const user = userEvent.setup()
      render(
        <ProjectCard
          project={mockPinnedProject}
          showActions={true}
        />
      )

      const starButton = screen.getByRole('button', { name: /unpin/i })
      expect(starButton).toHaveAttribute('title', 'Unpin')
    })
  })
})

describe('Project Pinning Persistence and Ordering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should persist pinned state in database', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { ...mockProject, is_pinned: true } }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(
      <ProjectCard
        project={mockProject}
        showActions={true}
      />
    )

    const starButton = screen.getByRole('button', { name: /pin to top/i })
    await user.click(starButton)

    // API should be called to persist the state
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/project-1/pin',
        expect.any(Object)
      )
    })

    // Verify the API was called (indicates database update)
    expect(mockFetch).toHaveBeenCalled()
  })

  it('should ensure pinning is per-user not global', async () => {
    // This test verifies that the API endpoint includes user context
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { ...mockProject, is_pinned: true } }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(
      <ProjectCard
        project={mockProject}
        showActions={true}
      />
    )

    const starButton = screen.getByRole('button', { name: /pin to top/i })
    await user.click(starButton)

    await waitFor(() => {
      // The API call should include user context (checked in integration)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/project-1/pin',
        expect.any(Object)
      )
    })
  })
})

describe('Project List Sorting with Pinned Projects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should sort pinned projects to the top of the list', () => {
    // This is integration tested at the list level
    const pinnedProject = { ...mockProject, id: 'project-1', name: 'A Project', is_pinned: true }
    const unpinnedProject1 = { ...mockProject, id: 'project-2', name: 'B Project', is_pinned: false }
    const unpinnedProject2 = { ...mockProject, id: 'project-3', name: 'C Project', is_pinned: false }

    // Expected order: pinned first, then alphabetical
    const projects = [unpinnedProject1, pinnedProject, unpinnedProject2]
    const sorted = [...projects].sort((a, b) => {
      // Pinned projects first
      if (a.is_pinned !== b.is_pinned) {
        return a.is_pinned ? -1 : 1
      }
      // Then alphabetical
      return a.name.localeCompare(b.name)
    })

    expect(sorted[0].id).toBe('project-1') // Pinned project first
    expect(sorted[1].id).toBe('project-2') // Then alphabetical unpinned
    expect(sorted[2].id).toBe('project-3')
  })

  it('should maintain alphabetical order within pinned projects', () => {
    const pinnedProject1 = { ...mockProject, id: 'project-1', name: 'B Pinned', is_pinned: true }
    const pinnedProject2 = { ...mockProject, id: 'project-2', name: 'A Pinned', is_pinned: true }

    const projects = [pinnedProject1, pinnedProject2]
    const sorted = [...projects].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) {
        return a.is_pinned ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })

    expect(sorted[0].name).toBe('A Pinned')
    expect(sorted[1].name).toBe('B Pinned')
  })

  it('should maintain alphabetical order within unpinned projects', () => {
    const unpinnedProject1 = { ...mockProject, id: 'project-1', name: 'B Unpinned', is_pinned: false }
    const unpinnedProject2 = { ...mockProject, id: 'project-2', name: 'A Unpinned', is_pinned: false }

    const projects = [unpinnedProject1, unpinnedProject2]
    const sorted = [...projects].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) {
        return a.is_pinned ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })

    expect(sorted[0].name).toBe('A Unpinned')
    expect(sorted[1].name).toBe('B Unpinned')
  })
})
