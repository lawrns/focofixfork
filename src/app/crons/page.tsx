'use client'

import { useState, useEffect } from 'react'
import { Clock, Play, ToggleLeft, ToggleRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { useAuth } from '@/lib/hooks/use-auth'
import { toast } from 'sonner'

type Cron = {
  id: string
  name: string
  schedule: string
  handler: string
  enabled: boolean
  last_run_at: string | null
  next_run_at: string | null
  created_at: string
}

function CreateCronDialog({ open, onOpenChange, onCreated }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (cron: Cron) => void
}) {
  const [name, setName] = useState('')
  const [schedule, setSchedule] = useState('0 * * * *')
  const [handler, setHandler] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !schedule.trim() || !handler.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/crons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), schedule: schedule.trim(), handler: handler.trim(), enabled }),
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
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cron-schedule">Schedule (cron expression)</Label>
            <Input
              id="cron-schedule"
              placeholder="0 * * * *"
              value={schedule}
              onChange={e => setSchedule(e.target.value)}
              required
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cron-handler">Handler</Label>
            <Input
              id="cron-handler"
              placeholder="jobs/daily-report"
              value={handler}
              onChange={e => setHandler(e.target.value)}
              required
              className="font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="cron-enabled"
              type="checkbox"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="cron-enabled" className="cursor-pointer">Enabled</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function CronsPage() {
  const { user, loading } = useAuth()
  const [crons, setCrons] = useState<Cron[]>([])
  const [fetching, setFetching] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  async function load() {
    setFetching(true)
    try {
      const res = await fetch('/api/crons')
      const json = await res.json()
      setCrons(json.data ?? [])
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
      setCrons(c => c.map(x => x.id === cron.id ? { ...x, enabled: !x.enabled } : x))
      toast.success(`Cron ${!cron.enabled ? 'enabled' : 'disabled'}`)
    }
  }

  async function testRun(cron: Cron) {
    const res = await fetch(`/api/crons/${cron.id}/test-run`, { method: 'POST' })
    if (res.ok) {
      toast.success(`Test run queued for "${cron.name}"`)
    }
  }

  useEffect(() => { if (user) load() }, [user])

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--foco-teal)]" /></div>
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
        onCreated={cron => setCrons(c => [cron, ...c])}
      />

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
          {crons.map(cron => (
            <div key={cron.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium">{cron.name}</span>
                  <Badge variant="outline" className="font-mono text-[10px]">{cron.schedule}</Badge>
                  <Badge variant={cron.enabled ? 'default' : 'secondary'} className="text-[10px]">
                    {cron.enabled ? 'enabled' : 'disabled'}
                  </Badge>
                </div>
                <p className="text-[12px] text-muted-foreground mt-0.5 font-mono-display">{cron.handler}</p>
                {cron.last_run_at && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Last: {new Date(cron.last_run_at).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => testRun(cron)}>
                  <Play className="h-3.5 w-3.5 mr-1" />Test
                </Button>
                <Button variant="ghost" size="icon" onClick={() => toggle(cron)}>
                  {cron.enabled
                    ? <ToggleRight className="h-5 w-5 text-[color:var(--foco-teal)]" />
                    : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}
