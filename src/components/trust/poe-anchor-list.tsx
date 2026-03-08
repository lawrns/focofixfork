'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AgentPoeAnchor } from '@/lib/trust/types'

interface PoeAnchorListProps {
  agentId: string
}

function outcomeBadge(outcome: string) {
  switch (outcome) {
    case 'success': return <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">Success</Badge>
    case 'failure': return <Badge variant="outline" className="text-rose-500 border-rose-500/30">Failure</Badge>
    case 'partial': return <Badge variant="outline" className="text-amber-500 border-amber-500/30">Partial</Badge>
    case 'cancelled': return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>
    default: return <Badge variant="outline">{outcome}</Badge>
  }
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '-'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60_000).toFixed(1)}m`
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PoeAnchorList({ agentId }: PoeAnchorListProps) {
  const [anchors, setAnchors] = useState<AgentPoeAnchor[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const perPage = 10

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/trust/agents/${agentId}/anchors?page=${p}&per_page=${perPage}`)
      const json = await res.json()
      if (res.ok) {
        setAnchors(json.anchors ?? [])
        setTotal(json.total ?? 0)
        setPage(p)
      }
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { void load(1) }, [load])

  const hasMore = page * perPage < total

  if (!loading && anchors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No execution proofs recorded yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {anchors.map((anchor) => (
        <div key={anchor.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {outcomeBadge(anchor.outcome)}
            <div>
              <p className="text-sm font-medium">{formatTime(anchor.created_at)}</p>
              <p className="text-xs text-muted-foreground">
                Duration: {formatDuration(anchor.duration_ms)}
                {anchor.session_id ? ` · Session ${anchor.session_id.slice(0, 8)}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {anchor.score_delta != null && (
              <span className={cn(
                'font-mono font-medium',
                anchor.score_delta > 0 ? 'text-emerald-500' : anchor.score_delta < 0 ? 'text-rose-500' : 'text-muted-foreground',
              )}>
                {anchor.score_delta > 0 ? '+' : ''}{anchor.score_delta.toFixed(2)}
              </span>
            )}
            {anchor.ledger_hash && (
              <span className="font-mono text-muted-foreground" title={anchor.ledger_hash}>
                #{anchor.ledger_hash.slice(0, 8)}
              </span>
            )}
          </div>
        </div>
      ))}
      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
      <div className="flex gap-2">
        {page > 1 && (
          <Button variant="outline" size="sm" onClick={() => void load(page - 1)}>Previous</Button>
        )}
        {hasMore && (
          <Button variant="outline" size="sm" onClick={() => void load(page + 1)}>Next</Button>
        )}
      </div>
    </div>
  )
}
