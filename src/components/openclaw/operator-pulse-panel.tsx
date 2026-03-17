'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  Cpu,
  FileText,
  HardDrive,
  MessageCircle,
  Play,
  RefreshCw,
  XCircle,
  Zap,
  Radio,
  Timer,
  SkipForward,
} from 'lucide-react'
import type { OpenClawOperatorPulse, OpenClawCronJobPulse, OpenClawOperatorAlert } from '@/lib/openclaw/operator-pulse'

/* ─── Time helpers ───────────────────────────────────────────────── */

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return `${Math.floor(diff / 86400_000)}d ago`
}

function timeUntil(iso: string | null): string {
  if (!iso) return '—'
  const diff = new Date(iso).getTime() - Date.now()
  if (diff < 0) return 'overdue'
  if (diff < 60_000) return `in ${Math.floor(diff / 1000)}s`
  if (diff < 3600_000) return `in ${Math.floor(diff / 60_000)}m`
  if (diff < 86400_000) return `in ${Math.floor(diff / 3600_000)}h`
  return `in ${Math.floor(diff / 86400_000)}d`
}

function durationMs(ms: number | null): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`
}

/* ─── Signal bars ────────────────────────────────────────────────── */

function SignalBars({ strength }: { strength: number }) {
  const bars = [1, 2, 3, 4, 5]
  return (
    <div className="flex items-end gap-[2px] h-4">
      {bars.map((b) => (
        <div
          key={b}
          className={cn(
            'w-[3px] rounded-sm transition-colors duration-300',
            b === 1 ? 'h-[4px]' : b === 2 ? 'h-[6px]' : b === 3 ? 'h-[8px]' : b === 4 ? 'h-[10px]' : 'h-[14px]',
            b <= strength
              ? strength >= 4 ? 'bg-emerald-400' : strength >= 2 ? 'bg-yellow-400' : 'bg-red-500'
              : 'bg-zinc-700',
          )}
        />
      ))}
    </div>
  )
}

/* ─── Status dot ─────────────────────────────────────────────────── */

function StatusDot({ status }: { status: 'ok' | 'warn' | 'error' | 'unknown' | 'running' }) {
  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full flex-shrink-0',
        status === 'ok' && 'bg-emerald-400',
        status === 'warn' && 'bg-yellow-400',
        status === 'error' && 'bg-red-500',
        status === 'running' && 'bg-sky-400 animate-pulse',
        status === 'unknown' && 'bg-zinc-600',
      )}
    />
  )
}

function trustToStatus(trust: OpenClawCronJobPulse['trust']): 'ok' | 'warn' | 'error' | 'unknown' {
  if (trust === 'healthy') return 'ok'
  if (trust === 'degraded') return 'warn'
  if (trust === 'failing') return 'error'
  return 'unknown'
}

/* ─── Run status badge ───────────────────────────────────────────── */

function RunStatusBadge({ status }: { status: 'ok' | 'error' | 'skipped' | null }) {
  if (!status) return <span className="text-zinc-600 text-xs">no runs</span>
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-mono',
        status === 'ok' && 'bg-emerald-950 text-emerald-400',
        status === 'error' && 'bg-red-950 text-red-400',
        status === 'skipped' && 'bg-zinc-800 text-zinc-400',
      )}
    >
      {status === 'ok' && <CheckCircle2 className="w-3 h-3" />}
      {status === 'error' && <XCircle className="w-3 h-3" />}
      {status === 'skipped' && <SkipForward className="w-3 h-3" />}
      {status}
    </span>
  )
}

/* ─── Cron job card ──────────────────────────────────────────────── */

function CronJobCard({ job, onRunNow }: { job: OpenClawCronJobPulse; onRunNow: (id: string) => void }) {
  const [running, setRunning] = useState(false)

  async function handleRunNow() {
    setRunning(true)
    try {
      await fetch(`/api/openclaw/crons/${job.id}/run`, { method: 'POST' })
    } catch {
      // best-effort
    } finally {
      setTimeout(() => setRunning(false), 2000)
      onRunNow(job.id)
    }
  }

  const isOverdue = job.nextRunAt && new Date(job.nextRunAt).getTime() < Date.now()
  const status = job.isRunning ? 'running' : trustToStatus(job.trust)

  return (
    <div
      className={cn(
        'rounded-lg border p-4 flex flex-col gap-3 transition-colors',
        !job.enabled && 'opacity-50 border-zinc-800 bg-zinc-900/20',
        job.enabled && status === 'ok' && 'border-zinc-800 bg-zinc-900/50',
        job.enabled && status === 'warn' && 'border-yellow-900/50 bg-zinc-900/50',
        job.enabled && status === 'error' && 'border-red-900/60 bg-red-950/10',
        job.enabled && status === 'running' && 'border-sky-900/60 bg-sky-950/10',
        job.enabled && status === 'unknown' && 'border-zinc-800 bg-zinc-900/30',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot status={status} />
          <span className="text-sm font-semibold text-zinc-100 truncate">{job.name}</span>
          {!job.enabled && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono flex-shrink-0">
              disabled
            </span>
          )}
          {job.isRunning && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 font-mono flex-shrink-0 animate-pulse">
              running
            </span>
          )}
        </div>
        {job.enabled && (
          <button
            onClick={handleRunNow}
            disabled={running || job.isRunning}
            className={cn(
              'flex items-center gap-1 text-[10px] px-2 py-1 rounded font-mono flex-shrink-0 transition-colors',
              'border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200',
              (running || job.isRunning) && 'opacity-50 cursor-not-allowed',
            )}
          >
            <Play className="w-2.5 h-2.5" />
            run now
          </button>
        )}
      </div>

      {/* Schedule row */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Clock className="w-3 h-3 flex-shrink-0" />
        <span className="font-mono">{job.schedule}</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Last run</span>
          <div className="flex items-center gap-1.5">
            <RunStatusBadge status={job.lastRunStatus} />
            <span className="text-xs text-zinc-400 font-mono">{timeAgo(job.lastRunAt)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Next run</span>
          <span className={cn('text-xs font-mono', isOverdue ? 'text-yellow-400' : 'text-zinc-400')}>
            {timeUntil(job.nextRunAt)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Duration</span>
          <span className="text-xs text-zinc-400 font-mono">{durationMs(job.lastRunDurationMs)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Delivery</span>
          <div className="flex items-center gap-1">
            {job.deliveryMode !== 'none' ? (
              <>
                <MessageCircle className="w-3 h-3 text-sky-500 flex-shrink-0" />
                <span className="text-xs text-zinc-400 font-mono truncate">
                  {job.deliveryMode === 'last' ? 'auto-ch' : job.deliveryMode}{job.delivered === false ? ' ✗' : job.delivered ? ' ✓' : ''}
                </span>
              </>
            ) : (
              <span className="text-xs text-zinc-600 font-mono">silent</span>
            )}
          </div>
        </div>
      </div>

      {/* Error streak */}
      {job.consecutiveErrors > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-red-400 font-mono">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          {job.consecutiveErrors} consecutive error{job.consecutiveErrors !== 1 ? 's' : ''}
        </div>
      )}

      {/* Recent run mini-timeline */}
      {job.recentRuns.length > 0 && (
        <div className="flex items-center gap-1">
          {job.recentRuns.slice(0, 10).reverse().map((run, i) => (
            <div
              key={i}
              title={`${run.status ?? 'unknown'} — ${new Date(run.ts).toLocaleString()}`}
              className={cn(
                'w-1.5 h-4 rounded-sm flex-shrink-0',
                run.status === 'ok' && 'bg-emerald-500',
                run.status === 'error' && 'bg-red-500',
                run.status === 'skipped' && 'bg-zinc-600',
                !run.status && 'bg-zinc-700',
              )}
            />
          ))}
          <span className="text-[10px] text-zinc-600 ml-1">last {Math.min(10, job.recentRuns.length)} runs</span>
        </div>
      )}
    </div>
  )
}

/* ─── Alert row ──────────────────────────────────────────────────── */

function AlertRow({ alert }: { alert: OpenClawOperatorAlert }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 px-3 py-2 rounded text-xs font-mono',
        alert.level === 'critical' && 'bg-red-950/30 border border-red-900/40 text-red-300',
        alert.level === 'warning' && 'bg-yellow-950/30 border border-yellow-900/40 text-yellow-300',
        alert.level === 'info' && 'bg-zinc-800/50 border border-zinc-700/40 text-zinc-300',
      )}
    >
      {alert.level === 'critical' && <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
      {alert.level === 'warning' && <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
      {alert.level === 'info' && <Circle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
      <span className="flex-1">{alert.message}</span>
      <span className="text-zinc-600 flex-shrink-0">{timeAgo(alert.at)}</span>
    </div>
  )
}

/* ─── Activity feed item ─────────────────────────────────────────── */

interface ActivityEntry {
  ts: number
  jobName: string
  status: 'ok' | 'error' | 'skipped' | undefined
  durationMs: number | undefined
  delivered: boolean | undefined
  summary: string | undefined
}

function ActivityFeedRow({ entry }: { entry: ActivityEntry }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-zinc-800/50 last:border-0 text-xs">
      <StatusDot status={entry.status === 'ok' ? 'ok' : entry.status === 'error' ? 'error' : 'unknown'} />
      <span className="text-zinc-400 font-mono flex-shrink-0">{timeAgo(new Date(entry.ts).toISOString())}</span>
      <span className="text-zinc-300 font-medium truncate flex-1">{entry.jobName}</span>
      <RunStatusBadge status={entry.status ?? null} />
      {entry.durationMs && (
        <span className="text-zinc-600 font-mono flex-shrink-0">{durationMs(entry.durationMs)}</span>
      )}
      {entry.delivered === true && (
        <MessageCircle className="w-3 h-3 text-sky-500 flex-shrink-0" />
      )}
    </div>
  )
}

/* ─── Workspace file badge ───────────────────────────────────────── */

const WORKSPACE_FILE_ICONS: Record<string, string> = {
  'SOUL.md': '🧠',
  'USER.md': '👤',
  'IDENTITY.md': '🎭',
  'AGENTS.md': '🤖',
  'HEARTBEAT.md': '💓',
  'GOALS.md': '🎯',
  'MEMORY.md': '📚',
}

/* ─── Main panel ─────────────────────────────────────────────────── */

const REFRESH_INTERVAL_MS = 30_000

export function OperatorPulsePanel() {
  const [pulse, setPulse] = useState<OpenClawOperatorPulse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchPulse = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const res = await fetch('/api/openclaw/operator-pulse', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as OpenClawOperatorPulse
      setPulse(data)
      setError(null)
      setLastRefresh(new Date())
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchPulse()
    intervalRef.current = setInterval(() => fetchPulse(true), REFRESH_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchPulse])

  // Build unified activity feed from all job recent runs
  const activityFeed: ActivityEntry[] = pulse
    ? pulse.crons.jobs
        .flatMap(job =>
          job.recentRuns.map(run => ({
            ts: run.ts,
            jobName: run.jobName ?? job.name,
            status: run.status,
            durationMs: run.durationMs,
            delivered: run.delivered,
            summary: run.summary,
          }))
        )
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 30)
    : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-600 text-sm font-mono">
        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
        loading operator pulse...
      </div>
    )
  }

  if (error && !pulse) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <XCircle className="w-6 h-6 text-red-500" />
        <p className="text-red-400 text-sm font-mono">{error}</p>
        <button
          onClick={() => fetchPulse()}
          className="text-xs text-zinc-400 underline hover:text-zinc-200"
        >
          retry
        </button>
      </div>
    )
  }

  if (!pulse) return null

  const { gateway, crons, workspace, alerts, signalStrength, system } = pulse
  const signalLabel =
    signalStrength === 5 ? 'fully operational' :
    signalStrength === 4 ? 'operational' :
    signalStrength === 3 ? 'degraded' :
    signalStrength === 2 ? 'impaired' :
    signalStrength === 1 ? 'critical' : 'offline'

  const signalColor =
    signalStrength >= 4 ? 'text-emerald-400' :
    signalStrength >= 2 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans">
      {/* Top bar */}
      <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Radio className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold tracking-tight text-zinc-100">OpenClaw Operator</span>
          <span className="text-zinc-700">·</span>
          <div className="flex items-center gap-2">
            <SignalBars strength={signalStrength} />
            <span className={cn('text-xs font-mono', signalColor)}>{signalLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono">
          {lastRefresh && (
            <span>updated {timeAgo(lastRefresh.toISOString())}</span>
          )}
          <button
            onClick={() => fetchPulse()}
            disabled={refreshing}
            className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3 h-3', refreshing && 'animate-spin')} />
            refresh
          </button>
        </div>
      </div>

      <div className="px-6 py-6 max-w-[1400px] mx-auto flex flex-col gap-6">

        {/* Alert strip */}
        {alerts.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {alerts.map((alert, i) => (
              <AlertRow key={i} alert={alert} />
            ))}
          </div>
        )}

        {/* Gateway + stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Gateway */}
          <div className={cn(
            'rounded-lg border p-3 flex flex-col gap-1.5',
            gateway.healthy ? 'border-emerald-900/50 bg-emerald-950/10' : 'border-red-900/60 bg-red-950/10',
          )}>
            <div className="flex items-center gap-2">
              <Zap className={cn('w-3.5 h-3.5', gateway.healthy ? 'text-emerald-400' : 'text-red-400')} />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Gateway</span>
            </div>
            <span className={cn('text-sm font-mono font-semibold', gateway.healthy ? 'text-emerald-400' : 'text-red-400')}>
              {gateway.healthy ? 'UP' : 'DOWN'}
            </span>
            <span className="text-[10px] text-zinc-600 font-mono truncate">{gateway.url}</span>
            {gateway.version && (
              <span className="text-[10px] text-zinc-600 font-mono">v{gateway.version}</span>
            )}
          </div>

          {/* Model */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Model</span>
            </div>
            <span className="text-sm font-mono font-semibold text-sky-300 truncate">
              {gateway.primaryModel ?? 'unknown'}
            </span>
            {gateway.heartbeatInterval && (
              <span className="text-[10px] text-zinc-600 font-mono">hb every {gateway.heartbeatInterval}</span>
            )}
          </div>

          {/* Cron health */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Timer className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Cron Jobs</span>
            </div>
            <span className="text-sm font-mono font-semibold text-zinc-100">
              {crons.enabled}/{crons.total} enabled
            </span>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              {crons.healthy > 0 && <span className="text-emerald-400">{crons.healthy} ok</span>}
              {crons.degraded > 0 && <span className="text-yellow-400">{crons.degraded} warn</span>}
              {crons.failing > 0 && <span className="text-red-400">{crons.failing} fail</span>}
              {crons.unknown > 0 && <span className="text-zinc-500">{crons.unknown} unknown</span>}
            </div>
          </div>

          {/* Workspace */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Workspace</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {workspace.files.length > 0
                ? workspace.files.map(f => (
                  <span
                    key={f}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono"
                    title={f}
                  >
                    {WORKSPACE_FILE_ICONS[f] ?? '📄'} {f.replace('.md', '')}
                  </span>
                ))
                : <span className="text-[10px] text-zinc-600 font-mono">no workspace files</span>
              }
            </div>
          </div>

          {/* CPU */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">CPU</span>
            </div>
            <span className={cn(
              'text-sm font-mono font-semibold',
              system && system.cpuPercent > 80 ? 'text-rose-400' :
              system && system.cpuPercent > 60 ? 'text-amber-400' : 'text-teal-300',
            )}>
              {system ? `${system.cpuPercent}%` : '—'}
            </span>
          </div>

          {/* RAM */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">RAM</span>
            </div>
            <span className={cn(
              'text-sm font-mono font-semibold',
              system && system.memPercent > 85 ? 'text-rose-400' :
              system && system.memPercent > 70 ? 'text-amber-400' : 'text-indigo-300',
            )}>
              {system ? `${system.memUsedGb}/${system.memTotalGb} GB` : '—'}
            </span>
            {system && system.memPercent > 0 && (
              <span className="text-[10px] text-zinc-600 font-mono">{system.memPercent}% used</span>
            )}
          </div>
        </div>

        {/* Main content: cron grid + activity */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          {/* Cron jobs */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Scheduled Jobs
              </h2>
              <span className="text-[10px] text-zinc-600 font-mono">{crons.jobs.length} total</span>
            </div>

            {crons.jobs.length === 0 ? (
              <div className="rounded-lg border border-zinc-800 p-8 text-center text-zinc-600 text-sm font-mono">
                no cron jobs configured
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {crons.jobs.map(job => (
                  <CronJobCard
                    key={job.id}
                    job={job}
                    onRunNow={() => setTimeout(() => fetchPulse(true), 1500)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Activity feed */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Recent Activity
              </h2>
              <span className="text-[10px] text-zinc-600 font-mono">{activityFeed.length} entries</span>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
              {activityFeed.length === 0 ? (
                <p className="text-zinc-600 text-xs font-mono text-center py-6">no recent activity</p>
              ) : (
                <div className="flex flex-col">
                  {activityFeed.map((entry, i) => (
                    <ActivityFeedRow key={i} entry={entry} />
                  ))}
                </div>
              )}
            </div>

            {/* Refresh note */}
            <p className="text-[10px] text-zinc-700 font-mono text-center">
              auto-refreshes every 30s
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
