'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  HelpCircle,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  XCircle,
} from 'lucide-react'
import type { Run, DashboardWorkItem, DashboardProposal, AgentOption } from '@/components/dashboard/use-dashboard-data'

/* ─── Attention item shape ───────────────────────────────────────── */

type AttentionLevel = 'critical' | 'warning' | 'info'

interface AttentionItem {
  id: string
  level: AttentionLevel
  category: 'run' | 'agent' | 'task' | 'proposal' | 'approval'
  title: string
  detail: string
  action?: string
  actionLabel?: string
  href?: string
}

function buildAttentionItems(
  runs: Run[],
  workItems: DashboardWorkItem[],
  proposals: DashboardProposal[],
  agents: AgentOption[],
): AttentionItem[] {
  const items: AttentionItem[] = []
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

  // Failed runs
  for (const run of runs) {
    if (run.status === 'failed' && new Date(run.created_at).getTime() > oneDayAgo) {
      items.push({
        id: `run-failed-${run.id}`,
        level: 'critical',
        category: 'run',
        title: run.summary || run.task_id || `Run ${run.id.slice(0, 8)}`,
        detail: `${run.runner} failed — needs retry or inspection`,
        actionLabel: 'inspect',
        href: `/runs/${run.id}`,
      })
    }
  }

  // Blocked work items
  for (const item of workItems) {
    if (item.status === 'blocked') {
      items.push({
        id: `blocked-${item.id}`,
        level: 'warning',
        category: 'task',
        title: item.title,
        detail: `Blocked${item.priority === 'urgent' ? ' — urgent' : ''}`,
        actionLabel: 'view',
      })
    }
  }

  // Pending proposals
  for (const p of proposals) {
    if (p.status === 'pending_review') {
      items.push({
        id: `proposal-${p.id}`,
        level: 'info',
        category: 'proposal',
        title: p.title,
        detail: 'Awaiting your review',
        actionLabel: 'review',
      })
    }
  }

  // Error agents
  for (const agent of agents) {
    if (agent.status === 'error') {
      items.push({
        id: `agent-error-${agent.id}`,
        level: 'critical',
        category: 'agent',
        title: agent.name,
        detail: `Agent in error state — needs attention`,
        actionLabel: 'check',
      })
    }
  }

  // Sort: critical first, then warning, then info
  const order: Record<AttentionLevel, number> = { critical: 0, warning: 1, info: 2 }
  return items.sort((a, b) => order[a.level] - order[b.level])
}

/* ─── Level config ───────────────────────────────────────────────── */

const LEVEL_CONFIG: Record<AttentionLevel, { icon: React.ElementType; color: string; border: string; bg: string }> = {
  critical: {
    icon: XCircle,
    color: 'text-rose-400',
    border: 'border-rose-900/40',
    bg: 'bg-rose-950/20',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    border: 'border-amber-900/30',
    bg: 'bg-amber-950/10',
  },
  info: {
    icon: HelpCircle,
    color: 'text-sky-400',
    border: 'border-sky-900/30',
    bg: 'bg-sky-950/10',
  },
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  run: RefreshCw,
  agent: ShieldAlert,
  task: AlertTriangle,
  proposal: UserCheck,
  approval: CheckCircle2,
}

/* ─── Attention item card ────────────────────────────────────────── */

function AttentionCard({ item }: { item: AttentionItem }) {
  const cfg = LEVEL_CONFIG[item.level]
  const Icon = cfg.icon
  const CatIcon = CATEGORY_ICONS[item.category] ?? Eye

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'rounded-xl border p-3 flex flex-col gap-2 group',
        cfg.border, cfg.bg,
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', cfg.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-100 leading-tight truncate">{item.title}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">{item.detail}</p>
        </div>
        <div className={cn('w-1 h-1 rounded-full flex-shrink-0 mt-1.5', cfg.color.replace('text-', 'bg-'))} />
      </div>

      {item.actionLabel && (
        <div className="flex items-center gap-2">
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-mono border', cfg.color, cfg.border)}>
            {item.category}
          </span>
          {item.href ? (
            <a
              href={item.href}
              className="ml-auto text-[10px] text-zinc-500 hover:text-zinc-300 font-mono transition-colors"
            >
              {item.actionLabel} →
            </a>
          ) : (
            <button className="ml-auto text-[10px] text-zinc-500 hover:text-zinc-300 font-mono transition-colors">
              {item.actionLabel} →
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

/* ─── Panel ──────────────────────────────────────────────────────── */

interface AttentionPanelProps {
  runs: Run[]
  workItems: DashboardWorkItem[]
  proposals: DashboardProposal[]
  agents: AgentOption[]
}

export function AttentionPanel({ runs, workItems, proposals, agents }: AttentionPanelProps) {
  const items = buildAttentionItems(runs, workItems, proposals, agents)
  const critical = items.filter(i => i.level === 'critical').length

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Attention</h2>
          {critical > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 font-mono border border-rose-900/40">
              {critical} critical
            </span>
          )}
        </div>
        {items.length > 0 && (
          <span className="text-[10px] text-zinc-600 font-mono">{items.length} items</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-700 gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-800" />
            <span className="text-xs font-mono text-zinc-600">all clear</span>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <AttentionCard key={item.id} item={item} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
