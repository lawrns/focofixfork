import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { buildMissionControlSnapshot } from '@/server/mission-control/snapshot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function encodeNamedEvent(name: string, data: unknown, id?: string): Uint8Array {
  const prefix = id ? `id: ${id}\n` : ''
  return new TextEncoder().encode(`${prefix}event: ${name}\ndata: ${JSON.stringify(data)}\n\n`)
}

export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      let sending = false

      const close = () => {
        if (closed) return
        closed = true
        clearInterval(heartbeat)
        clearInterval(poll)
        try {
          controller.close()
        } catch {
          // Stream is already closed.
        }
      }

      const sendSnapshot = async () => {
        if (closed || sending) return
        sending = true
        try {
          const snapshot = await buildMissionControlSnapshot({ req, user, supabase })
          controller.enqueue(
            encodeNamedEvent('snapshot', { data: snapshot }, snapshot.snapshotAt)
          )
        } catch (streamError) {
          controller.enqueue(
            encodeNamedEvent('warning', {
              message: streamError instanceof Error ? streamError.message : 'Mission control stream degraded',
            })
          )
        } finally {
          sending = false
        }
      }

      controller.enqueue(new TextEncoder().encode(': connected\n\n'))
      void sendSnapshot()

      const heartbeat = setInterval(() => {
        if (closed) return
        try {
          controller.enqueue(new TextEncoder().encode(': ping\n\n'))
        } catch {
          close()
        }
      }, 15_000)

      const poll = setInterval(() => {
        void sendSnapshot()
      }, 7_000)

      req.signal.addEventListener('abort', close)
    },
  })

  return mergeAuthResponse(
    new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    }),
    authResponse
  )
}
