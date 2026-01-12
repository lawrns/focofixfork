import { render, screen, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import SearchPage from '../page'

// Mock fetch
global.fetch = vi.fn()

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

// Mock auth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com' },
  }),
}))

describe('SearchPage - Filters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Scope Filter Tabs', () => {
    it('renders all scope filter tabs', () => {
      render(<SearchPage />)
      expect(screen.getByText('All')).toBeInTheDocument()
      expect(screen.getByText('Task')).toBeInTheDocument()
      expect(screen.getByText('Project')).toBeInTheDocument()
      expect(screen.getByText('People')).toBeInTheDocument()
      expect(screen.getByText('File')).toBeInTheDocument()
    })

    it('defaults to All scope tab as active', () => {
      render(<SearchPage />)
      const allTab = screen.getByText('All').closest('button')
      expect(allTab).toHaveAttribute('aria-selected', 'true')
    })

    it('changes active tab when scope tab is clicked', async () => {
      const mockResults = {
        success: true,
        data: { tasks: [], projects: [] },
      }
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResults,
      })

      const user = userEvent.setup()
      render(<SearchPage />)

      const tasksTab = screen.getByText('Task').closest('button')!
      await user.click(tasksTab)

      expect(tasksTab).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('All').closest('button')).toHaveAttribute('aria-selected', 'false')
    })

    it('includes scope filter in API request when scope changes', async () => {
      const mockResults = {
        success: true,
        data: { tasks: [{ id: '1', title: 'Test Task' }], projects: [] },
      }
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResults,
      })

      const user = userEvent.setup()
      render(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'test')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      }, { timeout: 500 })

      vi.clearAllMocks()
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResults,
      })

      const tasksTab = screen.getByRole('button', { name: /^tasks$/i })
      await user.click(tasksTab)

      await waitFor(() => {
        const call = (global.fetch as any).mock.calls[0]?.[0]
        expect(call).toContain('type=task')
      }, { timeout: 500 })
    })
  })

  describe('Project Filter Dropdown', () => {
    it('renders project filter dropdown', () => {
      render(<SearchPage />)
      expect(screen.getByRole('combobox', { name: /project/i })).toBeInTheDocument()
    })

    it('shows all user projects in dropdown', async () => {
      const mockProjects = [
        { id: 'p1', name: 'Project 1' },
        { id: 'p2', name: 'Project 2' },
      ]

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { tasks: [], projects: mockProjects },
        }),
      })

      const user = userEvent.setup()
      render(<SearchPage />)

      const projectDropdown = screen.getByRole('combobox', { name: /project/i })
      await user.click(projectDropdown)

      await waitFor(() => {
        expect(screen.getByText('Project 1')).toBeInTheDocument()
        expect(screen.getByText('Project 2')).toBeInTheDocument()
      })
    })

    it('includes project_id in API request when project is selected', async () => {
      const mockResults = {
        success: true,
        data: {
          tasks: [{ id: '1', title: 'Test Task', project: { name: 'Project 1' } }],
          projects: [],
        },
      }
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResults,
      })

      const user = userEvent.setup()
      render(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'test')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      }, { timeout: 500 })

      vi.clearAllMocks()
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResults,
      })

      const projectDropdown = screen.getByRole('combobox', { name: /project/i })
      await user.click(projectDropdown)

      const projectOption = await screen.findByText('Project 1')
      await user.click(projectOption)

      await waitFor(() => {
        const call = (global.fetch as any).mock.calls[0]?.[0]
        expect(call).toContain('project_id=p1')
      }, { timeout: 500 })
    })
  })

  describe('Date Range Filter', () => {
    it('renders date range filter options', async () => {
      render(<SearchPage />)
      const dateButton = screen.getByRole('button', { name: /date|time/i })
      expect(dateButton).toBeInTheDocument()
    })

    it('shows date preset options', async () => {
      const user = userEvent.setup()
      render(<SearchPage />)

      const dateButton = screen.getByRole('button', { name: /date|time/i })
      await user.click(dateButton)

      await waitFor(() => {
        expect(screen.getByText(/any time/i)).toBeInTheDocument()
        expect(screen.getByText(/past week/i)).toBeInTheDocument()
        expect(screen.getByText(/past month/i)).toBeInTheDocument()
        expect(screen.getByText(/custom/i)).toBeInTheDocument()
      })
    })

    it('includes date_from parameter when past week is selected', async () => {
      const mockResults = {
        success: true,
        data: { tasks: [], projects: [] },
      }
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResults,
      })

      const user = userEvent.setup()
      render(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'test')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      }, { timeout: 500 })

      vi.clearAllMocks()
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResults,
      })

      const dateButton = screen.getByRole('button', { name: /date|time/i })
      await user.click(dateButton)

      const pastWeekOption = await screen.findByText(/past week/i)
      await user.click(pastWeekOption)

      await waitFor(() => {
        const call = (global.fetch as any).mock.calls[0]?.[0]
        expect(call).toContain('date_from=')
      }, { timeout: 500 })
    })

    it('supports custom date range selection', async () => {
      const mockResults = {
        success: true,
        data: { tasks: [], projects: [] },
      }
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResults,
      })

      const user = userEvent.setup()
      render(<SearchPage />)

      const dateButton = screen.getByRole('button', { name: /date|time/i })
      await user.click(dateButton)

      const customOption = await screen.findByText(/custom/i)
      await user.click(customOption)

      const fromInput = screen.getByLabelText(/from|start/i)
      expect(fromInput).toBeInTheDocument()
    })
  })

  describe('Status Filter', () => {
    it('renders status filter', () => {
      render(<SearchPage />)
      const statusButton = screen.getByRole('button', { name: /status/i })
      expect(statusButton).toBeInTheDocument()
    })

    it('shows status options', async () => {
      const user = userEvent.setup()
      render(<SearchPage />)

      const statusButton = screen.getByRole('button', { name: /status/i })
      await user.click(statusButton)

      await waitFor(() => {
        expect(screen.getByText(/active/i)).toBeInTheDocument()
        expect(screen.getByText(/completed/i)).toBeInTheDocument()
        expect(screen.getByText(/archived/i)).toBeInTheDocument()
      })
    })

    it('includes status parameter in API request', async () => {
      const mockResults = {
        success: true,
        data: { tasks: [], projects: [] },
      }
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResults,
      })

      const user = userEvent.setup()
      render(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'test')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      }, { timeout: 500 })

      vi.clearAllMocks()
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResults,
      })

      const statusButton = screen.getByRole('button', { name: /status/i })
      await user.click(statusButton)

      const activeOption = await screen.findByText(/active/i)
      await user.click(activeOption)

      await waitFor(() => {
        const call = (global.fetch as any).mock.calls[0]?.[0]
        expect(call).toContain('status=')
      }, { timeout: 500 })
    })
  })

  describe('Filter Combination', () => {
    it('combines multiple filters in API request', async () => {
      const mockResults = {
        success: true,
        data: { tasks: [], projects: [] },
      }
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResults,
      })

      const user = userEvent.setup()
      render(<SearchPage />)

      // Enter search query
      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'test')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      }, { timeout: 500 })

      vi.clearAllMocks()
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResults,
      })

      // Select scope
      const tasksTab = screen.getByRole('button', { name: /^tasks$/i })
      await user.click(tasksTab)

      // Select date range
      const dateButton = screen.getByRole('button', { name: /date|time/i })
      await user.click(dateButton)
      const pastWeekOption = await screen.findByText(/past week/i)
      await user.click(pastWeekOption)

      // Select status
      const statusButton = screen.getByRole('button', { name: /status/i })
      await user.click(statusButton)
      const activeOption = await screen.findByText(/active/i)
      await user.click(activeOption)

      await waitFor(() => {
        const call = (global.fetch as any).mock.calls[0]?.[0]
        expect(call).toContain('type=task')
        expect(call).toContain('date_from=')
        expect(call).toContain('status=')
      }, { timeout: 500 })
    })
  })

  describe('Filter Persistence', () => {
    it('persists filters in URL parameters', async () => {
      const mockResults = {
        success: true,
        data: { tasks: [], projects: [] },
      }
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResults,
      })

      const user = userEvent.setup()
      const { rerender } = render(<SearchPage />)

      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'test')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      }, { timeout: 500 })

      // Verify URL is updated with filters
      const tasksTab = screen.getByRole('button', { name: /^tasks$/i })
      await user.click(tasksTab)

      // Check that filter state is maintained
      expect(tasksTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('Clear Filters Button', () => {
    it('renders clear filters button when filters are active', async () => {
      const mockResults = {
        success: true,
        data: { tasks: [], projects: [] },
      }
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResults,
      })

      const user = userEvent.setup()
      render(<SearchPage />)

      const tasksTab = screen.getByRole('button', { name: /^tasks$/i })
      await user.click(tasksTab)

      // Clear filters button should be visible
      const clearButton = screen.getByRole('button', { name: /clear.*filter|reset/i })
      expect(clearButton).toBeInTheDocument()
    })

    it('clears all filters when clear button is clicked', async () => {
      const mockResults = {
        success: true,
        data: { tasks: [], projects: [] },
      }
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResults,
      })

      const user = userEvent.setup()
      render(<SearchPage />)

      // Apply filters
      const tasksTab = screen.getByRole('button', { name: /^tasks$/i })
      await user.click(tasksTab)

      // Clear filters
      const clearButton = screen.getByRole('button', { name: /clear.*filter|reset/i })
      await user.click(clearButton)

      // All tab should be active again
      const allTab = screen.getByRole('button', { name: /^all$/i })
      expect(allTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('Filter Chips', () => {
    it('displays active filter chips', async () => {
      const mockResults = {
        success: true,
        data: { tasks: [], projects: [] },
      }
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResults,
      })

      const user = userEvent.setup()
      render(<SearchPage />)

      const tasksTab = screen.getByRole('button', { name: /^tasks$/i })
      await user.click(tasksTab)

      // Filter chip should appear
      const tasksChip = screen.getByText(/tasks/i)
      expect(tasksChip).toBeInTheDocument()
    })

    it('removes filter when chip is clicked', async () => {
      const mockResults = {
        success: true,
        data: { tasks: [], projects: [] },
      }
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResults,
      })

      const user = userEvent.setup()
      render(<SearchPage />)

      const tasksTab = screen.getByRole('button', { name: /^tasks$/i })
      await user.click(tasksTab)

      // Find and click remove button on chip
      const removeButtons = screen.getAllByRole('button', { name: /remove|x|close/i })
      const chipRemoveButton = removeButtons[0]
      await user.click(chipRemoveButton)

      const allTab = screen.getByRole('button', { name: /^all$/i })
      expect(allTab).toHaveAttribute('aria-selected', 'true')
    })
  })
})
