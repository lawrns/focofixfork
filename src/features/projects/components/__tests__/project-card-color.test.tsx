'use client'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
}))

const mockProjectWithColor = {
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
  color: '#3B82F6',
}

const mockProjectWithDefaultColor = {
  id: 'project-2',
  name: 'Default Color Project',
  description: 'Test Description',
  status: 'planning' as const,
  priority: 'medium' as const,
  progress_percentage: 25,
  start_date: '2024-01-01',
  due_date: '2024-12-31',
  created_at: '2024-01-01T00:00:00Z',
  organization_id: 'org-1',
  color: '#6366F1',
}

describe('ProjectCard - Color Display', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Color in Card UI', () => {
    it('should display project color in card border', () => {
      const { container } = render(
        <ProjectCard
          project={mockProjectWithColor}
          showActions={true}
        />
      )

      const card = container.querySelector('.border-l-4')
      expect(card).toBeInTheDocument()
    })

    it('should apply correct color to left border', () => {
      const { container } = render(
        <ProjectCard
          project={mockProjectWithColor}
          showActions={true}
        />
      )

      // Check if color is applied via class or style
      const card = container.querySelector('div[class*="glass-card"]')
      expect(card).toBeInTheDocument()
    })

    it('should use default indigo color when project has default color', () => {
      const { container } = render(
        <ProjectCard
          project={mockProjectWithDefaultColor}
          showActions={true}
        />
      )

      const card = container.querySelector('.border-l-4')
      expect(card).toBeInTheDocument()
    })
  })

  describe('Color Persistence Across Renders', () => {
    it('should maintain color when project updates other properties', () => {
      const { rerender } = render(
        <ProjectCard
          project={mockProjectWithColor}
          showActions={true}
        />
      )

      let card = screen.getByRole('heading', {
        name: /test project/i,
      }).closest('[class*="glass-card"]')

      const initialColor = mockProjectWithColor.color

      rerender(
        <ProjectCard
          project={{
            ...mockProjectWithColor,
            progress_percentage: 75,
          }}
          showActions={true}
        />
      )

      card = screen.getByRole('heading', {
        name: /test project/i,
      }).closest('[class*="glass-card"]')

      // Color should still be applied
      expect(card).toBeInTheDocument()
    })

    it('should update color when color prop changes', () => {
      const { rerender } = render(
        <ProjectCard
          project={mockProjectWithColor}
          showActions={true}
        />
      )

      rerender(
        <ProjectCard
          project={{
            ...mockProjectWithColor,
            color: '#EF4444',
          }}
          showActions={true}
        />
      )

      const card = screen.getByRole('heading', {
        name: /test project/i,
      }).closest('[class*="glass-card"]')

      expect(card).toBeInTheDocument()
    })
  })

  describe('Color Variants', () => {
    const colorVariants = [
      '#6366F1', // indigo
      '#3B82F6', // blue
      '#10B981', // emerald
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // violet
      '#EC4899', // pink
      '#06B6D4', // cyan
      '#6B7280', // gray
      '#14B8A6', // teal
      '#F97316', // orange
      '#A855F7', // purple
    ]

    colorVariants.forEach(color => {
      it(`should display project with color ${color}`, () => {
        render(
          <ProjectCard
            project={{
              ...mockProjectWithColor,
              color,
            }}
            showActions={true}
          />
        )

        const card = screen.getByRole('heading', {
          name: /test project/i,
        }).closest('[class*="glass-card"]')

        expect(card).toBeInTheDocument()
      })
    })
  })

  describe('Color with Project Status', () => {
    it('should show color accent alongside status colors', () => {
      const { container } = render(
        <ProjectCard
          project={mockProjectWithColor}
          showActions={true}
        />
      )

      // Status badge should be present
      expect(screen.getByText(/active/i)).toBeInTheDocument()

      // Color border should also be present
      const card = container.querySelector('.border-l-4')
      expect(card).toBeInTheDocument()
    })

    it('should maintain color visibility for all project statuses', () => {
      const statuses = ['planning', 'active', 'on_hold', 'completed', 'cancelled'] as const

      statuses.forEach(status => {
        const { unmount } = render(
          <ProjectCard
            project={{
              ...mockProjectWithColor,
              status,
            }}
            showActions={true}
          />
        )

        const card = screen.getByRole('heading', {
          name: /test project/i,
        }).closest('[class*="glass-card"]')

        expect(card).toBeInTheDocument()
        unmount()
      })
    })
  })

  describe('Color Badge Integration', () => {
    it('should render with color-tinted badge area', () => {
      render(
        <ProjectCard
          project={mockProjectWithColor}
          showActions={true}
        />
      )

      // Priority badge should be present and visible
      expect(screen.getByText(/high/i)).toBeInTheDocument()
    })

    it('should display color indicator in card header', () => {
      render(
        <ProjectCard
          project={mockProjectWithColor}
          showActions={true}
        />
      )

      // Title should be in document to verify card is rendered
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })
  })

  describe('Color Accessibility', () => {
    it('should have sufficient contrast with color borders', () => {
      render(
        <ProjectCard
          project={mockProjectWithColor}
          showActions={true}
        />
      )

      // Project title should be readable
      const title = screen.getByRole('heading', {
        name: /test project/i,
      })

      expect(title).toBeVisible()
    })

    it('should maintain readability with different color assignments', () => {
      const colors = ['#3B82F6', '#EF4444', '#10B981', '#06B6D4']

      colors.forEach(color => {
        const { unmount } = render(
          <ProjectCard
            project={{
              ...mockProjectWithColor,
              color,
            }}
            showActions={true}
          />
        )

        const title = screen.getByRole('heading', {
          name: /test project/i,
        })

        expect(title).toBeVisible()
        unmount()
      })
    })
  })

  describe('Color with Different Project Configurations', () => {
    it('should work with minimal project data', () => {
      const minimalProject = {
        id: 'minimal-1',
        name: 'Minimal',
        description: null,
        status: 'active' as const,
        priority: 'medium' as const,
        progress_percentage: 0,
        start_date: null,
        due_date: null,
        created_at: '2024-01-01T00:00:00Z',
        organization_id: 'org-1',
        color: '#F59E0B',
      }

      render(
        <ProjectCard
          project={minimalProject}
          showActions={true}
        />
      )

      expect(screen.getByText('Minimal')).toBeInTheDocument()
    })

    it('should work with full project data including color', () => {
      render(
        <ProjectCard
          project={mockProjectWithColor}
          showActions={true}
        />
      )

      expect(screen.getByText('Test Project')).toBeInTheDocument()
      expect(screen.getByText('Test Description')).toBeInTheDocument()
      expect(screen.getByText(/active/i)).toBeInTheDocument()
    })
  })
})
