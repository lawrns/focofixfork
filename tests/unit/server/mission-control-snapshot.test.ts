import { describe, expect, it } from 'vitest'
import { buildAttentionItems, getTaskVisualState } from '@/server/mission-control/snapshot'
import type { MissionControlTaskCard } from '@/features/mission-control/types'

function makeTask(overrides: Partial<MissionControlTaskCard> = {}): MissionControlTaskCard {
  return {
    id: 'task-1',
    title: 'Investigate failing run',
    status: 'backlog',
    priority: 'medium',
    projectId: 'project-1',
    projectName: 'Alpha',
    projectSlug: 'alpha',
    delegationStatus: null,
    assignedAgent: null,
    runId: null,
    dueDate: null,
    updatedAt: new Date('2026-03-17T12:00:00Z').toISOString(),
    latestEvent: null,
    latestSummary: null,
    blockedReason: null,
    verificationRequired: false,
    verificationStatus: null,
    visualState: 'idle',
    attention: 'none',
    href: '/tasks/task-1',
    ...overrides,
  }
}

describe('getTaskVisualState', () => {
  it('prioritizes blocked and failed execution states', () => {
    expect(getTaskVisualState({ status: 'blocked', delegationStatus: 'running' })).toBe('blocked')
    expect(getTaskVisualState({ status: 'in_progress', delegationStatus: 'failed' })).toBe('failed')
  })

  it('maps review tasks with required verification to verifying', () => {
    expect(
      getTaskVisualState({
        status: 'review',
        delegationStatus: 'completed',
        verificationRequired: true,
        verificationStatus: null,
      })
    ).toBe('verifying')
  })
})

describe('buildAttentionItems', () => {
  it('sorts critical machine, task, and run attention ahead of info items', () => {
    const items = buildAttentionItems({
      tasks: [
        makeTask({
          id: 'task-critical',
          title: 'Blocked deployment',
          visualState: 'blocked',
          attention: 'critical',
          blockedReason: 'Waiting for approval',
        }),
      ],
      runs: [
        {
          id: 'run-1',
          runner: 'openclaw',
          status: 'failed',
          task_id: 'task-critical',
          started_at: null,
          ended_at: null,
          created_at: new Date('2026-03-17T12:00:00Z').toISOString(),
          summary: 'Deployment failed',
          trace: null,
        },
      ],
      proposals: [
        {
          id: 'proposal-1',
          title: 'PRD review',
          status: 'pending_review',
          created_at: new Date('2026-03-17T12:01:00Z').toISOString(),
          project: { id: 'project-1', name: 'Alpha', slug: 'alpha' },
        },
      ],
      operator: {
        alerts: [
          {
            level: 'warning',
            message: 'Gateway reconnecting',
            source: 'gateway',
            at: new Date('2026-03-17T12:02:00Z').toISOString(),
          },
        ],
      },
      agents: [
        {
          id: 'agent-1',
          name: 'OpenClaw Agent',
          nativeId: 'relay',
          status: 'error',
          backend: 'openclaw',
        },
      ],
    })

    expect(items[0]?.level).toBe('critical')
    expect(items.some((item) => item.category === 'machine')).toBe(true)
    expect(items.some((item) => item.category === 'proposal')).toBe(true)
  })
})
