import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const {
  mockGetAuthUser,
  mockMergeAuthResponse,
  mockVerifyWorkspaceMembership,
  mockResolveClawdbotRuntimeProfile,
  mockUpsertClawdbotRuntimeProfile,
} = vi.hoisted(() => ({
  mockGetAuthUser: vi.fn(),
  mockMergeAuthResponse: vi.fn((response: NextResponse) => response),
  mockVerifyWorkspaceMembership: vi.fn(),
  mockResolveClawdbotRuntimeProfile: vi.fn(),
  mockUpsertClawdbotRuntimeProfile: vi.fn(),
}))

vi.mock('@/lib/api/auth-helper', () => ({
  getAuthUser: mockGetAuthUser,
  mergeAuthResponse: mockMergeAuthResponse,
}))

vi.mock('@/lib/cofounder-mode/config-resolver', () => ({
  verifyWorkspaceMembership: mockVerifyWorkspaceMembership,
}))

vi.mock('@/lib/clawdbot/runtime-profile', () => ({
  resolveClawdbotRuntimeProfile: mockResolveClawdbotRuntimeProfile,
  summarizeRuntimeProfile: (profile: { model_preference?: string | null; tool_mode: string }) => ({
    modelPreference: profile.model_preference ?? null,
    toolMode: profile.tool_mode,
  }),
  upsertClawdbotRuntimeProfile: mockUpsertClawdbotRuntimeProfile,
}))

import { GET, PUT } from '@/app/api/agents/clawdbot/runtime/route'

describe('/api/agents/clawdbot/runtime route', () => {
  const mockSupabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: { id: 'project-1', workspace_id: 'workspace-1' }, error: null })),
        })),
      })),
    })),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue({
      user: { id: 'user-1' },
      supabase: mockSupabase,
      error: null,
      response: NextResponse.next(),
    })
    mockVerifyWorkspaceMembership.mockResolvedValue(true)
    mockResolveClawdbotRuntimeProfile.mockResolvedValue({
      user_id: 'user-1',
      workspace_id: 'workspace-1',
      project_id: null,
      agent_backend: 'clawdbot',
      agent_key: 'clawdbot',
      display_name: 'ClawdBot',
      scope_key: 'workspace:workspace-1:default',
      active: true,
      model_preference: 'sonnet',
      tool_mode: 'gateway',
      bootstrap_files: ['FOUNDER_PROFILE.md'],
      memory_scope: {},
      session_scope: { dm_scope: 'per-channel-peer' },
      permissions: {},
      channel_routing: {},
      metadata: {},
    })
    mockUpsertClawdbotRuntimeProfile.mockResolvedValue({
      user_id: 'user-1',
      workspace_id: 'workspace-1',
      project_id: 'project-1',
      agent_backend: 'clawdbot',
      agent_key: 'clawdbot',
      display_name: 'ClawdBot',
      scope_key: 'workspace:workspace-1:project:project-1',
      active: true,
      model_preference: 'codex',
      tool_mode: 'gateway',
      bootstrap_files: ['FOUNDER_PROFILE.md', 'AGENTS.md'],
      memory_scope: {},
      session_scope: { dm_scope: 'per-channel-peer' },
      permissions: {},
      channel_routing: {},
      metadata: {},
    })
  })

  test('returns the resolved runtime profile for the workspace', async () => {
    const res = await GET(new NextRequest('http://localhost:4000/api/agents/clawdbot/runtime?workspace_id=workspace-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mockResolveClawdbotRuntimeProfile).toHaveBeenCalledWith(mockSupabase, expect.objectContaining({
      userId: 'user-1',
      workspaceId: 'workspace-1',
    }))
    expect(body.data.summary.modelPreference).toBe('sonnet')
  })

  test('saves project-scoped model preferences', async () => {
    const req = new NextRequest('http://localhost:4000/api/agents/clawdbot/runtime', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: 'workspace-1',
        project_id: 'project-1',
        model_preference: 'codex',
        bootstrap_files: ['FOUNDER_PROFILE.md', 'AGENTS.md'],
      }),
    })

    const res = await PUT(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mockUpsertClawdbotRuntimeProfile).toHaveBeenCalledWith(mockSupabase, expect.objectContaining({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      projectId: 'project-1',
      modelPreference: 'codex',
    }))
    expect(body.data.profile.model_preference).toBe('codex')
  })
})
