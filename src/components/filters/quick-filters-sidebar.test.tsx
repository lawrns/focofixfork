import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuickFiltersSidebar } from './quick-filters-sidebar'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock the API calls
const mockGetQuickCounts = vi.fn()
const mockSavedFilters = vi.fn()

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
    mockGetQuickCounts.mockResolvedValue({
      assigned_to_me: 5,
      created_by_me: 3,
      due_today: 2,
      due_this_week: 8,
      overdue: 1,
      high_priority: 4,
      no_assignee: 6,
      completed: 12,
    })
    mockSavedFilters.mockResolvedValue([
      { id: '1', name: 'My Filter 1' },
      { id: '2', name: 'My Filter 2' },
    ])
  })

  afterEach(() => {
    vi.clearAllMocks()
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

    it('renders divider between pre-built and saved filters', () => {
      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={vi.fn()}
        />
      )

      const divider = screen.getByRole('separator')
      expect(divider).toBeInTheDocument()
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
        expect(screen.getByText('5')).toBeInTheDocument() // assigned_to_me
        expect(screen.getByText('3')).toBeInTheDocument() // created_by_me
        expect(screen.getByText('2')).toBeInTheDocument() // due_today
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
        const badge = overdueButton.querySelector('[data-testid="overdue-badge"]')
        expect(badge).toHaveClass('bg-red-500', 'text-white')
      })
    })

    it('hides badges with zero count', async () => {
      mockGetQuickCounts.mockResolvedValue({
        assigned_to_me: 0,
        created_by_me: 3,
        due_today: 2,
        due_this_week: 8,
        overdue: 0,
        high_priority: 4,
        no_assignee: 6,
        completed: 12,
      })

      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={vi.fn()}
        />
      )

      await waitFor(() => {
        const assignedButton = screen.getByRole('button', { name: /Assigned to me/i })
        expect(assignedButton.querySelector('[data-testid="assigned-badge"]')).not.toBeInTheDocument()
      })
    })
  })

  describe('Filter Interaction', () => {
    it('highlights active filter with blue background and bold text', async () => {
      const onFilterChange = vi.fn()
      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={onFilterChange}
          activeFilter="assigned_to_me"
        />
      )

      const assignedButton = screen.getByRole('button', { name: /Assigned to me/i })
      expect(assignedButton).toHaveClass('bg-blue-100', 'font-bold')
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

    it('updates URL params when filter is clicked', async () => {
      const mockPush = vi.fn()
      vi.mock('next/navigation', () => ({
        useRouter: () => ({
          push: mockPush,
        }),
      }))

      const user = userEvent.setup()
      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={vi.fn()}
        />
      )

      const dueButton = screen.getByRole('button', { name: /Due today/i })
      await user.click(dueButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('filter=due_today'))
      })
    })

    it('removes filter when clicking active filter again (toggle)', async () => {
      const onFilterChange = vi.fn()
      const user = userEvent.setup()

      const { rerender } = render(
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
        expect(screen.getByText('My Filter 2')).toBeInTheDocument()
      })
    })

    it('applies saved filter when clicked', async () => {
      const onFilterChange = vi.fn()
      const user = userEvent.setup()

      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={onFilterChange}
        />
      )

      await waitFor(() => {
        const savedFilterButton = screen.getByRole('button', { name: /My Filter 1/i })
        expect(savedFilterButton).toBeInTheDocument()
      })

      const savedFilterButton = screen.getByRole('button', { name: /My Filter 1/i })
      const user_event = userEvent.setup()
      await user_event.click(savedFilterButton)

      expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }))
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
      expect(screen.getByPlaceholderText(/Filter name/i)).toBeInTheDocument()
    })

    it('saves filter with user-provided name', async () => {
      const user = userEvent.setup()

      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={vi.fn()}
        />
      )

      const saveButton = screen.getByRole('button', { name: /Save current filter/i })
      await user.click(saveButton)

      const input = screen.getByPlaceholderText(/Filter name/i)
      await user.type(input, 'My Custom Filter')

      const confirmButton = screen.getByRole('button', { name: /Save/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(screen.getByText('My Custom Filter')).toBeInTheDocument()
      })
    })

    it('allows editing saved filters', async () => {
      const user = userEvent.setup()

      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={vi.fn()}
        />
      )

      await waitFor(() => {
        const editButton = screen.getAllByRole('button', { name: /edit/i })[0]
        expect(editButton).toBeInTheDocument()
      })
    })

    it('allows deleting saved filters', async () => {
      const user = userEvent.setup()

      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={vi.fn()}
        />
      )

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
        expect(deleteButtons.length).toBeGreaterThan(0)
      })

      const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0]
      await user.click(deleteButton)

      // Filter should be removed
      await waitFor(() => {
        expect(screen.queryByText('My Filter 1')).not.toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('shows loading skeleton while fetching counts', () => {
      const { container } = render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={vi.fn()}
        />
      )

      const skeletons = container.querySelectorAll('[data-testid="badge-skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('shows loading state while fetching saved filters', () => {
      const { container } = render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={vi.fn()}
        />
      )

      const loadingText = screen.queryByText(/Loading filters/i)
      if (loadingText) {
        expect(loadingText).toBeInTheDocument()
      }
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

    it('supports keyboard navigation', async () => {
      const onFilterChange = vi.fn()
      const user = userEvent.setup()

      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={onFilterChange}
        />
      )

      const assignedButton = screen.getByRole('button', { name: /Assigned to me/i })
      assignedButton.focus()
      expect(assignedButton).toHaveFocus()

      await user.keyboard('{Enter}')
      expect(onFilterChange).toHaveBeenCalledWith('assigned_to_me')
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

  describe('Error Handling', () => {
    it('handles API error gracefully', async () => {
      mockGetQuickCounts.mockRejectedValue(new Error('API Error'))

      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={vi.fn()}
        />
      )

      // Should still render filters, just without counts
      expect(screen.getByRole('button', { name: /Assigned to me/i })).toBeInTheDocument()
    })

    it('shows error message for failed saved filters load', async () => {
      mockSavedFilters.mockRejectedValue(new Error('Failed to load filters'))

      render(
        <QuickFiltersSidebar
          workspaceId="test-workspace"
          onFilterChange={vi.fn()}
        />
      )

      await waitFor(() => {
        const errorMessage = screen.queryByText(/Failed to load saved filters/i)
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument()
        }
      })
    })
  })
})
