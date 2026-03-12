/**
 * Dispatchers — sends tasks to agent backends with handbook context.
 */

const BOSUN_BASE = 'http://127.0.0.1:3001'
const BOSUN_TOKEN = process.env.BOSUN_SERVICE_TOKEN

import { dispatchOpenClawTask } from '@/lib/openclaw/client'

export interface DispatchPayload {
  taskId: string
  title: string
  description?: string | null
  projectContext: string
  featureContext: string
  systemPrompt: string
  agentId: string
  callbackUrl?: string
  workingDirectory?: string | null
  preferredModel?: string | null
  runtimeProfile?: Record<string, unknown>
}

export interface DispatchResult {
  success: boolean
  externalRunId?: string
  error?: string
  tokensIn?: number
  tokensOut?: number
  costUsd?: number
}

const MODEL_COST_PER_MTOK: Record<string, { in: number; out: number }> = {
  'claude-opus': { in: 15, out: 75 },
  'claude-sonnet': { in: 3, out: 15 },
  'claude-haiku': { in: 0.25, out: 1.25 },
}

function computeCostUsd(model: string | undefined, tokensIn: number, tokensOut: number): number | undefined {
  if (!model) return undefined
  const m = model.toLowerCase()
  const key = Object.keys(MODEL_COST_PER_MTOK).find(k => m.includes(k))
  if (!key) return undefined
  const rates = MODEL_COST_PER_MTOK[key]
  return (tokensIn * rates.in + tokensOut * rates.out) / 1_000_000
}

export async function dispatchToClawdBot(payload: DispatchPayload): Promise<DispatchResult> {
  try {
    const taskBody = [
      payload.systemPrompt?.trim() ? `System instructions:\n${payload.systemPrompt.trim()}` : null,
      payload.description?.trim() ? `Task details:\n${payload.description.trim()}` : null,
      payload.projectContext?.trim() ? `Project context:\n${payload.projectContext.trim()}` : null,
      payload.featureContext?.trim() ? `Feature context:\n${payload.featureContext.trim()}` : null,
    ].filter((part): part is string => Boolean(part)).join('\n\n')

    const data = await dispatchOpenClawTask({
      agentId: payload.agentId,
      task: taskBody || payload.title,
      taskId: payload.taskId,
      title: payload.title,
      callbackUrl: payload.callbackUrl ?? undefined,
      preferredModel: payload.preferredModel ?? undefined,
      context: {
        source: 'delegation_dispatcher',
        title: payload.title,
        working_directory: payload.workingDirectory ?? null,
        runtime_profile: payload.runtimeProfile ?? null,
        legacy_backend: 'dispatchToClawdBot',
      },
      correlationId: payload.taskId,
    })

    return {
      success: true,
      externalRunId: data.runId ?? data.correlationId,
      costUsd: undefined,
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'OpenClaw unreachable' }
  }
}

/**
 * Dispatch to Bosun (scheduler backend).
 */
export async function dispatchToBosun(payload: DispatchPayload): Promise<DispatchResult> {
  try {
    const res = await fetch(`${BOSUN_BASE}/api/kanban/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(BOSUN_TOKEN ? { Authorization: `Bearer ${BOSUN_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        external_id: payload.taskId,
        title: payload.title,
        description: `${payload.systemPrompt}\n\n${payload.description ?? ''}`.trim(),
        agent_id: payload.agentId,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      const errorText = await res.text()
      return { success: false, error: `Bosun ${res.status}: ${errorText}` }
    }

    const data = await res.json()
    return { success: true, externalRunId: data.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Bosun unreachable' }
  }
}

/**
 * Build the handbook-injected system prompt for a task.
 */
export function buildSystemPrompt(
  projectName: string,
  projectContext: string,
  featureContext: string,
  taskTitle: string,
  taskDescription?: string | null
): string {
  const parts: string[] = []

  if (projectContext) {
    parts.push(`# Project: ${projectName}\n\n${projectContext}`)
  }

  if (featureContext) {
    parts.push(`# Feature Context\n\n${featureContext}`)
  }

  parts.push(`# Task\n\n**${taskTitle}**\n\n${taskDescription ?? ''}`.trim())

  return parts.join('\n\n---\n\n')
}
