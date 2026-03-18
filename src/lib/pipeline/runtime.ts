import { PIPELINE_PROMPTS, dispatchPipelinePhase } from '@/lib/pipeline/dispatcher'
import { getAIRuntimeHealth } from '@/lib/ai/runtime-health'
import { findModelCatalogEntry, getModelLabel } from '@/lib/ai/model-catalog'
import type { PipelinePhase, PlanResult, ExecutionResult, ReviewReport } from '@/lib/pipeline/types'

export type PipelineRunnerKind = 'openclaw_stream' | 'openclaw_async' | 'in_app_direct'

export interface PipelineFallbackEvent {
  phase: PipelinePhase
  kind: 'runner_switch' | 'model_remap'
  from: string
  to: string
  reason: string
  at: string
}

export interface PipelinePhaseResult<T> {
  ok: boolean
  runner: PipelineRunnerKind
  requestedModel: string
  resolvedModel: string
  actualModel: string | null
  externalRunId?: string | null
  output?: string
  parsed?: T | null
  tokensIn: number
  tokensOut: number
  costUsd: number
  elapsedMs: number
  error?: string
  fallbackEvents: PipelineFallbackEvent[]
}

function nowIso() {
  return new Date().toISOString()
}

function extractJsonObject(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/)
  return match ? match[0] : null
}

export function parsePlanResult(planOutput: string): PlanResult {
  try {
    const json = extractJsonObject(planOutput)
    if (json) return JSON.parse(json) as PlanResult
  } catch {}
  return {
    summary: planOutput.slice(0, 200),
    steps: [],
    files_to_modify: [],
    risks: [],
    db_implications: [],
    validation_strategy: '',
    estimated_complexity: 'medium',
    selected_agents: [],
    agent_perspectives: [],
  }
}

export function parseExecutionResult(execOutput: string): ExecutionResult {
  try {
    const json = extractJsonObject(execOutput)
    if (json) return JSON.parse(json) as ExecutionResult
  } catch {}
  return {
    summary: execOutput.slice(0, 200),
    patches: [],
    commands_suggested: [],
    warnings: [],
    notes: '',
  }
}

export function parseReviewResult(reviewOutput: string): ReviewReport | null {
  try {
    const json = extractJsonObject(reviewOutput)
    if (json) return JSON.parse(json) as ReviewReport
  } catch {}
  return null
}

export async function chooseDirectFallbackModel(options: {
  requestedModel: string
  resolvedModel: string
  fallbackChain: string[]
}): Promise<{ model: string; remapped: boolean; reason?: string } | null> {
  const health = await getAIRuntimeHealth().catch(() => null)
  const availableModels = new Set((health?.models ?? []).filter((item) => item.available).map((item) => item.model))
  const candidates = [options.resolvedModel, options.requestedModel, ...options.fallbackChain].filter(Boolean)
  for (const model of candidates) {
    const entry = findModelCatalogEntry(model)
    if (!entry) continue
    if (entry.provider === 'clawdbot') continue
    if (health && !availableModels.has(model)) continue
    return {
      model,
      remapped: model !== options.resolvedModel,
      reason: model !== options.resolvedModel ? `Remapped from ${getModelLabel(options.resolvedModel)} to ${getModelLabel(model)} because the selected runtime was unavailable` : undefined,
    }
  }
  return null
}

export async function runPhaseDirect<T>(options: {
  phase: PipelinePhase
  requestedModel: string
  resolvedModel: string
  fallbackChain: string[]
  taskDescription: string
  context: string
}): Promise<PipelinePhaseResult<T>> {
  const start = Date.now()
  const fallbackEvents: PipelineFallbackEvent[] = []
  const direct = await chooseDirectFallbackModel({
    requestedModel: options.requestedModel,
    resolvedModel: options.resolvedModel,
    fallbackChain: options.fallbackChain,
  })

  if (!direct) {
    return {
      ok: false,
      runner: 'in_app_direct',
      requestedModel: options.requestedModel,
      resolvedModel: options.resolvedModel,
      actualModel: null,
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      elapsedMs: Date.now() - start,
      error: 'No healthy direct-runtime fallback model is available for this phase',
      fallbackEvents,
    }
  }

  fallbackEvents.push({
    phase: options.phase,
    kind: 'runner_switch',
    from: 'clawdbot',
    to: 'in_app_direct',
    reason: 'ClawdBot streaming/dispatch was unavailable',
    at: nowIso(),
  })

  if (direct.remapped) {
    fallbackEvents.push({
      phase: options.phase,
      kind: 'model_remap',
      from: options.resolvedModel,
      to: direct.model,
      reason: direct.reason ?? 'Direct fallback remap',
      at: nowIso(),
    })
  }

  const entry = findModelCatalogEntry(direct.model)
  const provider = entry?.provider
  if (!provider || provider === 'clawdbot') {
    return {
      ok: false,
      runner: 'in_app_direct',
      requestedModel: options.requestedModel,
      resolvedModel: options.resolvedModel,
      actualModel: null,
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      elapsedMs: Date.now() - start,
      error: `Direct runtime is not supported for model ${direct.model}`,
      fallbackEvents,
    }
  }

  try {
    const { AIService } = await import('@/lib/services/ai-service')
    const service = new AIService({ provider, model: direct.model, temperature: options.phase === 'execute' ? 0.2 : 0.1, max_tokens: 8000 })
    const content = await service.chatCompletion([
      { role: 'system', content: PIPELINE_PROMPTS[options.phase] },
      { role: 'user', content: `Task:\n${options.taskDescription}\n\nContext:\n${options.context}` },
    ], { temperature: options.phase === 'execute' ? 0.2 : 0.1, maxTokens: 8000 })

    return {
      ok: true,
      runner: 'in_app_direct',
      requestedModel: options.requestedModel,
      resolvedModel: options.resolvedModel,
      actualModel: direct.model,
      output: content,
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      elapsedMs: Date.now() - start,
      fallbackEvents,
    }
  } catch (error) {
    return {
      ok: false,
      runner: 'in_app_direct',
      requestedModel: options.requestedModel,
      resolvedModel: options.resolvedModel,
      actualModel: direct.model,
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      elapsedMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Direct runner failed',
      fallbackEvents,
    }
  }
}

export async function dispatchOrFallbackPhase<T>(options: {
  pipelineRunId: string
  phase: PipelinePhase
  requestedModel: string
  resolvedModel: string
  fallbackChain: string[]
  taskDescription: string
  context: string
}): Promise<PipelinePhaseResult<T>> {
  const start = Date.now()
  try {
    const externalRunId = await dispatchPipelinePhase({
      pipelineRunId: options.pipelineRunId,
      phase: options.phase,
      preferredModel: options.resolvedModel,
      taskDescription: options.taskDescription,
      context: options.context,
    })
    return {
      ok: true,
      runner: 'openclaw_async',
      requestedModel: options.requestedModel,
      resolvedModel: options.resolvedModel,
      actualModel: null,
      externalRunId,
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      elapsedMs: Date.now() - start,
      fallbackEvents: [],
    }
  } catch (error) {
    return {
      ok: false,
      runner: 'openclaw_async',
      requestedModel: options.requestedModel,
      resolvedModel: options.resolvedModel,
      actualModel: null,
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      elapsedMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'OpenClaw dispatch failed',
      fallbackEvents: [],
    }
  }
}
