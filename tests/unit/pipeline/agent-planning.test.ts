import { describe, expect, it } from 'vitest'

import { buildPlanContext } from '@/lib/pipeline/context-builder'
import { normalizePlanningAgents } from '@/lib/pipeline/agent-planning'

describe('normalizePlanningAgents', () => {
  it('returns a default multi-agent roster when no agents are supplied', () => {
    const agents = normalizePlanningAgents(undefined)

    expect(agents.length).toBeGreaterThanOrEqual(4)
    expect(agents.some((agent) => agent.kind === 'system')).toBe(true)
    expect(agents.some((agent) => agent.kind === 'persona')).toBe(true)
  })

  it('normalizes custom technical, lane, and persona-flavored agents from request payloads', () => {
    const agents = normalizePlanningAgents([
      {
        id: 'custom:frontend',
        kind: 'custom',
        name: 'Frontend Performance Engineer',
        role: 'Rendering and UX performance specialist',
        expertise: ['react', 'web vitals'],
        incentives: ['ship faster pages'],
        risk_model: 'Avoid regressions in interaction latency.',
      },
      {
        id: 'lane:api',
        lane: 'platform_api',
        name: 'API Lane',
        approval_sensitivity: 'high',
      },
    ])

    expect(agents).toHaveLength(2)
    expect(agents[0].expertise).toContain('react')
    expect(agents[1].kind).toBe('lane')
    expect(agents[1].risk_model).toContain('Approval sensitivity')
  })
})

describe('buildPlanContext', () => {
  it('embeds selected agents, planning goal, and constraints into the planner context', () => {
    const context = buildPlanContext('Build a global agent orchestration platform', {
      selected_agents: [
        {
          id: 'persona:gates',
          kind: 'persona',
          name: 'Bill Gates',
          role: 'Technology & Philanthropy Strategy',
          expertise: ['platforms', 'scale'],
          incentives: ['global reach'],
          risk_model: 'Avoid fragmented systems that do not scale.',
        },
      ],
      planning_goal: 'Create one coherent model for agents worldwide.',
      constraints: ['Backward compatible with existing pipeline execution'],
      limits: ['No codegen-only solution'],
      context: {
        target_users: ['installers', 'operators', 'end users'],
      },
    })

    expect(context).toContain('# Selected Agents')
    expect(context).toContain('Bill Gates')
    expect(context).toContain('# Planning Goal')
    expect(context).toContain('Backward compatible')
    expect(context).toContain('target_users: installers, operators, end users')
  })
})
