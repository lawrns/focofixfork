'use client'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectCard } from '../project-card'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

const baseProject = {
  id: 'project-1',
  name: 'Test Project',
  description: 'Test Description',
  status: 'active' as const,
  priority: 'high' as const,
  progress_percentage: 50,
  start_date: '2024-01-01',
  due_date: '2024-12-31',
  created_at: '2024-01-01T00:00:00Z',
  organization_id: 'org-1',
  slug: 'test-project',
  is_pinned: false,
}

describe('Project pinning behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('renders pin button when actions are enabled', () => {
    render(<ProjectCard project={baseProject} showActions />)
    expect(screen.getByRole('button', { name: /pin to top/i })).toBeInTheDocument()
  })

  it('calls pin endpoint with POST for unpinned project', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    global.fetch = mockFetch as any

    render(<ProjectCard project={baseProject} showActions />)
    await user.click(screen.getByRole('button', { name: /pin to top/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/project-1/pin',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('calls pin endpoint with DELETE for already pinned project', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    global.fetch = mockFetch as any

    render(<ProjectCard project={{ ...baseProject, is_pinned: true }} showActions />)
    await user.click(screen.getByRole('button', { name: /unpin/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/project-1/pin',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })
})
