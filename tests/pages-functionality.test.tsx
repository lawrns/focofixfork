import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock all external dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useParams: () => ({ id: 'test-id' }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  notFound: vi.fn(),
}))

// Use importOriginal to auto-mock all lucide-react icons so new icon imports never break tests
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  const mocked: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(actual)) {
    if (typeof value === 'function' && /^[A-Z]/.test(key)) {
      mocked[key] = () => key
    } else {
      mocked[key] = value
    }
  }
  return mocked
})

vi.mock('../src/lib/supabase-client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  },
}))

vi.mock('../src/lib/supabase-server', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  },
}))

vi.mock('../src/lib/i18n/context', () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => children,
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
}))

vi.mock('../src/lib/contexts/auth-context', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}))

vi.mock('../src/components/layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}))

vi.mock('../src/components/auth/protected-route', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
  Toaster: () => null,
}))

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => {
      // Return a forwarding component for motion.div, motion.span, etc.
      return ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
        const { initial, animate, exit, transition, whileHover, whileTap, variants, layout, ...domProps } = props
        const Tag = prop as string
        return <div data-motion-tag={Tag} {...(domProps as Record<string, unknown>)}>{children}</div>
      }
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('next/script', () => ({
  default: () => null,
}))

vi.mock('../src/lib/stores/project-store', () => ({
  projectStore: {
    setProjects: vi.fn(),
    subscribe: vi.fn().mockReturnValue(vi.fn()),
  },
}))

// Mock fetch
global.fetch = vi.fn()

// Mock window.location.reload
const mockReload = vi.fn()
Object.defineProperty(window, 'location', {
  value: {
    reload: mockReload,
  },
  writable: true,
})

// Mock window.confirm
const mockConfirm = vi.fn(() => true)
global.confirm = mockConfirm

// Mock window.alert
const mockAlert = vi.fn()
global.alert = mockAlert

describe('Pages Functionality Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReload.mockClear()
    mockConfirm.mockClear()
    mockAlert.mockClear()
  })

  describe('Basic Page Rendering', () => {
    it('should redirect projects page to /empire/missions', async () => {
      // Projects page now redirects to /empire/missions
      const nav = await import('next/navigation')
      const { default: ProjectsPage } = await import('../src/app/projects/page')
      ProjectsPage()

      expect(nav.redirect).toHaveBeenCalledWith('/empire/missions')
    })

    it('should render milestones page without crashing', async () => {
      // Mock fetch for milestones
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [
            { id: 'milestone-1', name: 'Test Milestone 1', description: 'Milestone Desc 1', status: 'in-progress', priority: 'high', due_date: '2025-12-31', project_id: 'project-1' },
          ],
        }),
      } as Response)

      const { default: MilestonesPage } = await import('../src/app/milestones/page')
      render(<MilestonesPage />)

      expect(screen.getByTestId('main-layout')).toBeInTheDocument()
    })

    it('should redirect tasks page to /my-work', async () => {
      // Tasks page now permanently redirects to /my-work
      const nav = await import('next/navigation')
      const { default: TasksPage } = await import('../src/app/tasks/page')
      TasksPage()

      expect(nav.permanentRedirect).toHaveBeenCalledWith('/my-work')
    })

    it('should render organizations page without crashing', async () => {
      // Mock fetch for organizations
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [
            { id: 'org-1', name: 'Test Org', is_active: true, created_by: 'user-1', created_at: '2023-01-01' },
          ],
        }),
      } as Response)

      const { default: OrganizationsPage } = await import('../src/app/organizations/page')
      render(<OrganizationsPage />)

      expect(screen.getByTestId('main-layout')).toBeInTheDocument()
    })
  })

  describe('API Integration Tests', () => {
    it('should load and display milestone data from API', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [
            { id: 'milestone-1', name: 'Test Milestone 1', description: 'Milestone Desc 1', status: 'in-progress', priority: 'high', due_date: '2025-12-31', project_id: 'project-1' },
          ],
        }),
      } as Response)

      const { default: MilestonesPage } = await import('../src/app/milestones/page')
      render(<MilestonesPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Milestone 1')).toBeInTheDocument()
      })

      // Verify API was called for both projects and milestones
      expect(fetch).toHaveBeenCalledWith('/api/projects')
      expect(fetch).toHaveBeenCalledWith('/api/milestones')
    })

    it('should show empty state when no milestones exist', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [],
        }),
      } as Response)

      const { default: MilestonesPage } = await import('../src/app/milestones/page')
      render(<MilestonesPage />)

      await waitFor(() => {
        expect(screen.getByText('No milestones yet')).toBeInTheDocument()
      })
    })

    it('should display milestone details after loading', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [
            { id: 'milestone-1', name: 'Test Milestone 1', description: 'Milestone Desc 1', status: 'in-progress', priority: 'high', due_date: '2025-12-31', project_id: 'project-1' },
          ],
        }),
      } as Response)

      const { default: MilestonesPage } = await import('../src/app/milestones/page')
      render(<MilestonesPage />)

      // Milestone name and description should be visible
      await waitFor(() => {
        expect(screen.getByText('Test Milestone 1')).toBeInTheDocument()
      })

      // Quick stats should show counts
      expect(screen.getByText('Total Milestones')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const { default: MilestonesPage } = await import('../src/app/milestones/page')
      render(<MilestonesPage />)

      // Should not crash and should render the layout
      await waitFor(() => {
        expect(screen.getAllByTestId('main-layout')).toHaveLength(1)
      })
    })

    it('should handle empty data responses', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [],
        }),
      } as Response)

      const { default: MilestonesPage } = await import('../src/app/milestones/page')
      render(<MilestonesPage />)

      await waitFor(() => {
        expect(screen.getByTestId('main-layout')).toBeInTheDocument()
      })
    })
  })
})
