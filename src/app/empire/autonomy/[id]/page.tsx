'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, AlertTriangle, FileText, Workflow, ShieldAlert, Clock3 } from 'lucide-react'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type SessionStatusResponse = {
  session: {
    id: string
    objective: string | null
    status: string
    mode: string
    profile: string
    window_start: string
    window_end: string | null
    selected_agent?: { name?: string } | null
    selected_project_ids?: string[] | null
    summary?: Record<string, unknown> | null
  }
  stats: {
    totalEvents: number
    validations: number
    blocked: number
    requiresApproval: number
    jobs: number
    completedReports: number
  }
  outputs: Array<{
    job_id: string
    project_id: string
    project_name: string
    project_slug: string
    status: string
    report_id: string | null
    artifact_id: string | null
    pipeline_run_id: string | null
    report_url: string | null
    pipeline_url: string | null
    summary?: Record<string, unknown> | null
    error: string | null
    updated_at: string
  }>
  recentValidations: Array<{
    id: string
    action_type: string
    domain: string
    allowed: boolean
    requires_approval: boolean
    created_at: string
  }>
  recentEvents: Array<{
    id: string
    type: string
    timestamp: string
  }>
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

export default function AutonomySessionDetailPage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : ''
  const [payload, setPayload] = useState<SessionStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/autonomy/sessions/${id}/status`)
      .then((res) => res.json())
      .then((json) => setPayload((json?.data ?? null) as SessionStatusResponse | null))
      .finally(() => setLoading(false))
  }, [id])

  const session = payload?.session ?? null
  const outputs = payload?.outputs ?? []
  const blockedValidations = useMemo(() => (payload?.recentValidations ?? []).filter((item) => !item.allowed), [payload?.recentValidations])

  return (
    <PageShell className="space-y-6">
      <Link href="/empire/command?tab=morning" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" />
        Back to Morning Handoff
      </Link>

      {loading ? (
        <div className="flex items-center justify-center min-h-[260px]">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[color:var(--foco-teal)]" />
        </div>
      ) : !payload || !session ? (
        <div className="min-h-[260px] flex items-center justify-center text-sm text-muted-foreground">Autonomy session not found.</div>
      ) : (
        <>
          <PageHeader
            title={session.objective ?? 'Night autonomy handoff'}
            subtitle="Review overnight outputs, linked pipeline runs, and approval blockers."
            primaryAction={<Badge className={cn('border-0', statusTone(session.status))}>{session.status}</Badge>}
          />

          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Reports</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{payload.stats.completedReports}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Jobs</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{payload.stats.jobs}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Blocked</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{payload.stats.blocked}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Approvals</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{payload.stats.requiresApproval}</CardContent></Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Per-Project Outputs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {outputs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No project outputs yet.</p>
                ) : outputs.map((output) => (
                  <div key={output.job_id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{output.project_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{output.project_slug}</p>
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
                          <Link href={output.report_url}><FileText className="h-3.5 w-3.5" />Open report</Link>
                        </Button>
                      )}
                      {output.pipeline_url && (
                        <Button asChild size="sm" variant="ghost" className="h-7 text-[11px] gap-1.5">
                          <Link href={output.pipeline_url}><Workflow className="h-3.5 w-3.5" />Open pipeline run</Link>
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Updated {new Date(output.updated_at).toLocaleString()}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Session Context</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Started {new Date(session.window_start).toLocaleString()}</p>
                  {session.window_end && <p>Ended {new Date(session.window_end).toLocaleString()}</p>}
                  <p>Mode {session.mode} · Profile {session.profile}</p>
                  <p>Agent {session.selected_agent?.name ?? 'Unknown'}</p>
                  <p>{session.selected_project_ids?.length ?? 0} selected repos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-500" />Approval / Blockers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {blockedValidations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No blocked validations in this session.</p>
                  ) : blockedValidations.map((item) => (
                    <div key={item.id} className="rounded-md border p-2 text-sm">
                      <p className="font-medium">{item.action_type} · {item.domain}</p>
                      <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2"><Clock3 className="h-4 w-4" />Recent Events</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(payload.recentEvents ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recent events recorded.</p>
                  ) : (payload.recentEvents ?? []).map((event) => (
                    <div key={event.id} className="rounded-md border p-2 text-sm">
                      <p className="font-medium">{event.type}</p>
                      <p className="text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </PageShell>
  )
}
