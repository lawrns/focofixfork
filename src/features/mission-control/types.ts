import type { AgentOption, LedgerEvent, Run } from '@/components/dashboard/use-dashboard-data'
import type { OpenClawRuntimeSnapshot } from '@/lib/openclaw/types'

export type MissionControlVisualState =
  | 'idle'
  | 'queued'
  | 'running'
  | 'blocked'
  | 'waiting_human'
  | 'verifying'
  | 'completed'
  | 'failed'

export type MissionControlAttentionLevel = 'none' | 'info' | 'warning' | 'critical'

export type MissionControlActivityKind =
  | 'heartbeat'
  | 'started'
  | 'progress'
  | 'blocked'
  | 'approval_needed'
  | 'completed'
  | 'failed'
  | 'artifact'
  | 'status_changed'
  | 'commentary'

export interface MissionControlActivity {
  id: string
  timestamp: string
  scope: 'machine' | 'workspace' | 'project' | 'task' | 'run' | 'agent'
  kind: MissionControlActivityKind
  attention: MissionControlAttentionLevel
  visualState: MissionControlVisualState
  title: string
  summary: string
  source: string
  href?: string
  entity?: {
    type: 'task' | 'run' | 'project' | 'agent' | 'workspace'
    id?: string | null
    label?: string | null
  }
  correlationId?: string | null
  payload?: Record<string, unknown> | null
}

export interface MissionControlAttentionItem {
  id: string
  level: Exclude<MissionControlAttentionLevel, 'none'>
  title: string
  summary: string
  href?: string
  category: 'run' | 'task' | 'proposal' | 'machine' | 'agent'
}

export interface MissionControlTaskCard {
  id: string
  title: string
  status: string
  priority: string | null
  projectId: string
  projectName: string
  projectSlug?: string | null
  delegationStatus: string | null
  assignedAgent: string | null
  runId: string | null
  dueDate: string | null
  updatedAt: string
  latestEvent: string | null
  latestSummary: string | null
  blockedReason: string | null
  verificationRequired: boolean
  verificationStatus: string | null
  visualState: MissionControlVisualState
  attention: MissionControlAttentionLevel
  href: string
}

export interface MissionControlMachineSnapshot {
  signalStrength: 0 | 1 | 2 | 3 | 4 | 5
  gatewayHealthy: boolean
  primaryModel: string | null
  attachedTabs: number
  cpuPercent: number
  memPercent: number
  workspacePath: string | null
  cronSummary: {
    total: number
    enabled: number
    healthy: number
    degraded: number
    failing: number
  }
  alerts: Array<{
    level: 'critical' | 'warning' | 'info'
    message: string
    source: string
    at: string
  }>
}

export interface MissionControlMetric {
  id: string
  label: string
  value: string
  detail: string
  tone: 'neutral' | 'good' | 'warning' | 'critical'
}

export interface MissionControlSnapshot {
  snapshotAt: string
  workspaceId: string | null
  runtime: OpenClawRuntimeSnapshot | null
  machine: MissionControlMachineSnapshot
  metrics: MissionControlMetric[]
  attention: MissionControlAttentionItem[]
  activity: MissionControlActivity[]
  tasks: MissionControlTaskCard[]
  runs: Run[]
  signals: LedgerEvent[]
  agents: AgentOption[]
  proposals: Array<{
    id: string
    title: string
    status: string
    created_at: string
    project?: {
      id: string
      name: string
      slug?: string | null
    } | null
  }>
}
