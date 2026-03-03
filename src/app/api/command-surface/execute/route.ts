/**
 * POST /api/command-surface/execute
 *
 * Accepts a user prompt and relays it to ClawdBot's streaming endpoint.
 * Returns an SSE stream of text_delta / done / error events.
 *
 * If ClawdBot is unavailable, returns a 503 JSON error.
 */

import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const CLAWDBOT_BASE = process.env.CLAWDBOT_API_URL ?? 'http://127.0.0.1:18794'
const CLAWDBOT_TOKEN = process.env.OPENCLAW_SERVICE_TOKEN ?? ''

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await req.json()
  const { prompt, mode } = body as { prompt?: string; mode?: string }

  if (!prompt?.trim()) {
    return new Response(JSON.stringify({ error: 'prompt is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()

  // Map command surface mode to a ClawdBot model hint
  const modelHint =
    mode === 'cto' ? 'kimi-k2-max' :
    mode === 'coo' ? 'kimi-k2-standard' :
    'kimi-k2-standard'

  try {
    const clawdbotRes = await fetch(`${CLAWDBOT_BASE}/tasks/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CLAWDBOT_TOKEN ? { Authorization: `Bearer ${CLAWDBOT_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        title: prompt.trim(),
        description: `Command Surface request.\nMode: ${mode ?? 'auto'}\nUser: ${user.email}\n\nRespond directly and helpfully to the user's request. Be concise but thorough.`,
        preferred_model: modelHint,
      }),
      // 90 second timeout — generous but bounded
      signal: AbortSignal.timeout(90_000),
    })

    if (!clawdbotRes.ok || !clawdbotRes.body) {
      throw new Error(`ClawdBot returned ${clawdbotRes.status}`)
    }

    // Relay the SSE byte-for-byte to the browser
    const stream = new ReadableStream({
      async start(controller) {
        const reader = clawdbotRes.body!.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            controller.enqueue(value)
          }
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
    const message = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({
        success: false,
        error: `Agent unavailable: ${message}`,
        message:
          'ClawdBot is not reachable. Check that clawdbot-api.service is running.\n' +
          'Run: systemctl --user status clawdbot-api',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
