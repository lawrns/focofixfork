'use client'

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MobileMenu } from '../mobile-menu'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: vi.fn(),
  }),
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

// Mock useAuth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'test-user',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    },
    loading: false,
    error: null,
  })),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Menu: ({ className }: any) => <svg data-testid="menu-icon" className={className} />,
  X: ({ className }: any) => <svg data-testid="close-icon" className={className} />,
  Home: () => <svg data-testid="home-icon" />,
  Inbox: () => <svg data-testid="inbox-icon" />,
  FolderKanban: () => <svg data-testid="folder-icon" />,
  Users: () => <svg data-testid="users-icon" />,
  Settings: () => <svg data-testid="settings-icon" />,
}))

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    aside: ({ children, ...props }: any) => <aside {...props}>{children}</aside>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Set up window mocks for mobile detection
const originalInnerWidth = window.innerWidth

Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 500, // Mobile width
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: query === '(max-width: 767px)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe('MobileMenu Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Hamburger Icon Display', () => {
    it('should show hamburger icon on mobile screens (<768px)', () => {
      render(<MobileMenu />)
      const hamburger = screen.getByTestId('menu-icon')
      expect(hamburger).toBeInTheDocument()
    })

    it('should have hamburger icon with proper accessibility attributes', () => {
      render(<MobileMenu />)
      const button = screen.getByRole('button', { name: /menu/i })
      expect(button).toHaveAttribute('aria-label', 'Open menu')
    })
  })

  describe('Menu Open/Close Functionality', () => {
    it('should open menu when hamburger icon is clicked', async () => {
      render(<MobileMenu />)
      const hamburger = screen.getByRole('button', { name: /menu/i })

      fireEvent.click(hamburger)

      await waitFor(() => {
        const menu = screen.getByRole('navigation')
        expect(menu).toBeVisible()
      })
    })

    it('should show close icon when menu is open', async () => {
      render(<MobileMenu />)
      const hamburger = screen.getByRole('button', { name: /menu/i })

      fireEvent.click(hamburger)

      await waitFor(() => {
        const closeIcon = screen.getByTestId('close-icon')
        expect(closeIcon).toBeInTheDocument()
      })
    })

    it('should close menu when close icon is clicked', async () => {
      render(<MobileMenu />)
      const hamburger = screen.getByRole('button', { name: /menu/i })

      fireEvent.click(hamburger)
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeVisible()
      })

      const closeButton = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeButton)

      await waitFor(() => {
        expect(screen.getByRole('navigation')).not.toBeVisible()
      })
    })
  })

  describe('Navigation Items', () => {
    it('should display all navigation items in menu', async () => {
      render(<MobileMenu />)
      const hamburger = screen.getByRole('button', { name: /menu/i })

      fireEvent.click(hamburger)

      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument()
        expect(screen.getByText('Inbox')).toBeInTheDocument()
        expect(screen.getByText('My Work')).toBeInTheDocument()
        expect(screen.getByText('Projects')).toBeInTheDocument()
        expect(screen.getByText('People')).toBeInTheDocument()
        expect(screen.getByText('Settings')).toBeInTheDocument()
      })
    })

    it('should display user profile at top of menu', async () => {
      render(<MobileMenu />)
      const hamburger = screen.getByRole('button', { name: /menu/i })

      fireEvent.click(hamburger)

      await waitFor(() => {
        const profileSection = screen.getByText(/user|profile/i)
        expect(profileSection).toBeInTheDocument()
      })
    })

    it('should have correct links for each navigation item', async () => {
      render(<MobileMenu />)
      const hamburger = screen.getByRole('button', { name: /menu/i })

      fireEvent.click(hamburger)

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/dashboard')
        expect(screen.getByRole('link', { name: /inbox/i })).toHaveAttribute('href', '/inbox')
        expect(screen.getByRole('link', { name: /my work/i })).toHaveAttribute('href', '/my-work')
        expect(screen.getByRole('link', { name: /projects/i })).toHaveAttribute('href', '/projects')
        expect(screen.getByRole('link', { name: /people/i })).toHaveAttribute('href', '/people')
        expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings')
      })
    })
  })

  describe('Backdrop Interaction', () => {
    it('should display backdrop overlay when menu is open', async () => {
      render(<MobileMenu />)
      const hamburger = screen.getByRole('button', { name: /menu/i })

      fireEvent.click(hamburger)

      await waitFor(() => {
        const backdrop = screen.getByTestId('menu-backdrop')
        expect(backdrop).toBeVisible()
      })
    })

    it('should close menu when backdrop is clicked', async () => {
      render(<MobileMenu />)
      const hamburger = screen.getByRole('button', { name: /menu/i })

      fireEvent.click(hamburger)
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeVisible()
      })

      const backdrop = screen.getByTestId('menu-backdrop')
      fireEvent.click(backdrop)

      await waitFor(() => {
        expect(screen.getByRole('navigation')).not.toBeVisible()
      })
    })

    it('should have semi-transparent dark backdrop styling', async () => {
      render(<MobileMenu />)
      const hamburger = screen.getByRole('button', { name: /menu/i })

      fireEvent.click(hamburger)

      await waitFor(() => {
        const backdrop = screen.getByTestId('menu-backdrop')
        expect(backdrop).toHaveClass('bg-black/50')
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should close menu when Escape key is pressed', async () => {
      render(<MobileMenu />)
      const hamburger = screen.getByRole('button', { name: /menu/i })

      fireEvent.click(hamburger)
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeVisible()
      })

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })

      await waitFor(() => {
        expect(screen.getByRole('navigation')).not.toBeVisible()
      })
    })
  })

  describe('Touch Gestures', () => {
    it('should close menu when swiping right', async () => {
      render(<MobileMenu />)
      const hamburger = screen.getByRole('button', { name: /menu/i })

      fireEvent.click(hamburger)
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeVisible()
      })

      const menu = screen.getByRole('navigation')

      // Simulate swipe right
      fireEvent.touchStart(menu, {
        touches: [{ clientX: 100, clientY: 100 }],
      })

      fireEvent.touchEnd(menu, {
        changedTouches: [{ clientX: 300, clientY: 100 }],
      })

      await waitFor(() => {
        expect(screen.getByRole('navigation')).not.toBeVisible()
      })
    })

    it('should not close menu when swiping left', async () => {
      render(<MobileMenu />)
      const hamburger = screen.getByRole('button', { name: /menu/i })

      fireEvent.click(hamburger)
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeVisible()
      })

      const menu = screen.getByRole('navigation')

      // Simulate swipe left
      fireEvent.touchStart(menu, {
        touches: [{ clientX: 300, clientY: 100 }],
      })

      fireEvent.touchEnd(menu, {
        changedTouches: [{ clientX: 100, clientY: 100 }],
      })

      // Menu should still be visible
      expect(screen.getByRole('navigation')).toBeVisible()
    })
  })

  describe('Animation', () => {
    it('should animate menu sliding in', async () => {
      render(<MobileMenu />)
      const hamburger = screen.getByRole('button', { name: /menu/i })

      fireEvent.click(hamburger)

      await waitFor(() => {
        const menu = screen.getByRole('navigation')
        // With framer-motion mocked, we just verify it appears
        expect(menu).toBeVisible()
      })
    })
  })

  describe('Menu Positioning', () => {
    it('should position menu drawer on the left side', async () => {
      render(<MobileMenu />)
      const hamburger = screen.getByRole('button', { name: /menu/i })

      fireEvent.click(hamburger)

      await waitFor(() => {
        const menu = screen.getByRole('navigation')
        expect(menu).toHaveClass('left-0')
      })
    })

    it('should position hamburger icon in top-left corner', () => {
      render(<MobileMenu />)
      const hamburger = screen.getByRole('button', { name: /menu/i })

      expect(hamburger).toHaveClass('fixed', 'top-4', 'left-4')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels on menu button', () => {
      render(<MobileMenu />)
      const button = screen.getByRole('button', { name: /menu/i })

      expect(button).toHaveAttribute('aria-label', 'Open menu')
    })

    it('should have proper ARIA attributes when menu is open', async () => {
      render(<MobileMenu />)
      const hamburger = screen.getByRole('button', { name: /menu/i })

      fireEvent.click(hamburger)

      await waitFor(() => {
        const menu = screen.getByRole('navigation')
        expect(menu).toHaveAttribute('aria-hidden', 'false')
      })
    })

    it('should have proper focus management for navigation links', async () => {
      render(<MobileMenu />)
      const hamburger = screen.getByRole('button', { name: /menu/i })

      fireEvent.click(hamburger)

      await waitFor(() => {
        const homeLink = screen.getByRole('link', { name: /home/i })
        expect(homeLink).toBeInTheDocument()
      })
    })
  })
})
