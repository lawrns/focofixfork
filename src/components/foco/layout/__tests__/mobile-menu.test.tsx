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

  it('renders updated strategy-first labels', async () => {
    render(<MobileMenu />)
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))

    await waitFor(() => {
      expect(screen.getByText('Revenue Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Execution Board')).toBeInTheDocument()
      expect(screen.getByText('Command Surface')).toBeInTheDocument()
      expect(screen.getByText('Revenue Initiatives')).toBeInTheDocument()
      expect(screen.getByText('Guardrails')).toBeInTheDocument()
    })
  })

  it('uses expected href targets for core links', async () => {
    render(<MobileMenu />)
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /revenue dashboard/i })).toHaveAttribute('href', '/dashboard')
      expect(screen.getByRole('link', { name: /execution board/i })).toHaveAttribute('href', '/my-work')
      expect(screen.getByRole('link', { name: /command surface/i })).toHaveAttribute('href', '/empire/command')
      expect(screen.getByRole('link', { name: /revenue initiatives/i })).toHaveAttribute('href', '/empire/missions')
      expect(screen.getByRole('link', { name: /guardrails/i })).toHaveAttribute('href', '/policies')
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
