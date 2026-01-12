import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuickFiltersSidebar } from './quick-filters-sidebar'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock fetch globally
global.fetch = vi.fn()

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/dashboard',
}))

describe('QuickFiltersSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/filters/quick-counts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: {
              assigned_to_me: 5,
              created_by_me: 3,
              due_today: 2,
              due_this_week: 8,
              overdue: 1,
              high_priority: 4,
              no_assignee: 6,
              completed: 12,
            }
          })
        })
      }
      if (url.includes('/api/filters/saved')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [
              { id: '1', name: 'My Filter 1' },
              { id: '2', name: 'My Filter 2' },
            ]
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      })
    })
  })

  describe('Rendering', () => {
    it('renders the quick filters sidebar', () => {
      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={vi.fn()}
        />
      )
      expect(screen.getByRole('region', { name: 'Quick Filters' })).toBeInTheDocument()
    })

    it('renders all pre-built filter buttons', () => {
      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={vi.fn()}
        />
      )

      expect(screen.getByRole('button', { name: /Assigned to me/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Created by me/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Due today/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Due this week/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Overdue/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /High priority/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /No assignee/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Completed/i })).toBeInTheDocument()
    })

    it('renders saved filters section', () => {
      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={vi.fn()}
        />
      )

      expect(screen.getByText('Saved Filters')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Save current filter/i })).toBeInTheDocument()
    })
  })

  describe('Badge Counts', () => {
    it('displays correct badge counts for filters', async () => {
      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })
    })

    it('displays red badge for overdue items', async () => {
      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={vi.fn()}
        />
      )

      await waitFor(() => {
        const overdueButton = screen.getByRole('button', { name: /Overdue/i })
        expect(overdueButton).toBeInTheDocument()
      })
    })
  })

  describe('Filter Interaction', () => {
    it('highlights active filter with blue background', () => {
      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={vi.fn()}
          activeFilter="assigned_to_me"
        />
      )

      const assignedButton = screen.getByRole('button', { name: /Assigned to me/i })
      expect(assignedButton).toHaveClass('bg-blue-100')
    })

    it('calls onFilterChange when filter is clicked', async () => {
      const onFilterChange = vi.fn()
      const user = userEvent.setup()

      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={onFilterChange}
        />
      )

      const assignedButton = screen.getByRole('button', { name: /Assigned to me/i })
      await user.click(assignedButton)

      expect(onFilterChange).toHaveBeenCalledWith('assigned_to_me')
    })

    it('removes filter when clicking active filter again (toggle)', async () => {
      const onFilterChange = vi.fn()
      const user = userEvent.setup()

      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={onFilterChange}
          activeFilter="assigned_to_me"
        />
      )

      const assignedButton = screen.getByRole('button', { name: /Assigned to me/i })
      await user.click(assignedButton)

      expect(onFilterChange).toHaveBeenCalledWith(null)
    })
  })

  describe('Saved Filters', () => {
    it('loads and displays saved filters', async () => {
      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('My Filter 1')).toBeInTheDocument()
      })
    })

    it('opens save current filter dialog', async () => {
      const user = userEvent.setup()

      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={vi.fn()}
        />
      )

      const saveButton = screen.getByRole('button', { name: /Save current filter/i })
      await user.click(saveButton)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={vi.fn()}
        />
      )

      expect(screen.getByRole('region', { name: 'Quick Filters' })).toBeInTheDocument()
    })

    it('announces active filter status to screen readers', () => {
      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={vi.fn()}
          activeFilter="assigned_to_me"
        />
      )

      const assignedButton = screen.getByRole('button', { name: /Assigned to me/i })
      expect(assignedButton).toHaveAttribute('aria-pressed', 'true')
    })
  })
})
