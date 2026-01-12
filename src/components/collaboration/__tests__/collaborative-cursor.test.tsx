import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import CollaborativeCursor from '../collaborative-cursor'
import { CollaborationUser } from '@/lib/models/realtime-collaboration'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Mouse: () => <div data-testid="mouse-icon">Mouse</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  Wifi: () => <div data-testid="wifi-icon">Wifi</div>,
}))

// Mock avatar component
vi.mock('@/components/data-display/avatar', () => ({
  Avatar: ({ children, className }: any) => <div className={className} data-testid="avatar">{children}</div>,
  AvatarImage: ({ src }: any) => <img src={src} alt="avatar" data-testid="avatar-image" />,
  AvatarFallback: ({ children }: any) => <div data-testid="avatar-fallback">{children}</div>,
}))

// Mock tooltip
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
  TooltipTrigger: ({ children }: any) => <div data-testid="tooltip-trigger">{children}</div>,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: any) => <div data-testid="tooltip-provider">{children}</div>,
}))

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props} data-testid="motion-div">{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div data-testid="animate-presence">{children}</div>,
}))

const mockUsers: CollaborationUser[] = [
  {
    user_id: 'user-1',
    user_name: 'Alice Johnson',
    avatar: 'https://example.com/alice.jpg',
    status: 'online',
    last_seen: new Date().toISOString(),
    cursor_position: { line: 10, column: 5, offset: 45 },
    color: '#FF6B6B',
  },
  {
    user_id: 'user-2',
    user_name: 'Bob Smith',
    avatar: 'https://example.com/bob.jpg',
    status: 'online',
    last_seen: new Date().toISOString(),
    cursor_position: { line: 20, column: 15, offset: 95 },
    color: '#4ECDC4',
  },
  {
    user_id: 'user-3',
    user_name: 'Charlie Brown',
    avatar: 'https://example.com/charlie.jpg',
    status: 'away',
    last_seen: new Date(Date.now() - 300000).toISOString(),
    color: '#45B7D1',
  },
]

describe('CollaborativeCursor Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Cursor Position Broadcast', () => {
    it('should broadcast cursor position with user_id, cursor_x, cursor_y, page_path', async () => {
      const broadcastSpy = vi.fn()
      render(
        <CollaborativeCursor
          users={mockUsers}
          currentUserId="current-user"
          onBroadcastCursor={broadcastSpy}
          pagePath="/tasks/123"
        />
      )

      // Simulate mouse move event manually
      const event = new MouseEvent('mousemove', {
        clientX: 100,
        clientY: 200,
        bubbles: true,
      })
      window.dispatchEvent(event)

      // Wait for throttled broadcast (should be within 100ms)
      await waitFor(() => {
        expect(broadcastSpy).toHaveBeenCalled()
      }, { timeout: 200 })

      const call = broadcastSpy.mock.calls[0]
      expect(call[0]).toEqual(
        expect.objectContaining({
          user_id: 'current-user',
          cursor_x: expect.any(Number),
          cursor_y: expect.any(Number),
          page_path: '/tasks/123',
        })
      )
    })

    it('should throttle cursor position updates to 100ms', async () => {
      const broadcastSpy = vi.fn()
      render(
        <CollaborativeCursor
          users={mockUsers}
          currentUserId="current-user"
          onBroadcastCursor={broadcastSpy}
          pagePath="/tasks/123"
        />
      )

      // Move cursor rapidly 5 times
      for (let i = 0; i < 5; i++) {
        const event = new MouseEvent('mousemove', {
          clientX: 100 + i,
          clientY: 200 + i,
          bubbles: true,
        })
        window.dispatchEvent(event)
      }

      // Wait for throttling
      await waitFor(() => {
        // Should be throttled to fewer calls than movements
        expect(broadcastSpy.mock.calls.length).toBeLessThan(5)
      }, { timeout: 300 })
    })
  })

  describe('Other Users Cursors Display', () => {
    it('should display cursors for other users', () => {
      render(
        <CollaborativeCursor
          users={mockUsers}
          currentUserId="current-user"
          pagePath="/tasks/123"
        />
      )

      // Should display cursors for users 1 and 2 (who have cursor positions)
      expect(screen.getAllByText('Alice Johnson')).toHaveLength(2) // appears in cursor and tooltip
      expect(screen.getAllByText('Bob Smith')).toHaveLength(2) // appears in cursor and tooltip
    })

    it('should show cursor position with user name and status', () => {
      render(
        <CollaborativeCursor
          users={mockUsers}
          currentUserId="current-user"
          pagePath="/tasks/123"
        />
      )

      // Check user name appears in tooltips
      const aliceElements = screen.getAllByText('Alice Johnson')
      expect(aliceElements.length).toBeGreaterThan(0)

      // Check that cursor position is displayed in tooltip
      const lineText = screen.getByText(/Line 11, Column/)
      expect(lineText).toBeInTheDocument()
    })

    it('should not display cursor without position data', () => {
      const usersWithoutCursor: CollaborationUser[] = [
        {
          user_id: 'user-3',
          user_name: 'Charlie Brown',
          avatar: 'https://example.com/charlie.jpg',
          status: 'away',
          last_seen: new Date().toISOString(),
          color: '#45B7D1',
        },
      ]

      render(
        <CollaborativeCursor
          users={usersWithoutCursor}
          currentUserId="current-user"
          pagePath="/tasks/123"
        />
      )

      // Charlie should not appear in cursor display since no cursor position
      // (but may appear in presence list if showPresenceList is true)
      expect(screen.queryAllByText('Charlie Brown')).toHaveLength(0)
    })
  })

  describe('Cursor with User Name and Avatar', () => {
    it('should display user avatar with collaborative cursor', () => {
      render(
        <CollaborativeCursor
          users={mockUsers}
          currentUserId="current-user"
          pagePath="/tasks/123"
          showPresenceList
        />
      )

      // Should have avatar components for users with cursors in presence list
      const avatars = screen.getAllByTestId('avatar')
      expect(avatars.length).toBeGreaterThan(0)
    })

    it('should display user name on cursor hover', async () => {
      render(
        <CollaborativeCursor
          users={mockUsers}
          currentUserId="current-user"
          pagePath="/tasks/123"
        />
      )

      // User names should be visible in the component (in tooltips and labels)
      expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Bob Smith').length).toBeGreaterThan(0)
    })

    it('should use avatar fallback for missing image', () => {
      const usersWithoutAvatar: CollaborationUser[] = [
        {
          user_id: 'user-1',
          user_name: 'Alice Johnson',
          status: 'online',
          last_seen: new Date().toISOString(),
          cursor_position: { line: 10, column: 5, offset: 45 },
          color: '#FF6B6B',
        },
      ]

      render(
        <CollaborativeCursor
          users={usersWithoutAvatar}
          currentUserId="current-user"
          pagePath="/tasks/123"
          showPresenceList
        />
      )

      // Should show avatar component in presence list and user is displayed
      expect(screen.getAllByTestId('avatar').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThan(0)
    })
  })

  describe('Cursor Disappears on Disconnect', () => {
    it('should remove cursor when user goes offline', () => {
      const { rerender } = render(
        <CollaborativeCursor
          users={mockUsers}
          currentUserId="current-user"
          pagePath="/tasks/123"
        />
      )

      // Verify cursor is shown
      expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThan(0)

      // Rerender with offline user
      const offlineUsers: CollaborationUser[] = [
        {
          ...mockUsers[0],
          status: 'offline',
          cursor_position: undefined,
        },
      ]

      rerender(
        <CollaborativeCursor
          users={offlineUsers}
          currentUserId="current-user"
          pagePath="/tasks/123"
        />
      )

      // Cursor should be hidden since no position
      expect(screen.queryByText(/Line 11/)).not.toBeInTheDocument()
    })

    it('should remove cursor when cursor_position is cleared', () => {
      const { rerender } = render(
        <CollaborativeCursor
          users={mockUsers}
          currentUserId="current-user"
          pagePath="/tasks/123"
        />
      )

      // Verify cursor is shown
      expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThan(0)

      // Rerender with cleared cursor position
      const usersNoCursor: CollaborationUser[] = [
        {
          ...mockUsers[0],
          cursor_position: undefined,
        },
      ]

      rerender(
        <CollaborativeCursor
          users={usersNoCursor}
          currentUserId="current-user"
          pagePath="/tasks/123"
        />
      )

      // Cursor should not appear
      expect(screen.queryByText(/Line 11/)).not.toBeInTheDocument()
    })
  })

  describe('Cursor Color Assignment', () => {
    it('should assign color from user data', () => {
      const { container } = render(
        <CollaborativeCursor
          users={mockUsers}
          currentUserId="current-user"
          pagePath="/tasks/123"
        />
      )

      // Check that colored cursors are rendered
      const cursorDots = container.querySelectorAll('[data-testid="cursor-dot"]')
      expect(cursorDots.length).toBeGreaterThan(0)

      // Verify color is applied
      cursorDots.forEach((dot, index) => {
        expect(dot.getAttribute('style')).toContain('background-color')
      })
    })

    it('should use consistent color for same user', () => {
      const { rerender, container: container1 } = render(
        <CollaborativeCursor
          users={[mockUsers[0]]}
          currentUserId="current-user"
          pagePath="/tasks/123"
        />
      )

      const color1 = container1.querySelector('[data-testid="cursor-dot"]')?.getAttribute('style')

      // Rerender with same user
      rerender(
        <CollaborativeCursor
          users={[{ ...mockUsers[0], cursor_position: { line: 15, column: 10, offset: 50 } }]}
          currentUserId="current-user"
          pagePath="/tasks/123"
        />
      )

      const color2 = container1.querySelector('[data-testid="cursor-dot"]')?.getAttribute('style')

      expect(color1).toBe(color2)
    })
  })

  describe('Presence Indicator List', () => {
    it('should display presence list with online users', () => {
      render(
        <CollaborativeCursor
          users={mockUsers}
          currentUserId="current-user"
          pagePath="/tasks/123"
          showPresenceList
        />
      )

      // Should show presence list title
      expect(screen.getByText(/Who.s Here/i)).toBeInTheDocument()

      // Should list users - may appear multiple times
      expect(screen.queryAllByText('Alice Johnson').length).toBeGreaterThan(0)
      expect(screen.queryAllByText('Bob Smith').length).toBeGreaterThan(0)
    })

    it('should show user status in presence list', () => {
      render(
        <CollaborativeCursor
          users={mockUsers}
          currentUserId="current-user"
          pagePath="/tasks/123"
          showPresenceList
        />
      )

      // Should show online indicator for online users
      const wifiIcons = screen.getAllByTestId('wifi-icon')
      expect(wifiIcons.length).toBeGreaterThan(0)
    })

    it('should display avatar in presence list', () => {
      render(
        <CollaborativeCursor
          users={mockUsers}
          currentUserId="current-user"
          pagePath="/tasks/123"
          showPresenceList
        />
      )

      // Should have avatars in the presence list
      const avatars = screen.getAllByTestId('avatar')
      expect(avatars.length).toBeGreaterThan(0)
    })

    it('should exclude current user from presence list', () => {
      render(
        <CollaborativeCursor
          users={[
            ...mockUsers,
            {
              user_id: 'current-user',
              user_name: 'You',
              status: 'online',
              last_seen: new Date().toISOString(),
              color: '#000000',
            },
          ]}
          currentUserId="current-user"
          pagePath="/tasks/123"
          showPresenceList
        />
      )

      // Current user "You" should not appear
      expect(screen.queryByText('You')).not.toBeInTheDocument()
    })
  })

  describe('Rendering with Empty State', () => {
    it('should handle empty users list', () => {
      const { container } = render(
        <CollaborativeCursor
          users={[]}
          currentUserId="current-user"
          pagePath="/tasks/123"
        />
      )

      expect(container).toBeInTheDocument()
    })

    it('should handle users without cursor positions', () => {
      const usersNoCursor: CollaborationUser[] = [
        {
          user_id: 'user-1',
          user_name: 'Alice',
          status: 'online',
          last_seen: new Date().toISOString(),
          color: '#FF6B6B',
        },
      ]

      render(
        <CollaborativeCursor
          users={usersNoCursor}
          currentUserId="current-user"
          pagePath="/tasks/123"
        />
      )

      // Should render without error
      expect(screen.queryByText('Alice')).not.toBeInTheDocument()
    })
  })

  describe('Real-time Updates', () => {
    it('should update cursor position in real-time', async () => {
      const { rerender } = render(
        <CollaborativeCursor
          users={mockUsers}
          currentUserId="current-user"
          pagePath="/tasks/123"
        />
      )

      // Initial position - check for the tooltip content
      expect(screen.getByText(/Line 11, Column/)).toBeInTheDocument()

      // Update cursor position
      const updatedUsers: CollaborationUser[] = [
        {
          ...mockUsers[0],
          cursor_position: { line: 50, column: 25, offset: 150 },
        },
      ]

      rerender(
        <CollaborativeCursor
          users={updatedUsers}
          currentUserId="current-user"
          pagePath="/tasks/123"
        />
      )

      // Should show new position
      await waitFor(() => {
        expect(screen.getByText(/Line 51, Column/)).toBeInTheDocument()
      })
    })

    it('should add new users cursors dynamically', () => {
      const { rerender } = render(
        <CollaborativeCursor
          users={[mockUsers[0]]}
          currentUserId="current-user"
          pagePath="/tasks/123"
        />
      )

      expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThan(0)
      expect(screen.queryAllByText('Bob Smith').length).toBe(0)

      // Add second user
      rerender(
        <CollaborativeCursor
          users={mockUsers.slice(0, 2)}
          currentUserId="current-user"
          pagePath="/tasks/123"
        />
      )

      expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Bob Smith').length).toBeGreaterThan(0)
    })

    it('should remove users cursors when they disconnect', () => {
      const { rerender } = render(
        <CollaborativeCursor
          users={mockUsers.slice(0, 2)}
          currentUserId="current-user"
          pagePath="/tasks/123"
        />
      )

      expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Bob Smith').length).toBeGreaterThan(0)

      // Remove second user
      rerender(
        <CollaborativeCursor
          users={[mockUsers[0]]}
          currentUserId="current-user"
          pagePath="/tasks/123"
        />
      )

      expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThan(0)
      expect(screen.queryAllByText('Bob Smith').length).toBe(0)
    })
  })
})
