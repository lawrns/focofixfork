import { describe, expect, it } from 'vitest'
import {
  createCommandStreamJob,
  getCommandStreamJob,
  listCommandStreamEvents,
  listCommandStreamEventsSince,
  publishCommandStreamEvent,
} from '@/lib/command-surface/stream-broker'

describe('command stream broker', () => {
  it('creates a user-scoped job', async () => {
    const jobId = createCommandStreamJob('user-1')
    const job = await getCommandStreamJob(jobId)

    expect(job).toBeTruthy()
    expect(job?.id).toBe(jobId)
    expect(job?.userId).toBe('user-1')
  })

  it('stores and slices events by offset', async () => {
    const jobId = createCommandStreamJob('user-2')

    publishCommandStreamEvent(jobId, {
      type: 'status_update',
      status: 'queued',
      message: 'queued',
      timestamp: new Date().toISOString(),
    })
    publishCommandStreamEvent(jobId, {
      type: 'output_chunk',
      text: 'hello',
      timestamp: new Date().toISOString(),
    })
    publishCommandStreamEvent(jobId, {
      type: 'done',
      exitCode: 0,
      summary: 'done',
      timestamp: new Date().toISOString(),
    })

    const all = await listCommandStreamEvents(jobId)
    const sinceSecond = await listCommandStreamEventsSince(jobId, 1)

    expect(all).toHaveLength(3)
    expect(sinceSecond).toHaveLength(2)
    expect(sinceSecond[0].type).toBe('output_chunk')
    expect(sinceSecond[1].type).toBe('done')
  })

  it('marks jobs complete on terminal events', async () => {
    const jobId = createCommandStreamJob('user-3')
    publishCommandStreamEvent(jobId, {
      type: 'done',
      exitCode: 0,
      timestamp: new Date().toISOString(),
    })

    const job = await getCommandStreamJob(jobId)
    expect(job?.done).toBe(true)
  })
})
