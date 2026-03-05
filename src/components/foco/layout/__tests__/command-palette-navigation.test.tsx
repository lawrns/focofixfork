'use client'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommandPalette } from '../command-palette'
import { useCommandPaletteStore } from '@/lib/stores/foco-store'
import { useRouter } from 'next/navigation'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

describe('CommandPalette navigation', () => {
  const mockPush = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({ push: mockPush })
    useCommandPaletteStore.setState({ isOpen: false, mode: 'search', query: '' })
  })

  it('navigates when clicking dashboard command', async () => {
    useCommandPaletteStore.getState().open('search')
    render(<CommandPalette />)

    const user = userEvent.setup({ pointerEventsCheck: 0 })
    await user.click(screen.getByRole('option', { name: /go to dashboard/i }))

    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('filters command list by query', async () => {
    useCommandPaletteStore.getState().open('search')
    render(<CommandPalette />)

    const user = userEvent.setup({ pointerEventsCheck: 0 })
    await user.type(screen.getByRole('textbox', { name: /command search/i }), 'dispatch')

    expect(screen.getByText(/go to dispatch/i)).toBeInTheDocument()
  })
})
