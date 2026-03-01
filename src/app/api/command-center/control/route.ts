import { NextRequest, NextResponse } from 'next/server'
import type { AgentBackend } from '@/lib/command-center/types'

export const dynamic = 'force-dynamic'

interface ControlBody {
  action: 'stop' | 'pause' | 'resume'
  backend: AgentBackend
  nativeId: string
}

export async function POST(req: NextRequest) {
  const body = await req.json() as ControlBody
  const { action, backend, nativeId } = body

  if (!action || !backend || !nativeId) {
    return NextResponse.json({ error: 'action, backend, nativeId required' }, { status: 400 })
  }

  const origin = req.headers.get('origin') ?? 'http://localhost:3000'

  try {
    switch (backend) {
      case 'crico': {
        if (action === 'stop') {
          const authHeader = req.headers.get('authorization')
          const res = await fetch(`${origin}/api/crico/actions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authHeader ? { Authorization: authHeader } : {}),
            },
            body: JSON.stringify({ operation: 'cancel', actionId: nativeId }),
          })
          return NextResponse.json({ ok: res.ok, backend, action, nativeId })
        }
        return NextResponse.json({ supported: false, reason: 'CRICO only supports stop' })
      }

      case 'bosun': {
        const bosunToken = process.env.BOSUN_SERVICE_TOKEN
        const newStatus = action === 'stop' ? 'cancelled' : action === 'pause' ? 'blocked' : 'in_progress'
        const res = await fetch(`${origin}/api/bosun/kanban/tasks/${nativeId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(bosunToken ? { Authorization: `Bearer ${bosunToken}` } : {}),
          },
          body: JSON.stringify({ status: newStatus }),
        })
        return NextResponse.json({ ok: res.ok, backend, action, nativeId })
      }

      case 'clawdbot': {
        if (action === 'stop') {
          const clawdbotApi = process.env.CLAWDBOT_API_URL ?? 'http://127.0.0.1:18794'
          const token = process.env.OPENCLAW_SERVICE_TOKEN ?? ''
          const res = await fetch(`${clawdbotApi}/agents/stop`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ agentId: nativeId }),
            signal: AbortSignal.timeout(4000),
          })
          return NextResponse.json({ ok: res.ok, backend, action, nativeId })
        }
        return NextResponse.json({ supported: false, reason: 'ClawdBot only supports stop' })
      }

      case 'openclaw':
        return NextResponse.json({ supported: false, reason: 'OpenClaw has no stop endpoint' })

      default:
        return NextResponse.json({ error: 'Unknown backend' }, { status: 400 })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
