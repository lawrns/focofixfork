/**
 * POST /api/command-surface/execute
 *
 * Runs the full 3-phase hierarchy via pipeline streaming:
 *  - plan: claude-opus-4-6
 *  - execute: kimi-k2-standard (K2.5)
 *  - review: codex-standard
 *
 * Returns command-surface-compatible SSE events:
 *  text_delta / done / error
 */

import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function sseResponse(events: string[], status = 200): Response {
  return new Response(events.join(''), {
    status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

function safeString(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

async function readClawdbotError(res: Response): Promise<string | null> {
  try {
    const text = await res.text()
    if (!text) return null
    try {
      const json = JSON.parse(text) as Record<string, unknown>
      const message =
        (typeof json.error === 'string' && json.error) ||
        (typeof json.message === 'string' && json.message) ||
        (typeof json.detail === 'string' && json.detail) ||
        null
      return message ?? text.slice(0, 300)
    } catch {
      return text.slice(0, 300)
    }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) {
    return mergeAuthResponse(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), authResponse)
  }

  const body = await req.json().catch(() => null)
  const { prompt, mode } = body as { prompt?: string; mode?: string }

  if (!prompt?.trim()) {
    return mergeAuthResponse(
      NextResponse.json({ error: 'prompt is required' }, { status: 400 }),
      authResponse
    )
  }

  const encoder = new TextEncoder()

  // Fixed execution hierarchy
  const plannerModel = 'claude-opus-4-6'
  const executorModel = 'kimi-k2-standard'
  const reviewerModel = 'codex-standard'

  try {
    const pipelineRes = await fetch(`${req.nextUrl.origin}/api/pipeline/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.get('cookie') ? { cookie: req.headers.get('cookie')! } : {}),
      },
      body: JSON.stringify({
        task_description:
          `Command Surface request\n` +
          `Mode: ${mode ?? 'auto'}\n` +
          `User: ${user.email}\n\n` +
          `${prompt.trim()}`,
        planner_model: plannerModel,
        executor_model: executorModel,
        reviewer_model: reviewerModel,
        auto_review: true,
        handbook_slug: 'general',
      }),
      signal: AbortSignal.timeout(300_000),
    })

    if (!pipelineRes.ok || !pipelineRes.body) {
      const upstreamDetail = await readClawdbotError(pipelineRes)
      const fallbackText =
        pipelineRes.status >= 500
          ? `Agent service unavailable (HTTP ${pipelineRes.status}). Pipeline failed to start right now.`
          : `Agent request rejected (HTTP ${pipelineRes.status})${upstreamDetail ? `: ${upstreamDetail}` : ''}.`
      return sseResponse([
        `data: ${JSON.stringify({ type: 'text_delta', text: fallbackText })}\n\n`,
        `data: ${JSON.stringify({ type: 'done', output: fallbackText, degraded: true, status: pipelineRes.status, retryable: pipelineRes.status >= 500 })}\n\n`,
      ])
    }

    // Convert pipeline SSE protocol -> command-surface SSE protocol
    const stream = new ReadableStream({
      async start(controller) {
        const reader = pipelineRes.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let accumulated = ''
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })

            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              try {
                const event = JSON.parse(line.slice(6)) as Record<string, unknown>
                const type = typeof event.type === 'string' ? event.type : ''

                if (type === 'text_delta' && typeof event.text === 'string') {
                  accumulated += event.text
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text_delta', text: event.text })}\n\n`))
                  continue
                }

                if (type === 'activity' && typeof event.message === 'string') {
                  const phasePrefix = typeof event.phase === 'string' ? `[${event.phase}] ` : ''
                  const text = `\n${phasePrefix}${event.message}\n`
                  accumulated += text
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text_delta', text })}\n\n`))
                  continue
                }

                if (type === 'pipeline_error' || type === 'phase_error') {
                  const message = typeof event.message === 'string' ? event.message : 'Pipeline error'
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message })}\n\n`))
                  return
                }

                if (type === 'pipeline_complete') {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'done', output: accumulated, hierarchy: { plan: plannerModel, execute: executorModel, review: reviewerModel } })}\n\n`)
                  )
                  return
                }
              } catch {
                // ignore malformed pipeline event lines
              }
            }
          }

          // stream ended without explicit pipeline_complete
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done', output: accumulated, hierarchy: { plan: plannerModel, execute: executorModel, review: reviewerModel } })}\n\n`)
          )
        } catch (e) {
          // Emit an error event so the client knows something went wrong mid-stream
          const errEvent = `data: ${JSON.stringify({ type: 'error', message: String(e) })}\n\n`
          controller.enqueue(encoder.encode(errEvent))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    const message = safeString(err)
    const fallbackText =
      `Agent unavailable: ${message}. ` +
      'ClawdBot is not reachable right now. Check clawdbot-api.service.'
    return sseResponse([
      `data: ${JSON.stringify({ type: 'text_delta', text: fallbackText })}\n\n`,
      `data: ${JSON.stringify({ type: 'done', output: fallbackText, degraded: true })}\n\n`,
    ])
  }
}
