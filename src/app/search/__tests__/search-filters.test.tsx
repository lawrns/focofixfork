import { render, screen, waitFor } from '@testing-library/react'
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
      expect(allTab).toHaveAttribute('aria-pressed', 'true')
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

      expect(tasksTab).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByText('All').closest('button')).toHaveAttribute('aria-pressed', 'false')
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

      const tasksTab = screen.getByText('Task').closest('button')!
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
      expect(screen.getByLabelText(/project/i)).toBeInTheDocument()
    })

    it('has All Projects as default option', () => {
      render(<SearchPage />)
      const select = screen.getByLabelText(/project/i) as HTMLSelectElement
      expect(select.value).toBe('')
      expect(screen.getByText('All Projects')).toBeInTheDocument()
    })
  })

  describe('Date Range Filter', () => {
    it('renders date filter button', () => {
      render(<SearchPage />)
      const dateButton = Array.from(screen.getAllByRole('button')).find(
        b => b.textContent?.includes('Date')
      )
      expect(dateButton).toBeInTheDocument()
    })

    it('shows date preset options when clicked', async () => {
      const user = userEvent.setup()
      render(<SearchPage />)

      const dateButton = Array.from(screen.getAllByRole('button')).find(
        b => b.textContent?.includes('Date')
      )!
      await user.click(dateButton)

      await waitFor(() => {
        expect(screen.getByText(/any time/i)).toBeInTheDocument()
        expect(screen.getByText(/past week/i)).toBeInTheDocument()
        expect(screen.getByText(/past month/i)).toBeInTheDocument()
        expect(screen.getByText(/custom/i)).toBeInTheDocument()
      })
    })
  })

  describe('Status Filter', () => {
    it('renders status filter button', () => {
      render(<SearchPage />)
      const statusButton = Array.from(screen.getAllByRole('button')).find(
        b => b.textContent?.includes('Status')
      )
      expect(statusButton).toBeInTheDocument()
    })

    it('shows status options when clicked', async () => {
      const user = userEvent.setup()
      render(<SearchPage />)

      const statusButton = Array.from(screen.getAllByRole('button')).find(
        b => b.textContent?.includes('Status')
      )!
      await user.click(statusButton)

      await waitFor(() => {
        expect(screen.getByText(/active/i)).toBeInTheDocument()
        expect(screen.getByText(/completed/i)).toBeInTheDocument()
        expect(screen.getByText(/archived/i)).toBeInTheDocument()
      })
    })
  })

  describe('Clear Filters Button', () => {
    it('does not show clear button when no filters are active', () => {
      render(<SearchPage />)
      const clearButtons = screen.queryAllByRole('button').filter(
        b => b.textContent?.includes('Clear')
      )
      expect(clearButtons.length).toBe(0)
    })

    it('shows clear button when filters are active', async () => {
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

      await waitFor(() => {
        const clearButton = screen.queryAllByRole('button').find(
          b => b.textContent?.includes('Clear')
        )
        expect(clearButton).toBeInTheDocument()
      })
    })
  })

  describe('API Request with Filters', () => {
    it('sends type parameter when scope filter is applied', async () => {
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

      const projectTab = screen.getByText('Project').closest('button')!
      await user.click(projectTab)

      await waitFor(() => {
        const calls = (global.fetch as any).mock.calls
        const lastCall = calls[calls.length - 1]?.[0]
        expect(lastCall).toContain('type=project')
      }, { timeout: 500 })
    })

    it('sends status parameter when status filter is applied', async () => {
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

      const statusButton = Array.from(screen.getAllByRole('button')).find(
        b => b.textContent?.includes('Status')
      )!
      await user.click(statusButton)

      const activeOption = await screen.findByText(/^Active$/)
      await user.click(activeOption)

      await waitFor(() => {
        const calls = (global.fetch as any).mock.calls
        const lastCall = calls[calls.length - 1]?.[0]
        expect(lastCall).toContain('status=')
      }, { timeout: 500 })
    })
  })

  describe('Filter Persistence', () => {
    it('maintains filter state in component', async () => {
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

      expect(tasksTab).toHaveAttribute('aria-pressed', 'true')
    })
  })
})
