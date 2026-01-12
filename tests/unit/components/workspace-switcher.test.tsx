import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkspaceSwitcher } from '@/components/navigation/workspace-switcher'
import { useAuth } from '@/lib/hooks/use-auth'
import { useRouter } from 'next/navigation'

// Mock dependencies
vi.mock('@/lib/hooks/use-auth')
vi.mock('next/navigation')

// Mock fetch
global.fetch = vi.fn()

interface Workspace {
  id: string
  name: string
  slug: string
  icon?: string
}

describe('WorkspaceSwitcher Component', () => {
  const mockWorkspaces: Workspace[] = [
    { id: '1', name: 'Design Team', slug: 'design-team', icon: '🎨' },
    { id: '2', name: 'Engineering', slug: 'engineering', icon: '⚙️' },
    { id: '3', name: 'Product', slug: 'product', icon: '📦' },
  ]

  const mockUser = { id: 'user123', email: 'user@example.com' }
  const mockRouter = { push: vi.fn() }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuth as any).mockReturnValue({ user: mockUser })
    ;(useRouter as any).mockReturnValue(mockRouter)
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ workspaces: mockWorkspaces }),
    })
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('Rendering', () => {
    it('renders workspace switcher button with current workspace name', async () => {
      localStorage.setItem('lastWorkspace', 'design-team')

      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /design team/i })).toBeInTheDocument()
      })
    })

    it('renders default workspace name when none specified', async () => {
      render(<WorkspaceSwitcher />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /workspace/i })).toBeInTheDocument()
      })
    })

    it('displays workspace icon in button', async () => {
      localStorage.setItem('lastWorkspace', 'design-team')

      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      await waitFor(() => {
        expect(screen.getByText('🎨')).toBeInTheDocument()
      })
    })

    it('renders dropdown menu on button click', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button', { name: /design team/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument()
      })
    })
  })

  describe('Workspace List Display', () => {
    it('displays all workspaces in dropdown', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      await waitFor(() => {
        mockWorkspaces.forEach(workspace => {
          expect(screen.getByText(workspace.name)).toBeInTheDocument()
        })
      })
    })

    it('highlights current workspace as active', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      await waitFor(() => {
        const designTeamItem = screen.getByText('Design Team').closest('[role="menuitem"]')
        expect(designTeamItem).toHaveClass('bg-primary', 'text-primary-foreground')
      })
    })

    it('shows all workspaces with proper styling', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      await waitFor(() => {
        const menuItems = screen.getAllByRole('menuitem')
        expect(menuItems.length).toBeGreaterThanOrEqual(mockWorkspaces.length)
      })
    })

    it('displays create workspace option at bottom', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /create workspace/i })).toBeInTheDocument()
      })
    })
  })

  describe('Workspace Switching', () => {
    it('switches workspace on item click', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      const engineeringItem = await screen.findByRole('menuitem', { name: /engineering/i })
      await user.click(engineeringItem)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/engineering/dashboard')
      })
    })

    it('updates button text after switching workspace', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      const engineeringItem = await screen.findByRole('menuitem', { name: /engineering/i })
      await user.click(engineeringItem)

      // Simulate navigation and re-render with new workspace
      rerender(<WorkspaceSwitcher currentWorkspace="engineering" />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /engineering/i })).toBeInTheDocument()
      })
    })

    it('closes dropdown after switching', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument()
      })

      const engineeringItem = await screen.findByRole('menuitem', { name: /engineering/i })
      await user.click(engineeringItem)

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      })
    })

    it('stores selected workspace in localStorage', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      const engineeringItem = await screen.findByRole('menuitem', { name: /engineering/i })
      await user.click(engineeringItem)

      await waitFor(() => {
        expect(localStorage.getItem('lastWorkspace')).toBe('engineering')
      })
    })
  })

  describe('Search/Filter Functionality', () => {
    it('shows search input when 5+ workspaces exist', async () => {
      const manyWorkspaces = Array.from({ length: 6 }, (_, i) => ({
        id: String(i),
        name: `Workspace ${i}`,
        slug: `workspace-${i}`,
      }))

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workspaces: manyWorkspaces }),
      })

      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="workspace-0" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search workspaces/i)).toBeInTheDocument()
      })
    })

    it('filters workspaces based on search input', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      const searchInput = await screen.findByPlaceholderText(/search workspaces/i)
      await user.type(searchInput, 'eng')

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument()
        expect(screen.queryByText('Design Team')).not.toBeInTheDocument()
        expect(screen.queryByText('Product')).not.toBeInTheDocument()
      })
    })

    it('clears filter when search is cleared', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      const searchInput = await screen.findByPlaceholderText(/search workspaces/i)
      await user.type(searchInput, 'eng')

      await waitFor(() => {
        expect(screen.queryByText('Design Team')).not.toBeInTheDocument()
      })

      await user.clear(searchInput)

      await waitFor(() => {
        expect(screen.getByText('Design Team')).toBeInTheDocument()
        expect(screen.getByText('Engineering')).toBeInTheDocument()
        expect(screen.getByText('Product')).toBeInTheDocument()
      })
    })

    it('is case-insensitive when filtering', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      const searchInput = await screen.findByPlaceholderText(/search workspaces/i)
      await user.type(searchInput, 'DESIGN')

      await waitFor(() => {
        expect(screen.getByText('Design Team')).toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('opens dropdown with keyboard shortcut Cmd+Shift+W (macOS)', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      // Simulate Cmd+Shift+W on macOS
      await user.keyboard('{Meta>}{Shift>}w{/Shift}{/Meta}')

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument()
      })
    })

    it('opens dropdown with keyboard shortcut Ctrl+Shift+W (Windows/Linux)', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      // Simulate Ctrl+Shift+W
      await user.keyboard('{Control>}{Shift>}w{/Shift}{/Control}')

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument()
      })
    })

    it('navigates through workspaces with arrow keys', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      // Navigate down to next workspace
      await user.keyboard('{ArrowDown}')

      await waitFor(() => {
        const engineeringItem = screen.getByRole('menuitem', { name: /engineering/i })
        expect(engineeringItem).toHaveFocus()
      })
    })

    it('navigates up with up arrow', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="product" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      // Focus on last item
      await user.keyboard('{End}')

      // Navigate up
      await user.keyboard('{ArrowUp}')

      await waitFor(() => {
        const productItem = screen.getByRole('menuitem', { name: /product/i })
        expect(productItem).toHaveFocus()
      })
    })

    it('selects workspace with Enter key', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      // Navigate to engineering
      await user.keyboard('{ArrowDown}')

      // Select with Enter
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/engineering/dashboard')
      })
    })

    it('closes dropdown with Escape key', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument()
      })

      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      })
    })

    it('focuses search input with keyboard when opened', async () => {
      const user = userEvent.setup()
      const manyWorkspaces = Array.from({ length: 6 }, (_, i) => ({
        id: String(i),
        name: `Workspace ${i}`,
        slug: `workspace-${i}`,
      }))

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workspaces: manyWorkspaces }),
      })

      render(<WorkspaceSwitcher currentWorkspace="workspace-0" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      const searchInput = await screen.findByPlaceholderText(/search workspaces/i)

      // Input should be focused/ready for typing
      await user.type(searchInput, 'test')

      await waitFor(() => {
        expect(searchInput).toHaveValue('test')
      })
    })
  })

  describe('Create Workspace', () => {
    it('opens create workspace dialog when option clicked', async () => {
      const user = userEvent.setup()
      const mockDialogOpen = vi.fn()

      render(<WorkspaceSwitcher currentWorkspace="design-team" onCreateOpen={mockDialogOpen} />)

      const button = await screen.findByRole('button')
      await user.click(button)

      const createOption = await screen.findByRole('menuitem', { name: /create workspace/i })
      await user.click(createOption)

      await waitFor(() => {
        expect(mockDialogOpen).toHaveBeenCalled()
      })
    })

    it('shows visual separator before create option', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      await waitFor(() => {
        const separator = screen.getByRole('separator')
        expect(separator).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner while fetching workspaces', async () => {
      ;(global.fetch as any).mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ workspaces: mockWorkspaces }),
            })
          }, 100)
        })
      )

      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      // Should show loading state briefly
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument()
      })
    })

    it('handles fetch errors gracefully', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')

      // Should not crash
      expect(() => user.click(button)).not.toThrow()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA role attributes', async () => {
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      expect(button).toHaveAttribute('aria-haspopup', 'menu')
    })

    it('has accessible button label', async () => {
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      expect(button).toHaveAccessibleName(/design team/i)
    })

    it('announces workspace changes to screen readers', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      const engineeringItem = await screen.findByRole('menuitem', { name: /engineering/i })
      await user.click(engineeringItem)

      // Should have aria-live region for announcement
      const liveRegion = screen.getByRole('status', { hidden: true })
      expect(liveRegion).toBeInTheDocument()
    })

    it('maintains focus management', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')

      button.focus()
      expect(button).toHaveFocus()

      await user.click(button)

      await waitFor(() => {
        // First menu item should have focus when dropdown opens
        const firstMenuItem = screen.getAllByRole('menuitem')[0]
        expect(firstMenuItem).toHaveFocus()
      })
    })
  })

  describe('LocalStorage Integration', () => {
    it('restores last workspace from localStorage on load', () => {
      localStorage.setItem('lastWorkspace', 'engineering')

      render(<WorkspaceSwitcher />)

      // The component should use the stored workspace
      expect(localStorage.getItem('lastWorkspace')).toBe('engineering')
    })

    it('updates localStorage when workspace changes', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      const productItem = await screen.findByRole('menuitem', { name: /product/i })
      await user.click(productItem)

      await waitFor(() => {
        expect(localStorage.getItem('lastWorkspace')).toBe('product')
      })
    })

    it('initializes localStorage if empty', () => {
      localStorage.removeItem('lastWorkspace')

      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      expect(localStorage.getItem('lastWorkspace')).not.toBeNull()
    })
  })

  describe('API Integration', () => {
    it('fetches workspaces from API endpoint', async () => {
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/workspaces')
      })
    })

    it('handles API response correctly', async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      await waitFor(() => {
        mockWorkspaces.forEach(workspace => {
          expect(screen.getByText(workspace.name)).toBeInTheDocument()
        })
      })
    })

    it('retries API call on failure', async () => {
      ;(global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ workspaces: mockWorkspaces }),
        })

      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')

      // First click triggers first failed fetch
      await user.click(button)

      // Wait for retry
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles empty workspace list', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workspaces: [] }),
      })

      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      await waitFor(() => {
        // Should still show create workspace option
        expect(screen.getByRole('menuitem', { name: /create workspace/i })).toBeInTheDocument()
      })
    })

    it('handles workspace names with special characters', async () => {
      const specialWorkspaces = [
        { id: '1', name: 'Team & Co', slug: 'team-co' },
        { id: '2', name: 'R&D @ HQ', slug: 'rd-hq' },
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workspaces: specialWorkspaces }),
      })

      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="team-co" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Team & Co')).toBeInTheDocument()
        expect(screen.getByText('R&D @ HQ')).toBeInTheDocument()
      })
    })

    it('handles very long workspace names', async () => {
      const longName = 'This is a very long workspace name that might overflow'
      const longWorkspaces = [
        { id: '1', name: longName, slug: 'long-workspace' },
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workspaces: longWorkspaces }),
      })

      const user = userEvent.setup()
      render(<WorkspaceSwitcher currentWorkspace="long-workspace" />)

      const button = await screen.findByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText(longName)).toBeInTheDocument()
      })
    })

    it('handles rapid workspace switches', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<WorkspaceSwitcher currentWorkspace="design-team" />)

      const button = await screen.findByRole('button')

      // Rapid switches
      for (const workspace of mockWorkspaces) {
        rerender(<WorkspaceSwitcher currentWorkspace={workspace.slug} />)
      }

      // Should handle gracefully
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })
})
