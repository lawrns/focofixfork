import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useParams, useRouter } from 'next/navigation'
import RunDetailPage from '@/app/runs/[id]/page'

// ---- Mocks ----

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/lib/ai/model-catalog', () => ({
  getModelLabel: vi.fn((model: string | null) => model ?? 'Auto'),
  getModelRuntimeSourceLabel: vi.fn((model: string) => 'Anthropic Direct'),
}))

import { useAuth } from '@/lib/hooks/use-auth'

const mockPush = vi.fn()

// ---- Test Data ----

const mockRun = {
  id: 'run-abc123',
  runner: 'clawdbot',
  status: 'failed',
  task_id: null,
  started_at: '2026-03-08T10:00:00Z',
  ended_at: '2026-03-08T10:05:00Z',
  summary: 'Deploy frontend changes',
  created_at: '2026-03-08T09:59:00Z',
  tokens_in: 1500,
  tokens_out: 800,
  cost_usd: 0.0234,
  artifacts: [],
  trace: {
    ai_routing: {
      requested: {
        model: 'claude-opus-4-20250514',
        planner_model: null,
        executor_model: null,
        reviewer_model: null,
        fallback_chain: [],
      },
      actual: {
        planner_model: 'claude-opus-4-20250514',
        executor_model: 'claude-opus-4-20250514',
        reviewer_model: null,
        planner_provider: 'anthropic',
        executor_provider: 'anthropic',
      },
    },
    token_summary: { tokens_in: 1500, tokens_out: 800, cost_usd: 0.0234 },
  },
}

const mockTimeline = [
  {
    id: 'evt-1',
    kind: 'lifecycle',
    title: 'Run created',
    status: 'info',
    source: 'system',
    timestamp: '2026-03-08T09:59:00Z',
  },
  {
    id: 'evt-2',
    kind: 'lifecycle',
    title: 'Run started',
    status: 'running',
    source: 'system',
    timestamp: '2026-03-08T10:00:00Z',
  },
  {
    id: 'evt-3',
    kind: 'execution',
    title: 'Tool call: deploy',
    status: 'completed',
    source: 'clawdbot',
    timestamp: '2026-03-08T10:01:00Z',
    payload: {
      tokens_in: 500,
      tokens_out: 200,
      started_at: '2026-03-08T10:01:00Z',
      ended_at: '2026-03-08T10:02:00Z',
    },
  },
  {
    id: 'evt-4',
    kind: 'execution',
    title: "Model does not exist: gpt-5.4-medium",
    description: "The model 'gpt-5.4-medium' does not exist or is not available",
    status: 'failed',
    source: 'clawdbot',
    timestamp: '2026-03-08T10:05:00Z',
    payload: { error: "The model 'gpt-5.4-medium' does not exist" },
  },
]

const mockRouting = {
  requested: {
    model: 'claude-opus-4-20250514',
    planner_model: null,
    executor_model: null,
    reviewer_model: null,
    fallback_chain: [],
  },
  actual: {
    planner_model: 'claude-opus-4-20250514',
    executor_model: 'claude-opus-4-20250514',
    reviewer_model: null,
    planner_provider: 'anthropic',
    executor_provider: 'anthropic',
  },
}

function makeTimelineResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      run: mockRun,
      artifacts: mockRun.artifacts,
      routing: mockRouting,
      timeline: mockTimeline,
      execution_events: mockTimeline.filter((e) => e.kind === 'execution'),
      audit_events: [],
      ...overrides,
    },
  }
}

function mockFetchSuccess(body: unknown = makeTimelineResponse()) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  })
}

function mockFetch404() {
  return vi.fn().mockResolvedValue({
    ok: false,
    status: 404,
    json: () => Promise.resolve({ error: 'Not found' }),
  })
}

// ---- Helpers ----

function setup(fetchFn?: ReturnType<typeof vi.fn>) {
  ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    user: { id: 'user-1' },
    loading: false,
  })
  ;(useParams as ReturnType<typeof vi.fn>).mockReturnValue({ id: 'run-abc123' })
  ;(useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  })

  global.fetch = fetchFn ?? mockFetchSuccess()

  return render(<RunDetailPage />)
}

// ---- Tests ----

describe('RunDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockReset()
  })

  // ---- Rendering ----

  describe('Rendering', () => {
    it('shows loading spinner while fetching', () => {
      // Return a never-resolving promise to keep the loading state
      const pendingFetch = vi.fn().mockReturnValue(new Promise(() => {}))
      setup(pendingFetch)

      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeTruthy()
    })

    it('shows "Run not found" for 404 response', async () => {
      setup(mockFetch404())

      await waitFor(() => {
        expect(screen.getByText('Run not found')).toBeInTheDocument()
      })
    })

    it('displays run summary as heading', async () => {
      setup()

      await waitFor(() => {
        expect(screen.getByText('Deploy frontend changes')).toBeInTheDocument()
      })

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('Deploy frontend changes')
    })

    it('shows status badge with failed status', async () => {
      setup()

      await waitFor(() => {
        expect(screen.getByText('Deploy frontend changes')).toBeInTheDocument()
      })

      // StatusBadge renders the status text; "failed" appears in multiple places
      // (header badge + execution event status). Verify at least one exists.
      const failedBadges = screen.getAllByText('failed')
      expect(failedBadges.length).toBeGreaterThanOrEqual(1)
    })

    it('shows runner badge', async () => {
      setup()

      await waitFor(() => {
        expect(screen.getByText('Deploy frontend changes')).toBeInTheDocument()
      })

      // "clawdbot" appears in the header runner badge and also as execution event source
      const runnerBadges = screen.getAllByText('clawdbot')
      expect(runnerBadges.length).toBeGreaterThanOrEqual(1)
      // The first one is the header runner badge (font-mono)
      expect(runnerBadges[0].classList.toString()).toContain('font-mono')
    })

    it('shows duration (5m 0s)', async () => {
      setup()

      await waitFor(() => {
        expect(screen.getByText('Duration: 5m 0s')).toBeInTheDocument()
      })
    })

    it('shows token count badge (2,300 tokens)', async () => {
      setup()

      await waitFor(() => {
        expect(screen.getByText(/2,300/)).toBeInTheDocument()
      })
    })

    it('shows cost badge ($0.0234)', async () => {
      setup()

      await waitFor(() => {
        expect(screen.getByText('Deploy frontend changes')).toBeInTheDocument()
      })

      // Cost "$0.0234" appears in both header badge and token summary card
      const costElements = screen.getAllByText('$0.0234')
      expect(costElements.length).toBeGreaterThanOrEqual(1)
    })

    it('shows AI routing section with requested and actual models', async () => {
      setup()

      await waitFor(() => {
        expect(screen.getByText('AI Routing')).toBeInTheDocument()
      })

      expect(screen.getByText('Requested')).toBeInTheDocument()
      expect(screen.getByText('Actual')).toBeInTheDocument()
    })
  })

  // ---- Token Summary Card ----

  describe('Token Summary Card', () => {
    it('renders token summary when data exists', async () => {
      setup()

      await waitFor(() => {
        expect(screen.getByText('Token Summary')).toBeInTheDocument()
      })

      expect(screen.getByText('Tokens In')).toBeInTheDocument()
      expect(screen.getByText('Tokens Out')).toBeInTheDocument()
      expect(screen.getByText('Total Cost')).toBeInTheDocument()
      expect(screen.getByText('Avg Latency')).toBeInTheDocument()

      // Check actual values
      expect(screen.getByText('1,500')).toBeInTheDocument()
      expect(screen.getByText('800')).toBeInTheDocument()
    })

    it('does not render token summary when no token data', async () => {
      const noTokenRun = {
        ...mockRun,
        tokens_in: null,
        tokens_out: null,
        cost_usd: null,
        trace: {},
      }
      const response = makeTimelineResponse({ run: noTokenRun })

      setup(mockFetchSuccess(response))

      await waitFor(() => {
        expect(screen.getByText('Deploy frontend changes')).toBeInTheDocument()
      })

      expect(screen.queryByText('Token Summary')).not.toBeInTheDocument()
    })
  })

  // ---- Execution Timeline ----

  describe('Execution Timeline', () => {
    it('renders timeline events', async () => {
      setup()

      await waitFor(() => {
        expect(screen.getByText('Execution Timeline')).toBeInTheDocument()
      })

      expect(screen.getByText('Tool call: deploy')).toBeInTheDocument()
      // The error event title appears in both timeline and diagnosis section
      const errorTitles = screen.getAllByText('Model does not exist: gpt-5.4-medium')
      expect(errorTitles.length).toBeGreaterThanOrEqual(1)
    })

    it('renders vertical timeline line', async () => {
      setup()

      await waitFor(() => {
        expect(screen.getByText('Execution Timeline')).toBeInTheDocument()
      })

      // The vertical line is a div with class "w-[2px]" inside a .relative container
      // Use a broader querySelector approach since bracket classes need careful escaping
      const allDivs = document.querySelectorAll('div')
      const timelineLine = Array.from(allDivs).find(
        (el) => el.className.includes('w-[2px]') && el.className.includes('bg-border')
      )
      expect(timelineLine).toBeTruthy()
    })

    it('shows event title and status', async () => {
      setup()

      await waitFor(() => {
        expect(screen.getByText('Tool call: deploy')).toBeInTheDocument()
      })

      expect(screen.getByText('completed')).toBeInTheDocument()
    })

    it('shows duration for events with payload timestamps (1m 0s)', async () => {
      setup()

      await waitFor(() => {
        expect(screen.getByText('Tool call: deploy')).toBeInTheDocument()
      })

      expect(screen.getByText('1m 0s')).toBeInTheDocument()
    })

    it('shows token count for events with token payload', async () => {
      setup()

      await waitFor(() => {
        expect(screen.getByText('Tool call: deploy')).toBeInTheDocument()
      })

      // 500 + 200 = 700 tokens
      expect(screen.getByText('700')).toBeInTheDocument()
    })

    it('collapsible payload details toggle works', async () => {
      setup()

      await waitFor(() => {
        expect(screen.getByText('Tool call: deploy')).toBeInTheDocument()
      })

      // Find "Details" buttons (one per execution event with payload)
      const detailsButtons = screen.getAllByText('Details')
      expect(detailsButtons.length).toBeGreaterThan(0)

      // Initially no <pre> block visible
      expect(document.querySelector('pre')).toBeNull()

      // Click to expand
      fireEvent.click(detailsButtons[0])

      // Now a <pre> block should be visible with JSON payload
      const preBlock = document.querySelector('pre')
      expect(preBlock).toBeTruthy()
      expect(preBlock?.textContent).toContain('tokens_in')

      // Click again to collapse
      fireEvent.click(detailsButtons[0])

      await waitFor(() => {
        const preBlocks = document.querySelectorAll('pre')
        expect(preBlocks.length).toBe(0)
      })
    })
  })

  // ---- Failure Diagnosis ----

  describe('Failure Diagnosis', () => {
    it('shows diagnosis card for failed runs', async () => {
      setup()

      await waitFor(() => {
        expect(screen.getByText('Failure Diagnosis')).toBeInTheDocument()
      })

      // The diagnosis section has "Error" and "Suggestion" labels
      const errorLabels = screen.getAllByText('Error')
      expect(errorLabels.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Suggestion')).toBeInTheDocument()
    })

    it('shows model unavailable suggestion for model errors', async () => {
      setup()

      await waitFor(() => {
        expect(screen.getByText('Failure Diagnosis')).toBeInTheDocument()
      })

      // The lastError picks description first: "The model 'gpt-5.4-medium' does not exist or is not available"
      // diagnoseError matches /model.*does not exist/ and returns the model unavailable suggestion
      expect(
        screen.getByText(
          'The requested model is unavailable. Try switching to Claude or a different provider.'
        )
      ).toBeInTheDocument()
    })

    it('does not show diagnosis for completed runs', async () => {
      const completedRun = { ...mockRun, status: 'completed' }
      const completedEvents = mockTimeline
        .filter((e) => e.status !== 'failed')
        .filter((e) => e.kind === 'execution')
      const response = makeTimelineResponse({
        run: completedRun,
        execution_events: completedEvents,
      })

      setup(mockFetchSuccess(response))

      await waitFor(() => {
        expect(screen.getByText('Deploy frontend changes')).toBeInTheDocument()
      })

      expect(screen.queryByText('Failure Diagnosis')).not.toBeInTheDocument()
    })
  })

  // ---- Retry ----

  describe('Retry', () => {
    it('shows retry button for failed runs', async () => {
      setup()

      await waitFor(() => {
        expect(screen.getByText('Deploy frontend changes')).toBeInTheDocument()
      })

      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    it('does not show retry button for completed runs', async () => {
      const completedRun = { ...mockRun, status: 'completed' }
      const response = makeTimelineResponse({ run: completedRun })

      setup(mockFetchSuccess(response))

      await waitFor(() => {
        expect(screen.getByText('Deploy frontend changes')).toBeInTheDocument()
      })

      // No retry buttons for completed runs (neither in header nor diagnosis)
      const retryButtons = screen.queryAllByText('Retry')
      expect(retryButtons.length).toBe(0)
    })

    it('calls POST /api/runs/{id}/retry on click', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
        if (typeof url === 'string' && url.includes('/retry') && opts?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { id: 'run-new-456' } }),
          })
        }
        // Default: timeline response
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(makeTimelineResponse()),
        })
      })

      setup(fetchMock)

      await waitFor(() => {
        expect(screen.getByText('Deploy frontend changes')).toBeInTheDocument()
      })

      const retryButton = screen.getByText('Retry')
      fireEvent.click(retryButton)

      await waitFor(() => {
        const retryCalls = fetchMock.mock.calls.filter(
          ([url, opts]: [string, RequestInit?]) =>
            url.includes('/retry') && opts?.method === 'POST'
        )
        expect(retryCalls.length).toBe(1)
        expect(retryCalls[0][0]).toBe('/api/runs/run-abc123/retry')
      })
    })

    it('navigates to new run on successful retry', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
        if (typeof url === 'string' && url.includes('/retry') && opts?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { id: 'run-new-456' } }),
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(makeTimelineResponse()),
        })
      })

      setup(fetchMock)

      await waitFor(() => {
        expect(screen.getByText('Deploy frontend changes')).toBeInTheDocument()
      })

      const retryButton = screen.getByText('Retry')
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/runs/run-new-456')
      })
    })
  })
})
