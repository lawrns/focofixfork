'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, FileJson, ShieldAlert, Workflow } from 'lucide-react'
import { UnifiedPageShell } from '@/components/layout/unified-page-shell'
import { UnifiedCard } from '@/components/ui/unified-card'
import { StatusBadge } from '@/components/ui/unified-badge'
import { useAuth } from '@/lib/hooks/use-auth'

type Run = {
  id: string
  runner: string
  status: string
  task_id: string | null
  started_at: string | null
  ended_at: string | null
  summary: string | null
  created_at: string
  artifacts?: Array<{ type: string; uri: string; name?: string }> | null
}

type TimelineEvent = {
  id: string
  kind: 'lifecycle' | 'execution' | 'audit'
  title: string
  description?: string
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'info'
  source: string
  timestamp: string
  payload?: Record<string, unknown> | null
}

function formatDuration(startedAt: string, endedAt: string): string {
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  const seconds = Math.max(0, Math.floor(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (seconds < 3600) return `${minutes}m ${remainingSeconds}s`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

function statusTone(status?: TimelineEvent['status']): string {
  if (status === 'completed') return 'text-emerald-600 dark:text-emerald-400'
  if (status === 'running') return 'text-[color:var(--foco-teal)]'
  if (status === 'failed') return 'text-red-600 dark:text-red-400'
  if (status === 'cancelled') return 'text-zinc-500'
  if (status === 'pending') return 'text-amber-600 dark:text-amber-400'
  return 'text-muted-foreground'
}

export default function RunDetailPage() {
  const { user, loading } = useAuth()
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : ''

  const [run, setRun] = useState<Run | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [executionEvents, setExecutionEvents] = useState<TimelineEvent[]>([])
  const [auditEvents, setAuditEvents] = useState<TimelineEvent[]>([])
  const [fetching, setFetching] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!user || !id) return

    async function load() {
      setFetching(true)
      setNotFound(false)
      try {
        const res = await fetch(`/api/runs/${id}/timeline`)
        if (!res.ok) {
          setNotFound(true)
          return
        }
        const json = await res.json()
        const runData = (json.data?.run ?? null) as Run | null
        const artifacts = (json.data?.artifacts ?? []) as Run['artifacts']
        setRun(runData ? { ...runData, artifacts } : null)
        setTimeline((json.data?.timeline ?? []) as TimelineEvent[])
        setExecutionEvents((json.data?.execution_events ?? []) as TimelineEvent[])
        setAuditEvents((json.data?.audit_events ?? []) as TimelineEvent[])
      } catch {
        setNotFound(true)
      } finally {
        setFetching(false)
      }
    }

    void load()
  }, [user, id])

  const duration = useMemo(() => {
    if (!run?.started_at || !run?.ended_at) return null
    return formatDuration(run.started_at, run.ended_at)
  }, [run])

  if (loading || (fetching && !notFound)) {
    return (
      <UnifiedPageShell className="space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8" maxWidth="6xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </UnifiedPageShell>
    )
  }

  if (!user) return null

  if (notFound || !run) {
    return (
      <UnifiedPageShell className="space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8" maxWidth="6xl">
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 sm:gap-5 text-center">
          <p className="text-sm font-medium">Run not found</p>
          <Link
            href="/runs"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Runs
          </Link>
        </div>
      </UnifiedPageShell>
    )
  }

  const artifacts = run.artifacts ?? []

  return (
    <UnifiedPageShell className="space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8" maxWidth="6xl">
      <div className="flex items-center gap-2 px-1 py-2 -mx-1">
        <Link
          href="/runs"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3 w-3 shrink-0" />
          <span>Runs</span>
        </Link>
      </div>

      <div className="flex flex-col gap-5 sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold leading-relaxed text-foreground break-words">
            {run.summary ?? run.id}
          </h1>
          <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
            <StatusBadge status={run.status} />
            <span className="inline-flex items-center rounded bg-muted px-2 sm:px-2.5 py-1 font-mono text-xs whitespace-nowrap">{run.runner}</span>
            {duration && <span className="inline-flex items-center rounded bg-muted/60 px-2 sm:px-2.5 py-1 text-xs whitespace-nowrap">Duration: {duration}</span>}
            <span className="inline-flex items-center rounded bg-muted/60 px-2 sm:px-2.5 py-1 text-xs whitespace-nowrap">Events: {timeline.length}</span>
          </div>
        </div>
      </div>

      <section className="space-y-5 sm:space-y-6">
        <div className="flex items-center gap-3">
          <Workflow className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Execution Timeline
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
        {executionEvents.length === 0 ? (
          <UnifiedCard>
            <p className="text-sm text-muted-foreground">
              Run created, but execution has not emitted timeline events yet.
            </p>
          </UnifiedCard>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {executionEvents.map((evt) => (
              <UnifiedCard key={evt.id} animate={false} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 md:p-5">
                <div className="mt-1 shrink-0 flex-none">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="text-sm sm:text-base font-medium">{evt.title}</span>
                    {evt.status && (
                      <span className={`inline-flex items-center rounded bg-muted/60 px-1.5 sm:px-2 py-0.5 text-xs font-medium ${statusTone(evt.status)} whitespace-nowrap`}>
                        {evt.status}
                      </span>
                    )}
                    <span className="inline-flex items-center rounded bg-muted/40 px-1.5 sm:px-2 py-0.5 text-xs text-muted-foreground whitespace-nowrap">{evt.source}</span>
                  </div>
                  {evt.description && (
                    <p className="mt-2 sm:mt-2.5 text-sm text-muted-foreground break-words">{evt.description}</p>
                  )}
                  <p className="mt-2.5 sm:mt-3 text-xs text-muted-foreground">
                    {new Date(evt.timestamp).toLocaleString()}
                  </p>
                </div>
              </UnifiedCard>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-5 sm:space-y-6">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Policy And Audit Events
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
        {auditEvents.length === 0 ? (
          <UnifiedCard>
            <p className="text-sm text-muted-foreground">
              {run.runner === 'command-surface'
                ? 'No policy events were recorded. Command-surface executions currently do not enforce autonomy policy checks unless they route through the autonomy endpoints.'
                : 'No policy or governance events were recorded for this run.'}
            </p>
          </UnifiedCard>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {auditEvents.map((evt) => (
              <UnifiedCard key={evt.id} animate={false} className="p-3 sm:p-4 md:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm sm:text-base font-medium">{evt.title}</p>
                    {evt.description && <p className="text-sm text-muted-foreground mt-2 sm:mt-2.5 break-words">{evt.description}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 sm:text-right">
                    {new Date(evt.timestamp).toLocaleString()}
                  </span>
                </div>
              </UnifiedCard>
            ))}
          </div>
        )}
      </section>

      {artifacts.length > 0 && (
        <section className="space-y-5 sm:space-y-6">
          <div className="flex items-center gap-3">
            <FileJson className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Artifacts
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="space-y-3 sm:space-y-4">
            {artifacts.map((artifact, i) => (
              <UnifiedCard key={`${artifact.uri}-${i}`} animate={false} className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 md:p-5">
                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0 whitespace-nowrap">
                  {artifact.type}
                </span>
                <a
                  href={artifact.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline truncate"
                >
                  {artifact.name ?? artifact.uri}
                </a>
              </UnifiedCard>
            ))}
          </div>
        </section>
      )}
    </UnifiedPageShell>
  )
}
