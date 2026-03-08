import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

import { discoverLiveClawdbot, parseSseEvents } from './support/clawdbot-live-harness'

const LIVE_ENABLED = process.env.LIVE_CLAWDBOT_PIPELINE === '1'

const {
  mockGetAuthUser,
  mockMergeAuthResponse,
  mockFrom,
  mockResolveProfile,
} = vi.hoisted(() => ({
  mockGetAuthUser: vi.fn(),
  mockMergeAuthResponse: vi.fn((response: NextResponse) => response),
  mockFrom: vi.fn(),
  mockResolveProfile: vi.fn(),
}))

vi.mock('@/lib/api/auth-helper', () => ({
  getAuthUser: mockGetAuthUser,
  mergeAuthResponse: mockMergeAuthResponse,
}))

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: mockFrom,
  },
}))

vi.mock('@/lib/ai/resolver', () => ({
  resolveAIExecutionProfileFromWorkspace: mockResolveProfile,
}))

describe('live ClawdBot pipeline routing harness', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test.runIf(LIVE_ENABLED)('queues the manual planning route through ClawdBot async dispatch', { timeout: 60_000 }, async () => {
    const live = await discoverLiveClawdbot()
    process.env.CLAWDBOT_API_URL = live.baseUrl
    process.env.OPENCLAW_SERVICE_TOKEN = live.token
    process.env.NEXT_PUBLIC_APP_URL = 'http://127.0.0.1:4000'

    const updates: Array<Record<string, unknown>> = []

    mockGetAuthUser.mockResolvedValue({
      user: { id: 'user-live-1' },
      supabase: {},
      error: null,
      response: NextResponse.next(),
    })

    mockResolveProfile.mockImplementation(async ({ useCase, requestedModel, requestedFallbackChain }: { useCase: string; requestedModel?: string; requestedFallbackChain?: string[] }) => {
      const resolvedModel = requestedModel ?? (useCase === 'pipeline_execute' ? live.models.execute : useCase === 'pipeline_review' ? live.models.review : live.models.plan)
      return {
        profile: {
          model: resolvedModel,
          fallback_chain: requestedFallbackChain ?? live.fallbackChain,
          routing_profile_id: 'live-routing-harness',
        },
      }
    })

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'pipeline_runs') throw new Error(`Unexpected table ${table}`)

      return {
        insert: () => ({
          select: () => ({
            single: async () => ({ data: { id: `live-plan-${Date.now()}` }, error: null }),
          }),
        }),
        update: (payload: Record<string, unknown>) => ({
          eq: async () => {
            updates.push(payload)
            return { error: null }
          },
        }),
      }
    })

    vi.resetModules()
    const { POST } = await import('@/app/api/pipeline/plan/route')

    const request = new NextRequest('http://localhost:4000/api/pipeline/plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        task_description: 'Live routing probe only. Create a tiny no-op validation plan. Do not inspect files and do not request code changes.',
        planner_model: live.models.plan,
        planner_fallback_chain: live.fallbackChain,
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data.runner).toBe('clawdbot_async')
    expect(body.data.planner_run_id).toBeTruthy()
    expect(body.data.actual_model).toBeNull()
    expect(body.data.fallback_events).toEqual([])
    expect(updates).toContainEqual(expect.objectContaining({ planner_run_id: body.data.planner_run_id }))
  })

  test.runIf(LIVE_ENABLED)('streams a harmless pipeline query through ClawdBot without direct fallback', { timeout: 180_000 }, async () => {
    const live = await discoverLiveClawdbot()
    process.env.CLAWDBOT_API_URL = live.baseUrl
    process.env.OPENCLAW_SERVICE_TOKEN = live.token
    process.env.NEXT_PUBLIC_APP_URL = 'http://127.0.0.1:4000'

    const updates: Array<Record<string, unknown>> = []

    mockGetAuthUser.mockResolvedValue({
      user: { id: 'user-live-1' },
      supabase: {},
      error: null,
      response: NextResponse.next(),
    })

    mockResolveProfile.mockImplementation(async ({ useCase, requestedModel, requestedFallbackChain }: { useCase: string; requestedModel?: string; requestedFallbackChain?: string[] }) => {
      const resolvedModel = requestedModel ?? (useCase === 'pipeline_execute' ? live.models.execute : useCase === 'pipeline_review' ? live.models.review : live.models.plan)
      return {
        profile: {
          model: resolvedModel,
          fallback_chain: requestedFallbackChain ?? live.fallbackChain,
          routing_profile_id: 'live-routing-harness',
        },
      }
    })

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'pipeline_runs') throw new Error(`Unexpected table ${table}`)

      return {
        insert: (payload: Record<string, unknown>) => ({
          select: () => ({
            single: async () => ({ data: { id: `live-stream-${Date.now()}` }, error: null }),
          }),
        }),
        update: (payload: Record<string, unknown>) => ({
          eq: async () => {
            updates.push(payload)
            return { error: null }
          },
        }),
      }
    })

    vi.resetModules()
    const { POST } = await import('@/app/api/pipeline/stream/route')

    const request = new NextRequest('http://localhost:4000/api/pipeline/stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        task_description: 'Live validation probe only. Produce a minimal no-op plan, then an execution result with empty patches and no commands. Do not inspect the repository and do not suggest edits.',
        planner_model: live.models.plan,
        planner_fallback_chain: live.fallbackChain,
        executor_model: live.models.execute,
        executor_fallback_chain: live.fallbackChain,
        auto_review: false,
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/event-stream')

    const events = parseSseEvents(await response.text())
    const activities = events
      .filter((event) => event.type === 'activity')
      .map((event) => `${event.phase ?? 'system'}:${String(event.message ?? '')}`)

    expect(events.some((event) => event.type === 'phase_routing' && event.phase === 'plan' && event.runner === 'clawdbot_stream' && event.resolved_model === live.models.plan)).toBe(true)
    expect(events.some((event) => event.type === 'phase_routing' && event.phase === 'execute' && event.runner === 'clawdbot_stream' && event.resolved_model === live.models.execute)).toBe(true)
    expect(events.some((event) => event.type === 'phase_complete' && event.phase === 'plan')).toBe(true)
    expect(events.some((event) => event.type === 'phase_complete' && event.phase === 'execute')).toBe(true)
    expect(events.some((event) => event.type === 'pipeline_complete')).toBe(true)
    expect(events.some((event) => event.type === 'phase_fallback')).toBe(false)
    expect(events.some((event) => event.type === 'phase_error')).toBe(false)
    expect(activities.some((message) => message.includes('Streaming unavailable'))).toBe(false)
    expect(updates.some((payload) => payload.status === 'complete')).toBe(true)
  })
})
