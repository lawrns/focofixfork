import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  getCommandStreamJob,
  listCommandStreamEvents,
  listCommandStreamEventsSince,
} from '@/lib/command-surface/stream-broker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Params {
  params: Promise<{ jobId: string }>
}

function encodeEvent(event: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
}

export async function GET(req: NextRequest, { params }: Params) {
  const { jobId } = await params
  const { user, error, response: authResponse } = await getAuthUser(req)

  if (error || !user) {
    return mergeAuthResponse(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), authResponse)
  }

  const job = await getCommandStreamJob(jobId)
  if (!job) {
    return mergeAuthResponse(NextResponse.json({ error: 'Stream job not found' }, { status: 404 }), authResponse)
  }

  if (job.userId !== user.id) {
    return mergeAuthResponse(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), authResponse)
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      let sentCount = 0
      let flushing = false

      const close = () => {
        if (closed) return
        closed = true
        clearInterval(heartbeat)
        clearInterval(poll)
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      const flush = async () => {
        if (flushing || closed) return
        flushing = true

        try {
          const newEvents = await listCommandStreamEventsSince(jobId, sentCount)
          for (const event of newEvents) {
            controller.enqueue(encodeEvent(event))
            sentCount += 1
            if (event.type === 'done') {
              close()
              return
            }
          }
        } catch {
          // keep stream alive; next poll may recover
        } finally {
          flushing = false
        }
      }

      controller.enqueue(new TextEncoder().encode(': connected\n\n'))

      void (async () => {
        const backlog = await listCommandStreamEvents(jobId)
        backlog.forEach((event) => {
          if (!closed) controller.enqueue(encodeEvent(event))
        })
        sentCount = backlog.length
        if (backlog.some((event) => event.type === 'done')) {
          close()
          return
        }
        await flush()
      })()

      const heartbeat = setInterval(() => {
        if (closed) return
        try {
          controller.enqueue(new TextEncoder().encode(': ping\n\n'))
        } catch {
          close()
        }
      }, 15_000)

      const poll = setInterval(() => {
        void flush()
      }, 600)

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
