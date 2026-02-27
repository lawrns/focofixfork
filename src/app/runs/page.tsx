'use client'

import { useState, useEffect } from 'react'
import { Activity, RefreshCw, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { useAuth } from '@/lib/hooks/use-auth'
import { cn } from '@/lib/utils'

// Status badge color map
const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  running: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  completed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  failed: 'bg-red-500/15 text-red-600 dark:text-red-400',
  cancelled: 'bg-zinc-500/15 text-zinc-500',
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
}

export default function RunsPage() {
  const { user, loading } = useAuth()
  const [runs, setRuns] = useState<Run[]>([])
  const [fetching, setFetching] = useState(false)
  const [filter, setFilter] = useState('all')

  async function load() {
    setFetching(true)
    try {
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const res = await fetch(`/api/runs${params}`)
      const json = await res.json()
      setRuns(json.data ?? [])
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => { if (user) load() }, [user, filter])

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--foco-teal)]" /></div>
  if (!user) return null

  return (
    <PageShell>
      <PageHeader
        title="Runs"
        subtitle="Bosun &amp; Critter execution history"
        primaryAction={
          <Button variant="outline" size="sm" onClick={load} disabled={fetching}>
            <RefreshCw className={cn('h-4 w-4 mr-2', fetching && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          {['all','pending','running','completed','failed'].map(s => (
            <TabsTrigger key={s} value={s} className="capitalize">{s}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
          <div className="h-12 w-12 rounded-2xl bg-[color:var(--foco-teal-dim)] flex items-center justify-center">
            <Activity className="h-6 w-6 text-[color:var(--foco-teal)]" />
          </div>
          <p className="text-sm font-medium">No runs yet</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Bosun and Critter executions will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map(run => (
            <div
              key={run.id}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:bg-secondary/40 transition-colors"
            >
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[color:var(--foco-teal-dim)] flex items-center justify-center">
                <Activity className="h-4 w-4 text-[color:var(--foco-teal)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium font-mono-display">{run.runner}</span>
                  <Badge className={cn('text-[10px] px-1.5 py-0 rounded-sm border-0', statusColors[run.status] ?? statusColors.cancelled)}>
                    {run.status}
                  </Badge>
                </div>
                {run.summary && <p className="text-[12px] text-muted-foreground truncate mt-0.5">{run.summary}</p>}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-shrink-0">
                <Clock className="h-3 w-3" />
                {new Date(run.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}
