import type { UnifiedAgent, AgentNodeStatus } from '../types'

function mapBosunStatus(status: string | undefined): AgentNodeStatus {
  if (!status) return 'idle'
  const s = status.toLowerCase()
  if (s === 'in_progress') return 'working'
  if (s === 'blocked') return 'blocked'
  if (s === 'done') return 'done'
  return 'idle'
}

export async function fetchBosunAgents(_baseUrl: string, serviceToken?: string): Promise<UnifiedAgent[]> {
  try {
    const bosunApi = process.env.BOSUN_API_URL ?? 'http://127.0.0.1:3001'
    const headers: Record<string, string> = {}
    if (serviceToken) headers['Authorization'] = `Bearer ${serviceToken}`

    const res = await fetch(`${bosunApi}/api/kanban/tasks`, {
      headers,
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      // Return degraded node with error status
      return [{
        id: 'bosun::scheduler',
        backend: 'bosun',
        nativeId: 'scheduler',
        name: 'Bosun Scheduler',
        role: 'Task runner',
        status: res.status === 401 ? 'error' : 'idle',
        errorMessage: res.status === 401 ? 'Auth required (no token)' : `API returned ${res.status}`,
        raw: {},
      }]
    }

    const json = await res.json()
    const tasks: Array<Record<string, unknown>> = json?.data ?? []

    // Group tasks by runner to create one agent entry per runner
    const runnerMap = new Map<string, UnifiedAgent>()

    for (const task of tasks) {
      const runner = String(task.runner ?? task.assigned_to ?? 'bosun')
      if (!runnerMap.has(runner)) {
        const status = mapBosunStatus(task.status as string | undefined)
        runnerMap.set(runner, {
          id: `bosun::${runner}`,
          backend: 'bosun',
          nativeId: runner,
          name: `Bosun: ${runner}`,
          role: 'Task execution',
          status,
          lastActiveAt: task.updated_at ? String(task.updated_at) : undefined,
          raw: task,
        })
      } else {
        // Upgrade status if more active task found
        const existing = runnerMap.get(runner)!
        const newStatus = mapBosunStatus(task.status as string | undefined)
        if (newStatus === 'working') existing.status = 'working'
      }
    }

    if (runnerMap.size === 0) {
      return [{
        id: 'bosun::scheduler',
        backend: 'bosun',
        nativeId: 'scheduler',
        name: 'Bosun Scheduler',
        role: 'Task runner',
        status: 'idle',
        raw: {},
      }]
    }

    return Array.from(runnerMap.values())
  } catch (err) {
    // Return degraded node on error
    return [{
      id: 'bosun::scheduler',
      backend: 'bosun',
      nativeId: 'scheduler',
      name: 'Bosun Scheduler',
      role: 'Task runner',
      status: 'error',
      errorMessage: err instanceof Error ? err.message : 'Fetch failed',
      raw: {},
    }]
  }
}
