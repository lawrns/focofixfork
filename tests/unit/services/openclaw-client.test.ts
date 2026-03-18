import { beforeEach, describe, expect, test, vi } from 'vitest'

const {
  mockGetOpenClawServerConfig,
  mockBuildOpenClawBridgeDetails,
  mockBuildOpenClawBridgePrompt,
} = vi.hoisted(() => ({
  mockGetOpenClawServerConfig: vi.fn(),
  mockBuildOpenClawBridgeDetails: vi.fn(),
  mockBuildOpenClawBridgePrompt: vi.fn(),
}))

vi.mock('@/lib/openclaw/config', () => ({
  getOpenClawServerConfig: mockGetOpenClawServerConfig,
  buildEmptyRuntimeSnapshot: vi.fn(),
}))

vi.mock('@/lib/openclaw/tool-bridge', () => ({
  buildOpenClawBridgeDetails: mockBuildOpenClawBridgeDetails,
  buildOpenClawBridgePrompt: mockBuildOpenClawBridgePrompt,
}))

import { dispatchOpenClawTask } from '@/lib/openclaw/client'

describe('dispatchOpenClawTask', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())

    mockGetOpenClawServerConfig.mockResolvedValue({
      gatewayUrl: 'http://127.0.0.1:18789',
      relayUrl: 'http://127.0.0.1:18792',
      hookToken: 'gateway-token',
      gatewayToken: 'gateway-token',
    })
    mockBuildOpenClawBridgeDetails.mockReturnValue({
      available: true,
      base_url: 'http://localhost:4000',
      manifest_url: 'http://localhost:4000/api/openclaw/tools/manifest',
      execute_url: 'http://localhost:4000/api/openclaw/tools/execute',
      cli_path: '/home/laurence/focofixfork/scripts/openclaw-foco-tool.mjs',
      workspace_id: 'workspace-1',
      actor_user_id: 'user-1',
      use_case: 'command_surface_execute',
      agent_id: 'agent-1',
      preferred_transport: 'cli',
      suggested_tools: ['search_workspace'],
    })
    mockBuildOpenClawBridgePrompt.mockReturnValue('Bridge prompt')
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        run_id: 'run-123',
        correlation_id: 'corr-123',
        status: 'accepted',
      }),
    } as Response)
  })

  test('includes bridge framing and bridge context for workspace-scoped dispatches', async () => {
    const result = await dispatchOpenClawTask({
      agentId: 'agent-1',
      task: 'Summarize the workspace',
      context: {
        workspace_id: 'workspace-1',
        actor_user_id: 'user-1',
        ai_use_case: 'command_surface_execute',
        agent_id: 'agent-1',
      },
    })

    expect(result).toEqual({
      accepted: true,
      runId: 'run-123',
      correlationId: 'corr-123',
      status: 'accepted',
    })

    expect(mockBuildOpenClawBridgeDetails).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      actorUserId: 'user-1',
      useCase: 'command_surface_execute',
      agentId: 'agent-1',
    })
    expect(mockBuildOpenClawBridgePrompt).toHaveBeenCalledOnce()

    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('http://127.0.0.1:18789/hooks/agent-run')

    const payload = JSON.parse(String(init?.body))
    expect(payload.task).toContain('You are in an available workspace. Use tools when possible.')
    expect(payload.task).toContain('Bridge prompt')
    expect(payload.task).toContain('Summarize the workspace')
    expect(payload.context.foco_tool_bridge).toEqual({
      available: true,
      base_url: 'http://localhost:4000',
      manifest_url: 'http://localhost:4000/api/openclaw/tools/manifest',
      execute_url: 'http://localhost:4000/api/openclaw/tools/execute',
      cli_path: '/home/laurence/focofixfork/scripts/openclaw-foco-tool.mjs',
      workspace_id: 'workspace-1',
      actor_user_id: 'user-1',
      use_case: 'command_surface_execute',
      agent_id: 'agent-1',
      preferred_transport: 'cli',
      suggested_tools: ['search_workspace'],
    })
  })

  test('leaves bridge metadata out when workspace context is missing', async () => {
    await dispatchOpenClawTask({
      task: 'Do a generic task',
      context: {
        persona: 'generic',
      },
    })

    expect(mockBuildOpenClawBridgeDetails).not.toHaveBeenCalled()
    expect(mockBuildOpenClawBridgePrompt).not.toHaveBeenCalled()

    const [, init] = vi.mocked(fetch).mock.calls[0]
    const payload = JSON.parse(String(init?.body))

    expect(payload.task).toContain('Do a generic task')
    expect(payload.task).not.toContain('Bridge prompt')
    expect(payload.context.foco_tool_bridge).toBeUndefined()
  })
})
