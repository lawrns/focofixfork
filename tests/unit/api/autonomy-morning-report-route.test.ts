import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const {
  mockGetAuthUser,
  mockMergeAuthResponse,
  mockFrom,
} = vi.hoisted(() => ({
  mockGetAuthUser: vi.fn(),
  mockMergeAuthResponse: vi.fn((response: NextResponse) => response),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/api/auth-helper', () => ({
  getAuthUser: mockGetAuthUser,
  mergeAuthResponse: mockMergeAuthResponse,
}))

import { GET } from '@/app/api/autonomy/reports/morning/route'

describe('/api/autonomy/reports/morning route', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetAuthUser.mockResolvedValue({
      user: { id: 'user-1' },
      supabase: { from: mockFrom },
      error: null,
      response: NextResponse.next(),
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'autonomy_sessions') {
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                order: async () => ({
                  data: [{
                    id: 'session-1',
                    run_id: 'run-1',
                    objective: 'Leave a morning handoff',
                    mode: 'bounded',
                    profile: 'bounded_operator',
                    status: 'completed',
                    window_start: '2026-03-06T00:00:00.000Z',
                    window_end: '2026-03-06T04:00:00.000Z',
                    created_at: '2026-03-06T00:00:00.000Z',
                    selected_agent: { name: 'Night Operator' },
                    selected_project_ids: ['project-1'],
                    summary: { completed_jobs: 1 },
                  }],
                  error: null,
                }),
              }),
            }),
          }),
        }
      }

      if (table === 'crico_actions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => ({
                    limit: async () => ({ data: [{ id: 'decision-1', intent: 'approve', authority_level: 'high', created_at: '2026-03-06T03:00:00.000Z' }], error: null }),
                  }),
                }),
              }),
            }),
          }),
        }
      }

      if (table === 'autonomy_action_logs') {
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                order: async () => ({
                  data: [{
                    id: 'log-1',
                    action_type: 'report',
                    domain: 'code',
                    input: {},
                    decision: {},
                    allowed: false,
                    requires_approval: true,
                    created_at: '2026-03-06T03:30:00.000Z',
                  }],
                  error: null,
                }),
              }),
            }),
          }),
        }
      }

      if (table === 'autonomy_session_jobs') {
        return {
          select: () => ({
            in: () => ({
              order: async () => ({
                data: [{
                  id: 'job-1',
                  session_id: 'session-1',
                  user_id: 'user-1',
                  workspace_id: 'workspace-1',
                  project_id: 'project-1',
                  project_name: 'Repo One',
                  project_slug: 'repo-one',
                  status: 'completed',
                  command_job_id: 'cmd-1',
                  pipeline_run_id: 'pipe-1',
                  report_id: 'report-1',
                  artifact_id: 'artifact-1',
                  summary: { report_title: 'Repo One Project Health Report' },
                  error: null,
                  created_at: '2026-03-06T00:10:00.000Z',
                  updated_at: '2026-03-06T00:20:00.000Z',
                }],
                error: null,
              }),
            }),
          }),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    })
  })

  test('returns linked overnight outputs and aggregate counts', async () => {
    const req = new NextRequest('http://localhost:4000/api/autonomy/reports/morning?sinceHours=12')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data.summary.completedReports).toBe(1)
    expect(body.data.jobs_summary.completed).toBe(1)
    expect(body.data.latest_outputs[0]).toEqual(expect.objectContaining({
      project_name: 'Repo One',
      report_url: '/reports/report-1',
      pipeline_url: '/empire/pipeline?run_id=pipe-1',
    }))
  })
})
