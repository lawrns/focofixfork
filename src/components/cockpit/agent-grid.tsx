'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Activity,
  AlertOctagon,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  Ghost,
  Loader2,
  Pause,
  TriangleAlert,
  XCircle,
} from 'lucide-react'
import type { AgentOption, Run } from '@/components/dashboard/use-dashboard-data'

/* ─── Status config ──────────────────────────────────────────────── */

interface StatusCfg {
  label: string
  dot: string
  ring: string
  text: string
  icon: React.ElementType
}

const STATUS_MAP: Record<string, StatusCfg> = {
  working: {
    label: 'executing',
    dot: 'bg-emerald-400 animate-pulse',
    ring: 'ring-emerald-500/20',
    text: 'text-emerald-400',
    icon: Activity,
  },
  running: {
    label: 'executing',
    dot: 'bg-emerald-400 animate-pulse',
    ring: 'ring-emerald-500/20',
    text: 'text-emerald-400',
    icon: Activity,
  },
  planning: {
    label: 'planning',
    dot: 'bg-sky-400 animate-pulse',
    ring: 'ring-sky-500/20',
    text: 'text-sky-400',
    icon: Loader2,
  },
  idle: {
    label: 'idle',
    dot: 'bg-zinc-600',
    ring: 'ring-zinc-700/20',
    text: 'text-zinc-500',
    icon: Bot,
  },
  waiting: {
    label: 'waiting',
    dot: 'bg-amber-400',
    ring: 'ring-amber-500/20',
    text: 'text-amber-400',
    icon: Clock,
  },
  blocked: {
    label: 'blocked',
    dot: 'bg-amber-500',
    ring: 'ring-amber-600/20',
    text: 'text-amber-400',
    icon: TriangleAlert,
  },
  paused: {
    label: 'paused',
    dot: 'bg-zinc-500',
    ring: 'ring-zinc-600/20',
    text: 'text-zinc-400',
    icon: Pause,
  },
  error: {
    label: 'failed',
    dot: 'bg-rose-500',
    ring: 'ring-rose-600/30',
    text: 'text-rose-400',
    icon: XCircle,
  },
  stale: {
    label: 'stale',
    dot: 'bg-rose-800',
    ring: 'ring-rose-800/20',
    text: 'text-rose-700',
    icon: Ghost,
  },
  offline: {
    label: 'offline',
    dot: 'bg-zinc-800',
    ring: 'ring-zinc-800/20',
    text: 'text-zinc-700',
    icon: AlertOctagon,
  },
}

/* ─── Trust score ────────────────────────────────────────────────── */

function computeTrust(agent: AgentOption, runs: Run[]): number {
  const agentRuns = runs.filter(r => r.runner === agent.nativeId || r.runner === agent.name)
  if (agentRuns.length === 0) return 50 // default unknown

  const recent = agentRuns.slice(0, 10)
  const ok = recent.filter(r => r.status === 'completed').length
  const failed = recent.filter(r => r.status === 'failed').length

  let score = 50
  score += ok * 8
  score -= failed * 15

  if (agent.status === 'error') score -= 20
  if (agent.status === 'working' || agent.status === 'running') score += 5

  return Math.max(0, Math.min(100, Math.round(score)))
}

function TrustBar({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-emerald-500' :
    score >= 60 ? 'bg-amber-500' :
    score >= 40 ? 'bg-amber-600' : 'bg-rose-500'

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, delay: 0.1 }}
        />
      </div>
      <span className={cn('text-[10px] font-mono tabular-nums w-5 text-right',
        score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-rose-400'
      )}>
        {score}
      </span>
    </div>
  )
}

/* ─── Agent card ─────────────────────────────────────────────────── */

function AgentCard({
  agent,
  runs,
  onInspect,
}: {
  agent: AgentOption
  runs: Run[]
  onInspect: (agent: AgentOption) => void
}) {
  const status = agent.status ?? 'idle'
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.idle
  const trust = computeTrust(agent, runs)
  const Icon = cfg.icon

  const currentRun = runs.find(
    r => (r.runner === agent.nativeId || r.runner === agent.name) && r.status === 'running'
  )

  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      onClick={() => onInspect(agent)}
      className={cn(
        'text-left rounded-xl border bg-[#111113] p-3.5 flex flex-col gap-2.5 transition-colors group hover:bg-[#151517]',
        'ring-2',
        cfg.ring,
        status === 'error' ? 'border-rose-900/40' : 'border-zinc-800/60',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-0.5', cfg.dot)} />
          <span className="text-sm font-semibold text-zinc-100 truncate leading-tight">{agent.name}</span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 flex-shrink-0 transition-colors mt-0.5" />
      </div>

      {/* Status + backend */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn('text-[10px] font-mono font-medium', cfg.text)}>{cfg.label}</span>
        <span className="text-[10px] text-zinc-700 font-mono">{agent.backend}</span>
      </div>

      {/* Current task */}
      {currentRun && (
        <div className="flex items-start gap-1.5 text-[10px] text-zinc-500">
          <Cpu className="w-3 h-3 text-zinc-600 flex-shrink-0 mt-0.5" />
          <span className="truncate font-mono">{currentRun.summary || currentRun.task_id || '...'}</span>
        </div>
      )}

      {/* Trust bar */}
      <div>
        <span className="text-[9px] text-zinc-700 uppercase tracking-wider font-mono">trust</span>
        <TrustBar score={trust} />
      </div>

      {/* Today count */}
      {(() => {
        const today = Date.now() - 24 * 60 * 60 * 1000
        const todayRuns = runs.filter(
          r => (r.runner === agent.nativeId || r.runner === agent.name) &&
          new Date(r.created_at).getTime() > today
        )
        const completed = todayRuns.filter(r => r.status === 'completed').length
        const failed = todayRuns.filter(r => r.status === 'failed').length
        if (todayRuns.length === 0) return null
        return (
          <div className="flex items-center gap-2 text-[10px] font-mono">
            {completed > 0 && (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-2.5 h-2.5" />
                {completed}
              </span>
            )}
            {failed > 0 && (
              <span className="flex items-center gap-1 text-rose-600">
                <XCircle className="w-2.5 h-2.5" />
                {failed}
              </span>
            )}
            <span className="text-zinc-700">today</span>
          </div>
        )
      })()}
    </motion.button>
  )
}

/* ─── Grid ───────────────────────────────────────────────────────── */

interface AgentGridProps {
  agents: AgentOption[]
  runs: Run[]
}

export function AgentGrid({ agents, runs }: AgentGridProps) {
  const [inspecting, setInspecting] = useState<AgentOption | null>(null)

  // Sort: active first, then by trust
  const sorted = [...agents].sort((a, b) => {
    const aActive = ['working', 'running', 'planning', 'executing'].includes(a.status)
    const bActive = ['working', 'running', 'planning', 'executing'].includes(b.status)
    if (aActive && !bActive) return -1
    if (!aActive && bActive) return 1
    return computeTrust(b, runs) - computeTrust(a, runs)
  })

  if (agents.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Agent Fleet</h2>
        <div className="flex flex-col items-center justify-center h-32 text-zinc-700 gap-2 rounded-xl border border-zinc-800/40">
          <Bot className="w-6 h-6" />
          <span className="text-xs font-mono">no agents configured</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Agent Fleet</h2>
        <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-600">
          <span className="text-emerald-600">
            {agents.filter(a => ['working', 'running'].includes(a.status)).length} active
          </span>
          <span>{agents.length} total</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        <AnimatePresence mode="popLayout">
          {sorted.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              runs={runs}
              onInspect={setInspecting}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
