'use client'

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MobileMenu } from '../mobile-menu'

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'test-user',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    },
  })),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 500,
})

describe('MobileMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows menu button on mobile', () => {
    render(<MobileMenu />)
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument()
  })

  it('opens and closes from menu controls', async () => {
    render(<MobileMenu />)

    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /close menu/i })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /close menu/i }))
    await waitFor(() => expect(screen.queryByRole('button', { name: /close menu/i })).not.toBeInTheDocument())
  })

  it('renders current navigation labels', async () => {
    render(<MobileMenu />)
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getAllByText('Projects').length).toBeGreaterThan(0)
      expect(screen.getByText('Dispatch')).toBeInTheDocument()
      expect(screen.getAllByText('Projects').length).toBeGreaterThan(0)
      expect(screen.getByText('Policies')).toBeInTheDocument()
    })
  })

  it('uses expected href targets for core links', async () => {
    render(<MobileMenu />)
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard')
      expect(screen.getAllByRole('link', { name: /^projects$/i })[0]).toHaveAttribute('href', '/projects')
      expect(screen.getByRole('link', { name: /dispatch/i })).toHaveAttribute('href', '/dashboard?view=dispatch')
      expect(screen.getByRole('link', { name: /policies/i })).toHaveAttribute('href', '/policies')
    })
  })

  it('shows authenticated user block', async () => {
    render(<MobileMenu />)
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })
  })
})
