import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authorizeOpenClawRequestMock = vi.fn(() => false)

vi.mock('@/lib/security/openclaw-auth', () => ({
  authorizeOpenClawRequest: (...args: unknown[]) => authorizeOpenClawRequestMock(...args),
}))

import { authorizeAgentCallback } from '@/lib/security/agent-callback-auth'

describe('authorizeAgentCallback', () => {
  const previousCallbackToken = process.env.CLAWDBOT_CALLBACK_TOKEN

  beforeEach(() => {
    process.env.CLAWDBOT_CALLBACK_TOKEN = 'callback-token'
    authorizeOpenClawRequestMock.mockReset()
    authorizeOpenClawRequestMock.mockReturnValue(false)
  })

  afterEach(() => {
    process.env.CLAWDBOT_CALLBACK_TOKEN = previousCallbackToken
  })

  it('authorizes callback with accepted bearer token', () => {
    const req = new NextRequest('http://localhost:3000/api/pipeline/callback', {
      method: 'POST',
      headers: {
        authorization: 'Bearer callback-token',
      },
      body: '{"task_id":"pipeline:r1:plan"}',
    })

    expect(authorizeAgentCallback(req, '{"task_id":"pipeline:r1:plan"}')).toBe(true)
  })

  it('falls back to OpenClaw signature verification', () => {
    authorizeOpenClawRequestMock.mockReturnValueOnce(true)

    const req = new NextRequest('http://localhost:3000/api/pipeline/callback', {
      method: 'POST',
      body: '{"task_id":"pipeline:r1:plan"}',
    })

    expect(authorizeAgentCallback(req, '{"task_id":"pipeline:r1:plan"}')).toBe(true)
    expect(authorizeOpenClawRequestMock).toHaveBeenCalledOnce()
  })
})
