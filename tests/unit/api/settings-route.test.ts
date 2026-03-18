import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const {
  mockGetAuthUser,
  mockMergeAuthResponse,
  mockFrom,
  mockUpsert,
  mockUpdate,
} = vi.hoisted(() => ({
  mockGetAuthUser: vi.fn(),
  mockMergeAuthResponse: vi.fn((response: NextResponse) => response),
  mockFrom: vi.fn(),
  mockUpsert: vi.fn(),
  mockUpdate: vi.fn(),
}))

vi.mock('@/lib/api/auth-helper', () => ({
  getAuthUser: mockGetAuthUser,
  mergeAuthResponse: mockMergeAuthResponse,
}))

import { GET, PATCH } from '@/app/api/settings/route'

describe('/api/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetAuthUser.mockResolvedValue({
      user: { id: 'user-1' },
      supabase: { from: mockFrom },
      error: null,
      response: NextResponse.next(),
    })
  })

  test('returns settings from a user_id fallback row when id lookup is empty', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table !== 'user_profiles') {
        throw new Error(`Unexpected table ${table}`)
      }

      return {
        select: () => ({
          eq: (column: string) => ({
            maybeSingle: async () => {
              if (column === 'id') {
                return { data: null, error: null }
              }

              if (column === 'user_id') {
                return {
                  data: {
                    id: 'profile-1',
                    settings: { notifications: { email: true } },
                  },
                  error: null,
                }
              }

              throw new Error(`Unexpected column ${column}`)
            },
          }),
        }),
        upsert: mockUpsert,
        update: mockUpdate,
      }
    })

    const res = await GET(new NextRequest('http://localhost:4000/api/settings'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data.settings).toEqual({ notifications: { email: true } })
  })

  test('creates a settings row on patch when the profile does not exist yet', async () => {
    mockUpsert.mockReturnValue({
      select: () => ({
        single: async () => ({
          data: {
            settings: {
              notifications: {
                channels: { in_app: true },
              },
            },
          },
          error: null,
        }),
      }),
    })

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'user_profiles') {
        throw new Error(`Unexpected table ${table}`)
      }

      return {
        select: () => ({
          eq: (column: string) => ({
            maybeSingle: async () => {
              if (column === 'id') {
                return { data: null, error: null }
              }

              if (column === 'user_id') {
                return { data: null, error: { code: '42703', message: 'column user_id does not exist' } }
              }

              throw new Error(`Unexpected column ${column}`)
            },
          }),
        }),
        upsert: mockUpsert,
        update: mockUpdate,
      }
    })

    const req = new NextRequest('http://localhost:4000/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notifications: {
          channels: { in_app: true },
        },
      }),
    })

    const res = await PATCH(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data.settings).toEqual({
      notifications: {
        channels: { in_app: true },
      },
    })
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        settings: {
          notifications: {
            channels: { in_app: true },
          },
        },
      }),
      { onConflict: 'id' }
    )
  })
})
