import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockFrom,
  mockSelect,
  mockIlike,
  mockOrder,
  mockLimit,
  mockInsert,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockIlike: vi.fn(),
  mockOrder: vi.fn(),
  mockLimit: vi.fn(),
  mockInsert: vi.fn(),
}))

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: mockFrom,
  },
}))

import { GET, POST } from '@/app/api/empire/workflows/route'

describe('/api/empire/workflows route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())

    mockLimit.mockResolvedValue({ data: [], error: null })
    mockOrder.mockReturnValue({ limit: mockLimit })
    mockIlike.mockReturnValue({ order: mockOrder })
    mockSelect.mockReturnValue({ ilike: mockIlike })
    mockInsert.mockResolvedValue({ error: null })

    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    })
  })

  test('GET maps Temporal executions when Temporal responds OK', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        executions: [
          {
            execution: { workflowId: 'wf-1', runId: 'run-1' },
            type: { name: 'AutoShipWorkflow' },
            status: 1,
            startTime: '2026-03-03T00:00:00.000Z',
            closeTime: null,
          },
        ],
      }),
    } as Response)

    const res = await GET(new NextRequest('http://localhost:4000/api/empire/workflows'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.fallback).toBeUndefined()
    expect(data.workflows).toHaveLength(1)
    expect(data.workflows[0]).toMatchObject({
      workflowId: 'wf-1',
      runId: 'run-1',
      type: 'AutoShipWorkflow',
      status: 'Running',
    })
  })

  test('GET returns fallback workflows when Temporal returns non-OK', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
    } as Response)

    mockLimit.mockResolvedValueOnce({
      data: [
        {
          id: 'fallback-run-1',
          runner: 'temporal:AutoShipWorkflow',
          status: 'pending',
          created_at: '2026-03-03T00:00:00.000Z',
          completed_at: null,
        },
      ],
      error: null,
    })

    const res = await GET(new NextRequest('http://localhost:4000/api/empire/workflows'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.fallback).toBe(true)
    expect(data.error).toContain('Temporal HTTP 400')
    expect(data.workflows).toHaveLength(1)
    expect(data.workflows[0]).toMatchObject({
      workflowId: 'fallback-run-1',
      type: 'AutoShipWorkflow',
      status: 'Unknown',
    })
  })

  test('POST returns 400 when workflowType is missing', async () => {
    const req = new NextRequest('http://localhost:4000/api/empire/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('workflowType required')
  })

  test('POST degrades to fallback queue when Temporal rejects request', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'bad request',
    } as Response)

    const req = new NextRequest('http://localhost:4000/api/empire/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowType: 'AutoShipWorkflow' }),
    })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(202)
    expect(data.fallback).toBe(true)
    expect(data.queued).toBe(true)
    expect(data.workflowId).toContain('AutoShipWorkflow-')
  })
})

