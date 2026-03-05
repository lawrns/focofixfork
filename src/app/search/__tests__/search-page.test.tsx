import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SearchPage from '../page'

global.fetch = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}))

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com' },
  }),
}))

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { tasks: [], projects: [] } }),
    })
  })

  it('renders search input', () => {
    render(<SearchPage />)
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('shows empty state when no query is entered', () => {
    render(<SearchPage />)
    expect(screen.getAllByText(/search for tasks and projects/i).length).toBeGreaterThan(0)
  })

  it('performs search after debounce', async () => {
    const user = userEvent.setup()
    render(<SearchPage />)

    await user.type(screen.getByPlaceholderText(/search/i), 'test query')

    await waitFor(() => {
      expect((global.fetch as any).mock.calls.length).toBeGreaterThan(0)
      const urls = (global.fetch as any).mock.calls.map((call: any[]) => String(call[0]))
      const hasQuery = urls.some((url: string) => {
        if (!url.includes('/api/search?')) return false
        const parsed = new URL(url, 'http://localhost')
        return parsed.searchParams.get('q') === 'test query'
      })
      expect(hasQuery).toBe(true)
    }, { timeout: 1000 })
  })
})
