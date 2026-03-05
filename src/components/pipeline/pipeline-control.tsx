'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Play, AlertCircle, OctagonX, Terminal as TerminalIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  PipelineRun,
  PipelineStatus,
  PipelineSSEEvent,
  PlanResult,
  ExecutionResult,
  ReviewReport,
} from '@/lib/pipeline/types'
import { PLANNER_MODELS, EXECUTOR_MODELS, REVIEWER_MODELS } from '@/lib/pipeline/types'
import { ReviewReport as ReviewReportComponent } from './review-report'
import { RunHistoryTable } from './run-history-table'
import { OrchestrationGraph } from './orchestration-graph'
import { TelemetryBar } from './telemetry-bar'
import { PhaseCard, type PhaseCardStatus } from './phase-card'
import { ActivityFeed, type FeedEntry } from './activity-feed'
import { TerminalSidebar } from './terminal-sidebar'
import { toast } from 'sonner'

// Complexity heuristics
const COMPLEXITY_KEYWORDS = [
  /\.(sql|migration|schema)/i,
  /auth|rls|policy|role/i,
  /api|route|endpoint/i,
  /performance|index|optimize/i,
  /src\/[a-z].+\.[tj]sx?/i,
]

function detectComplexity(task: string): boolean {
  return COMPLEXITY_KEYWORDS.filter((re) => re.test(task)).length >= 2
}

// Command triggers
const TRIGGERS: Array<{ pattern: RegExp; action: string }> = [
  { pattern: /full pass|deep review|codex pass/i, action: 'full' },
  { pattern: /plan with claude/i, action: 'plan' },
  { pattern: /execute with kimi/i, action: 'execute' },
  { pattern: /review with codex/i, action: 'review' },
  { pattern: /run pipeline/i, action: 'full' },
]

function detectTrigger(task: string): string | null {
  for (const t of TRIGGERS) {
    if (t.pattern.test(task)) return t.action
  }
  return null
}

function estimateConfidence(run: PipelineRun): number {
  if (run.review_result) return run.review_result.confidence_score
  if (run.plan_result?.estimated_complexity === 'low') return 78
  if (run.plan_result?.estimated_complexity === 'medium') return 65
  if (run.plan_result?.estimated_complexity === 'high') return 48
  return 0
}

function phaseCardStatus(
  phase: 'plan' | 'execute' | 'review',
  s: PipelineStatus,
): PhaseCardStatus {
  if (s === 'failed' || s === 'cancelled') return 'failed'
  const doneSets: Record<string, PipelineStatus[]> = {
    plan: ['executing', 'reviewing', 'complete'],
    execute: ['reviewing', 'complete'],
    review: ['complete'],
  }
  const activeMap: Record<string, PipelineStatus> = {
    plan: 'planning',
    execute: 'executing',
    review: 'reviewing',
  }
  if (doneSets[phase].includes(s)) return 'done'
  if (activeMap[phase] === s) return 'active'
  return 'idle'
}

let feedCounter = 0
function makeFeedEntry(
  phase: FeedEntry['phase'],
  message: string,
): FeedEntry {
  return { id: String(++feedCounter), ts: new Date(), phase, message }
}

// Phase-specific streaming state
interface PhaseStreamState {
  text: string
  ttftMs: number | null
  tokensIn: number
  tokensOut: number
  elapsedMs: number
  phaseStartMs: number
}

const emptyPhaseStream = (): PhaseStreamState => ({
  text: '',
  ttftMs: null,
  tokensIn: 0,
  tokensOut: 0,
  elapsedMs: 0,
  phaseStartMs: 0,
})

export function PipelineControl() {
  const [task, setTask] = useState('')
  const [plannerModel, setPlannerModel] = useState('claude-opus-4-6')
  const [executorModel, setExecutorModel] = useState('kimi-k2-standard')
  const [reviewerModel, setReviewerModel] = useState('codex-standard')
  const [autoReview, setAutoReview] = useState(false)
  const [handbookSlug, setHandbookSlug] = useState('general')

  const [currentRun, setCurrentRun] = useState<PipelineRun | null>(null)
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [runActionId, setRunActionId] = useState<string | null>(null)

  // Mission control state
  const [feedEntries, setFeedEntries] = useState<FeedEntry[]>([])
  const [serverStartMs, setServerStartMs] = useState<number | null>(null)
  const [liveMs, setLiveMs] = useState(0)

  // Per-phase streaming state
  const [planStream, setPlanStream] = useState<PhaseStreamState>(emptyPhaseStream)
  const [execStream, setExecStream] = useState<PhaseStreamState>(emptyPhaseStream)
  const [reviewStream, setReviewStream] = useState<PhaseStreamState>(emptyPhaseStream)

  // Telemetry
  const [totalTokens, setTotalTokens] = useState(0)
  const [totalCostUsd, setTotalCostUsd] = useState(0)
  const [hasLiveTokens, setHasLiveTokens] = useState(false)

  // Active phase for the graph
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null)

  // SSE abort controller
  const abortRef = useRef<AbortController | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const complexHint = task.trim().length > 20 && detectComplexity(task)
  const triggerHint = detectTrigger(task)

  // Server-anchored live timer
  useEffect(() => {
    if (!serverStartMs || pipelineStatus === 'complete' || pipelineStatus === 'failed') return
    const id = setInterval(() => setLiveMs(Date.now() - serverStartMs), 250)
    return () => clearInterval(id)
  }, [serverStartMs, pipelineStatus])

  function addFeed(phase: FeedEntry['phase'], message: string) {
    setFeedEntries((prev) => [...prev, makeFeedEntry(phase, message)])
  }

  // ── History ───────────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline?limit=20')
      if (!res.ok) return
      const json = await res.json()
      if (json.ok) setRuns(json.data?.runs ?? [])
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // ── SSE Stream Handler ──────────────────────────────────────────────────
  function handleSSEEvent(event: PipelineSSEEvent) {
    switch (event.type) {
      case 'run_start':
        setServerStartMs(event.started_at)
        break

      case 'phase_start': {
        const statusMap: Record<string, PipelineStatus> = {
          plan: 'planning',
          execute: 'executing',
          review: 'reviewing',
        }
        setPipelineStatus(statusMap[event.phase] ?? 'planning')
        const setter = event.phase === 'plan' ? setPlanStream : event.phase === 'execute' ? setExecStream : setReviewStream
        setter({ ...emptyPhaseStream(), phaseStartMs: Date.now() })
        break
      }

      case 'text_delta': {
        const setter = event.phase === 'plan' ? setPlanStream : event.phase === 'execute' ? setExecStream : setReviewStream
        setter((prev) => ({
          ...prev,
          text: prev.text + event.text,
          tokensOut: prev.tokensOut + 1, // approximate: 1 delta ≈ 1 token
        }))
        break
      }

      case 'ttft': {
        const setter = event.phase === 'plan' ? setPlanStream : event.phase === 'execute' ? setExecStream : setReviewStream
        setter((prev) => ({ ...prev, ttftMs: event.ms }))
        break
      }

      case 'usage': {
        setHasLiveTokens(true)
        const setter = event.phase === 'plan' ? setPlanStream : event.phase === 'execute' ? setExecStream : setReviewStream
        setter((prev) => ({
          ...prev,
          tokensIn: event.input_tokens,
          tokensOut: event.output_tokens,
        }))
        setTotalTokens((prev) => prev + event.input_tokens + event.output_tokens)
        setTotalCostUsd((prev) => prev + event.cost_usd)
        break
      }

      case 'phase_complete': {
        const setter = event.phase === 'plan' ? setPlanStream : event.phase === 'execute' ? setExecStream : setReviewStream
        setter((prev) => ({ ...prev, elapsedMs: event.elapsed_ms }))

        // Update the current run with the result
        if (event.result) {
          setCurrentRun((prev) => {
            if (!prev) return prev
            if (event.phase === 'plan') {
              return { ...prev, plan_result: event.result as PlanResult, status: 'executing' }
            }
            if (event.phase === 'execute') {
              return { ...prev, execution_result: event.result as ExecutionResult, status: autoReview ? 'reviewing' : 'complete' }
            }
            if (event.phase === 'review') {
              return { ...prev, review_result: event.result as ReviewReport, status: 'complete' }
            }
            return prev
          })
        }

        // Advance pipeline status
        const nextStatusMap: Record<string, PipelineStatus> = {
          plan: 'executing',
          execute: autoReview ? 'reviewing' : 'complete',
          review: 'complete',
        }
        setPipelineStatus(nextStatusMap[event.phase] ?? 'complete')
        break
      }

      case 'phase_error':
        addFeed(event.phase as FeedEntry['phase'], `Error: ${event.message}`)
        break

      case 'activity':
        addFeed(event.phase as FeedEntry['phase'], event.message)
        break

      case 'pipeline_complete':
        setPipelineStatus('complete')
        setLoading(false)
        fetchHistory()
        break

      case 'pipeline_error':
        setPipelineStatus('failed')
        setLoading(false)
        addFeed('system', `Pipeline error: ${event.message}`)
        fetchHistory()
        break
    }
  }

  // ── Start Pipeline (SSE) ────────────────────────────────────────────────
  async function startPipeline() {
    if (!task.trim()) return
    setError(null)
    setLoading(true)
    setTerminalOpen(true)

    // Reset all state
    const now = Date.now()
    setServerStartMs(now)
    setLiveMs(0)
    setFeedEntries([])
    setPlanStream(emptyPhaseStream())
    setExecStream(emptyPhaseStream())
    setReviewStream(emptyPhaseStream())
    setTotalTokens(0)
    setTotalCostUsd(0)
    setHasLiveTokens(false)
    setPipelineStatus('planning')

    // Bootstrap a local run object
    const bootstrapRun: PipelineRun = {
      id: '',
      task_description: task,
      planner_model: plannerModel,
      executor_model: executorModel,
      reviewer_model: reviewerModel,
      status: 'planning',
      plan_result: null,
      execution_result: null,
      review_result: null,
      files_changed: [],
      db_changes: false,
      handbook_ref: null,
      auto_reviewed: autoReview,
      planner_run_id: null,
      executor_run_id: null,
      reviewer_run_id: null,
      started_at: new Date(now).toISOString(),
      planner_tokens_in: 0,
      planner_tokens_out: 0,
      executor_tokens_in: 0,
      executor_tokens_out: 0,
      reviewer_tokens_in: 0,
      reviewer_tokens_out: 0,
      total_cost_usd: 0,
      planner_ttft_ms: null,
      planner_elapsed_ms: null,
      executor_elapsed_ms: null,
      reviewer_elapsed_ms: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setCurrentRun(bootstrapRun)

    try {
      const abortController = new AbortController()
      abortRef.current = abortController

      const res = await fetch('/api/pipeline/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_description: task,
          planner_model: plannerModel,
          executor_model: executorModel,
          reviewer_model: reviewerModel,
          auto_review: autoReview,
          handbook_slug: handbookSlug || 'general',
        }),
        signal: abortController.signal,
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? `Server error ${res.status}`)
      }

      if (!res.body) {
        throw new Error('No response body — streaming not supported')
      }

      // Read SSE stream
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6)) as PipelineSSEEvent

            // Capture run_id from first event
            if (event.type === 'run_start' && 'run_id' in event) {
              setCurrentRun((prev) => prev ? { ...prev, id: event.run_id } : prev)
            }

            handleSSEEvent(event)
          } catch {
            // Skip malformed SSE
          }
        }
      }

      // Stream ended
      setLoading(false)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        addFeed('system', 'Pipeline cancelled')
      } else {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(msg)
        addFeed('system', `Error: ${msg}`)
      }
      setLoading(false)

      // If SSE failed, try the old polling approach as fallback
      if (!(err instanceof Error && err.name === 'AbortError')) {
        startPipelineFallback()
      }
    }
  }

  // ── Fallback: Old polling approach ────────────────────────────────────────
  async function startPipelineFallback() {
    try {
      addFeed('system', 'Falling back to polling mode…')
      const res = await fetch('/api/pipeline/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_description: task,
          planner_model: plannerModel,
        }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error?.message ?? 'Failed to start pipeline')

      const runId = json.data.run_id
      setCurrentRun((prev) => prev ? { ...prev, id: runId, planner_run_id: json.data.planner_run_id } : prev)
      addFeed('plan', `Dispatching to ${plannerModel} (polling mode)`)
      startPolling(runId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fallback failed too')
    }
  }

  // ── Polling (fallback) ────────────────────────────────────────────────────
  const fetchRun = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/pipeline/${id}`)
        if (!res.ok) return
        const json = await res.json()
        if (json.ok && json.data?.run) {
          const run = json.data.run as PipelineRun
          setCurrentRun(run)
          setPipelineStatus(run.status)

          // Update tokens from DB
          const total = (run.planner_tokens_in + run.planner_tokens_out) +
            (run.executor_tokens_in + run.executor_tokens_out) +
            (run.reviewer_tokens_in + run.reviewer_tokens_out)
          if (total > 0) {
            setTotalTokens(total)
            setTotalCostUsd(run.total_cost_usd ?? 0)
            setHasLiveTokens(true)
          }

          if (['complete', 'failed', 'cancelled'].includes(run.status)) {
            if (pollRef.current) clearInterval(pollRef.current)
            setLoading(false)
            fetchHistory()
          }
        }
      } catch {
        // silent
      }
    },
    [fetchHistory],
  )

  function startPolling(runId: string) {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => fetchRun(runId), 3_000)
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  // ── Manual triggers (for non-auto-review) ────────────────────────────────
  async function triggerExecute() {
    if (!currentRun?.id) return
    setError(null)
    addFeed('execute', `Dispatching to ${executorModel}`)
    setPipelineStatus('executing')
    try {
      const res = await fetch('/api/pipeline/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: currentRun.id, executor_model: executorModel }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error?.message ?? 'Execute failed')
      startPolling(currentRun.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  async function triggerReview() {
    if (!currentRun?.id) return
    setError(null)
    addFeed('review', `Dispatching to ${reviewerModel}`)
    setPipelineStatus('reviewing')
    try {
      const res = await fetch('/api/pipeline/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_id: currentRun.id,
          reviewer_model: reviewerModel,
          handbook_slug: handbookSlug || 'general',
        }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error?.message ?? 'Review failed')
      startPolling(currentRun.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  function cancelPipeline() {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    setLoading(false)
    setPipelineStatus('cancelled')
    addFeed('system', 'Pipeline cancelled by user')
    if (currentRun?.id) {
      void fetch(`/api/pipeline/${currentRun.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
    }
  }

  async function stopRun(run: PipelineRun) {
    setRunActionId(run.id)
    try {
      const res = await fetch(`/api/pipeline/${run.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? 'Failed to stop run')

      setRuns((prev) => prev.map((r) => (r.id === run.id ? { ...r, status: 'cancelled' } : r)))
      if (currentRun?.id === run.id) {
        setCurrentRun((prev) => (prev ? { ...prev, status: 'cancelled' } : prev))
        setPipelineStatus('cancelled')
      }
      toast.success('Pipeline run stopped')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not stop pipeline run')
    } finally {
      setRunActionId(null)
    }
  }

  async function deleteRun(run: PipelineRun) {
    setRunActionId(run.id)
    try {
      const res = await fetch(`/api/pipeline/${run.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? 'Failed to delete run')

      setRuns((prev) => prev.filter((r) => r.id !== run.id))
      if (currentRun?.id === run.id) {
        setCurrentRun(null)
        setPipelineStatus(null)
      }
      toast.success('Pipeline run deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete pipeline run')
    } finally {
      setRunActionId(null)
    }
  }

  const isRunning = pipelineStatus != null && !['complete', 'failed', 'cancelled'].includes(pipelineStatus)
  const canExecute =
    currentRun?.status === 'executing' && !!currentRun.plan_result && !currentRun.execution_result
  const canReview =
    (currentRun?.status === 'reviewing' || currentRun?.status === 'complete') &&
    !!currentRun.execution_result &&
    !currentRun.review_result

  // Compute throughput
  function getPhaseThp(stream: PhaseStreamState): number {
    if (stream.tokensOut === 0 || stream.phaseStartMs === 0) return 0
    const elapsed = (Date.now() - stream.phaseStartMs) / 1000
    return elapsed > 0 ? stream.tokensOut / elapsed : 0
  }

  // Complexity from plan result or unknown
  const complexity = currentRun?.plan_result?.estimated_complexity ?? 'unknown'

  // Derive active phase and stream text for terminal sidebar
  const activePhase: 'plan' | 'execute' | 'review' | null =
    pipelineStatus === 'planning'  ? 'plan'    :
    pipelineStatus === 'executing' ? 'execute' :
    pipelineStatus === 'reviewing' ? 'review'  : null

  const activeStreamText =
    activePhase === 'plan'    ? planStream.text   :
    activePhase === 'execute' ? execStream.text   :
    activePhase === 'review'  ? reviewStream.text : ''

  const hasTask = task.trim().length > 0

  const modelConfigCard = (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Model Config
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Planner</Label>
            <Select value={plannerModel} onValueChange={setPlannerModel}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Claude Opus 4.6" />
              </SelectTrigger>
              <SelectContent>
                {PLANNER_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Executor</Label>
            <Select value={executorModel} onValueChange={setExecutorModel}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Kimi K2.5 Std" />
              </SelectTrigger>
              <SelectContent>
                {EXECUTOR_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Reviewer</Label>
            <Select value={reviewerModel} onValueChange={setReviewerModel}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Codex Std" />
              </SelectTrigger>
              <SelectContent>
                {REVIEWER_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Switch
            id="auto-review"
            checked={autoReview}
            onCheckedChange={setAutoReview}
            className="data-[state=checked]:bg-[color:var(--foco-teal)]"
          />
          <Label htmlFor="auto-review" className="text-xs cursor-pointer text-muted-foreground">
            Auto-review after execution
          </Label>
        </div>
      </CardContent>
    </Card>
  )

  const taskCard = (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold">
          Task
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        {complexHint && (
          <div className="flex items-center gap-2 text-amber-500 text-xs bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            This task may benefit from Codex review.
          </div>
        )}
        {triggerHint && (
          <div className="flex items-center gap-2 text-[color:var(--foco-teal)] text-xs bg-[color:var(--foco-teal-dim)] border border-[color:var(--foco-teal)]/20 rounded-md px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            Detected trigger:{' '}
            <span className="font-mono ml-1">&ldquo;{triggerHint}&rdquo; mode</span>
          </div>
        )}
        <Textarea
          placeholder="Describe the engineering task… (e.g. Add RLS policies to the quotes table and write a migration)"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={4}
          className="resize-none text-sm"
        />
        {error && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}
        {/* Run + Stop — right-aligned, natural width */}
        <div className="flex items-center justify-end gap-2">
          {isRunning && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={cancelPipeline}
            >
              <OctagonX className="h-3.5 w-3.5" />
              Stop
            </Button>
          )}
          <Button
            size="sm"
            onClick={startPipeline}
            disabled={!task.trim() || loading || isRunning}
            className="bg-[color:var(--foco-teal)] hover:bg-[color:var(--foco-teal)]/90 text-white gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            Run Pipeline
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const graph = (
    <OrchestrationGraph
      status={pipelineStatus}
      plannerModel={plannerModel}
      executorModel={executorModel}
      reviewerModel={reviewerModel}
      hasTask={hasTask}
    />
  )

  const historyCard = (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Run History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <RunHistoryTable
          runs={runs}
          onSelect={(run) => {
            setCurrentRun(run)
            setPipelineStatus(run.status)
            const total = (run.planner_tokens_in + run.planner_tokens_out) +
              (run.executor_tokens_in + run.executor_tokens_out) +
              (run.reviewer_tokens_in + run.reviewer_tokens_out)
            if (total > 0) {
              setTotalTokens(total)
              setTotalCostUsd(run.total_cost_usd ?? 0)
              setHasLiveTokens(true)
            }
          }}
          onStop={stopRun}
          onDelete={deleteRun}
          runActionId={runActionId}
        />
      </CardContent>
    </Card>
  )

  const phaseSection = (
    <>
      {/* ── Telemetry Bar ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {pipelineStatus && (
          <motion.div
            key="telemetry"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            suppressHydrationWarning
          >
            <TelemetryBar
              tokens={totalTokens}
              runtimeMs={liveMs}
              complexity={complexity}
              confidence={estimateConfidence(currentRun ?? {} as PipelineRun)}
              costUsd={totalCostUsd}
              isLive={hasLiveTokens}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Phase Cards ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {pipelineStatus && (
          <motion.div
            key="phase-cards"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
            suppressHydrationWarning
          >
            {/* Planning */}
            <PhaseCard
              phase="plan"
              model={currentRun?.planner_model ?? plannerModel}
              status={phaseCardStatus('plan', pipelineStatus)}
              context={currentRun?.plan_result ? JSON.stringify(currentRun.plan_result, null, 2) : undefined}
              elapsedMs={
                phaseCardStatus('plan', pipelineStatus) === 'active'
                  ? liveMs
                  : planStream.elapsedMs || undefined
              }
              result={currentRun?.plan_result}
              streamingText={phaseCardStatus('plan', pipelineStatus) === 'active' ? planStream.text : undefined}
              ttftMs={planStream.ttftMs}
              tokensIn={planStream.tokensIn}
              tokensOut={planStream.tokensOut}
              tokenThroughput={
                phaseCardStatus('plan', pipelineStatus) === 'active'
                  ? getPhaseThp(planStream)
                  : undefined
              }
            />

            {/* Execution */}
            <PhaseCard
              phase="execute"
              model={currentRun?.executor_model ?? executorModel}
              status={phaseCardStatus('execute', pipelineStatus)}
              context={currentRun?.execution_result ? JSON.stringify(currentRun.execution_result, null, 2) : undefined}
              elapsedMs={
                phaseCardStatus('execute', pipelineStatus) === 'active'
                  ? (execStream.phaseStartMs ? Date.now() - execStream.phaseStartMs : liveMs)
                  : execStream.elapsedMs || undefined
              }
              result={currentRun?.execution_result}
              streamingText={phaseCardStatus('execute', pipelineStatus) === 'active' ? execStream.text : undefined}
              ttftMs={execStream.ttftMs}
              tokensIn={execStream.tokensIn}
              tokensOut={execStream.tokensOut}
              tokenThroughput={
                phaseCardStatus('execute', pipelineStatus) === 'active'
                  ? getPhaseThp(execStream)
                  : undefined
              }
            >
              {canExecute && (
                <Button size="sm" variant="outline" onClick={triggerExecute}>
                  Execute with Kimi
                </Button>
              )}
            </PhaseCard>

            {/* Review */}
            <PhaseCard
              phase="review"
              model={currentRun?.reviewer_model ?? reviewerModel}
              status={phaseCardStatus('review', pipelineStatus)}
              context={currentRun?.review_result ? JSON.stringify(currentRun.review_result, null, 2) : undefined}
              elapsedMs={
                phaseCardStatus('review', pipelineStatus) === 'active'
                  ? (reviewStream.phaseStartMs ? Date.now() - reviewStream.phaseStartMs : liveMs)
                  : reviewStream.elapsedMs || undefined
              }
              result={currentRun?.review_result}
              streamingText={phaseCardStatus('review', pipelineStatus) === 'active' ? reviewStream.text : undefined}
              ttftMs={reviewStream.ttftMs}
              tokensIn={reviewStream.tokensIn}
              tokensOut={reviewStream.tokensOut}
              tokenThroughput={
                phaseCardStatus('review', pipelineStatus) === 'active'
                  ? getPhaseThp(reviewStream)
                  : undefined
              }
              handbookRef={currentRun?.handbook_ref ?? null}
            >
              {canReview && (
                <div className="flex items-center gap-3 flex-wrap">
                  <Button size="sm" variant="outline" onClick={triggerReview}>
                    Run Codex Review
                  </Button>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Handbook slug</Label>
                    <input
                      type="text"
                      value={handbookSlug}
                      onChange={(e) =>
                        setHandbookSlug(e.target.value.replace(/[^a-z0-9_-]/gi, ''))
                      }
                      placeholder="general"
                      className={cn(
                        'h-7 w-28 text-xs rounded-md border border-input bg-background px-2',
                        'focus:outline-none focus:ring-1 focus:ring-[color:var(--foco-teal)]',
                      )}
                    />
                  </div>
                  <Button size="sm" variant="ghost" className="text-muted-foreground">
                    Skip
                  </Button>
                </div>
              )}
            </PhaseCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Activity Feed (mobile fallback only) ─────────────────────────── */}
      {feedEntries.length > 0 && (
        <div className="xl:hidden">
          <ActivityFeed entries={feedEntries} />
        </div>
      )}
    </>
  )

  return (
    <div className="grid xl:grid-cols-[460px_1fr] gap-5 items-start max-w-[1400px] mx-auto">
      {/* ── Left column: config + task + graph + history ─────────────────── */}
      <div className="space-y-4">
        {modelConfigCard}
        {taskCard}
        {graph}
        {historyCard}
      </div>

      {/* ── Right column: telemetry + phases + terminal ───────────────────── */}
      <div className="space-y-4 min-w-0">
        {phaseSection}
        {/* Single terminal instance — collapsible */}
        <TerminalSidebar
          feedEntries={feedEntries}
          activePhase={activePhase}
          activeStreamText={activeStreamText}
          isRunning={isRunning}
          isOpen={terminalOpen}
          onToggle={() => setTerminalOpen((v) => !v)}
        />
      </div>
    </div>
  )
}
