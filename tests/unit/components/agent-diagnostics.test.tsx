import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'

// Mock child components that are not under test
vi.mock('@/components/empire/agent-status-badge', () => ({
  AgentStatusBadge: ({ status, backend }: any) => (
    <span data-testid={`status-badge-${status}`}>{status} ({backend})</span>
  ),
}))

vi.mock('@/components/empire/agent-detail-sheet', () => ({
  AgentDetailSheet: ({ open }: any) =>
    open ? <div data-testid="agent-detail-sheet">Detail Sheet</div> : null,
}))

vi.mock('@/components/empire/agent-log-viewer', () => ({
  AgentLogViewer: ({ open }: any) =>
    open ? <div data-testid="agent-log-viewer">Log Viewer</div> : null,
}))

vi.mock('@/components/agent-ops/custom-agent-modal', () => ({
  CustomAgentModal: ({ trigger }: any) => trigger ?? <button>New Agent</button>,
}))

vi.mock('@/components/data-display/avatar', () => ({
  Avatar: ({ children, ...props }: any) => {
    // Filter out non-DOM props like "size"
    const { size, ...domProps } = props
    return <div data-testid="avatar" {...domProps}>{children}</div>
  },
  AvatarFallback: ({ children }: any) => <span>{children}</span>,
  AvatarImage: ({ src, alt }: any) => <img src={src} alt={alt} />,
}))

// ── Mock data ──────────────────────────────────────────────────────────────

const NOW = new Date('2026-03-08T12:00:00Z')

const mockOverview = {
  ok: true,
  data: {
    timestamp: NOW.toISOString(),
    source_errors: ['CRICO: auth error'],
    backend_health: [
      { backend: 'clawdbot', status: 'up', agent_count: 5, error: null, last_checked_at: NOW.toISOString() },
      { backend: 'crico', status: 'down', agent_count: 0, error: 'Authentication failed', last_checked_at: NOW.toISOString() },
      { backend: 'bosun', status: 'up', agent_count: 1, error: null, last_checked_at: NOW.toISOString() },
      { backend: 'openclaw', status: 'down', agent_count: 0, error: 'Connection refused', last_checked_at: NOW.toISOString() },
    ],
    system_agents: [
      {
        id: 'clawdbot::main',
        native_id: 'main',
        backend: 'clawdbot',
        name: 'ClawdBot Main',
        role: 'Lead executor',
        model: 'OPUS',
        status: 'working',
        last_active_at: new Date(NOW.getTime() - 300_000).toISOString(), // 5 min ago
        error_message: null,
        avatar_url: null,
      },
      {
        id: 'crico::conductor',
        native_id: 'conductor',
        backend: 'crico',
        name: 'Intelligence Conductor',
        role: 'Decision support',
        model: 'SONNET',
        status: 'error',
        last_active_at: null,
        error_message: 'Authentication token expired',
        avatar_url: null,
      },
      {
        id: 'bosun::scheduler',
        native_id: 'scheduler',
        backend: 'bosun',
        name: 'Task Scheduler',
        role: 'Scheduler',
        model: 'KIMI',
        status: 'idle',
        last_active_at: new Date(NOW.getTime() - 86_400_000).toISOString(), // 1 day ago
        error_message: null,
        avatar_url: null,
      },
      {
        id: 'openclaw::relay',
        native_id: 'relay',
        backend: 'openclaw',
        name: 'Browser Agent',
        role: 'Web relay',
        model: 'UNKNOWN',
        status: 'error',
        last_active_at: null,
        error_message: 'Connection refused',
        avatar_url: null,
      },
    ],
    advisors: [
      {
        id: 'advisor::hormozi',
        native_id: 'hormozi',
        backend: 'advisor',
        name: 'Alex Hormozi',
        role: 'Growth & Acquisition',
        model: 'OPUS',
        status: 'idle',
        avatar_url: null,
        description: 'Growth advisor',
        system_prompt: 'You are Alex...',
        persona_tags: ['growth'],
        featured_order: 1,
      },
    ],
    custom_agents: [],
    lane_stats: [],
    recent: { tasks: [], messages: [], decisions: [], activity: [] },
    totals: {
      system_agents: 4,
      advisors: 1,
      custom_agents: 0,
      tasks: 0,
      messages: 0,
      decisions: 0,
      open_messages: 0,
      active_custom_agents: 0,
    },
  },
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function mockFetchSuccess(data = mockOverview) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  })
}

function mockFetchError(message = 'Network error') {
  global.fetch = vi.fn().mockRejectedValue(new Error(message))
}

// ── Import component under test AFTER mocks ─────────────────────────────────

import { AgentRosterExtended } from '@/components/empire/agent-roster-extended'

// ── Tests ───────────────────────────────────────────────────────────────────

describe('AgentRosterExtended — Diagnostic Enhancements', () => {
  beforeEach(() => {
    mockFetchSuccess()
  })

  // ── Diagnostic Panel ──────────────────────────────────────────────────

  describe('Diagnostic Panel', () => {
    it('shows diagnostic panel for ERROR agents', async () => {
      render(<AgentRosterExtended />)
      await waitFor(() => {
        // crico::conductor and openclaw::relay both have error/unreachable status
        // so multiple diagnostic panels should appear
        const diagnosticHeadings = screen.getAllByText('Diagnostic')
        expect(diagnosticHeadings.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('shows diagnostic panel for UNREACHABLE agents (backend down)', async () => {
      render(<AgentRosterExtended />)
      await waitFor(() => {
        // openclaw backend is down, so Browser Agent should be UNREACHABLE
        const badges = screen.getAllByTestId('status-badge-UNREACHABLE')
        expect(badges.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('does not show diagnostic panel for IDLE/WORKING agents', async () => {
      // Override: all backends up, all agents idle/working
      const healthyOverview = {
        ...mockOverview,
        data: {
          ...mockOverview.data,
          source_errors: [],
          backend_health: mockOverview.data.backend_health.map((b) => ({
            ...b,
            status: 'up' as const,
            error: null,
          })),
          system_agents: [
            {
              ...mockOverview.data.system_agents[0], // ClawdBot Main (working)
            },
            {
              ...mockOverview.data.system_agents[2], // Task Scheduler (idle)
            },
          ],
        },
      }
      mockFetchSuccess(healthyOverview)
      render(<AgentRosterExtended />)
      await waitFor(() => {
        expect(screen.getByText('ClawdBot Main')).toBeTruthy()
      })
      // "Diagnostic" heading only appears inside error/unreachable panels
      expect(screen.queryByText('Diagnostic')).toBeNull()
    })

    it('diagnostic message mentions "auth" for authentication errors', async () => {
      // Make crico backend "up" so the agent gets ERROR (not UNREACHABLE),
      // then getDiagnosticMessage will check the description for "auth"/"token"
      const authErrorOverview = {
        ...mockOverview,
        data: {
          ...mockOverview.data,
          backend_health: mockOverview.data.backend_health.map((b) =>
            b.backend === 'crico' ? { ...b, status: 'up' as const, error: null } : b
          ),
          system_agents: [
            mockOverview.data.system_agents[1], // crico::conductor with error_message "Authentication token expired"
          ],
        },
      }
      mockFetchSuccess(authErrorOverview)
      render(<AgentRosterExtended />)
      await waitFor(() => {
        // getDiagnosticMessage detects "auth" in description and returns auth error message
        const authMessages = screen.getAllByText(/Authentication error|API key or service token/i)
        expect(authMessages.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('diagnostic message mentions "not responding" for unreachable agents', async () => {
      render(<AgentRosterExtended />)
      await waitFor(() => {
        // openclaw::relay has backend down => UNREACHABLE
        // getDiagnosticMessage returns "...is not responding..."
        const unreachableMessages = screen.getAllByText(/not responding/i)
        expect(unreachableMessages.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('shows "View logs" and "Check settings" action buttons', async () => {
      render(<AgentRosterExtended />)
      await waitFor(() => {
        expect(screen.getAllByText('View logs').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Check settings').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('shows "System status" action for unreachable agents', async () => {
      render(<AgentRosterExtended />)
      await waitFor(() => {
        // UNREACHABLE agents get an extra "System status" action
        expect(screen.getAllByText('System status').length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  // ── Activity Bars ─────────────────────────────────────────────────────

  describe('Activity Bars', () => {
    it('shows activity bars for agents with lastActivity', async () => {
      render(<AgentRosterExtended />)
      await waitFor(() => {
        // ClawdBot Main has last_active_at, so "7d activity" label should appear
        expect(screen.getAllByText('7d activity').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('does not show activity bars for agents with no activity', async () => {
      // Only include agents with no last_active_at
      const noActivityOverview = {
        ...mockOverview,
        data: {
          ...mockOverview.data,
          source_errors: [],
          backend_health: mockOverview.data.backend_health.map((b) => ({
            ...b,
            status: 'up' as const,
            error: null,
          })),
          system_agents: [
            {
              id: 'test::noactivity',
              native_id: 'noactivity',
              backend: 'clawdbot' as const,
              name: 'No Activity Agent',
              role: 'Test',
              model: 'OPUS' as const,
              status: 'idle' as const,
              last_active_at: null,
              error_message: null,
              avatar_url: null,
            },
          ],
          advisors: [],
        },
      }
      mockFetchSuccess(noActivityOverview)
      render(<AgentRosterExtended />)
      await waitFor(() => {
        expect(screen.getByText('No Activity Agent')).toBeTruthy()
      })
      expect(screen.queryByText('7d activity')).toBeNull()
    })
  })

  // ── Advisor Hints ─────────────────────────────────────────────────────

  describe('Advisor Hints', () => {
    it('shows "No recommendations" hint for idle advisors with no activity', async () => {
      render(<AgentRosterExtended />)
      await waitFor(() => {
        // Alex Hormozi is idle with lastActivity=null and backend='Advisor'
        expect(
          screen.getByText(/No recommendations generated yet/)
        ).toBeTruthy()
      })
    })
  })

  // ── Degraded Backend Warning ──────────────────────────────────────────

  describe('Degraded Backend Warning', () => {
    it('shows "Some providers are degraded" warning when source_errors exist', async () => {
      render(<AgentRosterExtended />)
      await waitFor(() => {
        expect(screen.getByText(/Some providers are degraded/)).toBeTruthy()
      })
    })

    it('shows specific source error details', async () => {
      render(<AgentRosterExtended />)
      await waitFor(() => {
        expect(screen.getByText('CRICO: auth error')).toBeTruthy()
      })
    })

    it('does not show degraded warning when no source_errors', async () => {
      const healthyOverview = {
        ...mockOverview,
        data: {
          ...mockOverview.data,
          source_errors: [],
          backend_health: mockOverview.data.backend_health.map((b) => ({
            ...b,
            status: 'up' as const,
            error: null,
          })),
          system_agents: [mockOverview.data.system_agents[0]],
        },
      }
      mockFetchSuccess(healthyOverview)
      render(<AgentRosterExtended />)
      await waitFor(() => {
        expect(screen.getByText('ClawdBot Main')).toBeTruthy()
      })
      expect(screen.queryByText(/Some providers are degraded/)).toBeNull()
    })
  })

  // ── General Rendering ─────────────────────────────────────────────────

  describe('General Rendering', () => {
    it('renders Core Operators section', async () => {
      render(<AgentRosterExtended />)
      await waitFor(() => {
        expect(screen.getByText('Core Operators')).toBeTruthy()
      })
    })

    it('renders Executive Advisors section', async () => {
      render(<AgentRosterExtended />)
      await waitFor(() => {
        expect(screen.getByText('Executive Advisors')).toBeTruthy()
      })
    })

    it('shows correct agent count cards', async () => {
      render(<AgentRosterExtended />)
      await waitFor(() => {
        // Should show count labels
        expect(screen.getByText('Core operators')).toBeTruthy()
        expect(screen.getByText('Executive advisors')).toBeTruthy()
        expect(screen.getByText('Active custom agents')).toBeTruthy()
      })
    })

    it('shows backend health in technical inventory', async () => {
      render(<AgentRosterExtended />)
      await waitFor(() => {
        // Technical Inventory is inside a <details> element
        expect(screen.getByText('Technical Inventory')).toBeTruthy()
        expect(screen.getByText('Backend Health')).toBeTruthy()
      })
    })

    it('renders loading state initially', () => {
      // Make fetch hang so loading persists
      global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))
      render(<AgentRosterExtended />)
      expect(screen.getByText('Loading focused agent roster...')).toBeTruthy()
    })

    it('renders error state on fetch failure', async () => {
      mockFetchError('Server exploded')
      render(<AgentRosterExtended />)
      await waitFor(() => {
        expect(screen.getByText('Server exploded')).toBeTruthy()
      })
    })
  })
})
