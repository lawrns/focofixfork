import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const {
  mockGetAuthUser,
  mockMergeAuthResponse,
  mockResolveWorkspaceScope,
  mockFrom,
} = vi.hoisted(() => ({
  mockGetAuthUser: vi.fn(),
  mockMergeAuthResponse: vi.fn((response: NextResponse) => response),
  mockResolveWorkspaceScope: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/api/auth-helper', () => ({
  getAuthUser: mockGetAuthUser,
  mergeAuthResponse: mockMergeAuthResponse,
}))

vi.mock('@/features/content-pipeline/server/workspace-scope', async () => {
  const actual = await vi.importActual<typeof import('@/features/content-pipeline/server/workspace-scope')>(
    '@/features/content-pipeline/server/workspace-scope'
  )

  return {
    ...actual,
    resolveWorkspaceScope: mockResolveWorkspaceScope,
  }
})

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: mockFrom,
  },
}))

import { GET as getSocialSources } from '@/app/api/content-pipeline/social/sources/route'
import { GET as getSocialInsights } from '@/app/api/content-pipeline/social/insights/route'

describe('content pipeline social routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetAuthUser.mockResolvedValue({
      user: { id: 'user-1' },
      error: null,
      response: NextResponse.next(),
    })

    mockResolveWorkspaceScope.mockResolvedValue({
      scope: {
        workspaceIds: ['workspace-1'],
        projects: [{ id: 'project-1', workspace_id: 'workspace-1', name: 'Main', slug: 'main' }],
      },
      error: null,
    })
  })

  test('GET /social/sources returns normalized social sources with explicit item counts', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'content_sources') {
        return {
          select: () => ({
            in: () => ({
              order: async () => ({
                data: [
                  {
                    id: 'source-1',
                    project_id: 'project-1',
                    name: 'X: @openai',
                    url: 'https://x.com/openai',
                    type: 'apify',
                    headers: {
                      __foco_platform: 'twitter',
                      __foco_provider_config: { actor_id: 'apidojo/tweet-scraper' },
                    },
                    status: 'active',
                  },
                  {
                    id: 'source-2',
                    project_id: 'project-1',
                    name: 'RSS feed',
                    url: 'https://example.com/rss.xml',
                    type: 'rss',
                    headers: {},
                    status: 'active',
                  },
                ],
                error: null,
              }),
            }),
          }),
        }
      }

      if (table === 'content_items') {
        return {
          select: (_columns: string, options?: { count?: string; head?: boolean }) => {
            expect(options).toEqual({ count: 'exact', head: true })
            return {
              eq: async (_column: string, sourceId: string) => ({
                count: sourceId === 'source-1' ? 3 : 0,
                error: null,
              }),
            }
          },
        }
      }

      throw new Error(`Unexpected table ${table}`)
    })

    const res = await getSocialSources(new NextRequest('http://localhost:4000/api/content-pipeline/social/sources'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data).toEqual([
      expect.objectContaining({
        id: 'source-1',
        platform: 'twitter',
        item_count: 3,
      }),
    ])
  })

  test('GET /social/sources returns an empty list when the content pipeline schema is missing', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'content_sources') {
        return {
          select: () => ({
            in: () => ({
              order: async () => ({
                data: null,
                error: {
                  code: 'PGRST205',
                  message: "Could not find the table 'public.content_sources' in the schema cache",
                },
              }),
            }),
          }),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    })

    const res = await getSocialSources(new NextRequest('http://localhost:4000/api/content-pipeline/social/sources'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data).toEqual([])
  })

  test('GET /social/insights returns zeroed payload when there are no social sources', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'content_sources') {
        return {
          select: () => ({
            in: async () => ({
              data: [
                {
                  id: 'source-2',
                  project_id: 'project-1',
                  name: 'RSS feed',
                  url: 'https://example.com/rss.xml',
                  type: 'rss',
                  headers: {},
                  status: 'active',
                },
              ],
              error: null,
            }),
          }),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    })

    const res = await getSocialInsights(new NextRequest('http://localhost:4000/api/content-pipeline/social/insights'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data).toEqual({
      top_insights: [],
      themes: [],
      platform_counts: {},
      total_items: 0,
      analyzed_count: 0,
    })
  })

  test('GET /social/insights returns zeroed payload when the content pipeline schema is missing', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'content_sources') {
        return {
          select: () => ({
            in: async () => ({
              data: null,
              error: {
                code: 'PGRST205',
                message: "Could not find the table 'public.content_sources' in the schema cache",
              },
            }),
          }),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    })

    const res = await getSocialInsights(new NextRequest('http://localhost:4000/api/content-pipeline/social/insights'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data).toEqual({
      top_insights: [],
      themes: [],
      platform_counts: {},
      total_items: 0,
      analyzed_count: 0,
    })
  })

  test('GET /social/insights aggregates analyzed items for legacy embedded platform metadata', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'content_sources') {
        return {
          select: () => ({
            in: async () => ({
              data: [
                {
                  id: 'source-1',
                  project_id: 'project-1',
                  name: 'X: @openai',
                  url: 'https://x.com/openai',
                  type: 'apify',
                  headers: {
                    __foco_platform: 'twitter',
                  },
                  status: 'active',
                },
              ],
              error: null,
            }),
          }),
        }
      }

      if (table === 'content_items') {
        return {
          select: (columns: string, options?: { count?: string; head?: boolean }) => {
            if (options?.head) {
              return {
                in: () => ({
                  gte: async () => ({
                    count: 4,
                    error: null,
                  }),
                }),
              }
            }

            expect(columns).toContain('ai_summary')
            return {
              in: () => ({
                not: () => ({
                  gte: () => ({
                    order: () => ({
                      limit: async () => ({
                        data: [
                          {
                            id: 'item-1',
                            ai_summary: 'Users are discussing the launch',
                            ai_tags: ['launch', 'growth'],
                            relevance_score: 0.9,
                            published_at: null,
                            created_at: '2026-03-05T19:00:00.000Z',
                            source_id: 'source-1',
                          },
                        ],
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }
          },
        }
      }

      throw new Error(`Unexpected table ${table}`)
    })

    const res = await getSocialInsights(new NextRequest('http://localhost:4000/api/content-pipeline/social/insights'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data.top_insights).toEqual([
      expect.objectContaining({
        id: 'item-1',
        platform: 'twitter',
        source_name: 'X: @openai',
      }),
    ])
    expect(body.data.platform_counts).toEqual({ twitter: 1 })
    expect(body.data.total_items).toBe(4)
    expect(body.data.analyzed_count).toBe(1)
  })
})
