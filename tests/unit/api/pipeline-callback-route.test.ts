import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockFrom, mockAuthorizeAgentCallback } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockAuthorizeAgentCallback: vi.fn(),
}))

vi.mock('@/lib/security/agent-callback-auth', () => ({
  authorizeAgentCallback: (...args: unknown[]) => mockAuthorizeAgentCallback(...args),
}))

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: mockFrom,
  },
}))

import { POST } from '@/app/api/pipeline/callback/route'

describe('/api/pipeline/callback route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns 401 when callback auth fails', async () => {
    mockAuthorizeAgentCallback.mockReturnValue(false)

    const req = new NextRequest('http://localhost:4000/api/pipeline/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: 'pipeline:run1:plan' }),
    })

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  test('returns 409 when callback run_id mismatches active phase run id', async () => {
    mockAuthorizeAgentCallback.mockReturnValue(true)

    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'run1',
        status: 'planning',
        planner_run_id: 'expected-run-id',
        executor_run_id: null,
        reviewer_run_id: null,
      },
      error: null,
    })

    const eqSecond = vi.fn().mockReturnValue({ single })
    const eqFirst = vi.fn().mockReturnValue({ eq: eqSecond, single })
    const select = vi.fn().mockReturnValue({ eq: eqFirst })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'pipeline_runs') {
        return { select }
      }
      return { select: vi.fn(), update: vi.fn() }
    })

    const req = new NextRequest('http://localhost:4000/api/pipeline/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task_id: 'pipeline:run1:plan',
        run_id: 'wrong-run-id',
        status: 'completed',
        output: '{}',
      }),
    })

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(409)
    expect(data.error).toContain('does not match')
  })
})
