import type { UnifiedAgent, AgentNodeStatus } from '../types'
import type { AgentStatus } from '@/lib/crico/types/index'

function mapCricoStatus(status: AgentStatus): AgentNodeStatus {
  switch (status) {
    case 'analyzing':
    case 'suggesting':
    case 'executing': return 'working'
    case 'waiting':   return 'blocked'
    case 'error':     return 'error'
    case 'idle':
    default:          return 'idle'
  }
}

export async function fetchCricoAgents(_baseUrl: string, token?: string): Promise<UnifiedAgent[]> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    // Fetch from API proxy endpoint using internal localhost:3001 reference
    const res = await fetch('http://127.0.0.1:3001/api/crico/actions?limit=20', {
      headers,
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      // Return degraded node with error status
      return [{
        id: 'crico::conductor',
        backend: 'crico',
        nativeId: 'conductor',
        name: 'CRICO Conductor',
        role: 'Action orchestration',
        status: res.status === 401 ? 'error' : 'idle',
        errorMessage: res.status === 401 ? 'Auth required (no token)' : `API returned ${res.status}`,
        raw: {},
      }]
    }

    const json = await res.json()
    const actions: Array<Record<string, unknown>> = json?.data?.actions ?? []

    // Map unique agents by their type (conductor, planner, etc.)
    const seen = new Set<string>()
    const agents: UnifiedAgent[] = []

    for (const action of actions) {
      const agentType = String(action.source ?? 'unknown')
      if (seen.has(agentType)) continue
      seen.add(agentType)

      const status = mapCricoStatus((action.status as AgentStatus) ?? 'idle')

      agents.push({
        id: `crico::${agentType}`,
        backend: 'crico',
        nativeId: agentType,
        name: `CRICO ${agentType}`,
        role: String(action.scope ?? 'system'),
        status,
        lastActiveAt: action.created_at ? String(action.created_at) : undefined,
        errorMessage: action.errorMessage ? String(action.errorMessage) : undefined,
        raw: action,
      })
    }

    // If no live actions, return a single idle representative node
    if (agents.length === 0) {
      agents.push({
        id: 'crico::conductor',
        backend: 'crico',
        nativeId: 'conductor',
        name: 'CRICO Conductor',
        role: 'Action orchestration',
        status: 'idle',
        raw: {},
      })
    }

    return agents
  } catch (err) {
    // Return degraded node on error
    return [{
      id: 'crico::conductor',
      backend: 'crico',
      nativeId: 'conductor',
      name: 'CRICO Conductor',
      role: 'Action orchestration',
      status: 'error',
      errorMessage: err instanceof Error ? err.message : 'Fetch failed',
      raw: {},
    }]
  }
}
