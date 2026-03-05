'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Download, FileJson, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentLogViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent: {
    id: string
    name: string
    backend: string
    nativeId?: string
  } | null
}

interface RunRow {
  id: string
  runner: string
  status: string
  summary: string | null
  created_at: string
  started_at: string | null
  ended_at: string | null
}

interface HistoryRow {
  id?: string
  runId?: string
  prompt?: string
  outputPreview?: string
  error?: string
  status?: string
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

type LogStatus = 'running' | 'completed' | 'failed' | 'cancelled' | 'unknown'

interface AgentLogRow {
  id: string
  source: 'run' | 'history'
  runId?: string
  status: LogStatus
  createdAt: string
  durationMs?: number | null
  summary: string
  stdout?: string
  stderr?: string
  raw: unknown
}

const STATUS_CLASSES: Record<LogStatus, string> = {
  running: 'text-blue-600 border-blue-500/40 bg-blue-500/10',
  completed: 'text-emerald-600 border-emerald-500/40 bg-emerald-500/10',
  failed: 'text-red-600 border-red-500/40 bg-red-500/10',
  cancelled: 'text-zinc-600 border-zinc-500/40 bg-zinc-500/10',
  unknown: 'text-amber-700 border-amber-500/40 bg-amber-500/10',
}

function parseStatus(value: string | null | undefined): LogStatus {
  if (value === 'running') return 'running'
  if (value === 'completed') return 'completed'
  if (value === 'failed') return 'failed'
  if (value === 'cancelled') return 'cancelled'
  return 'unknown'
}

function matchesAgentText(value: string | null | undefined, tokens: string[]): boolean {
  if (!value) return false
  const lower = value.toLowerCase()
  return tokens.some((token) => lower.includes(token))
}

function toDurationMs(startedAt: string | null, endedAt: string | null): number | null {
  if (!startedAt || !endedAt) return null
  const start = new Date(startedAt).getTime()
  const end = new Date(endedAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null
  return end - start
}

function formatDuration(durationMs: number | null | undefined): string {
  if (!durationMs || durationMs <= 0) return 'n/a'
  if (durationMs < 1000) return `${durationMs}ms`
  const sec = Math.round(durationMs / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  const rem = sec % 60
  return `${min}m ${rem}s`
}

export function AgentLogViewer({ open, onOpenChange, agent }: AgentLogViewerProps) {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<AgentLogRow[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | LogStatus>('all')
  const [dateFilter, setDateFilter] = useState('')
  const [textFilter, setTextFilter] = useState('')

  const loadRows = useCallback(async () => {
    if (!agent) return
    setLoading(true)

    try {
      const tokens = [
        agent.id,
        agent.nativeId ?? '',
        agent.name,
        agent.backend,
      ]
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)

      const [runsRes, historyRes] = await Promise.all([
        fetch('/api/runs?limit=100'),
        fetch('/api/command-surface/history?limit=100'),
      ])

      const runsJson = await runsRes.json().catch(() => ({}))
      const historyJson = await historyRes.json().catch(() => ({}))
      const runs = (Array.isArray(runsJson?.data) ? runsJson.data : []) as RunRow[]
      const history = (Array.isArray(historyJson?.data) ? historyJson.data : []) as HistoryRow[]

      const runRows: AgentLogRow[] = runs
        .filter((run) => (
          matchesAgentText(run.runner, tokens)
          || matchesAgentText(run.summary, tokens)
        ))
        .map((run) => ({
          id: `run-${run.id}`,
          source: 'run',
          runId: run.id,
          status: parseStatus(run.status),
          createdAt: run.created_at,
          durationMs: toDurationMs(run.started_at, run.ended_at),
          summary: run.summary ?? `${run.runner} run ${run.status}`,
          stdout: run.summary ?? undefined,
          raw: run,
        }))

      const historyRows: AgentLogRow[] = history
        .filter((item) => (
          matchesAgentText(item.prompt, tokens)
          || matchesAgentText(item.outputPreview, tokens)
          || matchesAgentText(item.error, tokens)
        ))
        .map((item, index) => ({
          id: `history-${item.id ?? item.runId ?? index}`,
          source: 'history',
          runId: item.runId,
          status: parseStatus(item.status),
          createdAt: item.updatedAt ?? item.createdAt ?? new Date().toISOString(),
          summary: item.outputPreview ?? item.prompt ?? 'Execution history item',
          stdout: item.outputPreview,
          stderr: item.error,
          raw: item,
        }))

      const merged = [...runRows, ...historyRows]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 120)
      setRows(merged)
    } catch (loadError) {
      console.error(loadError)
      toast.error('Could not load execution logs for this agent')
    } finally {
      setLoading(false)
    }
  }, [agent])

  useEffect(() => {
    if (!open || !agent) return
    void loadRows()
  }, [agent, loadRows, open])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (dateFilter) {
        const createdDate = new Date(row.createdAt)
        if (!Number.isFinite(createdDate.getTime())) return false
        const created = createdDate.toISOString().slice(0, 10)
        if (created !== dateFilter) return false
      }
      if (textFilter) {
        const search = textFilter.toLowerCase()
        const blob = `${row.summary}\n${row.stdout ?? ''}\n${row.stderr ?? ''}`.toLowerCase()
        if (!blob.includes(search)) return false
      }
      return true
    })
  }, [dateFilter, rows, statusFilter, textFilter])

  const copyRow = useCallback(async (row: AgentLogRow) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(row.raw, null, 2))
      toast.success('Copied log JSON')
    } catch {
      toast.error('Clipboard write failed')
    }
  }, [])

  const downloadRows = useCallback(() => {
    if (filteredRows.length === 0 || !agent) return
    const blob = new Blob([JSON.stringify(filteredRows.map((row) => row.raw), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${agent.name.toLowerCase().replace(/\s+/g, '-')}-logs.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }, [agent, filteredRows])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <div className="h-full flex flex-col">
          <SheetHeader className="space-y-2">
            <SheetTitle className="flex items-center gap-2 flex-wrap">
              <span className="truncate">{agent?.name ?? 'Agent'} Logs</span>
              {agent?.backend && <Badge variant="outline" className="text-[10px]">{agent.backend}</Badge>}
            </SheetTitle>
          </SheetHeader>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-4">
            <Input
              value={textFilter}
              onChange={(event) => setTextFilter(event.target.value)}
              placeholder="Search stdout / stderr"
              className="md:col-span-2 h-8 text-xs"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | LogStatus)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="all">All statuses</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="unknown">Unknown</option>
            </select>
            <Input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{filteredRows.length} log items</p>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                onClick={() => void loadRows()}
                disabled={loading}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                Refresh
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                disabled={filteredRows.length === 0}
                onClick={downloadRows}
              >
                <Download className="h-3.5 w-3.5" />
                JSON
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 mt-3 rounded-md border p-2">
            <div className="space-y-2 pr-2">
              {filteredRows.length === 0 && (
                <p className="text-sm text-muted-foreground px-2 py-6 text-center">
                  No logs matched for this agent and filter combination.
                </p>
              )}

              <AnimatePresence initial={false}>
                {filteredRows.map((row) => (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="rounded-md border p-2.5 bg-background/70"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn('text-[10px] border', STATUS_CLASSES[row.status])}>
                          {row.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{row.source}</Badge>
                        {row.runId && <span className="text-[10px] text-muted-foreground font-mono">{row.runId.slice(0, 12)}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => void copyRow(row)} title="Copy raw JSON">
                          <FileJson className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs mt-1.5 whitespace-pre-wrap break-words">{row.summary}</p>

                    <div className="mt-1.5 grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
                      <p>Execution time: {formatDuration(row.durationMs)}</p>
                      <p>Exit code: {row.status === 'completed' ? '0' : row.status === 'failed' ? '1' : 'n/a'}</p>
                    </div>

                    {row.stdout && (
                      <div className="mt-2 rounded border bg-muted/20 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">stdout</p>
                        <p className="text-xs whitespace-pre-wrap break-words">{row.stdout}</p>
                      </div>
                    )}

                    {row.stderr && (
                      <div className="mt-2 rounded border border-red-500/30 bg-red-500/5 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-red-600 mb-1">stderr</p>
                        <p className="text-xs whitespace-pre-wrap break-words text-red-600">{row.stderr}</p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
