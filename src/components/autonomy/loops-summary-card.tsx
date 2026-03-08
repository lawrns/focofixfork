'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { CofounderLoop } from '@/lib/autonomy/loop-types'
import {
  LOOP_TYPE_LABELS,
  STATUS_LABELS,
  BACKEND_LABELS,
  describeCronSchedule,
} from '@/lib/autonomy/loop-types'
import { CreateLoopDialog } from '@/components/autonomy/create-loop-dialog'

function loopTypeLabel(loopType: string): string {
  return LOOP_TYPE_LABELS[loopType] ?? loopType.replace(/_/g, ' ')
}

function scheduleLabel(loop: CofounderLoop): string {
  return describeCronSchedule(loop.schedule_kind, loop.schedule_value, loop.timezone)
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
  if (absDiffMs < 60_000) {
    label = 'just now'
  } else if (minutes < 60) {
    label = `${minutes}m`
  } else if (hours < 24) {
    label = `${hours}h ${minutes % 60}m`
  } else {
    label = `${days}d`
  }

  if (absDiffMs < 60_000) return label
  return isPast ? `${label} ago` : `in ${label}`
}

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

export interface LoopSummaryCardProps {
  workspaceId?: string | null
}

export function LoopsSummaryCard({ workspaceId }: LoopSummaryCardProps) {
  const [loops, setLoops] = useState<CofounderLoop[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patching, setPatching] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const fetchLoops = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: '20' })
      if (workspaceId) params.set('workspace_id', workspaceId)
      const res = await fetch(`/api/autonomy/loops?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error ?? 'Failed to load loops')
        return
      }
      setLoops((json?.data?.data ?? json?.data ?? []) as CofounderLoop[])
      setCount(json?.data?.count ?? json?.count ?? 0)
    } catch {
      setError('Service unreachable')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchLoops()
  }, [fetchLoops])

  async function toggleLoopStatus(loop: CofounderLoop) {
    const nextStatus = loop.status === 'active' ? 'paused' : 'active'
    setPatching(loop.id)
    try {
      await fetch(`/api/autonomy/loops/${loop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      setLoops((prev) =>
        prev.map((l) => (l.id === loop.id ? { ...l, status: nextStatus as CofounderLoop['status'] } : l)),
      )
    } catch {
      // Swallow; state stays unchanged
    } finally {
      setPatching(null)
    }
  }

  return (
    <>
      <CreateLoopDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        workspaceId={workspaceId ?? null}
        onCreated={() => void fetchLoops()}
      />
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">Recurring Tasks</CardTitle>
              {!loading && (
                <Badge variant="outline" className="text-xs font-normal">
                  {count}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2 text-[11px]"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </Button>
              <Link
                href="/recurring"
                className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24 ml-auto" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-rose-500">{error}</p>
        ) : loops.length === 0 ? (
          <div className="text-center py-4 space-y-2">
            <p className="text-sm text-muted-foreground">No active recurring tasks</p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-[11px]"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Create one
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {loops.map((loop) => (
              <div key={loop.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium truncate">{loopTypeLabel(loop.loop_type)}</p>
                    <p className="text-xs text-muted-foreground truncate">{scheduleLabel(loop)}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-[10px] font-medium ${statusBadgeClass(loop.status)}`}
                  >
                    {STATUS_LABELS[loop.status] ?? loop.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    Next run:{' '}
                    <span className="text-foreground font-medium">
                      {relativeTime(loop.next_tick_at)}
                    </span>
                  </span>
                  <span>·</span>
                  <span>
                    Runs:{' '}
                    <span className="text-foreground font-medium">{loop.iteration_count}</span>
                  </span>
                  {loop.execution_backend && (
                    <>
                      <span>·</span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-normal">
                        {BACKEND_LABELS[loop.execution_backend] ?? loop.execution_backend}
                      </Badge>
                    </>
                  )}
                </div>

                {(loop.status === 'active' || loop.status === 'paused') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[11px] px-2"
                    disabled={patching === loop.id}
                    onClick={() => toggleLoopStatus(loop)}
                  >
                    {patching === loop.id
                      ? '...'
                      : loop.status === 'active'
                      ? 'Pause'
                      : 'Resume'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </>
  )
}
