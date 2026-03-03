import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { buildOpenClawSignature } from '@/lib/security/openclaw-auth'

describe('openclaw auth signing', () => {
  it('builds deterministic signature for same input', () => {
    const req = new NextRequest('http://localhost:3000/api/openclaw/events', {
      method: 'POST',
      headers: {
        'x-openclaw-timestamp': '1735689600000',
      },
      body: '{"hello":"world"}',
    })

    const one = buildOpenClawSignature('test-secret', req, '{"hello":"world"}')
    const two = buildOpenClawSignature('test-secret', req, '{"hello":"world"}')

    expect(one).toBe(two)
    expect(one).toHaveLength(64)
  })
})

