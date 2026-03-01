export type AgentBackend = 'crico' | 'clawdbot' | 'bosun' | 'openclaw'

export type AgentNodeStatus = 'idle' | 'working' | 'blocked' | 'done' | 'error' | 'paused'

export interface UnifiedAgent {
  id: string              // composite: `${backend}::${nativeId}`
  backend: AgentBackend
  nativeId: string
  name: string
  role: string
  status: AgentNodeStatus
  model?: string          // 'KIMI' | 'OPUS' | 'SONNET' | 'GLM-5'
  currentMissionId?: string
  lastActiveAt?: string
  errorMessage?: string
  raw: Record<string, unknown>
}

export interface MissionStep {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'failed'
  output?: string
}

export interface UnifiedMission {
  id: string
  title: string
  description?: string
  status: 'pending' | 'active' | 'met' | 'failed'
  assignedAgentIds: string[]
  backend: AgentBackend
  nativeRunId?: string
  createdAt: string
  steps?: MissionStep[]
}

// ── Diagram types ──────────────────────────────────────────────────────────────

export interface FlowLane {
  id: string
  label: string
  backend: AgentBackend
  agents: UnifiedAgent[]
}

export interface FlowGoal {
  id: string
  label: string
  status: UnifiedMission['status']
  agentIds: string[]
}

export interface FlowMove {
  from: string
  to: string
  type: 'spawn' | 'progress' | 'block' | 'complete'
  ts: number
}

// ── Status display ─────────────────────────────────────────────────────────────

export const AGENT_STATUS_COLORS: Record<AgentNodeStatus, string> = {
  idle:    'bg-zinc-500/20 text-zinc-500',
  working: 'bg-teal-500/20 text-teal-500',
  blocked: 'bg-amber-500/20 text-amber-500',
  done:    'bg-emerald-500/20 text-emerald-500',
  error:   'bg-rose-500/20 text-rose-500',
  paused:  'bg-blue-500/20 text-blue-500',
}

export const AGENT_STATUS_DOT: Record<AgentNodeStatus, string> = {
  idle:    'bg-zinc-400',
  working: 'bg-teal-400 shadow-[0_0_6px_theme(colors.teal.400)]',
  blocked: 'bg-amber-400',
  done:    'bg-emerald-400',
  error:   'bg-rose-400',
  paused:  'bg-blue-400',
}

export const BACKEND_LABELS: Record<AgentBackend, string> = {
  crico:    'CRICO',
  clawdbot: 'ClawdBot',
  bosun:    'Bosun',
  openclaw: 'OpenClaw',
}
