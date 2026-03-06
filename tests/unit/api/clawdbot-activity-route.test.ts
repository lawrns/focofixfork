import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockAuthorizeAgentCallback,
  mockRecordClawdbotActivity,
  mockUpsertClawdbotRuntimeProfile,
} = vi.hoisted(() => ({
  mockAuthorizeAgentCallback: vi.fn(),
  mockRecordClawdbotActivity: vi.fn(),
  mockUpsertClawdbotRuntimeProfile: vi.fn(),
}))

vi.mock('@/lib/security/agent-callback-auth', () => ({
  authorizeAgentCallback: mockAuthorizeAgentCallback,
}))

vi.mock('@/lib/clawdbot/activity', () => ({
  recordClawdbotActivity: mockRecordClawdbotActivity,
}))

vi.mock('@/lib/clawdbot/runtime-profile', () => ({
  upsertClawdbotRuntimeProfile: mockUpsertClawdbotRuntimeProfile,
}))

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {},
}))

import { POST } from '@/app/api/agents/clawdbot/activity/route'

describe('/api/agents/clawdbot/activity route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthorizeAgentCallback.mockReturnValue(true)
    mockUpsertClawdbotRuntimeProfile.mockResolvedValue({ id: 'profile-1' })
    mockRecordClawdbotActivity.mockResolvedValue({
      row: {
        id: 'event-1',
        user_id: 'user-1',
        workspace_id: 'workspace-1',
        project_id: null,
        task_id: null,
        run_id: null,
        agent_backend: 'clawdbot',
        agent_key: 'clawdbot-main',
        session_key: 'telegram:chat-1',
        correlation_id: 'corr-1',
        event_type: 'tool.completed',
        severity: 'info',
        direction: 'tool',
        title: 'Tool call completed',
        detail: 'exec finished',
        source: 'clawdbot_bridge',
        payload: { model: 'sonnet' },
        idempotency_key: 'idem-1',
        created_at: new Date().toISOString(),
      },
      idempotent: false,
    })
  })

  test('rejects unauthorized bridge calls', async () => {
    mockAuthorizeAgentCallback.mockReturnValue(false)

    const req = new NextRequest('http://localhost:4000/api/agents/clawdbot/activity', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-1', event_type: 'tool.started' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  test('persists activity and returns the bridge event', async () => {
    const req = new NextRequest('http://localhost:4000/api/agents/clawdbot/activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': 'idem-1',
      },
      body: JSON.stringify({
        user_id: 'user-1',
        workspace_id: 'workspace-1',
        agent_key: 'clawdbot-main',
        session_key: 'telegram:chat-1',
        correlation_id: 'corr-1',
        event_type: 'tool.completed',
        direction: 'tool',
        title: 'Tool call completed',
        detail: 'exec finished',
        payload: { model: 'sonnet' },
      }),
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(mockUpsertClawdbotRuntimeProfile).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      agentKey: 'clawdbot-main',
    }))
    expect(mockRecordClawdbotActivity).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      sessionKey: 'telegram:chat-1',
      idempotencyKey: 'idem-1',
    }))
    expect(body.data.item.event_type).toBe('tool.completed')
  })
})
