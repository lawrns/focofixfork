'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Moon, RefreshCw, Square, ArrowUpRight, FileText, Workflow, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { NightAutonomyLaunchDialog } from '@/components/autonomy/night-autonomy-launch-dialog'
import { cn } from '@/lib/utils'

interface AutonomySession {
  id: string
  status: string
  objective: string | null
  window_start: string
  window_end?: string | null
  selected_agent?: { name?: string } | null
  selected_project_ids?: string[] | null
  summary?: Record<string, unknown> | null
}

interface MorningSummary {
  sessions: number
  executedActions: number
  blockedActions: number
  pendingDecisions: number
  reposTouched: number
  reportJobs?: number
  completedReports?: number
  failedReports?: number
}

interface OutputLink {
  job_id: string
  session_id: string
  project_id: string
  project_name: string
  project_slug: string
  status: string
  report_id: string | null
  artifact_id: string | null
  pipeline_run_id: string | null
  report_title: string | null
  report_url: string | null
  pipeline_url: string | null
  error: string | null
  updated_at: string
}

interface MorningPayload {
  summary: MorningSummary
  jobs_summary?: Record<string, number>
  sessions: AutonomySession[]
  latest_outputs: OutputLink[]
}

function statusTone(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
    case 'running':
      return 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
    case 'failed':
      return 'bg-red-500/15 text-red-600 dark:text-red-400'
    case 'cancelled':
      return 'bg-zinc-500/15 text-zinc-500'
    default:
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
  }
}

export function NightAutonomyCard() {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeSession, setActiveSession] = useState<AutonomySession | null>(null)
  const [morning, setMorning] = useState<MorningPayload | null>(null)

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true)
      const [sessionsRes, reportRes] = await Promise.all([
        fetch('/api/autonomy/sessions?status=running&limit=1'),
        fetch('/api/autonomy/reports/morning?sinceHours=12'),
      ])

      if (sessionsRes.ok) {
        const sessionsJson = await sessionsRes.json()
        const session = sessionsJson?.data?.sessions?.[0] as AutonomySession | undefined
        setActiveSession(session ?? null)
      }

      if (reportRes.ok) {
        const reportJson = await reportRes.json()
        setMorning((reportJson?.data ?? null) as MorningPayload | null)
      }
    } catch (error) {
      console.error('Failed to load night autonomy handoff data', error)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const stopNightMode = async () => {
    if (!activeSession) return
    try {
      setLoading(true)
      const res = await fetch('/api/autonomy/sessions/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession.id, reason: 'Manual stop from Command Center' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message ?? 'Failed to stop night mode')
      toast.success('Night co-founder mode stopped')
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to stop night mode')
    } finally {
      setLoading(false)
    }
  }

  const recentSessions = useMemo(() => (morning?.sessions ?? []).slice(0, 5), [morning?.sessions])
  const latestOutputs = useMemo(() => (morning?.latest_outputs ?? []).slice(0, 8), [morning?.latest_outputs])

  return (
    <div className="space-y-4">
      <Card className="border border-zinc-200/80 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-[color:var(--foco-teal)]" />
              <CardTitle className="text-sm">Morning Handoff</CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {activeSession ? 'Night run active' : 'Ready for tonight'}
            </Badge>
          </div>
          <CardDescription>
            Launch report-only night autonomy, then review overnight outputs, linked pipeline runs, and approval blockers by morning.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-4 text-[11px]">
            <div className="rounded-md border p-2">
              <div className="text-muted-foreground">Reports</div>
              <div className="text-sm font-semibold">{morning?.summary?.completedReports ?? 0}</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-muted-foreground">Repos touched</div>
              <div className="text-sm font-semibold">{morning?.summary?.reposTouched ?? 0}</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-muted-foreground">Blocked actions</div>
              <div className="text-sm font-semibold">{morning?.summary?.blockedActions ?? 0}</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-muted-foreground">Pending approvals</div>
              <div className="text-sm font-semibold">{morning?.summary?.pendingDecisions ?? 0}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeSession ? (
              <Button
                size="sm"
                variant="destructive"
                className="h-8 text-[12px] gap-1.5"
                onClick={stopNightMode}
                disabled={loading}
              >
                <Square className="h-3.5 w-3.5" />
                Stop Night Mode
              </Button>
            ) : (
              <NightAutonomyLaunchDialog
                onStarted={loadData}
                onStopped={loadData}
                trigger={(
                  <Button
                    size="sm"
                    className="h-8 text-[12px] gap-1.5 bg-[color:var(--foco-teal)] hover:bg-[color:var(--foco-teal)]/90"
                  >
                    <Moon className="h-3.5 w-3.5" />
                    Configure Night Mode
                  </Button>
                )}
              />
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-[12px] gap-1.5"
              onClick={() => void loadData()}
              disabled={refreshing}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {activeSession && (
            <div className="rounded-md border p-3 text-[11px] text-muted-foreground">
              Active session started {new Date(activeSession.window_start).toLocaleString()}
              {activeSession.selected_agent?.name ? ` with ${activeSession.selected_agent.name}` : ''}
              {activeSession.selected_project_ids?.length ? ` across ${activeSession.selected_project_ids.length} repos.` : '.'}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Latest Outputs</CardTitle>
            <CardDescription>Durable overnight outputs linked to their reports and pipeline runs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {latestOutputs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No overnight outputs yet.</p>
            ) : latestOutputs.map((output) => (
              <div key={output.job_id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{output.project_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{output.report_title ?? output.project_slug}</p>
                  </div>
                  <Badge className={cn('border-0 text-[10px]', statusTone(output.status))}>{output.status}</Badge>
                </div>
                {output.error && (
                  <div className="flex items-start gap-2 text-[11px] text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
                    <span>{output.error}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {output.report_url && (
                    <Button asChild size="sm" variant="outline" className="h-7 text-[11px] gap-1.5">
                      <Link href={output.report_url}>
                        <FileText className="h-3.5 w-3.5" />
                        Open report
                      </Link>
                    </Button>
                  )}
                  {output.pipeline_url && (
                    <Button asChild size="sm" variant="ghost" className="h-7 text-[11px] gap-1.5">
                      <Link href={output.pipeline_url}>
                        <Workflow className="h-3.5 w-3.5" />
                        Open pipeline run
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Recent Sessions</CardTitle>
            <CardDescription>Why the night run was launched and what it touched.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No night autonomy sessions in the last 12 hours.</p>
            ) : recentSessions.map((session) => (
              <div key={session.id} className="rounded-lg border p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{session.objective ?? 'Overnight project steering run'}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(session.window_start).toLocaleString()}
                      {session.selected_agent?.name ? ` · ${session.selected_agent.name}` : ''}
                    </p>
                  </div>
                  <Badge className={cn('border-0 text-[10px]', statusTone(session.status))}>{session.status}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {(session.selected_project_ids?.length ?? 0)} repos selected
                  {typeof session.summary?.completed_jobs === 'number' ? ` · ${String(session.summary.completed_jobs)} completed` : ''}
                  {typeof session.summary?.failed_jobs === 'number' ? ` · ${String(session.summary.failed_jobs)} failed` : ''}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Link href={`/empire/autonomy/${session.id}`} className="inline-flex items-center gap-1 hover:text-foreground">
                    Open session detail <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
