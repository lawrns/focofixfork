/**
 * Dispatchers — sends tasks to agent backends with handbook context.
 */

const CLAWDBOT_BASE = process.env.CLAWDBOT_API_URL ?? 'http://127.0.0.1:18794'
const BOSUN_BASE = 'http://127.0.0.1:3001'
const CLAWDBOT_TOKEN = process.env.OPENCLAW_SERVICE_TOKEN
const BOSUN_TOKEN = process.env.BOSUN_SERVICE_TOKEN

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

/**
 * Dispatch to ClawdBot (primary agent backend).
 */
export async function dispatchToClawdBot(payload: DispatchPayload): Promise<DispatchResult> {
  try {
    const res = await fetch(`${CLAWDBOT_BASE}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CLAWDBOT_TOKEN ? { Authorization: `Bearer ${CLAWDBOT_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        agent_id: payload.agentId,
        task_id: payload.taskId,
        title: payload.title,
        description: payload.description,
        system_prompt: payload.systemPrompt,
        ...(payload.callbackUrl ? { callback_url: payload.callbackUrl } : {}),
        ...(payload.workingDirectory ? { working_directory: payload.workingDirectory } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      const errorText = await res.text()
      return { success: false, error: `ClawdBot ${res.status}: ${errorText}` }
    }

    const data = await res.json()
    const tokensIn: number | undefined = data.tokens_in ?? data.usage?.input_tokens
    const tokensOut: number | undefined = data.tokens_out ?? data.usage?.output_tokens
    const costUsd: number | undefined = data.cost_usd ?? (
      tokensIn != null && tokensOut != null
        ? computeCostUsd(data.model, tokensIn, tokensOut)
        : undefined
    )
    return { success: true, externalRunId: data.run_id ?? data.id, tokensIn, tokensOut, costUsd }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'ClawdBot unreachable' }
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
