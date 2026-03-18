'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { MissionControlTaskCard } from '@/features/mission-control/types'
import { Bot, CheckCircle2, Clock3, GitBranch, ShieldCheck, TriangleAlert } from 'lucide-react'

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

function stateClasses(state: MissionControlTaskCard['visualState']): string {
  switch (state) {
    case 'running':
      return 'border-emerald-500/30 bg-emerald-500/8'
    case 'queued':
      return 'border-sky-500/30 bg-sky-500/8'
    case 'blocked':
      return 'border-rose-500/40 bg-rose-500/8'
    case 'verifying':
      return 'border-amber-500/30 bg-amber-500/8'
    case 'completed':
      return 'border-zinc-700 bg-zinc-900/80'
    case 'failed':
      return 'border-rose-500/40 bg-rose-500/10'
    default:
      return 'border-zinc-800 bg-zinc-950/70'
  }
}

function priorityClasses(priority: string | null): string {
  switch (priority) {
    case 'urgent':
      return 'border-rose-500/30 text-rose-300'
    case 'high':
      return 'border-amber-500/30 text-amber-300'
    case 'medium':
      return 'border-sky-500/30 text-sky-300'
    case 'low':
      return 'border-emerald-500/30 text-emerald-300'
    default:
      return 'border-zinc-700 text-zinc-400'
  }
}

export function WorkboardPanel({ tasks, loading }: { tasks: MissionControlTaskCard[]; loading?: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Operational Board</h2>
          <p className="mt-1 text-[11px] text-zinc-600">Evidence-backed work linked to delegation, verification, and runs.</p>
        </div>
        <Badge variant="outline" className="border-zinc-700 bg-zinc-950 text-zinc-300">
          {loading ? '…' : `${tasks.length} visible`}
        </Badge>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {loading ? (
          <>
            {[0, 1, 2].map(i => (
              <div key={i} className="rounded-xl border border-zinc-800/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="h-3.5 w-2/3 animate-pulse rounded bg-zinc-800" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-800/60" />
                  </div>
                  <div className="h-5 w-12 animate-pulse rounded bg-zinc-800/60" />
                </div>
                <div className="mt-3 flex gap-2">
                  <div className="h-5 w-20 animate-pulse rounded-full bg-zinc-800/60" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-800/60" />
                </div>
              </div>
            ))}
          </>
        ) : tasks.length === 0 ? (
          <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 text-xs text-zinc-600">
            No execution-aware tasks available yet.
          </div>
        ) : null}

        {tasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: index * 0.03 }}
            className={cn('rounded-xl border p-3 transition-colors', stateClasses(task.visualState))}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link href={task.href} className="truncate text-sm font-semibold text-zinc-100 hover:text-teal-300">
                    {task.title}
                  </Link>
                  {task.visualState === 'running' ? (
                    <motion.span
                      className="h-2 w-2 rounded-full bg-emerald-400"
                      animate={{ scale: [1, 1.35, 1], opacity: [0.85, 1, 0.85] }}
                      transition={{ repeat: Infinity, duration: 1.6 }}
                    />
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {task.projectName} • {task.status.replaceAll('_', ' ')}
                </p>
              </div>
              <Badge variant="outline" className={cn('text-[10px] uppercase', priorityClasses(task.priority))}>
                {task.priority ?? 'none'}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
              {task.delegationStatus ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-2 py-0.5">
                  <GitBranch className="h-3 w-3" />
                  {task.delegationStatus}
                </span>
              ) : null}
              {task.assignedAgent ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-2 py-0.5">
                  <Bot className="h-3 w-3" />
                  {task.assignedAgent}
                </span>
              ) : null}
              {task.verificationRequired ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-2 py-0.5">
                  <ShieldCheck className="h-3 w-3" />
                  {task.verificationStatus ?? 'verification pending'}
                </span>
              ) : null}
              {task.runId ? (
                <Link href={`/runs/${task.runId}`} className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-2 py-0.5 hover:border-teal-500/50 hover:text-teal-300">
                  <CheckCircle2 className="h-3 w-3" />
                  linked run
                </Link>
              ) : null}
            </div>

            {(task.latestSummary || task.blockedReason) ? (
              <div className="mt-3 rounded-lg border border-zinc-800 bg-black/20 px-3 py-2 text-[11px] text-zinc-300">
                <div className="flex items-start gap-2">
                  {task.visualState === 'blocked' || task.attention === 'critical' ? (
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-rose-400" />
                  ) : (
                    <Clock3 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-sky-400" />
                  )}
                  <span className="line-clamp-2">
                    {task.blockedReason || task.latestSummary}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="mt-2 text-[10px] text-zinc-600">
              Updated {relativeTime(task.updatedAt)}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
