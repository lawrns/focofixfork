import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const {
  mockGetAuthUser,
  mockMergeAuthResponse,
  mockFrom,
  mockInsert,
} = vi.hoisted(() => ({
  mockGetAuthUser: vi.fn(),
  mockMergeAuthResponse: vi.fn((response: NextResponse) => response),
  mockFrom: vi.fn(),
  mockInsert: vi.fn(),
}))

vi.mock('@/lib/api/auth-helper', () => ({
  getAuthUser: mockGetAuthUser,
  mergeAuthResponse: mockMergeAuthResponse,
}))

import { POST } from '@/app/api/notifications/from-briefing/route'

describe('/api/notifications/from-briefing', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetAuthUser.mockResolvedValue({
      user: { id: 'user-1' },
      supabase: { from: mockFrom },
      error: null,
      response: NextResponse.next(),
    })
  })

  test('uses the provided workspace id when creating inbox notifications', async () => {
    mockInsert.mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'foco_workspace_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { workspace_id: 'workspace-1' }, error: null }),
              }),
            }),
          }),
        }
      }

      if (table === 'inbox_items') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                gte: async () => ({ data: [], error: null }),
              }),
            }),
          }),
          insert: mockInsert,
        }
      }

      throw new Error(`Unexpected table ${table}`)
    })

    const req = new NextRequest('http://localhost:4000/api/notifications/from-briefing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace-1',
        briefing: {
          date: '2026-03-09',
          sections: {
            recommendations: ['Investigate broken notification inserts'],
          },
        },
      }),
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.created).toBe(1)
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        workspace_id: 'workspace-1',
        user_id: 'user-1',
        type: 'ai_flag',
      }),
    ])
  })

  test('skips notification creation when the user has no workspace', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'foco_workspace_members') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }
      }

      if (table === 'inbox_items') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                gte: async () => ({ data: [], error: null }),
              }),
            }),
          }),
          insert: mockInsert,
        }
      }

      throw new Error(`Unexpected table ${table}`)
    })

    const req = new NextRequest('http://localhost:4000/api/notifications/from-briefing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        briefing: {
          date: '2026-03-09',
          sections: {
            recommendations: ['Investigate broken notification inserts'],
          },
        },
      }),
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.created).toBe(0)
    expect(body.reason).toBe('no_workspace')
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
