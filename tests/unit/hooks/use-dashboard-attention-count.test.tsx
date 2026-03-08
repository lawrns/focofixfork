import { describe, it, expect } from 'vitest'

// Replicate the attention count logic from useDashboardData for isolated testing
// See: src/components/dashboard/use-dashboard-data.ts (attentionCount useMemo)
function computeAttentionCount(
  runs: Array<{ status: string; created_at?: string }>,
  workItems: Array<{ status: string }>,
  proposals: Array<{ status: string }>,
  agents: Array<{ status: string }>
): number {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
  const recentFailedRuns = runs.filter(
    (run) => run.status === 'failed' && run.created_at && new Date(run.created_at).getTime() > oneDayAgo
  ).length
  const blockedItems = workItems.filter((item) => item.status === 'blocked').length
  const pendingProposals = proposals.filter((p) => p.status === 'pending_review').length
  const errorAgents = agents.filter((a) => a.status === 'error').length
  return recentFailedRuns + blockedItems + pendingProposals + errorAgents
}

describe('computeAttentionCount', () => {
  it('returns 0 when all clear', () => {
    const result = computeAttentionCount(
      [{ status: 'completed' }],
      [{ status: 'active' }],
      [{ status: 'approved' }],
      [{ status: 'idle' }]
    )
    expect(result).toBe(0)
  })

  it('counts recent failed runs (within 24h)', () => {
    const recentTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
    const result = computeAttentionCount(
      [
        { status: 'failed', created_at: recentTime },
        { status: 'failed', created_at: recentTime },
      ],
      [],
      [],
      []
    )
    expect(result).toBe(2)
  })

  it('ignores old failed runs (>24h ago)', () => {
    const oldTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() // 48 hours ago
    const result = computeAttentionCount(
      [{ status: 'failed', created_at: oldTime }],
      [],
      [],
      []
    )
    expect(result).toBe(0)
  })

  it('ignores failed runs without created_at', () => {
    const result = computeAttentionCount(
      [{ status: 'failed' }],
      [],
      [],
      []
    )
    expect(result).toBe(0)
  })

  it('counts blocked work items', () => {
    const result = computeAttentionCount(
      [],
      [{ status: 'blocked' }, { status: 'blocked' }, { status: 'active' }],
      [],
      []
    )
    expect(result).toBe(2)
  })

  it('counts pending proposals', () => {
    const result = computeAttentionCount(
      [],
      [],
      [{ status: 'pending_review' }, { status: 'approved' }, { status: 'pending_review' }],
      []
    )
    expect(result).toBe(2)
  })

  it('counts error agents', () => {
    const result = computeAttentionCount(
      [],
      [],
      [],
      [{ status: 'error' }, { status: 'idle' }, { status: 'working' }, { status: 'error' }]
    )
    expect(result).toBe(2)
  })

  it('sums all sources correctly', () => {
    const recentTime = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
    const result = computeAttentionCount(
      [{ status: 'failed', created_at: recentTime }],           // +1
      [{ status: 'blocked' }, { status: 'blocked' }],           // +2
      [{ status: 'pending_review' }],                           // +1
      [{ status: 'error' }, { status: 'error' }, { status: 'error' }]  // +3
    )
    expect(result).toBe(7)
  })

  it('ignores non-qualifying statuses', () => {
    const recentTime = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    const result = computeAttentionCount(
      [{ status: 'completed', created_at: recentTime }, { status: 'running', created_at: recentTime }],
      [{ status: 'active' }, { status: 'done' }],
      [{ status: 'approved' }, { status: 'rejected' }],
      [{ status: 'idle' }, { status: 'working' }]
    )
    expect(result).toBe(0)
  })

  it('handles empty arrays', () => {
    const result = computeAttentionCount([], [], [], [])
    expect(result).toBe(0)
  })
})
