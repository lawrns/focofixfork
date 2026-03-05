import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectForm } from '../project-form'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
  }),
}))

global.fetch = vi.fn()

describe('ProjectForm slug behavior', () => {
  const workspaces = [{ id: 'ws-1', name: 'Main Workspace' }]

  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ available: true }),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('auto-generates slug from project name', async () => {
    const user = userEvent.setup()
    render(<ProjectForm workspaces={workspaces} />)

    await user.type(screen.getByLabelText(/project name/i), 'My Test Project')

    await waitFor(() => {
      expect(screen.getByLabelText(/slug/i)).toHaveValue('my-test-project')
    })
  })

  it('preserves manually edited slug when name changes', async () => {
    const user = userEvent.setup()
    render(<ProjectForm workspaces={workspaces} />)

    const nameInput = screen.getByLabelText(/project name/i)
    const slugInput = screen.getByLabelText(/slug/i)

    await user.type(nameInput, 'First Name')
    await waitFor(() => {
      expect(slugInput).toHaveValue('first-name')
    })

    await user.clear(slugInput)
    await user.type(slugInput, 'custom-slug')
    await user.clear(nameInput)
    await user.type(nameInput, 'Second Name')

    expect(slugInput).toHaveValue('custom-slug')
  })

  it('disables slug input while editing an existing project', () => {
    render(
      <ProjectForm
        workspaces={workspaces}
        project={{
          id: 'project-1',
          name: 'Existing',
          slug: 'existing',
          workspace_id: 'ws-1',
          status: 'active',
          priority: 'medium',
          progress_percentage: 10,
          color: '#6366F1',
          description: '',
          start_date: '',
          due_date: '',
        }}
      />
    )

    expect(screen.getByLabelText(/slug/i)).toBeDisabled()
  })

  it('checks slug with workspace_id after debounce', async () => {
    const user = userEvent.setup()
    render(<ProjectForm workspaces={workspaces} />)
    await user.type(screen.getByLabelText(/project name/i), 'Alpha Project')

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    }, { timeout: 2000 })

    const [, options] = (global.fetch as any).mock.calls.at(-1)
    const payload = JSON.parse(String(options.body))
    expect(payload.slug).toBe('alpha-project')
    expect(payload.workspace_id).toBe('ws-1')
  })

  it('shows slug availability error when slug is taken', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: false }),
    })

    const user = userEvent.setup()
    render(<ProjectForm workspaces={workspaces} />)

    await user.type(screen.getByLabelText(/project name/i), 'Taken Project')

    expect(await screen.findByText(/slug already taken/i)).toBeInTheDocument()
  })

  it('shows available status when slug is unique', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true }),
    })

    const user = userEvent.setup()
    render(<ProjectForm workspaces={workspaces} />)

    await user.type(screen.getByLabelText(/project name/i), 'Unique Project')

    expect(await screen.findByText(/available/i)).toBeInTheDocument()
  })
})
