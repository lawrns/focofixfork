import { getOpenClawServerConfig, buildEmptyRuntimeSnapshot } from './config'
import { buildOpenClawBridgeDetails, buildOpenClawBridgePrompt } from './tool-bridge'
import type {
  OpenClawDispatchRequest,
  OpenClawDispatchResult,
  OpenClawRuntimeSnapshot,
} from './types'

function authHeaders(token: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function normalizeList(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : []
}

const EXECUTION_FRAMING = `You are in an available workspace. Use tools when possible.
Do not answer with shell advice unless blocked.
Report concrete outputs.`

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function buildToolBridgePrompt(context: Record<string, unknown>): string | null {
  const workspaceId = typeof context.workspace_id === 'string' ? context.workspace_id : null
  const actorUserId = typeof context.actor_user_id === 'string' ? context.actor_user_id : null
  if (!workspaceId || !actorUserId) return null

  const details = buildOpenClawBridgeDetails({
    workspaceId,
    actorUserId,
    useCase:
      typeof context.ai_use_case === 'string' && context.ai_use_case.trim().length > 0
        ? context.ai_use_case as any
        : 'command_surface_execute',
    agentId: typeof context.agent_id === 'string' ? context.agent_id : null,
  })

  return buildOpenClawBridgePrompt(details)
}

function assertAgentDispatchReady(
  agentId: string,
  serverConfig: Awaited<ReturnType<typeof getOpenClawServerConfig>>,
): void {
  if (agentId !== 'codex') return

  if (!serverConfig.acpEnabled) {
    throw new Error(
      `Codex dispatch is not enabled in ${serverConfig.configPath}. Set acp.enabled=true and restart the OpenClaw gateway.`
    )
  }

  if (!serverConfig.codexConfigured) {
    throw new Error(
      `Codex is not configured in ${serverConfig.configPath}. Add a codex entry under agents.list with runtime.type=\"acp\" and runtime.acp.agent=\"codex\", then restart the OpenClaw gateway.`
    )
  }
}

export async function getOpenClawRuntimeSnapshot(): Promise<OpenClawRuntimeSnapshot> {
  const serverConfig = await getOpenClawServerConfig()
  const snapshot = buildEmptyRuntimeSnapshot(
    serverConfig.configPath,
    serverConfig.relayUrl,
    serverConfig.gatewayUrl,
  )

  snapshot.primaryModel = serverConfig.primaryModel
  snapshot.modelAlias = serverConfig.modelAlias
  snapshot.configuredModels = serverConfig.configuredModels
  snapshot.acpEnabled = serverConfig.acpEnabled
  snapshot.acpDispatchEnabled = serverConfig.acpDispatchEnabled
  snapshot.acpBackend = serverConfig.acpBackend
  snapshot.configuredAgents = serverConfig.configuredAgents
  snapshot.codexConfigured = serverConfig.codexConfigured
  snapshot.defaultModelConfigured = Boolean(
    serverConfig.primaryModel && serverConfig.configuredModels.includes(serverConfig.primaryModel)
  )
  snapshot.workspacePath = serverConfig.workspacePath
  snapshot.tokenConfigured = Boolean(serverConfig.hookToken || serverConfig.gatewayToken)
  snapshot.tokenSource = serverConfig.tokenSource
  snapshot.version = serverConfig.version
  snapshot.dispatchConfigured = Boolean(serverConfig.gatewayUrl)

  // Check gateway health independently of relay auth
  try {
    const gwRes = await fetch(`${serverConfig.gatewayUrl}/health`, {
      headers: authHeaders(serverConfig.gatewayToken),
      signal: AbortSignal.timeout(3000),
    })
    snapshot.gatewayHealthy = gwRes.ok
  } catch {
    // gatewayHealthy stays false
  }

  // Check relay for browser tab / profile data
  try {
    const res = await fetch(`${serverConfig.relayUrl}/`, {
      headers: authHeaders(serverConfig.gatewayToken),
      signal: AbortSignal.timeout(3000),
    })

    if (res.ok) {
      const body = await res.json().catch(() => ({}))
      const tabs = normalizeList((body as Record<string, unknown>).tabs ?? (body as Record<string, unknown>).attached_tabs)
      const profiles = normalizeList((body as Record<string, unknown>).profiles)

      snapshot.relayReachable = true
      snapshot.tabs = tabs.map((tab) => ({
        id: String(tab.id ?? tab.tabId ?? ''),
        title: String(tab.title ?? tab.name ?? ''),
        url: String(tab.url ?? ''),
        attached: Boolean(tab.attached ?? true),
        profile: typeof tab.profile === 'string' ? tab.profile : undefined,
        lastSeen: typeof tab.last_seen === 'string' ? tab.last_seen : undefined,
      }))
      snapshot.attachedTabs = snapshot.tabs.filter((tab) => tab.attached).length
      snapshot.profiles = profiles.map((profile) => ({
        name: String(profile.name ?? profile.profile ?? ''),
        active: Boolean(profile.active ?? profile.current ?? false),
      }))
    }
  } catch {
    // relayReachable stays false
  }

  return snapshot
}

export async function dispatchOpenClawTask(
  request: OpenClawDispatchRequest,
): Promise<OpenClawDispatchResult> {
  const serverConfig = await getOpenClawServerConfig()
  assertAgentDispatchReady(request.agentId, serverConfig)
  const correlationId = request.correlationId?.trim() || crypto.randomUUID()
  const context = asRecord(request.context)
  const toolBridgePrompt = buildToolBridgePrompt(context)

  // Apply execution framing to the task
  const framedTask = [
    EXECUTION_FRAMING,
    toolBridgePrompt,
    request.task,
  ].filter((part): part is string => typeof part === 'string' && part.trim().length > 0).join('\n\n')

  const bridgeContext = (() => {
    const workspaceId = typeof context.workspace_id === 'string' ? context.workspace_id : null
    const actorUserId = typeof context.actor_user_id === 'string' ? context.actor_user_id : null
    if (!workspaceId || !actorUserId) return null
    return buildOpenClawBridgeDetails({
      workspaceId,
      actorUserId,
      useCase:
        typeof context.ai_use_case === 'string' && context.ai_use_case.trim().length > 0
          ? context.ai_use_case as any
          : 'command_surface_execute',
      agentId: typeof context.agent_id === 'string' ? context.agent_id : null,
    })
  })()

  const response = await fetch(`${serverConfig.gatewayUrl}/hooks/agent-run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(serverConfig.hookToken || serverConfig.gatewayToken),
    },
    body: JSON.stringify({
      agent_id: request.agentId,
      task_id: request.taskId ?? undefined,
      title: request.title ?? undefined,
      task: framedTask,
      preferred_model: request.preferredModel ?? 'kimi-coding/k2p5',
      callback_url: request.callbackUrl ?? undefined,
      context: {
        ...context,
        ...(bridgeContext ? { foco_tool_bridge: bridgeContext } : {}),
      },
      correlation_id: correlationId,
    }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`OpenClaw gateway returned HTTP ${response.status}: ${text.slice(0, 200)}`)
  }

  const body = await response.json().catch(() => ({} as Record<string, unknown>))
  return {
    accepted: true,
    runId: typeof body.run_id === 'string' ? body.run_id : null,
    correlationId: typeof body.correlation_id === 'string' ? body.correlation_id : correlationId,
    status: typeof body.status === 'string' ? body.status : 'accepted',
  }
}
