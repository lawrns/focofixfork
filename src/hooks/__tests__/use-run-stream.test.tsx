'use client'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useRunStream } from '../use-run-stream'

global.fetch = vi.fn()

function createSseResponse(events: unknown[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

describe('useRunStream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retries run-to-job lookup until a stream becomes available', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ jobId: 'job-1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        createSseResponse([
          { type: 'output_chunk', text: '[ACTION] planning', timestamp: new Date().toISOString() },
          { type: 'done', exitCode: 0, summary: 'Completed', timestamp: new Date().toISOString() },
        ])
      )

    const { result } = renderHook(() => useRunStream('run-1', null))

    expect(result.current.connectionState).toBe('resolving')

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/command-surface/stream/job-1',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(result.current.lines.map((line) => line.text)).toContain('planning')
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(result.current.connectionState).toBe('ended')
    }, { timeout: 3000 })
  })

  it('resets stale lines when switching to a different run', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValue(
      createSseResponse([
        { type: 'output_chunk', text: '[OBSERVE] first run', timestamp: new Date().toISOString() },
        { type: 'done', exitCode: 0, summary: 'Completed', timestamp: new Date().toISOString() },
      ])
    )

    const { result, rerender } = renderHook(
      ({ runId, jobId }: { runId: string | null; jobId: string | null }) => useRunStream(runId, jobId),
      { initialProps: { runId: 'run-1', jobId: 'job-1' } }
    )

    await waitFor(() => {
      expect(result.current.lines.length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    rerender({ runId: 'run-2', jobId: null })

    expect(result.current.lines).toEqual([])
    expect(result.current.connectionState).toBe('resolving')
  }, 10000)
})
