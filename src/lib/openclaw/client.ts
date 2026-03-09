import { getOpenClawServerConfig, buildEmptyRuntimeSnapshot } from './config'
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

export async function getOpenClawRuntimeSnapshot(): Promise<OpenClawRuntimeSnapshot> {
  const serverConfig = await getOpenClawServerConfig()
  const snapshot = buildEmptyRuntimeSnapshot(
    serverConfig.configPath,
    serverConfig.relayUrl,
    serverConfig.gatewayUrl,
  )

  snapshot.primaryModel = serverConfig.primaryModel
  snapshot.modelAlias = serverConfig.modelAlias
  snapshot.workspacePath = serverConfig.workspacePath
  snapshot.tokenConfigured = Boolean(serverConfig.hookToken || serverConfig.gatewayToken)
  snapshot.tokenSource = serverConfig.tokenSource
  snapshot.version = serverConfig.version
  snapshot.dispatchConfigured = Boolean(serverConfig.gatewayUrl)

  try {
    const res = await fetch(`${serverConfig.relayUrl}/`, {
      headers: authHeaders(serverConfig.gatewayToken),
      signal: AbortSignal.timeout(3000),
    })

    if (!res.ok) return snapshot

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
    return snapshot
  } catch {
    return snapshot
  }
}

export async function dispatchOpenClawTask(
  request: OpenClawDispatchRequest,
): Promise<OpenClawDispatchResult> {
  const serverConfig = await getOpenClawServerConfig()
  const correlationId = request.correlationId?.trim() || crypto.randomUUID()

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
      task: request.task,
      preferred_model: request.preferredModel ?? undefined,
      callback_url: request.callbackUrl ?? undefined,
      context: request.context ?? {},
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
