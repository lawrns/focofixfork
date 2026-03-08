import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const {
  mockGetAuthUser,
  mockMergeAuthResponse,
  mockGetUserCoFounderPolicy,
  mockIsInOvernightWindow,
  mockLoadNightLaunchProjects,
  mockPreflightProjectRepo,
  mockLoadFounderProfile,
  mockRunsInsert,
  mockAutonomyInsert,
  mockLedgerInsert,
  mockCreateCommandStreamJob,
  mockSetJobRunId,
  mockRunPipelineStreamJob,
  mockCreateAutonomySessionJobs,
  mockReconcileAutonomySession,
  mockUpdateAutonomySessionJob,
} = vi.hoisted(() => ({
  mockGetAuthUser: vi.fn(),
  mockMergeAuthResponse: vi.fn((response: NextResponse) => response),
  mockGetUserCoFounderPolicy: vi.fn(),
  mockIsInOvernightWindow: vi.fn(),
  mockLoadNightLaunchProjects: vi.fn(),
  mockPreflightProjectRepo: vi.fn(),
  mockLoadFounderProfile: vi.fn(),
  mockRunsInsert: vi.fn(),
  mockAutonomyInsert: vi.fn(),
  mockLedgerInsert: vi.fn(),
  mockCreateCommandStreamJob: vi.fn(),
  mockSetJobRunId: vi.fn(),
  mockRunPipelineStreamJob: vi.fn(),
  mockCreateAutonomySessionJobs: vi.fn(),
  mockReconcileAutonomySession: vi.fn(),
  mockUpdateAutonomySessionJob: vi.fn(),
}))

vi.mock('@/lib/api/auth-helper', () => ({
  getAuthUser: mockGetAuthUser,
  mergeAuthResponse: mockMergeAuthResponse,
}))

vi.mock('@/lib/autonomy/settings', () => ({
  getUserCoFounderPolicy: mockGetUserCoFounderPolicy,
}))

vi.mock('@/lib/autonomy/policy', () => ({
  isInOvernightWindow: mockIsInOvernightWindow,
}))

vi.mock('@/lib/autonomy/night-session', async () => {
  const actual = await vi.importActual<typeof import('@/lib/autonomy/night-session')>('@/lib/autonomy/night-session')
  return {
    ...actual,
    loadNightLaunchProjects: mockLoadNightLaunchProjects,
    preflightProjectRepo: mockPreflightProjectRepo,
  }
})

vi.mock('@/lib/cofounder-mode/founder-profile', () => ({
  loadFounderProfile: mockLoadFounderProfile,
}))

vi.mock('@/lib/command-surface/stream-broker', () => ({
  createCommandStreamJob: mockCreateCommandStreamJob,
  setJobRunId: mockSetJobRunId,
}))

vi.mock('@/lib/command-surface/pipeline-runner', () => ({
  runPipelineStreamJob: mockRunPipelineStreamJob,
}))

vi.mock('@/lib/autonomy/session-jobs', () => ({
  createAutonomySessionJobs: mockCreateAutonomySessionJobs,
  reconcileAutonomySession: mockReconcileAutonomySession,
  updateAutonomySessionJob: mockUpdateAutonomySessionJob,
}))

import { POST } from '@/app/api/autonomy/sessions/start/route'

function createSupabase() {
  return {
    from: vi.fn((table: string) => {
      if (table === 'runs') {
        return {
          insert: mockRunsInsert,
        }
      }
      if (table === 'autonomy_sessions') {
        return {
          insert: mockAutonomyInsert,
        }
      }
      if (table === 'ledger_events') {
        return {
          insert: mockLedgerInsert,
        }
      }
      throw new Error(`Unexpected table ${table}`)
    }),
  }
}

describe('/api/autonomy/sessions/start route', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetUserCoFounderPolicy.mockResolvedValue({
      mode: 'bounded',
      profile: 'bounded_operator',
      overnightWindow: {
        enabled: true,
        timezone: 'UTC',
        start: '22:00',
        end: '07:00',
      },
      hardLimits: {
        spendCapUsdPerWindow: 0,
        maxExternalMessages: 0,
        maxLiveExperiments: 0,
        allowProductionDeploys: false,
      },
      actionPolicies: {
        allowedDomains: ['code'],
        blockedActionTypes: [],
        requireApprovalActionTypes: [],
      },
      trustGates: {
        minConfidenceToExecute: 0.8,
        minTrustScoreToRaiseAutonomy: 0.9,
      },
    })
    mockIsInOvernightWindow.mockReturnValue(true)
    mockLoadNightLaunchProjects.mockResolvedValue([
      {
        id: '11111111-1111-1111-1111-111111111111',
        workspace_id: '22222222-2222-2222-2222-222222222222',
        name: 'Repo One',
        slug: 'repo-one',
        local_path: '/tmp/repo-one',
        git_remote: 'git@github.com:test/repo-one.git',
      },
    ])
    mockPreflightProjectRepo.mockResolvedValue({
      projectId: '11111111-1111-1111-1111-111111111111',
      projectName: 'Repo One',
      localPath: '/tmp/repo-one',
      ok: true,
      reason: null,
      remote: 'git@github.com:test/repo-one.git',
      baseBranch: 'main',
      currentBranch: 'main',
      targetBranch: 'autonomy/night-operator/20260306',
      hasUncommittedChanges: false,
      syncBeforeRun: true,
      allowPush: true,
    })
    mockLoadFounderProfile.mockResolvedValue({
      available: true,
      stale: false,
      excerpt: 'Optimize for safe, reviewable progress by morning.',
      parsed: { strategic_priority_order: { product_quality: 6 } },
      issues: [],
    })
    mockRunsInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'run-1',
            runner: 'agent-1',
            status: 'running',
            summary: 'Autonomous co-founder session',
            started_at: '2026-03-06T00:00:00.000Z',
            created_at: '2026-03-06T00:00:00.000Z',
          },
          error: null,
        }),
      }),
    })
    mockAutonomyInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'session-1',
            status: 'running',
            window_start: '2026-03-06T00:00:00.000Z',
            selected_agent: { id: 'agent-1', name: 'Night Operator' },
            selected_project_ids: ['11111111-1111-1111-1111-111111111111'],
            git_strategy: { branchPrefix: 'autonomy' },
            repo_preflight: [],
          },
          error: null,
        }),
      }),
    })
    mockLedgerInsert.mockResolvedValue({ error: null })
    mockCreateCommandStreamJob.mockReturnValue('job-1')
    mockSetJobRunId.mockResolvedValue(undefined)
    mockCreateAutonomySessionJobs.mockResolvedValue([
      {
        id: 'job-row-1',
        session_id: 'session-1',
        user_id: 'user-1',
        workspace_id: '22222222-2222-2222-2222-222222222222',
        project_id: '11111111-1111-1111-1111-111111111111',
        project_name: 'Repo One',
        project_slug: 'repo-one',
        status: 'queued',
        command_job_id: 'job-1',
        pipeline_run_id: null,
        report_id: null,
        artifact_id: null,
        summary: {},
        error: null,
        created_at: '2026-03-06T00:00:00.000Z',
        updated_at: '2026-03-06T00:00:00.000Z',
      },
    ])
    mockReconcileAutonomySession.mockResolvedValue({ status: 'running', summary: {}, jobs: [] })
    mockUpdateAutonomySessionJob.mockResolvedValue(null)
    mockRunPipelineStreamJob.mockResolvedValue(undefined)

    mockGetAuthUser.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
      supabase: createSupabase(),
      error: null,
      response: NextResponse.next(),
    })
  })

  test('rejects invalid payloads before creating a session', async () => {
    const req = new NextRequest('http://localhost:4000/api/autonomy/sessions/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objective: 'missing required fields' }),
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.message).toContain('Invalid night autonomy payload')
    expect(mockRunsInsert).not.toHaveBeenCalled()
  })

  test('rejects repo preflight failures', async () => {
    mockPreflightProjectRepo.mockResolvedValueOnce({
      projectId: '11111111-1111-1111-1111-111111111111',
      projectName: 'Repo One',
      localPath: '/tmp/repo-one',
      ok: false,
      reason: 'Repository has uncommitted changes',
      remote: 'git@github.com:test/repo-one.git',
      baseBranch: 'main',
      currentBranch: 'main',
      targetBranch: 'autonomy/night-operator/20260306',
      hasUncommittedChanges: true,
      syncBeforeRun: true,
      allowPush: true,
    })

    const req = new NextRequest('http://localhost:4000/api/autonomy/sessions/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: '22222222-2222-2222-2222-222222222222',
        selected_agent: {
          id: 'agent-1',
          kind: 'custom',
          name: 'Night Operator',
          role: 'Repo fixer',
          expertise: ['git'],
          incentives: ['safety'],
          risk_model: 'Avoid protected branches',
        },
        selected_project_ids: ['11111111-1111-1111-1111-111111111111'],
        objective: 'Ship safe fixes',
        git_strategy: {
          syncBeforeRun: true,
          branchPrefix: 'autonomy',
          allowPush: true,
          allowCommit: true,
        },
      }),
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.message).toContain('Night autonomy preflight failed')
    expect(mockRunsInsert).not.toHaveBeenCalled()
  })

  test('creates queued report jobs and starts report-only background dispatch', async () => {
    const req = new NextRequest('http://localhost:4000/api/autonomy/sessions/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: 'workspace_id=22222222-2222-2222-2222-222222222222' },
      body: JSON.stringify({
        workspace_id: '22222222-2222-2222-2222-222222222222',
        selected_agent: {
          id: 'agent-1',
          kind: 'custom',
          name: 'Night Operator',
          role: 'Repo fixer',
          expertise: ['git'],
          incentives: ['safety'],
          risk_model: 'Avoid protected branches',
        },
        selected_project_ids: ['11111111-1111-1111-1111-111111111111'],
        objective: 'Leave a safe morning handoff',
        git_strategy: {
          syncBeforeRun: true,
          branchPrefix: 'autonomy',
          allowPush: true,
          allowCommit: true,
        },
      }),
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.selectedAgent.name).toBe('Night Operator')
    expect(body.data.selectedProjectIds).toEqual(['11111111-1111-1111-1111-111111111111'])
    expect(body.data.jobCount).toBe(1)
    expect(mockRunsInsert).toHaveBeenCalledTimes(1)
    expect(mockAutonomyInsert).toHaveBeenCalledTimes(1)
    expect(mockCreateAutonomySessionJobs).toHaveBeenCalledTimes(1)
    expect(mockRunPipelineStreamJob).toHaveBeenCalledTimes(1)
    expect(mockLedgerInsert).toHaveBeenCalledTimes(1)
  })
})
