import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProjectTable from '../ProjectTable'

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@example.com' } }),
}))

vi.mock('@/lib/hooks/useRealtime', () => ({
  useRealtime: vi.fn(),
  useOrganizationRealtime: vi.fn(),
}))

vi.mock('@/lib/hooks/useOrganization', () => ({
  useOrganization: () => ({ organization: { id: 'org-1', name: 'Test Org' } }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

describe('ProjectTable delete flow (smoke)', () => {
  it('renders table shell without crashing', () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    }) as any
    render(<ProjectTable />)
    expect(screen.getByRole('button', { name: /archived/i })).toBeInTheDocument()
  })
})
