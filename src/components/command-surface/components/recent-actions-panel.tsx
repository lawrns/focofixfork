'use client'

import { Square, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function RecentActionsPanel({
  history,
  actionRunId,
  normalizeError,
  onStop,
  onDelete,
}: {
  history: Array<{ id: string; prompt: string; outputPreview?: string; status: string; runId?: string }>
  actionRunId: string | null
  normalizeError: (error: unknown) => string
  onStop: (runId: string) => void
  onDelete: (item: { id: string; runId?: string }) => void
}) {
  const router = useRouter()

  if (history.length === 0) return null

  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Recent Actions
      </p>
      <div className="space-y-2">
        {history.slice(0, 5).map((item) => (
          <div key={item.id} className="flex items-start gap-2 text-xs">
            <span className={cn(
              'mt-0.5 h-1.5 w-1.5 rounded-full',
              item.status === 'completed' && 'bg-emerald-400',
              item.status === 'failed' && 'bg-rose-400',
              item.status === 'running' && 'bg-amber-400',
            )} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-foreground/90">{item.prompt}</p>
              <p className="truncate text-muted-foreground/80">
                {normalizeError(item.outputPreview) || (item.status === 'running' ? 'Running...' : 'No output')}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {item.runId && item.status === 'running' && (
                <Button size="icon" variant="ghost" className="h-6 w-6" disabled={actionRunId === (item.runId ?? item.id)} onClick={() => onStop(item.runId!)} title="Stop run">
                  <Square className="h-3 w-3" />
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600 hover:text-red-700" disabled={actionRunId === (item.runId ?? item.id)} onClick={() => onDelete(item)} title="Delete action">
                <Trash2 className="h-3 w-3" />
              </Button>
              {item.runId && (
                <button className="text-teal-400 hover:underline" onClick={() => router.push(`/runs/${item.runId}`)}>
                  Run
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
