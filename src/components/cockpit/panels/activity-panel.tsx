'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { MissionControlActivity } from '@/features/mission-control/types'
import { ArrowRight, CheckCircle2, Clock3, LoaderCircle, TriangleAlert } from 'lucide-react'

function relativeTime(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime()
  const seconds = Math.max(1, Math.floor(delta / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function itemClasses(item: MissionControlActivity): string {
  if (item.visualState === 'failed' || item.visualState === 'blocked') return 'border-rose-500/30 bg-rose-500/8'
  if (item.visualState === 'running' || item.visualState === 'queued') return 'border-sky-500/30 bg-sky-500/8'
  if (item.visualState === 'completed') return 'border-emerald-500/30 bg-emerald-500/8'
  return 'border-zinc-800 bg-zinc-950/70'
}

function ActivityIcon({ item }: { item: MissionControlActivity }) {
  if (item.visualState === 'failed' || item.visualState === 'blocked') {
    return <TriangleAlert className="h-3.5 w-3.5 flex-shrink-0 text-rose-400" />
  }
  if (item.visualState === 'completed') {
    return <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
  }
  if (item.visualState === 'running' || item.visualState === 'queued') {
    return <LoaderCircle className="h-3.5 w-3.5 flex-shrink-0 text-sky-400" />
  }
  return <Clock3 className="h-3.5 w-3.5 flex-shrink-0 text-zinc-500" />
}

export function ActivityPanel({ activity, loading }: { activity: MissionControlActivity[]; loading?: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Execution Timeline</h2>
        <p className="mt-0.5 text-[11px] text-zinc-600">Machine, task, run, and workspace activity normalized into one feed.</p>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {loading ? (
          <>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="rounded-xl border border-zinc-800/60 px-3 py-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="mt-[3px] h-3.5 w-3.5 flex-shrink-0 animate-pulse rounded-full bg-zinc-800" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-zinc-800" />
                    <div className="h-3 w-full animate-pulse rounded bg-zinc-800/60" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-zinc-900" />
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : activity.length === 0 ? (
          <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 text-xs text-zinc-600">
            No activity has been observed yet.
          </div>
        ) : null}

        {activity.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: index * 0.015 }}
            className={cn('rounded-xl border px-3 py-2.5', itemClasses(item))}
          >
            <div className="flex items-start gap-2.5">
              {/* Icon — no bulky circle, stays top-aligned */}
              <div className="mt-[3px] flex-shrink-0">
                <ActivityIcon item={item} />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                {/* Title — full width with native tooltip for truncated text */}
                <p
                  className="truncate text-[13px] font-semibold leading-snug text-zinc-100"
                  title={item.title}
                >
                  {item.title}
                </p>

                {/* Summary — clamped to 2 lines to prevent runaway overflow */}
                {item.summary && (
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-300">
                    {item.summary}
                  </p>
                )}

                {/* Metadata row — scope badge + source + time + kind */}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="rounded border border-zinc-700/60 px-1.5 py-px text-[9px] uppercase tracking-[0.16em] text-zinc-400">
                    {item.scope}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">{item.source}</span>
                  <span className="text-[10px] text-zinc-500">{relativeTime(item.timestamp)}</span>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{item.kind.replaceAll('_', ' ')}</span>
                </div>
              </div>

              {/* Inspect link — flex-shrink-0 so it never wraps */}
              {item.href ? (
                <Link
                  href={item.href}
                  className="flex-shrink-0 mt-0.5 inline-flex items-center gap-0.5 text-[11px] text-zinc-500 hover:text-teal-300 transition-colors"
                  title="Inspect"
                >
                  <ArrowRight className="h-3 w-3" />
                </Link>
              ) : null}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
