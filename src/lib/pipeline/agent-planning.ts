import { SPECIALIST_ADVISORS } from '@/lib/agent-avatars'

export type PlanningAgentKind = 'system' | 'custom' | 'persona' | 'lane'

export interface PlanningAgentDescriptor {
  id: string
  kind: PlanningAgentKind
  name: string
  role: string
  expertise: string[]
  incentives: string[]
  risk_model: string
  description?: string
  source?: string
}

export interface PlanningInputs {
  selected_agents?: unknown
  context?: unknown
  planning_goal?: unknown
  constraints?: unknown
  limits?: unknown
}

const DEFAULT_SYSTEM_AGENTS: PlanningAgentDescriptor[] = [
  {
    id: 'system:architect',
    kind: 'system',
    name: 'Systems Architect',
    role: 'Architecture and technical tradeoff lead',
    expertise: ['system design', 'integration strategy', 'scalability', 'technical feasibility'],
    incentives: ['long-term maintainability', 'coherent architecture', 'clear interfaces'],
    risk_model: 'Avoid brittle designs, accidental complexity, and hidden coupling.',
    source: 'default',
  },
  {
    id: 'system:implementation',
    kind: 'system',
    name: 'Implementation Lead',
    role: 'Delivery and execution specialist',
    expertise: ['shipping strategy', 'incremental rollout', 'code change scoping', 'engineering pragmatism'],
    incentives: ['fast delivery', 'low migration cost', 'clear implementation steps'],
    risk_model: 'Avoid plans that are elegant on paper but slow, vague, or operationally expensive.',
    source: 'default',
  },
  {
    id: 'system:product',
    kind: 'system',
    name: 'Product Strategist',
    role: 'User and business value advocate',
    expertise: ['product framing', 'workflow design', 'adoption risk', 'value prioritization'],
    incentives: ['user clarity', 'broad usefulness', 'high-leverage outcomes'],
    risk_model: 'Avoid technically correct solutions that are hard to adopt or weak in user value.',
    source: 'default',
  },
  {
    id: 'system:risk',
    kind: 'system',
    name: 'Risk Reviewer',
    role: 'Safety, quality, and regression critic',
    expertise: ['failure analysis', 'security', 'operational risk', 'validation strategy'],
    incentives: ['reliability', 'defensible decisions', 'strong validation'],
    risk_model: 'Bias toward surfacing hidden risks, irreversible mistakes, and missing evidence.',
    source: 'default',
  },
]

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function summarizeContext(context: unknown): string[] {
  if (!context) return []
  if (typeof context === 'string') return [context.trim()].filter(Boolean)
  if (Array.isArray(context)) return toStringArray(context)
  if (typeof context === 'object') {
    return Object.entries(context as Record<string, unknown>)
      .flatMap(([key, value]) => {
        if (typeof value === 'string' && value.trim()) return [`${key}: ${value.trim()}`]
        if (Array.isArray(value)) {
          const items = toStringArray(value)
          return items.length > 0 ? [`${key}: ${items.join(', ')}`] : []
        }
        return []
      })
      .filter(Boolean)
  }
  return []
}

function normalizeSingleAgent(input: unknown, index: number): PlanningAgentDescriptor | null {
  if (typeof input === 'string') {
    const value = input.trim()
    if (!value) return null
    return {
      id: `adhoc:${index}:${value.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      kind: 'custom',
      name: value,
      role: 'Specialist advisor',
      expertise: [],
      incentives: [],
      risk_model: 'Not provided.',
      source: 'request',
    }
  }

  if (!input || typeof input !== 'object') return null

  const record = input as Record<string, unknown>
  const id = typeof record.id === 'string' && record.id.trim()
    ? record.id.trim()
    : `agent:${index}`
  const kind = record.kind === 'system' || record.kind === 'custom' || record.kind === 'persona' || record.kind === 'lane'
    ? record.kind
    : (typeof record.lane === 'string' ? 'lane' : 'custom')
  const name = typeof record.name === 'string' && record.name.trim()
    ? record.name.trim()
    : typeof record.agent_name === 'string' && record.agent_name.trim()
      ? record.agent_name.trim()
      : `Agent ${index + 1}`
  const role = typeof record.role === 'string' && record.role.trim()
    ? record.role.trim()
    : typeof record.lane === 'string' && record.lane.trim()
      ? `${record.lane.trim()} specialist`
      : 'Specialist advisor'
  const expertise = [
    ...toStringArray(record.expertise),
    ...toStringArray(record.persona_tags),
  ]
  const incentives = toStringArray(record.incentives)
  const riskModel = typeof record.risk_model === 'string' && record.risk_model.trim()
    ? record.risk_model.trim()
    : typeof record.approval_sensitivity === 'string'
      ? `Approval sensitivity: ${record.approval_sensitivity}`
      : 'Balance speed, quality, and risk according to role.'
  const description = typeof record.description === 'string' && record.description.trim()
    ? record.description.trim()
    : undefined

  return {
    id,
    kind,
    name,
    role,
    expertise: [...new Set(expertise)],
    incentives,
    risk_model: riskModel,
    description,
    source: 'request',
  }
}

function buildPersonaAgents(limit = 2): PlanningAgentDescriptor[] {
  return SPECIALIST_ADVISORS.slice(0, limit).map((advisor) => ({
    id: advisor.id,
    kind: 'persona',
    name: advisor.name,
    role: advisor.role,
    expertise: advisor.personaTags,
    incentives: [
      'Provide a differentiated lens',
      'Challenge conventional assumptions',
      'Push for sharper tradeoffs',
    ],
    risk_model: advisor.description,
    description: advisor.description,
    source: 'advisor_catalog',
  }))
}

export function normalizePlanningAgents(selectedAgents: unknown): PlanningAgentDescriptor[] {
  const provided = Array.isArray(selectedAgents)
    ? selectedAgents
        .map((agent, index) => normalizeSingleAgent(agent, index))
        .filter((agent): agent is PlanningAgentDescriptor => !!agent)
    : []

  if (provided.length > 0) return provided

  return [...DEFAULT_SYSTEM_AGENTS, ...buildPersonaAgents(1)]
}

export function formatPlanningInputs(options: PlanningInputs): string {
  const agents = normalizePlanningAgents(options.selected_agents)
  const contextItems = summarizeContext(options.context)
  const constraints = summarizeContext(options.constraints)
  const limits = summarizeContext(options.limits)
  const planningGoal = typeof options.planning_goal === 'string' ? options.planning_goal.trim() : ''

  const sections: string[] = []

  sections.push('# Selected Agents')
  sections.push(
    agents.map((agent, index) => [
      `## Agent ${index + 1}`,
      `Name: ${agent.name}`,
      `Kind: ${agent.kind}`,
      `Role: ${agent.role}`,
      `Expertise: ${agent.expertise.length > 0 ? agent.expertise.join(', ') : 'Not specified'}`,
      `Incentives: ${agent.incentives.length > 0 ? agent.incentives.join(', ') : 'Not specified'}`,
      `Risk model: ${agent.risk_model}`,
      agent.description ? `Description: ${agent.description}` : null,
    ].filter(Boolean).join('\n'))
      .join('\n\n')
  )

  if (planningGoal) {
    sections.push('# Planning Goal')
    sections.push(planningGoal)
  }

  if (contextItems.length > 0) {
    sections.push('# Additional Context')
    sections.push(contextItems.map((item) => `- ${item}`).join('\n'))
  }

  if (constraints.length > 0) {
    sections.push('# Constraints')
    sections.push(constraints.map((item) => `- ${item}`).join('\n'))
  }

  if (limits.length > 0) {
    sections.push('# Limits')
    sections.push(limits.map((item) => `- ${item}`).join('\n'))
  }

  return sections.join('\n\n')
}
