'use client'

import { useState, useEffect } from 'react'
import { Clock, Play, ToggleLeft, ToggleRight, Plus, History, Settings, Folder, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { useAuth } from '@/lib/hooks/use-auth'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

type Cron = {
  id: string
  name: string
  schedule: string
  handler: string
  enabled: boolean
  last_run_at: string | null
  next_run_at: string | null
  last_status: string | null
  policy: Record<string, unknown> | null
  project_id: string | null
  project?: {
    id: string
    name: string
    color: string
  } | null
  metadata: Record<string, unknown> | null
  created_at: string
}

type AutomationRun = {
  id: string
  status: string
  trigger_type: string
  started_at: string | null
  ended_at: string | null
  duration_ms: number | null
  error: string | null
  created_at: string
}

type Project = {
  id: string
  name: string
  color: string
}

const statusIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
  running: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  cancelled: <AlertCircle className="h-4 w-4 text-zinc-500" />,
}

const statusColors: Record<string, string> = {
  completed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  failed: 'bg-red-500/15 text-red-600 dark:text-red-400',
  running: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  pending: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  cancelled: 'bg-zinc-500/15 text-zinc-500',
}

function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return ''
  const [min, hour, dom, mon, dow] = parts

  // Common patterns
  if (expr === '* * * * *') return 'Every minute'
  if (min === '0' && hour === '*' && dom === '*' && mon === '*' && dow === '*') return 'Every hour'
  if (min === '0' && hour === '0' && dom === '*' && mon === '*' && dow === '*') return 'Daily at midnight'
  if (min === '0' && hour === '0' && dom === '*' && mon === '*' && dow === '1') return 'Every Monday at midnight'
  if (min === '0' && hour === '0' && dom === '1' && mon === '*' && dow === '*') return 'First day of every month at midnight'

  // */N patterns
  if (min.startsWith('*/') && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    return `Every ${min.slice(2)} minutes`
  }
  if (min === '0' && hour.startsWith('*/') && dom === '*' && mon === '*' && dow === '*') {
    return `Every ${hour.slice(2)} hours`
  }

  // Specific hour:minute
  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && dom === '*' && mon === '*' && dow === '*') {
    return `Daily at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`
  }

  return ''
}

function CreateCronDialog({
  open,
  onOpenChange,
  onCreated,
  projects,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (cron: Cron) => void
  projects: Project[]
}) {
  const [name, setName] = useState('')
  const [schedule, setSchedule] = useState('0 * * * *')
  const [handler, setHandler] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [projectId, setProjectId] = useState('__none__')
  const [policy, setPolicy] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !schedule.trim() || !handler.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/crons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          schedule: schedule.trim(),
          handler: handler.trim(),
          enabled,
          project_id: projectId === '__none__' ? undefined : projectId || undefined,
          policy: policy ? JSON.parse(policy) : {},
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to create cron')
        return
      }
      toast.success(`Cron "${name}" created`)
      onCreated(json.data)
      onOpenChange(false)
      setName('')
      setSchedule('0 * * * *')
      setHandler('')
      setProjectId('__none__')
      setPolicy('')
      setEnabled(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Cron</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cron-name">Name</Label>
            <Input
              id="cron-name"
              placeholder="Daily report"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cron-schedule">Schedule (cron expression)</Label>
            <Input
              id="cron-schedule"
              placeholder="0 * * * *"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              required
              className="font-mono"
            />
            {describeCron(schedule) && (
              <p className="text-xs text-muted-foreground mt-1">{describeCron(schedule)}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cron-handler">Handler</Label>
            <Input
              id="cron-handler"
              placeholder="jobs/daily-report"
              value={handler}
              onChange={(e) => setHandler(e.target.value)}
              required
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cron-project">Project (optional)</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: p.color || '#64748b' }}
                      />
                      {p.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cron-policy">Policy (JSON, optional)</Label>
            <Textarea
              id="cron-policy"
              placeholder='{"max_retries": 3}'
              value={policy}
              onChange={(e) => setPolicy(e.target.value)}
              className="font-mono text-xs"
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="cron-enabled"
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="cron-enabled" className="cursor-pointer">
              Enabled
            </Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CronRunsDialog({
  cron,
  open,
  onOpenChange,
}: {
  cron: Cron | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [runs, setRuns] = useState<AutomationRun[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!cron || !open) return
    setLoading(true)
    fetch(`/api/automation/jobs/${cron.id}/runs`)
      .then((r) => r.json())
      .then((d) => setRuns(d.data || []))
      .finally(() => setLoading(false))
  }, [cron, open])

  if (!cron) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Run History: {cron.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No runs yet. Click Test to trigger a manual run.
            </p>
          ) : (
            runs.map((run) => (
              <div
                key={run.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card"
              >
                {statusIcons[run.status] || statusIcons.pending}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge className={cn('text-[10px] border-0', statusColors[run.status] || statusColors.pending)}>
                      {run.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground capitalize">{run.trigger_type}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {run.started_at && new Date(run.started_at).toLocaleString()}
                    {run.duration_ms && ` · ${(run.duration_ms / 1000).toFixed(1)}s`}
                  </p>
                  {run.error && (
                    <p className="text-xs text-red-500 mt-1 truncate">{run.error}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function CronsPage() {
  const { user, loading } = useAuth()
  const [crons, setCrons] = useState<Cron[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [fetching, setFetching] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [runsDialogOpen, setRunsDialogOpen] = useState(false)
  const [selectedCron, setSelectedCron] = useState<Cron | null>(null)

  async function load() {
    setFetching(true)
    try {
      const [cronsRes, projectsRes] = await Promise.all([
        fetch('/api/crons'),
        fetch('/api/projects'),
      ])
      const cronsJson = await cronsRes.json()
      const projectsJson = await projectsRes.json()
      setCrons(cronsJson.data || [])
      setProjects(projectsJson.data || [])
    } finally {
      setFetching(false)
    }
  }

  async function toggle(cron: Cron) {
    const res = await fetch(`/api/crons/${cron.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !cron.enabled }),
    })
    if (res.ok) {
      setCrons((c) => c.map((x) => (x.id === cron.id ? { ...x, enabled: !x.enabled } : x)))
      toast.success(`Cron ${!cron.enabled ? 'enabled' : 'disabled'}`)
    }
  }

  async function testRun(cron: Cron) {
    const res = await fetch(`/api/crons/${cron.id}/test-run`, { method: 'POST' })
    if (res.ok) {
      toast.success(`Test run queued for "${cron.name}"`)
      // Refresh after a delay
      setTimeout(load, 2000)
    }
  }

  function openRuns(cron: Cron) {
    setSelectedCron(cron)
    setRunsDialogOpen(true)
  }

  useEffect(() => {
    if (user) load()
  }, [user])

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--foco-teal)]" />
      </div>
    )
  if (!user) return null

  return (
    <PageShell>
      <PageHeader
        title="Crons"
        subtitle="Generalized scheduler"
        primaryAction={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Cron
          </Button>
        }
      />

      <CreateCronDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(cron) => {
          setCrons((c) => [cron, ...c])
          load()
        }}
        projects={projects}
      />

      <CronRunsDialog cron={selectedCron} open={runsDialogOpen} onOpenChange={setRunsDialogOpen} />

      {crons.length === 0 && !fetching ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
          <div className="h-12 w-12 rounded-2xl bg-[color:var(--foco-teal-dim)] flex items-center justify-center">
            <Clock className="h-6 w-6 text-[color:var(--foco-teal)]" />
          </div>
          <p className="text-sm font-medium">No crons configured yet</p>
          <p className="text-xs text-muted-foreground">Scheduled jobs will appear here once configured.</p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Cron
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {crons.map((cron) => (
            <div
              key={cron.id}
              className="flex items-start gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:bg-secondary/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium">{cron.name}</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {cron.schedule}
                  </Badge>
                  <Badge variant={cron.enabled ? 'default' : 'secondary'} className="text-[10px]">
                    {cron.enabled ? 'enabled' : 'disabled'}
                  </Badge>
                  {cron.last_status && (
                    <Badge className={cn('text-[10px] border-0', statusColors[cron.last_status])}>
                      {cron.last_status}
                    </Badge>
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground mt-0.5 font-mono-display">
                  {cron.handler}
                </p>
                {describeCron(cron.schedule) && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {describeCron(cron.schedule)}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {cron.project && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Folder className="h-3 w-3" />
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: cron.project.color || '#64748b' }}
                      />
                      {cron.project.name}
                    </div>
                  )}
                  {cron.last_run_at && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <History className="h-3 w-3" />
                      Last: {new Date(cron.last_run_at).toLocaleString()}
                    </div>
                  )}
                  {cron.next_run_at && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Next: {new Date(cron.next_run_at).toLocaleString()}
                    </div>
                  )}
                  {cron.policy && Object.keys(cron.policy).length > 0 && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Settings className="h-3 w-3" />
                      Policy set
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => openRuns(cron)}>
                  <History className="h-3.5 w-3.5 mr-1" />
                  Runs
                </Button>
                <Button variant="ghost" size="sm" onClick={() => testRun(cron)}>
                  <Play className="h-3.5 w-3.5 mr-1" />
                  Test
                </Button>
                <Button variant="ghost" size="icon" onClick={() => toggle(cron)}>
                  {cron.enabled ? (
                    <ToggleRight className="h-5 w-5 text-[color:var(--foco-teal)]" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}
