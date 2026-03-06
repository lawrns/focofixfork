import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const {
  mockGetAuthUser,
  mockMergeAuthResponse,
} = vi.hoisted(() => ({
  mockGetAuthUser: vi.fn(),
  mockMergeAuthResponse: vi.fn((response: NextResponse) => response),
}))

vi.mock('@/lib/api/auth-helper', () => ({
  getAuthUser: mockGetAuthUser,
  mergeAuthResponse: mockMergeAuthResponse,
}))

import { GET } from '@/app/api/founder-profile/route'

describe('/api/founder-profile route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue({
      user: { id: 'user-1' },
      error: null,
      response: NextResponse.next(),
    })
  })

  test('returns structured founder profile data for authenticated users', async () => {
    const res = await GET(new NextRequest('http://localhost:4000/api/founder-profile'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.founder_profile.available).toBe(true)
    expect(body.data.founder_profile.parsed.activeVenture).toBe('foco.mx')
    expect(body.data.founder_profile.parsed.strategicPriorityOrder).toContain('product_quality')
  })
})
