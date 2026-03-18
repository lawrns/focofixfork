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

// ClawdBot disabled - migrated to OpenClaw
export async function fetchClawdbotAgents(_baseUrl: string, _token?: string): Promise<UnifiedAgent[]> {
  return []
}
