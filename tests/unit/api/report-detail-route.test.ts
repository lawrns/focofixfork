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

import { GET } from '@/app/api/reports/[id]/route'

describe('/api/reports/[id] route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue({
      user: { id: 'user-1' },
      error: null,
      response: NextResponse.next(),
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: { id: 'report-1', title: 'Foco Project Health Report' },
                error: null,
              })),
            })),
          })),
        })),
      },
    })
  })

  test('returns the report record for authenticated users', async () => {
    const res = await GET(new NextRequest('http://localhost:4000/api/reports/report-1'), {
      params: { id: 'report-1' },
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.report.id).toBe('report-1')
  })
})
