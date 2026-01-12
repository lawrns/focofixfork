import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest'
import Sidebar from '../Sidebar'
import { projectStore } from '@/lib/stores/project-store'
import { useAuth } from '@/lib/hooks/use-auth'
import { useOrganizationRealtime } from '@/lib/hooks/useRealtime'

// Mock Supabase client to avoid initialization errors
vi.mock('@/lib/supabase-client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(),
  },
}))

// Mock dependencies
vi.mock('@/lib/hooks/use-auth')
vi.mock('@/lib/hooks/useRealtime')
vi.mock('@/lib/i18n/context', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'navigation.home': 'Home',
        'navigation.inbox': 'Inbox',
        'navigation.myTasks': 'My Tasks',
        'navigation.favorites': 'Favorites',
        'navigation.reports': 'Reports',
      }
      return translations[key] || key
    },
  }),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

// Mock next/link
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Mock next/image
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}))

// Mock theme toggle to avoid additional dependencies
vi.mock('@/components/ui/theme-toggle', () => ({
  ThemeToggle: () => <button>Theme Toggle</button>,
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Home: () => <svg data-testid="home-icon" />,
  Inbox: () => <svg data-testid="inbox-icon" />,
  CheckSquare: () => <svg data-testid="check-square-icon" />,
  Star: () => <svg data-testid="star-icon" />,
  BarChart3: () => <svg data-testid="bar-chart-icon" />,
  Plus: () => <svg data-testid="plus-icon" />,
  ChevronDown: () => <svg data-testid="chevron-down-icon" />,
  ChevronRight: () => <svg data-testid="chevron-right-icon" />,
  Folder: () => <svg data-testid="folder-icon" />,
  Users: () => <svg data-testid="users-icon" />,
  Settings: () => <svg data-testid="settings-icon" />,
  Sun: () => <svg data-testid="sun-icon" />,
  Moon: () => <svg data-testid="moon-icon" />,
}))

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
}

const mockProjects = [
  {
    id: 'project-1',
    name: 'Project Alpha',
    slug: 'project-alpha',
    status: 'active',
    organization_id: 'org-1',
    description: 'Test project',
    priority: 'high',
    created_by: 'user-123',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'project-2',
    name: 'Project Beta',
    slug: 'project-beta',
    status: 'active',
    organization_id: 'org-1',
    description: 'Test project 2',
    priority: 'medium',
    created_by: 'user-123',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
]

describe('Sidebar State Management', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    ;(useAuth as any).mockReturnValue({ user: mockUser })
    ;(useOrganizationRealtime as any).mockImplementation(() => {})

    // Clear project store and reset its internal state
    projectStore.setProjects([])
    // Reset the store's internal timing variables by accessing private properties
    ;(projectStore as any).lastFetchTime = 0
    ;(projectStore as any).fetchInProgress = false

    // Mock fetch globally
    global.fetch = vi.fn() as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Single Source of Truth', () => {
    it('should use projectStore as single source of truth for projects', async () => {
      // Mock API response
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/projects')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: mockProjects }),
          })
        }
        if (url.includes('/api/organizations')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: [{ id: 'org-1' }] }),
          })
        }
        return Promise.reject(new Error('Not found'))
      })

      render(<Sidebar />)

      // Wait for projects to load
      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument()
      })

      // Verify projects are displayed
      expect(screen.getByText('Project Alpha')).toBeInTheDocument()
      expect(screen.getByText('Project Beta')).toBeInTheDocument()
    })

    it('should reflect projectStore updates immediately without local state', async () => {
      // Mock API response
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/projects')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: [] }),
          })
        }
        if (url.includes('/api/organizations')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: [{ id: 'org-1' }] }),
          })
        }
        return Promise.reject(new Error('Not found'))
      })

      render(<Sidebar />)

      // Initially no projects
      await waitFor(() => {
        expect(screen.getByText('No projects yet')).toBeInTheDocument()
      })

      // Update store directly (simulating real-time update)
      await act(async () => {
        projectStore.setProjects(mockProjects)
      })

      // Should immediately reflect in UI
      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument()
      })

      expect(screen.getByText('Project Beta')).toBeInTheDocument()
    })

    it('should not have duplicate state management', async () => {
      // Mock API to track how many times it's called
      let fetchCount = 0
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/projects')) {
          fetchCount++
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: mockProjects }),
          })
        }
        if (url.includes('/api/organizations')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: [{ id: 'org-1' }] }),
          })
        }
        return Promise.reject(new Error('Not found'))
      })

      render(<Sidebar />)

      await waitFor(
        () => {
          expect(screen.getByText('Project Alpha')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      // Should only fetch once on mount
      // Note: May be called once for initial mount
      expect(fetchCount).toBeLessThanOrEqual(1)
    })

    it('should update when new project is added to store', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/projects')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: [mockProjects[0]] }),
          })
        }
        if (url.includes('/api/organizations')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: [{ id: 'org-1' }] }),
          })
        }
        return Promise.reject(new Error('Not found'))
      })

      render(<Sidebar />)

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument()
      })

      // Add a new project to the store
      await act(async () => {
        projectStore.addProject(mockProjects[1])
      })

      // Should appear immediately
      await waitFor(() => {
        expect(screen.getByText('Project Beta')).toBeInTheDocument()
      })
    })

    it('should update when project is removed from store', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/projects')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: mockProjects }),
          })
        }
        if (url.includes('/api/organizations')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: [{ id: 'org-1' }] }),
          })
        }
        return Promise.reject(new Error('Not found'))
      })

      render(<Sidebar />)

      await waitFor(
        () => {
          expect(screen.getByText('Project Alpha')).toBeInTheDocument()
          expect(screen.getByText('Project Beta')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      // Remove a project from the store
      await act(async () => {
        projectStore.removeProject('project-1', true)
      })

      // Should disappear immediately
      await waitFor(() => {
        expect(screen.queryByText('Project Alpha')).not.toBeInTheDocument()
      })

      // Other project should still be there
      expect(screen.getByText('Project Beta')).toBeInTheDocument()
    })

    it('should use projectStore.refreshProjects() instead of local fetch', async () => {
      const refreshSpy = vi.spyOn(projectStore, 'refreshProjects')

      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/projects')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: mockProjects }),
          })
        }
        if (url.includes('/api/organizations')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: [{ id: 'org-1' }] }),
          })
        }
        return Promise.reject(new Error('Not found'))
      })

      render(<Sidebar />)

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument()
      })

      // Verify that refreshProjects was called (indicating use of store method)
      expect(refreshSpy).toHaveBeenCalled()

      refreshSpy.mockRestore()
    })
  })
})
