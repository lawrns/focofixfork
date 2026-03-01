'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Terminal, FileEdit, Zap, Clock, ArrowLeft } from 'lucide-react'
import { UnifiedPageShell } from '@/components/layout/unified-page-shell'
import { UnifiedCard } from '@/components/ui/unified-card'
import { StatusBadge } from '@/components/ui/unified-badge'
import { SwarmProgress, type SwarmStep } from '@/components/swarm'
import { useAuth } from '@/lib/hooks/use-auth'
import { cn } from '@/lib/utils'

type RunStep = {
  id: string
  type: string
  created_at: string
  input?: Record<string, unknown> | null
  output?: Record<string, unknown> | null
}

type Run = {
  id: string
  runner: string
  status: string
  task_id: string | null
  started_at: string | null
  ended_at: string | null
  summary: string | null
  created_at: string
  run_steps: RunStep[]
  artifacts?: Array<{ type: string; uri: string; name?: string }> | null
}

type LedgerEvent = {
  id: string
  type: string
  source: string
  timestamp: string
  payload: Record<string, unknown> | null
}

function formatDuration(startedAt: string, endedAt: string): string {
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (seconds < 3600) return `${minutes}m ${remainingSeconds}s`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

function mapRunStepsToSwarmSteps(runSteps: RunStep[], runStatus: string): SwarmStep[] {
  const statusMap: Record<string, SwarmStep['status']> = {
    'pending': 'pending',
    'running': 'running',
    'completed': 'completed',
    'failed': 'error',
    'cancelled': 'skipped',
  }

  return runSteps.map((step, index) => {
    // Determine status based on run status and position
    let status: SwarmStep['status'] = 'pending'
    if (runStatus === 'completed') {
      status = 'completed'
    } else if (runStatus === 'failed') {
      status = index === runSteps.length - 1 ? 'error' : 'completed'
    } else if (runStatus === 'running') {
      // Assume earlier steps completed, find the current one
      const progress = Math.floor((index / runSteps.length) * 100)
      if (progress < 50) status = 'completed'
      else if (progress < 75) status = 'running'
      else status = 'pending'
    }

    return {
      id: step.id,
      type: step.type === 'tool_use' ? 'tool_use' : 
            step.type === 'file_edit' ? 'file_edit' : 'thinking',
      status,
      label: step.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: step.input ? Object.keys(step.input).join(', ') : undefined,
      startedAt: step.created_at,
    }
  })
}

function StepIcon({ type }: { type: string }) {
  if (type === 'tool_use') return <Terminal className="h-4 w-4 text-primary" />
  if (type === 'file_edit') return <FileEdit className="h-4 w-4 text-amber-500" />
  return <Zap className="h-4 w-4 text-violet-500" />
}

function JsonDetails({ data }: { data: Record<string, unknown> }) {
  const text = JSON.stringify(data, null, 2)
  const lines = text.split('\n')
  const preview = lines.slice(0, 5).join('\n')
  const hasMore = lines.length > 5

  return (
    <details className="mt-1">
      <summary className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
        input ({lines.length} lines)
      </summary>
      <pre className="mt-1 text-xs bg-muted rounded p-2 overflow-x-auto">
        {hasMore ? preview + '\n  …' : text}
      </pre>
    </details>
  )
}

export default function RunDetailPage() {
  const { user, loading } = useAuth()
  const params = useParams()
  const id = params.id as string

  const [run, setRun] = useState<Run | null>(null)
  const [ledgerEvents, setLedgerEvents] = useState<LedgerEvent[]>([])
  const [fetching, setFetching] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!user || !id) return

    async function load() {
      setFetching(true)
      try {
        const [runRes, ledgerRes] = await Promise.all([
          fetch(`/api/runs/${id}`),
          fetch(`/api/ledger?source=claude-code&limit=200`),
        ])

        if (!runRes.ok) {
          setNotFound(true)
          return
        }

        const runJson = await runRes.json()
        const ledgerJson = await ledgerRes.json()

        setRun(runJson.data ?? null)

        const allEvents: LedgerEvent[] = ledgerJson.data ?? []
        const correlated = allEvents.filter(
          e => e.payload && (e.payload as Record<string, unknown>)['run_id'] === id
        )
        setLedgerEvents(correlated)
      } catch {
        setNotFound(true)
      } finally {
        setFetching(false)
      }
    }

    load()
  }, [user, id])

  if (loading || (fetching && !notFound)) {
    return (
      <UnifiedPageShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </UnifiedPageShell>
    )
  }

  if (!user) return null

  if (notFound || !run) {
    return (
      <UnifiedPageShell>
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
          <p className="text-sm font-medium">Run not found</p>
          <Link
            href="/runs"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Runs
          </Link>
        </div>
      </UnifiedPageShell>
    )
  }

  const steps = (run.run_steps ?? []).slice().sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  const swarmSteps = mapRunStepsToSwarmSteps(steps, run.status)
  const artifacts = run.artifacts ?? []

  const duration =
    run.started_at && run.ended_at
      ? formatDuration(run.started_at, run.ended_at)
      : null

  return (
    <UnifiedPageShell>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/runs"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Runs
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground break-words">
            {run.summary ?? run.id}
          </h1>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
            <StatusBadge status={run.status} />
            <span className="font-mono bg-muted px-2 py-0.5 rounded">{run.runner}</span>
            {duration && <span>Duration: {duration}</span>}
          </div>
        </div>
      </div>

      {/* Swarm Progress - NEW! */}
      {swarmSteps.length > 0 && (
        <UnifiedCard>
          <SwarmProgress steps={swarmSteps} variant="detailed" showDurations />
        </UnifiedCard>
      )}

      {/* Timeline - Legacy view for reference */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Step Details
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
        
        {steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No steps recorded.</p>
        ) : (
          <div className="space-y-2">
            {steps.map(step => {
              const hasInput =
                step.input &&
                typeof step.input === 'object' &&
                Object.keys(step.input).length > 0

              return (
                <UnifiedCard key={step.id} animate={false} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <StepIcon type={step.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium font-mono-display">{step.type}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(step.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    {hasInput && <JsonDetails data={step.input as Record<string, unknown>} />}
                  </div>
                </UnifiedCard>
              )
            })}
          </div>
        )}
      </section>

      {/* Ledger Events */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ledger Events
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
        
        {ledgerEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No correlated ledger events found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium">Source</th>
                  <th className="pb-2 pr-4 font-medium">Timestamp</th>
                  <th className="pb-2 font-medium">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ledgerEvents.map(evt => (
                  <tr key={evt.id} className="hover:bg-muted/50 transition-colors">
                    <td className="py-2 pr-4 font-mono text-xs">{evt.type}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{evt.source}</td>
                    <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap text-xs">
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 text-muted-foreground truncate max-w-[240px] text-xs">
                      {evt.payload ? JSON.stringify(evt.payload).slice(0, 80) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Artifacts */}
      {artifacts.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Artifacts
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          
          <div className="space-y-2">
            {artifacts.map((artifact, i) => (
              <UnifiedCard key={i} animate={false} className="flex items-center gap-3">
                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
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
