/**
 * Agent Matcher — selects an idle agent from the project's agent pool.
 * Queries ClawdBot directly (server-side via 127.0.0.1) to check live status.
 */

const CLAWDBOT_BASE = 'http://127.0.0.1:18794'
const TOKEN = process.env.OPENCLAW_SERVICE_TOKEN

interface AgentStatus {
  id: string
  name: string
  status: string
  model?: string
}

async function fetchClawdBotAgents(): Promise<AgentStatus[]> {
  try {
    const res = await fetch(`${CLAWDBOT_BASE}/agents`, {
      headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.agents ?? data ?? []) as AgentStatus[]
  } catch {
    return []
  }
}

/**
 * Pick the first idle agent from the given pool.
 * Falls back to the first pool entry if ClawdBot is unreachable.
 */
export async function matchAgent(agentPool: string[]): Promise<string | null> {
  if (!agentPool || agentPool.length === 0) return null

  const agents = await fetchClawdBotAgents()

  if (agents.length > 0) {
    // Find an idle agent whose name/id is in the pool
    const idle = agents.find(a =>
      (a.status === 'idle' || a.status === 'available') &&
      agentPool.some(p => p === a.id || p === a.name)
    )
    if (idle) return idle.id ?? idle.name
  }

  // Fallback: return the first pool entry
  return agentPool[0]
}
