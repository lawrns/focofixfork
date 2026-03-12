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

// CRICO disabled - migrated to OpenClaw
export async function fetchCricoAgents(_baseUrl: string, _token?: string): Promise<UnifiedAgent[]> {
  return []
}
