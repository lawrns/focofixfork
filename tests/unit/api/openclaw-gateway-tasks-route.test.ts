import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const {
  mockAuthorizeOpenClawRequest,
  mockGetAuthUser,
  mockMergeAuthResponse,
} = vi.hoisted(() => ({
  mockAuthorizeOpenClawRequest: vi.fn(),
  mockGetAuthUser: vi.fn(),
  mockMergeAuthResponse: vi.fn((response: NextResponse) => response),
}))

vi.mock('@/lib/security/openclaw-auth', () => ({
  authorizeOpenClawRequest: mockAuthorizeOpenClawRequest,
}))

vi.mock('@/lib/api/auth-helper', () => ({
  getAuthUser: mockGetAuthUser,
  mergeAuthResponse: mockMergeAuthResponse,
}))

import { POST } from '@/app/api/openclaw-gateway/tasks/route'

describe('/api/openclaw-gateway/tasks route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())

    mockAuthorizeOpenClawRequest.mockReturnValue(false)
    mockGetAuthUser.mockResolvedValue({
      user: { id: 'user-1' },
      error: null,
      response: NextResponse.next(),
    })
  })

  test('wraps advisor tasks and sends advisor prompt context downstream', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ run_id: 'run-123' }),
    } as Response)

    const req = new NextRequest('http://localhost:4000/api/openclaw-gateway/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'taleb',
        task: 'Stress-test this operating plan',
        context: { persona: 'auto' },
      }),
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.status).toBe('accepted')

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('http://127.0.0.1:18789/hooks/agent-run')

    const payload = JSON.parse(String(init?.body))
    expect(payload.agent_id).toBe('taleb')
    expect(payload.task).toContain('Advisor: Nassim Taleb')
    expect(payload.task).toContain('Stress-test this operating plan')
    expect(payload.context.advisor.name).toBe('Nassim Taleb')
    expect(payload.context.advisor.systemPrompt).toContain('What these symptoms usually imply:')
  })
})
