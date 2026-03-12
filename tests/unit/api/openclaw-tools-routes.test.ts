import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockAuthorizeOpenClawRequest,
  mockResolveOpenClawToolExecutionContext,
  mockBuildOpenClawBridgeManifest,
  mockExecuteToolCall,
} = vi.hoisted(() => ({
  mockAuthorizeOpenClawRequest: vi.fn(),
  mockResolveOpenClawToolExecutionContext: vi.fn(),
  mockBuildOpenClawBridgeManifest: vi.fn(),
  mockExecuteToolCall: vi.fn(),
}))

vi.mock('@/lib/security/openclaw-auth', () => ({
  authorizeOpenClawRequest: mockAuthorizeOpenClawRequest,
}))

vi.mock('@/lib/openclaw/tool-bridge', () => ({
  normalizeAIUseCase: vi.fn((value: unknown) =>
    typeof value === 'string' && value.trim().length > 0 ? value : 'command_surface_execute'
  ),
  resolveOpenClawToolExecutionContext: mockResolveOpenClawToolExecutionContext,
  buildOpenClawBridgeManifest: mockBuildOpenClawBridgeManifest,
}))

vi.mock('@/lib/ai/tool-executor', () => ({
  executeToolCall: mockExecuteToolCall,
}))

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: { __name: 'supabase-admin-mock' },
}))

import { POST as postManifest } from '@/app/api/openclaw/tools/manifest/route'
import { POST as postExecute } from '@/app/api/openclaw/tools/execute/route'

const workspaceId = 'd7de1d3e-cae6-4210-ae4e-775fb84ddb7d'
const actorUserId = '60c44927-9d61-40e2-8c41-7e44cf7f7981'

describe('/api/openclaw/tools routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthorizeOpenClawRequest.mockReturnValue(true)
    mockResolveOpenClawToolExecutionContext.mockResolvedValue({
      useCase: 'command_surface_execute',
      aiPolicy: {
        allowed_tools: ['search_workspace'],
        constraints: { require_approval_for_changes: false },
      },
      bridge: {
        available: true,
        base_url: 'http://localhost:4000',
        manifest_url: 'http://localhost:4000/api/openclaw/tools/manifest',
        execute_url: 'http://localhost:4000/api/openclaw/tools/execute',
        cli_path: '/home/laurence/focofixfork/scripts/openclaw-foco-tool.mjs',
        workspace_id: workspaceId,
        actor_user_id: actorUserId,
        use_case: 'command_surface_execute',
        agent_id: null,
        preferred_transport: 'cli',
        suggested_tools: ['search_workspace'],
      },
    })
    mockBuildOpenClawBridgeManifest.mockReturnValue({
      bridge: { available: true },
      allowed_tools: ['search_workspace'],
      constraints: { require_approval_for_changes: false },
      tools: [
        {
          name: 'search_workspace',
          description: 'Search the workspace',
          category: 'read',
          schema: { type: 'object' },
        },
      ],
    })
    mockExecuteToolCall.mockResolvedValue({
      success: true,
      data: [],
      explanation: 'Found 0 workspace results',
      evidence: [],
    })
  })

  test('returns forbidden when manifest auth fails', async () => {
    mockAuthorizeOpenClawRequest.mockReturnValue(false)

    const req = new NextRequest('http://localhost:4000/api/openclaw/tools/manifest', {
      method: 'POST',
      body: JSON.stringify({
        workspace_id: workspaceId,
        actor_user_id: actorUserId,
      }),
    })

    const res = await postManifest(req)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.ok).toBe(false)
    expect(body.error.message).toBe('OpenClaw service authentication required')
    expect(mockResolveOpenClawToolExecutionContext).not.toHaveBeenCalled()
  })

  test('returns a manifest for authorized requests', async () => {
    const req = new NextRequest('http://localhost:4000/api/openclaw/tools/manifest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        actor_user_id: actorUserId,
        agent_id: 'agent-1',
      }),
    })

    const res = await postManifest(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data.allowed_tools).toEqual(['search_workspace'])
    expect(mockResolveOpenClawToolExecutionContext).toHaveBeenCalledWith({
      workspaceId,
      actorUserId,
      useCase: 'command_surface_execute',
      agentId: 'agent-1',
    })
    expect(mockBuildOpenClawBridgeManifest).toHaveBeenCalledWith({
      workspaceId,
      actorUserId,
      useCase: 'command_surface_execute',
      agentId: 'agent-1',
      aiPolicy: {
        allowed_tools: ['search_workspace'],
        constraints: { require_approval_for_changes: false },
      },
    })
  })

  test('validates required execute fields', async () => {
    const req = new NextRequest('http://localhost:4000/api/openclaw/tools/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        actor_user_id: actorUserId,
      }),
    })

    const res = await postExecute(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.ok).toBe(false)
    expect(body.error.message).toBe('workspace_id, actor_user_id, and tool are required')
    expect(mockExecuteToolCall).not.toHaveBeenCalled()
  })

  test('executes an allowed tool through the bridge', async () => {
    const req = new NextRequest('http://localhost:4000/api/openclaw/tools/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        actor_user_id: actorUserId,
        tool: 'search_workspace',
        args: { query: 'project' },
        agent_id: 'agent-1',
      }),
    })

    const res = await postExecute(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data.tool).toBe('search_workspace')
    expect(body.data.result.success).toBe(true)
    expect(mockExecuteToolCall).toHaveBeenCalledWith(
      'search_workspace',
      { query: 'project' },
      expect.objectContaining({
        userId: actorUserId,
        workspaceId,
        aiPolicy: {
          allowed_tools: ['search_workspace'],
          constraints: { require_approval_for_changes: false },
        },
        supabase: { __name: 'supabase-admin-mock' },
        metadata: {
          source: 'openclaw_tool_bridge',
          agent_id: 'agent-1',
          use_case: 'command_surface_execute',
        },
      })
    )
  })

  test('returns forbidden when the actor is not a workspace member', async () => {
    mockResolveOpenClawToolExecutionContext.mockRejectedValue(
      new Error('Actor does not have access to this workspace')
    )

    const req = new NextRequest('http://localhost:4000/api/openclaw/tools/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        actor_user_id: actorUserId,
        tool: 'search_workspace',
      }),
    })

    const res = await postExecute(req)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.ok).toBe(false)
    expect(body.error.message).toBe('Actor does not have access to this workspace')
  })

  test('returns policy-denied tool results without masking the failure', async () => {
    mockExecuteToolCall.mockResolvedValue({
      success: false,
      error: "Tool 'create_page' is not allowed by workspace policy",
      explanation: 'This action violates workspace policy',
    })

    const req = new NextRequest('http://localhost:4000/api/openclaw/tools/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        actor_user_id: actorUserId,
        tool: 'create_page',
        args: { title: 'Blocked write' },
      }),
    })

    const res = await postExecute(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data.result.success).toBe(false)
    expect(body.data.result.error).toBe("Tool 'create_page' is not allowed by workspace policy")
  })
})
