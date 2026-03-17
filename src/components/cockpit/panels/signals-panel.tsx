'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Bot,
  Check,
  Clock,
  GitCommit,
  MessageSquare,
  Radio,
  RefreshCw,
  Siren,
  Timer,
  XCircle,
  Zap,
} from 'lucide-react'
import type { LedgerEvent } from '@/components/dashboard/use-dashboard-data'

/* ─── Event type config ──────────────────────────────────────────── */

interface EventConfig {
  icon: React.ElementType
  color: string
  bg: string
  label: (e: LedgerEvent) => string
}

function getEventConfig(event: LedgerEvent): EventConfig {
  const t = event.type ?? ''

  if (t.startsWith('cron.') || t.startsWith('cron_'))
    return {
      icon: Timer,
      color: 'text-violet-400',
      bg: 'bg-violet-950/30',
      label: (e) => `${e.type} — ${e.source ?? ''}`,
    }
  if (t.startsWith('agent.') || t.startsWith('agent_'))
    return {
      icon: Bot,
      color: 'text-teal-400',
      bg: 'bg-teal-950/30',
      label: (e) => `${e.type}`,
    }
  if (t.startsWith('run.') || t.startsWith('run_'))
    return {
      icon: Zap,
      color: 'text-sky-400',
      bg: 'bg-sky-950/30',
      label: (e) => `${e.type}`,
    }
  if (t.startsWith('git.') || t.includes('commit') || t.includes('push'))
    return {
      icon: GitCommit,
      color: 'text-amber-400',
      bg: 'bg-amber-950/30',
      label: (e) => e.type,
    }
  if (t.startsWith('report.') || t.includes('report'))
    return {
      icon: MessageSquare,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/30',
      label: (e) => e.type,
    }
  if (t.includes('fail') || t.includes('error'))
    return {
      icon: XCircle,
      color: 'text-rose-400',
      bg: 'bg-rose-950/30',
      label: (e) => e.type,
    }
  if (t.includes('complet') || t.includes('success') || t.includes('done'))
    return {
      icon: Check,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/30',
      label: (e) => e.type,
    }
  return {
    icon: Radio,
    color: 'text-zinc-500',
    bg: 'bg-zinc-800/30',
    label: (e) => e.type,
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s`
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`
  return `${Math.floor(diff / 3600_000)}h`
}

function getEventDetail(event: LedgerEvent): string {
  if (!event.payload) return ''
  const p = event.payload
  const candidates = [p.message, p.summary, p.title, p.name, p.status]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim().slice(0, 60)
  }
  return ''
}

/* ─── Single event row ───────────────────────────────────────────── */

function SignalRow({ event }: { event: LedgerEvent }) {
  const cfg = getEventConfig(event)
  const Icon = cfg.icon
  const detail = getEventDetail(event)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      className="flex items-start gap-2.5 py-2 border-b border-zinc-800/40 last:border-0 group"
    >
      <div className={cn('w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bg)}>
        <Icon className={cn('w-3 h-3', cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <span className={cn('text-[11px] font-mono font-medium', cfg.color)}>
          {event.type}
        </span>
        {detail && (
          <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{detail}</p>
        )}
      </div>
      <span className="text-[10px] text-zinc-700 font-mono flex-shrink-0 mt-0.5">
        {timeAgo(event.timestamp)}
      </span>
    </motion.div>
  )
}

/* ─── Panel ──────────────────────────────────────────────────────── */

interface SignalsPanelProps {
  events: LedgerEvent[]
  refreshing?: boolean
  onRefresh: () => void
}

export function SignalsPanel({ events, refreshing, onRefresh }: SignalsPanelProps) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Signals</h2>
        <div className="flex items-center gap-2">
          {sorted.length > 0 && (
            <span className="text-[10px] text-zinc-600 font-mono">{sorted.length} events</span>
          )}
          <button
            onClick={onRefresh}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <RefreshCw className={cn('w-3 h-3', refreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-700 gap-2">
            <Clock className="w-5 h-5" />
            <span className="text-xs font-mono">no recent signals</span>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sorted.map((event) => (
              <SignalRow key={event.id} event={event} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
