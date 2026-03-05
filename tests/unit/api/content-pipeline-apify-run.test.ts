import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const {
  mockGetAuthUser,
  mockMergeAuthResponse,
  mockResolveWorkspaceScope,
  mockFrom,
  mockStartApifyRun,
  mockGetDatasetItems,
  mockPrepareApifyItemsForSource,
  mockProcessNewItems,
} = vi.hoisted(() => ({
  mockGetAuthUser: vi.fn(),
  mockMergeAuthResponse: vi.fn((response: NextResponse) => response),
  mockResolveWorkspaceScope: vi.fn(),
  mockFrom: vi.fn(),
  mockStartApifyRun: vi.fn(),
  mockGetDatasetItems: vi.fn(),
  mockPrepareApifyItemsForSource: vi.fn(),
  mockProcessNewItems: vi.fn(),
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

vi.mock('@/features/content-pipeline/services/apify-client', () => ({
  startApifyRun: mockStartApifyRun,
  getDatasetItems: mockGetDatasetItems,
}))

vi.mock('@/features/content-pipeline/services/social-ingestion', () => ({
  prepareApifyItemsForSource: mockPrepareApifyItemsForSource,
}))

vi.mock('@/features/content-pipeline/services/source-poller', () => ({
  SourcePoller: {
    processNewItems: mockProcessNewItems,
  },
}))

import { POST as postApifyRun } from '@/app/api/content-pipeline/apify/run/route'

describe('POST /api/content-pipeline/apify/run', () => {
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

    mockStartApifyRun.mockResolvedValue({
      runId: 'run-1',
      status: 'succeeded',
      defaultDatasetId: 'dataset-1',
    })
    mockGetDatasetItems.mockResolvedValue([{ id: 'item-1' }])
    mockPrepareApifyItemsForSource.mockResolvedValue({
      items: [{ external_id: 'item-1', content: 'Transcript text' }],
      videoItemsDetected: 1,
      videosDownloaded: 1,
      transcriptsCompleted: 1,
      transcriptsFailed: 0,
      warnings: [],
    })
    mockProcessNewItems.mockResolvedValue({
      success: true,
      itemsProcessed: 1,
      itemsNew: 1,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'content_sources') {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'source-1',
                    project_id: 'project-1',
                    type: 'apify',
                    headers: {
                      __foco_platform: 'instagram',
                      __foco_provider_config: { actor_id: 'apify/instagram-post-scraper' },
                    },
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }
      }

      if (table === 'apify_runs') {
        return {
          upsert: () => ({
            select: () => ({
              single: async () => ({
                data: { id: 'db-run-1' },
                error: null,
              }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    })
  })

  test('returns enriched ingestion metrics for social video runs', async () => {
    const req = new NextRequest('http://localhost:4000/api/content-pipeline/apify/run', {
      method: 'POST',
      body: JSON.stringify({ source_id: 'source-1' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await postApifyRun(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data.ingested).toEqual(
      expect.objectContaining({
        itemsProcessed: 1,
        itemsNew: 1,
        videoItemsDetected: 1,
        videosDownloaded: 1,
        transcriptsCompleted: 1,
        transcriptsFailed: 0,
      })
    )
  })
})
