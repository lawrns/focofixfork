'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Clock,
  Play,
  ToggleLeft,
  ToggleRight,
  Plus,
  History,
  Lock,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Radio,
  Globe,
  FileText,
  Mail,
  Users,
  Activity,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { useAuth } from '@/lib/hooks/use-auth'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

type Cron = {
  id: string
  name: string
  schedule: string
  handler: string
  description?: string
  enabled: boolean
  native: boolean
  last_run_at: string | null
  next_run_at: string | null
  last_status: string | null
  created_at: string
}

type CronRun = {
  id: string
  timestamp: string | null
  status: string
  // Hourly
  gateway_ok?: boolean
  file_activity_count?: number
  recent_reports?: string[]
  cron_count?: number | null
  // Daily intel
  date?: string
  repo_count?: number
  top_repo?: string | null
  top_score?: number | null
  email_sent?: boolean
  summary?: string
  // GSID
  agents_total?: number
  agents_succeeded?: number
  agents_timed_out?: number
  brief_saved?: string | null
  emails_sent?: number
  // User crons
  output?: string | null
}

type HealthData = {
  last_checkin: string | null
  cron_ran_today: boolean
}

// ── Status helpers ───────────────────────────────────────────────────────────

const statusIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  failed: <XCircle className="h-4 w-4 text-rose-500" />,
  running: <Loader2 className="h-4 w-4 text-[color:var(--foco-teal)] animate-spin" />,
  pending: <Clock className="h-4 w-4 text-amber-500" />,
  unknown: <AlertTriangle className="h-4 w-4 text-zinc-500" />,
}

const statusColors: Record<string, string> = {
  completed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  failed: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  running: 'bg-[color:var(--foco-teal-dim)] text-[color:var(--foco-teal)]',
  pending: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  unknown: 'bg-zinc-500/15 text-zinc-500',
}

function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return ''
  const [min, hour, dom, mon, dow] = parts

  if (expr === '* * * * *') return 'Every minute'
  if (min === '0' && hour === '*' && dom === '*' && mon === '*' && dow === '*') return 'Every hour'
  if (min === '0' && hour === '0' && dom === '*' && mon === '*' && dow === '*') return 'Daily at midnight'
  if (min === '0' && hour === '0' && dom === '*' && mon === '*' && dow === '1') return 'Every Monday at midnight'
  if (min === '0' && hour === '0' && dom === '1' && mon === '*' && dow === '*') return 'First day of month'
  if (min.startsWith('*/') && hour === '*' && dom === '*' && mon === '*' && dow === '*') return `Every ${min.slice(2)} minutes`
  if (min === '0' && hour.startsWith('*/') && dom === '*' && mon === '*' && dow === '*') return `Every ${hour.slice(2)} hours`
  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && dom === '*' && mon === '*' && dow === '*') {
    return `Daily at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`
  }
  return ''
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ── ClawdBot Status Bar ──────────────────────────────────────────────────────

function StatusBar({ health }: { health: HealthData | null }) {
  if (!health) return null

  return (
    <div className="flex gap-3 mb-4">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-xs">
        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Daily Intel</span>
        {health.cron_ran_today ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-amber-500" />
        )}
        <span className={health.cron_ran_today ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
          {health.cron_ran_today ? 'Ran today' : 'Pending'}
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-xs">
        <Radio className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Last Check-in</span>
        <span className="text-foreground">{relativeTime(health.last_checkin)}</span>
      </div>
    </div>
  )
}

// ── Create Cron Dialog ───────────────────────────────────────────────────────

function CreateCronDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (cron: Cron) => void
}) {
  const [name, setName] = useState('')
  const [schedule, setSchedule] = useState('0 * * * *')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !schedule.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/crons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          schedule: schedule.trim(),
          description: description.trim() || undefined,
          enabled: true,
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
      setDescription('')
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
              placeholder="Weekly digest"
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
            <Label htmlFor="cron-desc">Description (optional)</Label>
            <Textarea
              id="cron-desc"
              placeholder="What does this cron do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
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

// ── Run History Dialog ───────────────────────────────────────────────────────

function HourlyRunCard({ run }: { run: CronRun }) {
  return (
    <div className="px-3 py-2.5 rounded-lg border border-border bg-card space-y-1.5">
      <div className="flex items-center gap-2">
        {statusIcons[run.status] || statusIcons.completed}
        <span className="text-xs font-medium">
          {run.timestamp ? new Date(run.timestamp).toLocaleString() : 'Unknown'}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          {run.gateway_ok ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          ) : (
            <XCircle className="h-3 w-3 text-rose-500" />
          )}
          Gateway {run.gateway_ok ? 'OK' : 'Down'}
        </span>
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {run.file_activity_count ?? 0} files modified
        </span>
        {run.cron_count != null && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {run.cron_count} crons active
          </span>
        )}
      </div>
      {run.recent_reports && run.recent_reports.length > 0 && (
        <div className="text-[11px] text-muted-foreground">
          Reports: {run.recent_reports.map(r => r.split('/').pop()).join(', ')}
        </div>
      )}
    </div>
  )
}

function DailyIntelRunCard({ run }: { run: CronRun }) {
  return (
    <div className="px-3 py-2.5 rounded-lg border border-border bg-card space-y-1.5">
      <div className="flex items-center gap-2">
        {statusIcons[run.status] || statusIcons.completed}
        <span className="text-xs font-medium">{run.date ?? 'Unknown date'}</span>
        {run.email_sent && (
          <Badge className="text-[10px] border-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Mail className="h-3 w-3 mr-0.5" /> Sent
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Globe className="h-3 w-3" />
          {run.repo_count ?? 0} repos scanned
        </span>
        {run.top_repo && (
          <span className="flex items-center gap-1">
            Top: <span className="font-medium text-foreground">{run.top_repo}</span>
            {run.top_score != null && ` (${run.top_score}/10)`}
          </span>
        )}
      </div>
      {run.summary && (
        <p className="text-[11px] text-muted-foreground line-clamp-2">{run.summary}</p>
      )}
    </div>
  )
}

function GsidRunCard({ run }: { run: CronRun }) {
  const successRate = run.agents_total
    ? Math.round((run.agents_succeeded! / run.agents_total) * 100)
    : 0

  return (
    <div className="px-3 py-2.5 rounded-lg border border-border bg-card space-y-1.5">
      <div className="flex items-center gap-2">
        {statusIcons[run.status] || statusIcons.completed}
        <span className="text-xs font-medium">
          {run.timestamp ? new Date(run.timestamp).toLocaleString() : 'Unknown'}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {run.agents_succeeded ?? 0}/{run.agents_total ?? 0} agents
          <span className={cn(
            'font-medium',
            successRate >= 70 ? 'text-emerald-500' : successRate >= 40 ? 'text-amber-500' : 'text-rose-500'
          )}>
            ({successRate}%)
          </span>
        </span>
        {(run.agents_timed_out ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-amber-500">
            <AlertTriangle className="h-3 w-3" />
            {run.agents_timed_out} timed out
          </span>
        )}
        {(run.emails_sent ?? 0) > 0 && (
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {run.emails_sent} emails
          </span>
        )}
      </div>
      {run.brief_saved && (
        <p className="text-[11px] text-muted-foreground font-mono truncate">{run.brief_saved}</p>
      )}
    </div>
  )
}

function UserCronRunCard({ run }: { run: CronRun }) {
  return (
    <div className="px-3 py-2.5 rounded-lg border border-border bg-card space-y-1.5">
      <div className="flex items-center gap-2">
        {statusIcons[run.status] || statusIcons.pending}
        <span className="text-xs font-medium">
          {run.timestamp ? new Date(run.timestamp).toLocaleString() : 'Unknown'}
        </span>
        <Badge className={cn('text-[10px] border-0', statusColors[run.status] || statusColors.pending)}>
          {run.status}
        </Badge>
      </div>
      {run.output && (
        <p className="text-[11px] text-muted-foreground line-clamp-3 font-mono">{run.output}</p>
      )}
    </div>
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
  const [runs, setRuns] = useState<CronRun[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!cron || !open) return
    setLoading(true)
    fetch(`/api/crons/${cron.id}/runs?limit=20`)
      .then((r) => r.json())
      .then((d) => setRuns(d.data || []))
      .catch(() => setRuns([]))
      .finally(() => setLoading(false))
  }, [cron, open])

  if (!cron) return null

  const renderRun = (run: CronRun) => {
    switch (cron.id) {
      case 'hourly-checkin':
        return <HourlyRunCard key={run.id} run={run} />
      case 'daily-intel':
        return <DailyIntelRunCard key={run.id} run={run} />
      case 'gsid-run':
        return <GsidRunCard key={run.id} run={run} />
      default:
        return <UserCronRunCard key={run.id} run={run} />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Run History: {cron.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[color:var(--foco-teal)]" />
            </div>
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No runs recorded yet.
            </p>
          ) : (
            runs.map(renderRun)
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Delete Confirmation Dialog ───────────────────────────────────────────────

function DeleteCronDialog({
  cron,
  open,
  onOpenChange,
  onDeleted,
}: {
  cron: Cron | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onDeleted: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)

  async function confirm() {
    if (!cron) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/crons/${cron.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(`Cron "${cron.name}" deleted`)
        onDeleted(cron.id)
        onOpenChange(false)
      } else {
        const json = await res.json()
        toast.error(json.error ?? 'Failed to delete')
      }
    } finally {
      setDeleting(false)
    }
  }

  if (!cron) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Cron</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Delete <span className="font-medium text-foreground">{cron.name}</span>? This will also remove the crontab entry.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={confirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function CronsPage() {
  const { user, loading } = useAuth()
  const [crons, setCrons] = useState<Cron[]>([])
  const [health, setHealth] = useState<HealthData | null>(null)
  const [fetching, setFetching] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [runsDialogOpen, setRunsDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCron, setSelectedCron] = useState<Cron | null>(null)

  const load = useCallback(async () => {
    setFetching(true)
    try {
      const [cronsRes, healthRes] = await Promise.all([
        fetch('/api/crons'),
        fetch('/api/empire/health').catch(() => null),
      ])
      const cronsJson = await cronsRes.json()
      setCrons(cronsJson.data || [])

      if (healthRes?.ok) {
        const healthJson = await healthRes.json()
        setHealth({
          last_checkin: healthJson.clawdbot?.last_checkin ?? null,
          cron_ran_today: healthJson.clawdbot?.cron_ran_today ?? false,
        })
      }
    } finally {
      setFetching(false)
    }
  }, [])

  async function toggle(cron: Cron) {
    if (cron.native) return // Prevent toggling native crons from UI
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
      setTimeout(load, 2000)
    } else {
      toast.error('Failed to queue test run')
    }
  }

  function openRuns(cron: Cron) {
    setSelectedCron(cron)
    setRunsDialogOpen(true)
  }

  function openDelete(cron: Cron) {
    setSelectedCron(cron)
    setDeleteDialogOpen(true)
  }

  useEffect(() => {
    if (user) load()
  }, [user, load])

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
        subtitle="ClawdBot scheduled activity"
        primaryAction={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Cron
          </Button>
        }
      />

      <StatusBar health={health} />

      <CreateCronDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(cron) => {
          setCrons((c) => [cron, ...c])
          load()
        }}
      />

      <CronRunsDialog cron={selectedCron} open={runsDialogOpen} onOpenChange={setRunsDialogOpen} />

      <DeleteCronDialog
        cron={selectedCron}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={(id) => setCrons((c) => c.filter((x) => x.id !== id))}
      />

      {crons.length === 0 && !fetching ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
          <div className="h-12 w-12 rounded-2xl bg-[color:var(--foco-teal-dim)] flex items-center justify-center">
            <Clock className="h-6 w-6 text-[color:var(--foco-teal)]" />
          </div>
          <p className="text-sm font-medium">No crons configured yet</p>
          <p className="text-xs text-muted-foreground">
            Scheduled jobs will appear here once ClawdBot is running.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Cron
          </Button>
        </div>
      ) : (
        <TooltipProvider>
          <div className="space-y-2">
            {crons.map((cron) => (
              <div
                key={cron.id}
                className="flex items-start gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:bg-secondary/40 transition-colors"
              >
                {/* Status indicator */}
                <div className="mt-0.5">
                  {statusIcons[cron.last_status ?? 'unknown'] || statusIcons.unknown}
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium">{cron.name}</span>
                    {cron.native && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Managed by ClawdBot — edit crontab directly</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {cron.schedule}
                    </Badge>
                    {describeCron(cron.schedule) && (
                      <span className="text-[11px] text-muted-foreground">
                        {describeCron(cron.schedule)}
                      </span>
                    )}
                    {cron.last_status && (
                      <Badge className={cn('text-[10px] border-0', statusColors[cron.last_status] || statusColors.unknown)}>
                        {cron.last_status}
                      </Badge>
                    )}
                    {!cron.enabled && (
                      <Badge variant="secondary" className="text-[10px]">
                        disabled
                      </Badge>
                    )}
                  </div>

                  {cron.description && (
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {cron.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[11px] text-muted-foreground">
                    <span className="font-mono">{cron.handler}</span>
                    {cron.last_run_at && (
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {relativeTime(cron.last_run_at)}
                      </span>
                    )}
                    {cron.next_run_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Next: {new Date(cron.next_run_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openRuns(cron)}>
                    <History className="h-3.5 w-3.5 mr-1" />
                    Runs
                  </Button>
                  {!cron.native && (
                    <Button variant="ghost" size="sm" onClick={() => testRun(cron)}>
                      <Play className="h-3.5 w-3.5 mr-1" />
                      Test
                    </Button>
                  )}
                  {cron.native ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="h-8 w-8 flex items-center justify-center">
                          <Lock className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Native cron — managed by ClawdBot</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => toggle(cron)}>
                        {cron.enabled ? (
                          <ToggleRight className="h-5 w-5 text-[color:var(--foco-teal)]" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDelete(cron)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-rose-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TooltipProvider>
      )}
    </PageShell>
  )
}
