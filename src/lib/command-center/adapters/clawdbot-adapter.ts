import type { UnifiedAgent, AgentNodeStatus } from '../types'

function mapClawdbotStatus(status: string | undefined): AgentNodeStatus {
  if (!status) return 'idle'
  const s = status.toLowerCase()
  if (s.includes('run') || s.includes('work') || s.includes('active') || s.includes('exec')) return 'working'
  if (s.includes('block') || s.includes('wait') || s.includes('pend')) return 'blocked'
  if (s.includes('error') || s.includes('fail')) return 'error'
  if (s.includes('done') || s.includes('complete')) return 'done'
  if (s.includes('pause')) return 'paused'
  return 'idle'
}

export async function fetchClawdbotAgents(_baseUrl: string, token?: string): Promise<UnifiedAgent[]> {
  try {
    const clawdbotApi = process.env.CLAWDBOT_API_URL ?? 'http://127.0.0.1:18794'
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${clawdbotApi}/agents`, {
      headers,
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return [{
        id: 'clawdbot::gateway',
        backend: 'clawdbot',
        nativeId: 'gateway',
        name: 'ClawdBot Gateway',
        role: 'Intel API',
        status: 'error',
        errorMessage: `API returned ${res.status}`,
        raw: {},
      }]
    }

    const json = await res.json()
    const items: Array<Record<string, unknown>> = Array.isArray(json)
      ? json
      : json?.agents ?? json?.data ?? []

    if (items.length === 0) {
      return [{
        id: 'clawdbot::intel',
        backend: 'clawdbot',
        nativeId: 'intel',
        name: 'ClawdBot Intel',
        role: 'Intel gathering',
        status: 'idle',
        raw: {},
      }]
    }

    return items.map(item => {
      const nativeId = String(item.id ?? item.agent_id ?? 'unknown')
      return {
        id: `clawdbot::${nativeId}`,
        backend: 'clawdbot',
        nativeId,
        name: String(item.name ?? item.agent_name ?? `ClawdBot ${nativeId}`),
        role: String(item.purpose ?? item.role ?? 'Intel agent'),
        status: mapClawdbotStatus(item.status as string | undefined),
        model: item.model ? String(item.model) : undefined,
        lastActiveAt: item.last_active ? String(item.last_active) : undefined,
        raw: item,
      }
    })
  } catch (err) {
    // Return degraded node on error
    return [{
      id: 'clawdbot::gateway',
      backend: 'clawdbot',
      nativeId: 'gateway',
      name: 'ClawdBot Gateway',
      role: 'Intel API',
      status: 'error',
      errorMessage: err instanceof Error ? err.message : 'Fetch failed',
      raw: {},
    }]
  }
}
