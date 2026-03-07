'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  RefreshCw,
  Plus,
  Pause,
  Play,
  Trash2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { CreateLoopDialog } from '@/components/autonomy/create-loop-dialog'
import { useAuth } from '@/lib/hooks/use-auth'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { CofounderLoop } from '@/lib/autonomy/loop-types'
import {
  LOOP_TYPE_LABELS,
  STATUS_LABELS,
  describeCronSchedule,
} from '@/lib/autonomy/loop-types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'active':
      return 'text-[color:var(--foco-teal)] bg-[color:var(--foco-teal)]/10 border-[color:var(--foco-teal)]/20'
    case 'paused':
      return 'text-amber-500 bg-amber-500/10 border-amber-500/20'
    case 'cancelled':
    case 'expired':
      return 'text-rose-500 bg-rose-500/10 border-rose-500/20'
    case 'completed':
      return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    default:
      return 'text-muted-foreground bg-muted border-border'
  }
}

function relativeTime(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  const date = new Date(isoString)
  const now = Date.now()
  const diffMs = date.getTime() - now
  const absDiffMs = Math.abs(diffMs)
  const isPast = diffMs < 0

  const minutes = Math.floor(absDiffMs / 60_000)
  const hours = Math.floor(absDiffMs / 3_600_000)
  const days = Math.floor(absDiffMs / 86_400_000)

  let label: string
  if (absDiffMs < 60_000) return 'just now'
  else if (minutes < 60) label = `${minutes}m`
  else if (hours < 24) label = `${hours}h ${minutes % 60}m`
  else label = `${days}d`

  return isPast ? `${label} ago` : `in ${label}`
}

// ── Delete Dialog ─────────────────────────────────────────────────────────────

function DeleteLoopDialog({
  loop,
  open,
  onOpenChange,
  onDeleted,
}: {
  loop: CofounderLoop | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onDeleted: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)

  async function confirm() {
    if (!loop) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/autonomy/loops/${loop.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Recurring task deleted')
        onDeleted(loop.id)
        onOpenChange(false)
      } else {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? 'Failed to delete')
      }
    } finally {
      setDeleting(false)
    }
  }

  if (!loop) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Recurring Task</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Delete{' '}
          <span className="font-medium text-foreground">
            {LOOP_TYPE_LABELS[loop.loop_type] ?? loop.loop_type}
          </span>
          ? This cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LoopsPage() {
  const { user, loading } = useAuth()
  const [loops, setLoops] = useState<CofounderLoop[]>([])
  const [fetching, setFetching] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CofounderLoop | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [patching, setPatching] = useState<string | null>(null)

  const load = useCallback(async () => {
    setFetching(true)
    try {
      const res = await fetch('/api/autonomy/loops?limit=50')
      const json = await res.json()
      setLoops((json?.data ?? []) as CofounderLoop[])
    } catch {
      // silent
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  async function toggleStatus(loop: CofounderLoop) {
    const nextStatus = loop.status === 'active' ? 'paused' : 'active'
    setPatching(loop.id)
    try {
      const res = await fetch(`/api/autonomy/loops/${loop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (res.ok) {
        setLoops((prev) =>
          prev.map((l) =>
            l.id === loop.id ? { ...l, status: nextStatus as CofounderLoop['status'] } : l,
          ),
        )
        toast.success(nextStatus === 'paused' ? 'Task paused' : 'Task resumed')
      } else {
        toast.error('Failed to update status')
      }
    } finally {
      setPatching(null)
    }
  }

  function openDelete(loop: CofounderLoop) {
    setDeleteTarget(loop)
    setDeleteOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--foco-teal)]" />
      </div>
    )
  }
  if (!user) return null

  return (
    <PageShell>
      <PageHeader
        title="Recurring Tasks"
        subtitle="Automated workflows that run on a schedule"
        primaryAction={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Recurring Task
          </Button>
        }
      />

      <CreateLoopDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        workspaceId={null}
        onCreated={() => void load()}
      />

      <DeleteLoopDialog
        loop={deleteTarget}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={(id) => setLoops((prev) => prev.filter((l) => l.id !== id))}
      />

      {loops.length === 0 && !fetching ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
          <div className="h-12 w-12 rounded-2xl bg-[color:var(--foco-teal-dim)] flex items-center justify-center">
            <RefreshCw className="h-6 w-6 text-[color:var(--foco-teal)]" />
          </div>
          <p className="text-sm font-medium">No recurring tasks yet</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Create one to automate daily briefings, PR monitoring, codebase health checks, and more.
          </p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Recurring Task
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {fetching && loops.length === 0 && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[color:var(--foco-teal)]" />
            </div>
          )}
          {loops.map((loop) => (
            <div
              key={loop.id}
              className="flex items-start gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:bg-secondary/40 transition-colors"
            >
              {/* Icon */}
              <div className="mt-0.5 h-8 w-8 rounded-lg bg-[color:var(--foco-teal-dim)] flex items-center justify-center shrink-0">
                <RefreshCw className="h-4 w-4 text-[color:var(--foco-teal)]" />
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium">
                    {LOOP_TYPE_LABELS[loop.loop_type] ?? loop.loop_type.replace(/_/g, ' ')}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-medium',
                      statusBadgeClass(loop.status),
                    )}
                  >
                    {STATUS_LABELS[loop.status] ?? loop.status}
                  </Badge>
                </div>

                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {describeCronSchedule(loop.schedule_kind, loop.schedule_value, loop.timezone)}
                </p>

                <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[11px] text-muted-foreground">
                  {loop.last_tick_at && (
                    <span>Last run: <span className="text-foreground">{relativeTime(loop.last_tick_at)}</span></span>
                  )}
                  {loop.next_tick_at && (
                    <span>Next: <span className="text-foreground">{relativeTime(loop.next_tick_at)}</span></span>
                  )}
                  <span>Runs: <span className="text-foreground font-medium">{loop.iteration_count}</span></span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {(loop.status === 'active' || loop.status === 'paused') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleStatus(loop)}
                    disabled={patching === loop.id}
                  >
                    {patching === loop.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : loop.status === 'active' ? (
                      <>
                        <Pause className="h-3.5 w-3.5 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 mr-1" />
                        Resume
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openDelete(loop)}
                  disabled={patching === loop.id}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-rose-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}
