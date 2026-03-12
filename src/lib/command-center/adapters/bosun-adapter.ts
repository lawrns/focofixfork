import type { UnifiedAgent, AgentNodeStatus } from '../types'

function mapBosunStatus(status: string | undefined): AgentNodeStatus {
  if (!status) return 'idle'
  const s = status.toLowerCase()
  if (s === 'in_progress') return 'working'
  if (s === 'blocked') return 'blocked'
  if (s === 'done') return 'done'
  return 'idle'
}

// Bosun disabled - migrated to OpenClaw
export async function fetchBosunAgents(_baseUrl: string, _serviceToken?: string): Promise<UnifiedAgent[]> {
  return []
}
