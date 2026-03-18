'use client'

import React from 'react'
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
      bg: 'bg-violet-950/40',
      label: (e) => `${e.type} — ${e.source ?? ''}`,
    }
  if (t.startsWith('agent.') || t.startsWith('agent_'))
    return {
      icon: Bot,
      color: 'text-teal-400',
      bg: 'bg-teal-950/40',
      label: (e) => `${e.type}`,
    }
  if (t.startsWith('run.') || t.startsWith('run_'))
    return {
      icon: Zap,
      color: 'text-sky-400',
      bg: 'bg-sky-950/40',
      label: (e) => `${e.type}`,
    }
  if (t.startsWith('git.') || t.includes('commit') || t.includes('push'))
    return {
      icon: GitCommit,
      color: 'text-amber-400',
      bg: 'bg-amber-950/40',
      label: (e) => e.type,
    }
  if (t.startsWith('report.') || t.includes('report'))
    return {
      icon: MessageSquare,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/40',
      label: (e) => e.type,
    }
  if (t.includes('fail') || t.includes('error'))
    return {
      icon: XCircle,
      color: 'text-rose-400',
      bg: 'bg-rose-950/40',
      label: (e) => e.type,
    }
  if (t.includes('complet') || t.includes('success') || t.includes('done'))
    return {
      icon: Check,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/40',
      label: (e) => e.type,
    }
  return {
    icon: Radio,
    color: 'text-zinc-500',
    bg: 'bg-zinc-800/40',
    label: (e) => e.type,
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s`
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h`
  return `${Math.floor(diff / 86_400_000)}d`
}

function getEventDetail(event: LedgerEvent): string {
  if (!event.payload) return ''
  const p = event.payload
  const candidates = [p.message, p.summary, p.title, p.name, p.status]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim().slice(0, 80)
  }
  return ''
}

/* ─── Single event row ───────────────────────────────────────────── */

const SignalRow = React.forwardRef<HTMLDivElement, { event: LedgerEvent }>(
  function SignalRow({ event }, ref) {
  const cfg = getEventConfig(event)
  const Icon = cfg.icon
  const detail = getEventDetail(event)

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      className="flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-zinc-800/30 transition-colors border-b border-zinc-800/30 last:border-0 group cursor-default"
    >
      {/* Colored icon container — consistent size, top-aligned */}
      <div className={cn('w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-px', cfg.bg)}>
        <Icon className={cn('w-3 h-3', cfg.color)} />
      </div>

      {/* Text — min-w-0 ensures truncation works */}
      <div className="flex-1 min-w-0">
        <span className={cn('block truncate text-[11px] font-mono font-medium leading-snug', cfg.color)}>
          {event.type}
        </span>
        {detail && (
          <p className="mt-px truncate text-[10px] leading-snug text-zinc-400" title={detail}>
            {detail}
          </p>
        )}
      </div>

      {/* Timestamp — right-aligned, readable contrast */}
      <span className="flex-shrink-0 mt-px text-[10px] font-mono text-zinc-500 tabular-nums">
        {timeAgo(event.timestamp)}
      </span>
    </motion.div>
  )
})
SignalRow.displayName = 'SignalRow'

/* ─── Panel ──────────────────────────────────────────────────────── */

interface SignalsPanelProps {
  events: LedgerEvent[]
  refreshing?: boolean
  loading?: boolean
  onRefresh: () => void
}

export function SignalsPanel({ events, refreshing, loading, onRefresh }: SignalsPanelProps) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Signals</h2>
        <div className="flex items-center gap-2">
          {!loading && sorted.length > 0 && (
            <span className="text-[10px] text-zinc-600 font-mono tabular-nums">{sorted.length} events</span>
          )}
          <button
            onClick={onRefresh}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
            title="Refresh signals"
          >
            <RefreshCw className={cn('w-3 h-3', refreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto -mx-2 px-0">
        {loading ? (
          <div className="space-y-px">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-start gap-2 px-2 py-2 border-b border-zinc-800/30 last:border-0">
                <div className="mt-px h-5 w-5 flex-shrink-0 animate-pulse rounded bg-zinc-800/60" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-800" />
                  <div className="h-2.5 w-3/4 animate-pulse rounded bg-zinc-800/60" />
                </div>
                <div className="h-2.5 w-6 flex-shrink-0 animate-pulse rounded bg-zinc-900" />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
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
