'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api/fetch-client'
import { normalizeApiError } from '@/lib/utils/normalize-api-error'

type CronSummary = {
  id: string
  name: string
  schedule: string
  enabled: boolean
  description?: string
  next_run_at: string | null
  last_run_at: string | null
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

function statusBadgeClass(enabled: boolean): string {
  return enabled
    ? 'text-[color:var(--foco-teal)] bg-[color:var(--foco-teal)]/10 border-[color:var(--foco-teal)]/20'
    : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
}

export interface LoopSummaryCardProps {
  workspaceId?: string | null
}

export function LoopsSummaryCard({ workspaceId: _workspaceId }: LoopSummaryCardProps) {
  const [crons, setCrons] = useState<CronSummary[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patching, setPatching] = useState<string | null>(null)

  const fetchCrons = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch('/api/crons')
      const json = await res.json()
      if (!res.ok) {
        setError(normalizeApiError(json?.error, 'Failed to load recurring jobs'))
        return
      }
      const jobs = (Array.isArray(json?.data) ? json.data : []) as CronSummary[]
      setCrons(jobs)
      setCount(typeof json?.count === 'number' ? json.count : jobs.length)
    } catch {
      setError('Service unreachable')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchCrons()
  }, [fetchCrons])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchCrons()
    }, 15_000)

    const handleFocus = () => {
      void fetchCrons()
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void fetchCrons()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchCrons])

  async function toggleCronStatus(cron: CronSummary) {
    setPatching(cron.id)
    try {
      const res = await apiFetch(`/api/crons/${cron.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !cron.enabled }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(normalizeApiError(json?.error, 'Failed to update recurring job'))
        return
      }
      setCrons((prev) =>
        prev.map((item) => (item.id === cron.id ? { ...item, enabled: !cron.enabled } : item)),
      )
    } catch {
      toast.error('Service unreachable')
    } finally {
      setPatching(null)
    }
  }

  return (
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
            <Button asChild size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px]">
              <Link href="/recurring?create=true">
                <Plus className="h-3.5 w-3.5" />
                New
              </Link>
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
        ) : crons.length === 0 ? (
          <div className="text-center py-4 space-y-2">
            <p className="text-sm text-muted-foreground">No recurring OpenClaw jobs</p>
            <Button asChild size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px]">
              <Link href="/recurring?create=true">
                <Plus className="h-3.5 w-3.5" />
                Create one
              </Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {crons.map((cron) => (
              <div key={cron.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium truncate">{cron.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{cron.schedule}</p>
                    {cron.description && (
                      <p className="text-xs text-muted-foreground truncate">{cron.description}</p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-[10px] font-medium ${statusBadgeClass(cron.enabled)}`}
                  >
                    {cron.enabled ? 'Active' : 'Paused'}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    Next run:{' '}
                    <span className="text-foreground font-medium">
                      {relativeTime(cron.next_run_at)}
                    </span>
                  </span>
                  {cron.last_run_at && (
                    <>
                      <span>·</span>
                      <span>
                        Last run:{' '}
                        <span className="text-foreground font-medium">
                          {relativeTime(cron.last_run_at)}
                        </span>
                      </span>
                    </>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[11px] px-2"
                  disabled={patching === cron.id}
                  onClick={() => toggleCronStatus(cron)}
                >
                  {patching === cron.id ? '...' : cron.enabled ? 'Pause' : 'Resume'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
