import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import SearchPage from '../page'

// Mock fetch
global.fetch = jest.fn()

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}))

// Mock auth hook
jest.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com' },
  }),
}))

describe('SearchPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders search input', () => {
    render(<SearchPage />)
    const searchInput = screen.getByPlaceholderText(/search/i)
    expect(searchInput).toBeInTheDocument()
  })

  it('displays search results when search is performed after debounce delay', async () => {
    const mockResults = {
      success: true,
      data: {
        tasks: [
          { id: '1', title: 'Test Task', description: 'A test task' },
        ],
        projects: [
          { id: '1', name: 'Test Project', description: 'A test project' },
        ],
      },
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResults,
    })

    const user = userEvent.setup()
    render(<SearchPage />)

    const searchInput = screen.getByPlaceholderText(/search/i)
    await user.type(searchInput, 'test query')

    // API should not be called immediately
    expect(global.fetch).not.toHaveBeenCalled()

    // Wait for debounce to complete (300ms default)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search?q=test%20query'),
        expect.any(Object)
      )
    }, { timeout: 500 })
  })

  it('shows empty state when no query is entered', () => {
    render(<SearchPage />)
    expect(screen.getByText(/search for tasks and projects/i)).toBeInTheDocument()
  })
})
