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

vi.mock('@/features/orchestration/services/orchestration-engine', () => ({
  completePhaseTask: vi.fn().mockResolvedValue({ success: true, workflowAdvanced: false }),
}))

import { POST } from '@/app/api/orchestration/callback/route'

describe('/api/orchestration/callback route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns 401 when callback auth fails', async () => {
    mockAuthorizeAgentCallback.mockReturnValue(false)

    const req = new NextRequest('http://localhost:4000/api/orchestration/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: 'm2c1:w1:0' }),
    })

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
