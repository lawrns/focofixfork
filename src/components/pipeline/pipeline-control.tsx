'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type {
  PipelineRun,
  PipelineStatus,
  PipelineSSEEvent,
  PlanResult,
  ExecutionResult,
  ReviewReport,
} from '@/lib/pipeline/types'
import { RunHistoryTable } from './run-history-table'
import { OrchestrationGraph } from './orchestration-graph'
import type { FeedEntry } from './activity-feed'
import { TerminalSidebar } from './terminal-sidebar'
import { useCurrentWorkspace, getCurrentWorkspaceId } from '@/hooks/use-current-workspace'
import { usePlanningAgents } from '@/components/planning-agents/use-planning-agents'
import { PipelineConfigPanel } from './components/pipeline-config-panel'
import { PipelinePhaseSection } from './components/pipeline-phase-section'
import type { PhaseCardStatus } from './phase-card'
import type { PipelineFallbackEvent, PipelineRunnerKind } from '@/lib/pipeline/types'

type PhaseKey = 'plan' | 'execute' | 'review'

type PhaseRuntimeMeta = {
  requestedModel: string | null
  resolvedModel: string | null
  actualModel: string | null
  runner: PipelineRunnerKind | null
  error: string | null
  fallbacks: PipelineFallbackEvent[]
}

type WorkspacePipelineDefaults = {
  plan: string
  execute: string
  review: string
  planFallback: string[]
  executeFallback: string[]
  reviewFallback: string[]
}

const DEFAULT_PIPELINE_DEFAULTS: WorkspacePipelineDefaults = {
  plan: 'gpt-5.4-medium',
  execute: 'kimi-k2-standard',
  review: 'gpt-5.4-medium',
  planFallback: [],
  executeFallback: [],
  reviewFallback: [],
}

const EMPTY_PHASE_META = (): Record<PhaseKey, PhaseRuntimeMeta> => ({
  plan: { requestedModel: null, resolvedModel: null, actualModel: null, runner: null, error: null, fallbacks: [] },
  execute: { requestedModel: null, resolvedModel: null, actualModel: null, runner: null, error: null, fallbacks: [] },
  review: { requestedModel: null, resolvedModel: null, actualModel: null, runner: null, error: null, fallbacks: [] },
})

const COMPLEXITY_KEYWORDS = [
  /\.(sql|migration|schema)/i,
  /auth|rls|policy|role/i,
  /api|route|endpoint/i,
  /performance|index|optimize/i,
  /src\/[a-z].+\.[tj]sx?/i,
]

const TRIGGERS: Array<{ pattern: RegExp; action: string }> = [
  { pattern: /full pass|deep review|codex pass/i, action: 'full' },
  { pattern: /plan with claude/i, action: 'plan' },
  { pattern: /execute with kimi/i, action: 'execute' },
  { pattern: /review with codex/i, action: 'review' },
  { pattern: /run pipeline/i, action: 'full' },
]

function detectComplexity(task: string): boolean {
  return COMPLEXITY_KEYWORDS.filter((re) => re.test(task)).length >= 2
}

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

function phaseCardStatus(phase: PhaseKey, s: PipelineStatus | null, phaseMeta: Record<PhaseKey, PhaseRuntimeMeta>): PhaseCardStatus {
  if (phaseMeta[phase].error) return 'failed'
  if (s === 'cancelled') return 'idle'
  if (!s) return 'idle'
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
function makeFeedEntry(phase: FeedEntry['phase'], message: string): FeedEntry {
  return { id: String(++feedCounter), ts: new Date(), phase, message }
}

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
  const [workspaceDefaults, setWorkspaceDefaults] = useState<WorkspacePipelineDefaults>(DEFAULT_PIPELINE_DEFAULTS)
  const [plannerModel, setPlannerModel] = useState(DEFAULT_PIPELINE_DEFAULTS.plan)
  const [executorModel, setExecutorModel] = useState(DEFAULT_PIPELINE_DEFAULTS.execute)
  const [reviewerModel, setReviewerModel] = useState(DEFAULT_PIPELINE_DEFAULTS.review)
  const [autoReview, setAutoReview] = useState(false)
  const [handbookSlug, setHandbookSlug] = useState('general')
  const [agentPickerOpen, setAgentPickerOpen] = useState(false)
  const [currentRun, setCurrentRun] = useState<PipelineRun | null>(null)
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [runActionId, setRunActionId] = useState<string | null>(null)
  const [feedEntries, setFeedEntries] = useState<FeedEntry[]>([])
  const [serverStartMs, setServerStartMs] = useState<number | null>(null)
  const [liveMs, setLiveMs] = useState(0)
  const [planStream, setPlanStream] = useState<PhaseStreamState>(emptyPhaseStream)
  const [execStream, setExecStream] = useState<PhaseStreamState>(emptyPhaseStream)
  const [reviewStream, setReviewStream] = useState<PhaseStreamState>(emptyPhaseStream)
  const [totalTokens, setTotalTokens] = useState(0)
  const [totalCostUsd, setTotalCostUsd] = useState(0)
  const [hasLiveTokens, setHasLiveTokens] = useState(false)
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null)
  const [phaseMeta, setPhaseMeta] = useState<Record<PhaseKey, PhaseRuntimeMeta>>(EMPTY_PHASE_META)
  const [workspacePolicyLoaded, setWorkspacePolicyLoaded] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const preloadedRunIdRef = useRef<string | null>(null)

  const searchParams = useSearchParams()
  const { workspaceId } = useCurrentWorkspace()
  const {
    agents: availableAgents,
    selectedIds: selectedAgentIds,
    setSelectedIds,
    selectedAgents: selectedPlanningAgents,
    isSaving: savingAgentDefaults,
    saveDefaults,
  } = usePlanningAgents(workspaceId)

  const complexHint = task.trim().length > 20 && detectComplexity(task)
  const triggerHint = detectTrigger(task)
  const plannerOverrideActive = workspacePolicyLoaded && plannerModel !== workspaceDefaults.plan
  const executorOverrideActive = workspacePolicyLoaded && executorModel !== workspaceDefaults.execute
  const reviewerOverrideActive = workspacePolicyLoaded && reviewerModel !== workspaceDefaults.review

  useEffect(() => {
    let cancelled = false

    async function loadPolicy() {
      if (!workspaceId) return
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/ai-policy`)
        if (!response.ok) return
        const json = await response.json()
        const policy = json?.data ?? json
        const nextDefaults: WorkspacePipelineDefaults = {
          plan: policy?.model_profiles?.pipeline_plan?.model ?? DEFAULT_PIPELINE_DEFAULTS.plan,
          execute: policy?.model_profiles?.pipeline_execute?.model ?? DEFAULT_PIPELINE_DEFAULTS.execute,
          review: policy?.model_profiles?.pipeline_review?.model ?? DEFAULT_PIPELINE_DEFAULTS.review,
          planFallback: policy?.model_profiles?.pipeline_plan?.fallback_chain ?? [],
          executeFallback: policy?.model_profiles?.pipeline_execute?.fallback_chain ?? [],
          reviewFallback: policy?.model_profiles?.pipeline_review?.fallback_chain ?? [],
        }
        if (!cancelled) {
          setWorkspaceDefaults(nextDefaults)
          setPlannerModel(nextDefaults.plan)
          setExecutorModel(nextDefaults.execute)
          setReviewerModel(nextDefaults.review)
          setWorkspacePolicyLoaded(true)
        }
      } catch {
        if (!cancelled) setWorkspacePolicyLoaded(true)
      }
    }

    void loadPolicy()
    return () => {
      cancelled = true
    }
  }, [workspaceId])

  useEffect(() => {
    if (!serverStartMs || pipelineStatus === 'complete' || pipelineStatus === 'failed') return
    const id = setInterval(() => setLiveMs(Date.now() - serverStartMs), 250)
    return () => clearInterval(id)
  }, [serverStartMs, pipelineStatus])

  const addFeed = useCallback((phase: FeedEntry['phase'], message: string) => {
    setFeedEntries((prev) => [...prev, makeFeedEntry(phase, message)])
  }, [])

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
    void fetchHistory()
  }, [fetchHistory])

  const handleSSEEvent = useCallback((event: PipelineSSEEvent) => {
    switch (event.type) {
      case 'run_start':
        setServerStartMs(event.started_at)
        break
      case 'run_profile':
        setPhaseMeta((prev) => ({
          ...prev,
          plan: { ...prev.plan, requestedModel: event.requested.plan, resolvedModel: event.resolved.plan },
          execute: { ...prev.execute, requestedModel: event.requested.execute, resolvedModel: event.resolved.execute },
          review: { ...prev.review, requestedModel: event.requested.review, resolvedModel: event.resolved.review },
        }))
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
        setPhaseMeta((prev) => ({
          ...prev,
          [event.phase]: {
            ...prev[event.phase],
            error: null,
            fallbacks: [],
          },
        }))
        break
      }
      case 'phase_routing': {
        setPhaseMeta((prev) => ({
          ...prev,
          [event.phase]: {
            ...prev[event.phase],
            requestedModel: event.requested_model,
            resolvedModel: event.resolved_model,
            actualModel: event.actual_model,
            runner: event.runner,
          },
        }))
        break
      }
      case 'phase_fallback':
        setPhaseMeta((prev) => ({
          ...prev,
          [event.phase]: {
            ...prev[event.phase],
            fallbacks: [...prev[event.phase].fallbacks, event.fallback],
          },
        }))
        break
      case 'text_delta': {
        const setter = event.phase === 'plan' ? setPlanStream : event.phase === 'execute' ? setExecStream : setReviewStream
        setter((prev) => ({ ...prev, text: prev.text + event.text, tokensOut: prev.tokensOut + 1 }))
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
        setter((prev) => ({ ...prev, tokensIn: event.input_tokens, tokensOut: event.output_tokens }))
        setPhaseMeta((prev) => ({
          ...prev,
          [event.phase]: {
            ...prev[event.phase],
            actualModel: event.model,
          },
        }))
        setTotalTokens((prev) => prev + event.input_tokens + event.output_tokens)
        setTotalCostUsd((prev) => prev + event.cost_usd)
        break
      }
      case 'phase_complete': {
        const setter = event.phase === 'plan' ? setPlanStream : event.phase === 'execute' ? setExecStream : setReviewStream
        setter((prev) => ({ ...prev, elapsedMs: event.elapsed_ms }))

        if (event.result) {
          setCurrentRun((prev) => {
            if (!prev) return prev
            if (event.phase === 'plan') return { ...prev, plan_result: event.result as PlanResult, status: 'executing' }
            if (event.phase === 'execute') return { ...prev, execution_result: event.result as ExecutionResult, status: autoReview ? 'reviewing' : 'complete' }
            if (event.phase === 'review') return { ...prev, review_result: event.result as ReviewReport, status: 'complete' }
            return prev
          })
        }

        const nextStatusMap: Record<string, PipelineStatus> = {
          plan: 'executing',
          execute: autoReview ? 'reviewing' : 'complete',
          review: 'complete',
        }
        setPipelineStatus(nextStatusMap[event.phase] ?? 'complete')
        break
      }
      case 'phase_error':
        setPhaseMeta((prev) => ({
          ...prev,
          [event.phase]: {
            ...prev[event.phase],
            error: event.message,
          },
        }))
        setPipelineStatus('failed')
        addFeed(event.phase as FeedEntry['phase'], `Error: ${event.message}`)
        break
      case 'activity':
        addFeed(event.phase as FeedEntry['phase'], event.message)
        break
      case 'pipeline_complete':
        setPipelineStatus('complete')
        setLoading(false)
        void fetchHistory()
        break
      case 'pipeline_error':
        setPipelineStatus('failed')
        setLoading(false)
        addFeed('system', `Pipeline error: ${event.message}`)
        void fetchHistory()
        break
    }
  }, [addFeed, autoReview, fetchHistory])

  const fetchRun = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/pipeline/${id}`)
      if (!res.ok) return
      const json = await res.json()
      if (json.ok && json.data?.run) {
        const run = json.data.run as PipelineRun
        setCurrentRun(run)
        setPipelineStatus(run.status)
        setPhaseMeta({
          plan: {
            requestedModel: run.planner_model,
            resolvedModel: run.planner_model,
            actualModel: run.plan_model_actual ?? null,
            runner: null,
            error: run.status === 'failed' && !run.plan_result ? 'Plan failed' : null,
            fallbacks: run.fallbacks_triggered?.filter((item) => item.phase === 'plan') ?? [],
          },
          execute: {
            requestedModel: run.executor_model,
            resolvedModel: run.executor_model,
            actualModel: run.execute_model_actual ?? null,
            runner: null,
            error: run.status === 'failed' && !!run.plan_result && !run.execution_result ? 'Execution failed' : null,
            fallbacks: run.fallbacks_triggered?.filter((item) => item.phase === 'execute') ?? [],
          },
          review: {
            requestedModel: run.reviewer_model,
            resolvedModel: run.reviewer_model,
            actualModel: run.review_model_actual ?? null,
            runner: null,
            error: run.status === 'failed' && !!run.execution_result && !run.review_result ? 'Review failed' : null,
            fallbacks: run.fallbacks_triggered?.filter((item) => item.phase === 'review') ?? [],
          },
        })

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
          void fetchHistory()
        }
      }
    } catch {
      // silent
    }
  }, [fetchHistory])

  useEffect(() => {
    const runId = searchParams?.get('run_id')
    if (!runId || preloadedRunIdRef.current === runId) return
    preloadedRunIdRef.current = runId
    void fetchRun(runId)
  }, [fetchRun, searchParams])

  const startPolling = useCallback((runId: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => void fetchRun(runId), 3000)
  }, [fetchRun])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  const startPipelineFallback = useCallback(async () => {
    try {
      addFeed('system', 'Falling back to polling mode…')
      const res = await fetch('/api/pipeline/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_description: task,
          planner_model: plannerOverrideActive ? plannerModel : null,
          planner_fallback_chain: plannerOverrideActive ? workspaceDefaults.planFallback : undefined,
          selected_agents: selectedPlanningAgents,
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
  }, [addFeed, plannerModel, plannerOverrideActive, selectedPlanningAgents, startPolling, task, workspaceDefaults.planFallback])

  const startPipeline = useCallback(async () => {
    if (!task.trim()) return
    setError(null)
    setLoading(true)
    setTerminalOpen(true)

    const now = Date.now()
    setServerStartMs(now)
    setLiveMs(0)
    setFeedEntries([])
    setPlanStream(emptyPhaseStream())
    setExecStream(emptyPhaseStream())
    setReviewStream(emptyPhaseStream())
    setPhaseMeta(EMPTY_PHASE_META())
    setTotalTokens(0)
    setTotalCostUsd(0)
    setHasLiveTokens(false)
    setPipelineStatus('planning')

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
      const resolvedWorkspaceId = await getCurrentWorkspaceId()

      const res = await fetch('/api/pipeline/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_description: task,
          planner_model: plannerOverrideActive ? plannerModel : null,
          planner_fallback_chain: plannerOverrideActive ? workspaceDefaults.planFallback : undefined,
          executor_model: executorOverrideActive ? executorModel : null,
          executor_fallback_chain: executorOverrideActive ? workspaceDefaults.executeFallback : undefined,
          reviewer_model: reviewerOverrideActive ? reviewerModel : null,
          reviewer_fallback_chain: reviewerOverrideActive ? workspaceDefaults.reviewFallback : undefined,
          auto_review: autoReview,
          handbook_slug: handbookSlug || 'general',
          selected_agents: selectedPlanningAgents,
          workspace_id: resolvedWorkspaceId,
        }),
        signal: abortController.signal,
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? `Server error ${res.status}`)
      }
      if (!res.body) throw new Error('No response body — streaming not supported')

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
            if (event.type === 'run_start' && 'run_id' in event) {
              setCurrentRun((prev) => prev ? { ...prev, id: event.run_id } : prev)
            }
            handleSSEEvent(event)
          } catch {
            // ignore malformed SSE
          }
        }
      }

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

      if (!(err instanceof Error && err.name === 'AbortError')) {
        void startPipelineFallback()
      }
    }
  }, [
    addFeed,
    autoReview,
    executorModel,
    handleSSEEvent,
    handbookSlug,
    plannerModel,
    plannerOverrideActive,
    executorOverrideActive,
    reviewerOverrideActive,
    workspaceDefaults,
    reviewerModel,
    selectedPlanningAgents,
    startPipelineFallback,
    task,
  ])

  const triggerExecute = useCallback(async () => {
    if (!currentRun?.id) return
    setError(null)
    addFeed('execute', `Dispatching to ${executorModel}`)
    setPipelineStatus('executing')
    try {
      const res = await fetch('/api/pipeline/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_id: currentRun.id,
          executor_model: executorOverrideActive ? executorModel : null,
          executor_fallback_chain: executorOverrideActive ? workspaceDefaults.executeFallback : undefined,
        }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error?.message ?? 'Execute failed')
      startPolling(currentRun.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [addFeed, currentRun?.id, executorModel, executorOverrideActive, startPolling, workspaceDefaults.executeFallback])

  const triggerReview = useCallback(async () => {
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
          reviewer_model: reviewerOverrideActive ? reviewerModel : null,
          reviewer_fallback_chain: reviewerOverrideActive ? workspaceDefaults.reviewFallback : undefined,
          handbook_slug: handbookSlug || 'general',
        }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error?.message ?? 'Review failed')
      startPolling(currentRun.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [addFeed, currentRun?.id, handbookSlug, reviewerModel, reviewerOverrideActive, startPolling, workspaceDefaults.reviewFallback])

  const cancelPipeline = useCallback(() => {
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
  }, [addFeed, currentRun?.id])

  const stopRun = useCallback(async (run: PipelineRun) => {
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
  }, [currentRun?.id])

  const deleteRun = useCallback(async (run: PipelineRun) => {
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
  }, [currentRun?.id])

  const isRunning = pipelineStatus != null && !['complete', 'failed', 'cancelled'].includes(pipelineStatus)
  const canExecute = currentRun?.status === 'executing' && !!currentRun.plan_result && !currentRun.execution_result
  const canReview = (currentRun?.status === 'reviewing' || currentRun?.status === 'complete') && !!currentRun.execution_result && !currentRun.review_result

  const getPhaseThp = useCallback((stream: PhaseStreamState): number => {
    if (stream.tokensOut === 0 || stream.phaseStartMs === 0) return 0
    const elapsed = (Date.now() - stream.phaseStartMs) / 1000
    return elapsed > 0 ? stream.tokensOut / elapsed : 0
  }, [])

  const complexity = currentRun?.plan_result?.estimated_complexity ?? 'unknown'
  const activePhase: 'plan' | 'execute' | 'review' | null =
    pipelineStatus === 'planning' ? 'plan' :
    pipelineStatus === 'executing' ? 'execute' :
    pipelineStatus === 'reviewing' ? 'review' : null

  const activeStreamText =
    activePhase === 'plan' ? planStream.text :
    activePhase === 'execute' ? execStream.text :
    activePhase === 'review' ? reviewStream.text : ''

  const graph = (
    <OrchestrationGraph
      status={pipelineStatus}
      plannerModel={phaseMeta.plan.actualModel ?? phaseMeta.plan.resolvedModel ?? plannerModel}
      executorModel={phaseMeta.execute.actualModel ?? phaseMeta.execute.resolvedModel ?? executorModel}
      reviewerModel={phaseMeta.review.actualModel ?? phaseMeta.review.resolvedModel ?? reviewerModel}
      hasTask={task.trim().length > 0}
    />
  )

  const historyCard = (
    <Card>
      <CardHeader className="px-4 pb-2 pt-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Run History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <RunHistoryTable
          runs={runs}
          onSelect={(run) => {
            setCurrentRun(run)
            setPipelineStatus(run.status)
            setPhaseMeta({
              plan: {
                requestedModel: run.planner_model,
                resolvedModel: run.planner_model,
                actualModel: run.plan_model_actual ?? null,
                runner: null,
                error: run.status === 'failed' && !run.plan_result ? 'Plan failed' : null,
                fallbacks: run.fallbacks_triggered?.filter((item) => item.phase === 'plan') ?? [],
              },
              execute: {
                requestedModel: run.executor_model,
                resolvedModel: run.executor_model,
                actualModel: run.execute_model_actual ?? null,
                runner: null,
                error: run.status === 'failed' && !!run.plan_result && !run.execution_result ? 'Execution failed' : null,
                fallbacks: run.fallbacks_triggered?.filter((item) => item.phase === 'execute') ?? [],
              },
              review: {
                requestedModel: run.reviewer_model,
                resolvedModel: run.reviewer_model,
                actualModel: run.review_model_actual ?? null,
                runner: null,
                error: run.status === 'failed' && !!run.execution_result && !run.review_result ? 'Review failed' : null,
                fallbacks: run.fallbacks_triggered?.filter((item) => item.phase === 'review') ?? [],
              },
            })
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

  return (
    <div className="mx-auto grid max-w-[1400px] items-start gap-5 xl:grid-cols-[460px_1fr]">
      <div className="space-y-4">
        <PipelineConfigPanel
          plannerModel={plannerModel}
          executorModel={executorModel}
          reviewerModel={reviewerModel}
          autoReview={autoReview}
          setPlannerModel={setPlannerModel}
          setExecutorModel={setExecutorModel}
          setReviewerModel={setReviewerModel}
          setAutoReview={setAutoReview}
          task={task}
          setTask={setTask}
          complexHint={complexHint}
          triggerHint={triggerHint}
          error={error}
          isRunning={isRunning}
          loading={loading}
          startPipeline={() => void startPipeline()}
          cancelPipeline={cancelPipeline}
          agents={availableAgents}
          selectedIds={selectedAgentIds}
          selectedAgents={selectedPlanningAgents}
          agentPickerOpen={agentPickerOpen}
          setAgentPickerOpen={setAgentPickerOpen}
          setSelectedIds={setSelectedIds}
          saveWorkspaceAgentDefaults={() => void saveDefaults()}
          savingAgentDefaults={savingAgentDefaults}
          workspaceId={workspaceId}
        />
        {graph}
        {historyCard}
      </div>

      <div className="min-w-0 space-y-4">
        <PipelinePhaseSection
          pipelineStatus={pipelineStatus}
          totalTokens={totalTokens}
          liveMs={liveMs}
          complexity={complexity}
          confidence={estimateConfidence(currentRun ?? {} as PipelineRun)}
          totalCostUsd={totalCostUsd}
          hasLiveTokens={hasLiveTokens}
          currentRun={currentRun}
          plannerModel={phaseMeta.plan.actualModel ?? phaseMeta.plan.resolvedModel ?? plannerModel}
          executorModel={phaseMeta.execute.actualModel ?? phaseMeta.execute.resolvedModel ?? executorModel}
          reviewerModel={phaseMeta.review.actualModel ?? phaseMeta.review.resolvedModel ?? reviewerModel}
          planStream={planStream}
          execStream={execStream}
          reviewStream={reviewStream}
          phaseCardStatus={(phase, status) => phaseCardStatus(phase, status, phaseMeta)}
          getPhaseThp={getPhaseThp}
          canExecute={canExecute}
          triggerExecute={() => void triggerExecute()}
          canReview={canReview}
          triggerReview={() => void triggerReview()}
          handbookSlug={handbookSlug}
          setHandbookSlug={setHandbookSlug}
          feedEntries={feedEntries}
          phaseMeta={phaseMeta}
        />
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
