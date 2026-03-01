import type { UnifiedAgent } from '../types'

interface TabRecord {
  id: string
  title: string
  url: string
  attached: boolean
}

interface OpenClawStatus {
  relay: { reachable: boolean }
  tabs: TabRecord[]
}

export async function fetchOpenClawAgents(_baseUrl: string): Promise<UnifiedAgent[]> {
  let status: OpenClawStatus | null = null

  try {
    const relayUrl = process.env.FOCO_OPENCLAW_RELAY ?? 'http://127.0.0.1:18792'
    const token = process.env.FOCO_OPENCLAW_TOKEN ?? process.env.OPENCLAW_SERVICE_TOKEN ?? ''
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${relayUrl}/`, {
      headers,
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      const body = await res.json()
      status = {
        relay: { reachable: true },
        tabs: (body.tabs ?? body.attached_tabs ?? []).map((t: Record<string, unknown>) => ({
          id: String(t.id ?? t.tabId ?? ''),
          title: String(t.title ?? t.name ?? ''),
          url: String(t.url ?? ''),
          attached: Boolean(t.attached ?? true),
        }))
      }
    }
  } catch {
    // fall through to error agent
  }

  if (!status || !status.relay?.reachable) {
    return [{
      id: 'openclaw::relay',
      backend: 'openclaw',
      nativeId: 'relay',
      name: 'OpenClaw Relay',
      role: 'Browser orchestration',
      status: 'error',
      errorMessage: 'Relay unreachable',
      raw: {},
    }]
  }

  const tabs = status.tabs ?? []

  if (tabs.length === 0) {
    return [{
      id: 'openclaw::relay',
      backend: 'openclaw',
      nativeId: 'relay',
      name: 'OpenClaw Relay',
      role: 'Browser orchestration',
      status: 'idle',
      raw: {},
    }]
  }

  return tabs.map(tab => ({
    id: `openclaw::${tab.id}`,
    backend: 'openclaw' as const,
    nativeId: tab.id,
    name: tab.title || `Tab ${tab.id.slice(0, 6)}`,
    role: 'Browser tab agent',
    status: tab.attached ? 'working' : 'idle',
    raw: tab as unknown as Record<string, unknown>,
  }))
}
