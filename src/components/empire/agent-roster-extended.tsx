'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Bot, CheckCircle2, Clock, AlertCircle, Zap } from 'lucide-react'

export interface AgentEntry {
  id: string
  name: string
  role: string
  model: 'OPUS' | 'SONNET' | 'KIMI' | 'GLM-5'
  phase: 'PLANNING' | 'EXECUTING' | 'REVIEWING' | 'IDLE'
  lastRun?: string | null
  status: 'active' | 'idle' | 'error'
}

const CSUITE_AGENTS: AgentEntry[] = [
  { id: 'claw-finance', name: 'ClawFinance', role: 'Revenue & financial intelligence', model: 'KIMI', phase: 'IDLE', status: 'idle' },
  { id: 'vigil-core',   name: 'VigilCore',   role: 'GSID intelligence gathering',       model: 'KIMI', phase: 'IDLE', status: 'idle' },
  { id: 'claw-dev',     name: 'ClawDev',     role: 'Codebase health & CI/CD',           model: 'KIMI', phase: 'IDLE', status: 'idle' },
  { id: 'synthesizer',  name: 'Synthesizer', role: 'Briefing synthesis (planning)',     model: 'OPUS', phase: 'IDLE', status: 'idle' },
  { id: 'vox',          name: 'Vox',         role: 'Audio brief generation',            model: 'KIMI', phase: 'IDLE', status: 'idle' },
  { id: 'herald',       name: 'Herald',      role: 'Message delivery & routing',        model: 'KIMI', phase: 'IDLE', status: 'idle' },
]

const MODEL_COLORS: Record<string, string> = {
  OPUS:    'bg-purple-500/10 text-purple-600 border-purple-400/40',
  SONNET:  'bg-blue-500/10 text-blue-600 border-blue-400/40',
  KIMI:    'bg-[color:var(--foco-teal)]/10 text-[color:var(--foco-teal)] border-[color:var(--foco-teal)]/40',
  'GLM-5': 'bg-amber-500/10 text-amber-600 border-amber-400/40',
}

const PHASE_COLORS: Record<string, string> = {
  PLANNING:  'text-purple-500',
  EXECUTING: 'text-[color:var(--foco-teal)]',
  REVIEWING: 'text-blue-500',
  IDLE:      'text-muted-foreground',
}

interface AgentRosterExtendedProps {
  overrides?: Partial<Record<string, Partial<AgentEntry>>>
}

export function AgentRosterExtended({ overrides = {} }: AgentRosterExtendedProps) {
  const agents = CSUITE_AGENTS.map(a => ({
    ...a,
    ...(overrides[a.id] ?? {}),
  }))

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {agents.map(agent => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  )
}

function AgentCard({ agent }: { agent: AgentEntry }) {
  const modelStyle = MODEL_COLORS[agent.model] ?? ''
  const phaseStyle = PHASE_COLORS[agent.phase] ?? PHASE_COLORS.IDLE

  const StatusIcon =
    agent.status === 'active' ? Zap :
    agent.status === 'error'  ? AlertCircle :
    Clock

  return (
    <div className="rounded-md border bg-card px-3 py-2.5 flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">
        <div className={cn(
          'h-7 w-7 rounded-md flex items-center justify-center',
          agent.status === 'active' ? 'bg-[color:var(--foco-teal)]/10' : 'bg-secondary',
        )}>
          <Bot className={cn(
            'h-3.5 w-3.5',
            agent.status === 'active' ? 'text-[color:var(--foco-teal)]' : 'text-muted-foreground',
          )} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium">{agent.name}</span>
          <Badge variant="outline" className={cn('text-[10px] font-mono-display border', modelStyle)}>
            {agent.model}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{agent.role}</p>
        <div className="flex items-center gap-2 mt-1">
          <StatusIcon className={cn('h-3 w-3', phaseStyle)} />
          <span className={cn('text-[10px] font-mono-display', phaseStyle)}>
            {agent.phase}
          </span>
          {agent.lastRun && (
            <span className="text-[10px] text-muted-foreground">
              · {agent.lastRun}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
