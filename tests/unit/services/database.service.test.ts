import { describe, it, expect, vi } from 'vitest'
import { DatabaseService } from '@/lib/database/service'

const fakeClient: any = {
  from: (table: string) => ({
    select: () => ({ data: [], error: null }),
    insert: (data: any) => ({ select: () => ({ single: () => ({ data, error: null }) }) })
  })
}

describe('DatabaseService.executeQuery', () => {
  it('returns success true on successful operation', async () => {
    const service = new DatabaseService() as any
    service.client = fakeClient
    const result = await service["executeQuery"](async (client: any) => ({ data: [{ id: 1 }], error: null }))
    expect(result.success).toBe(true)
    expect(result.error).toBeNull()
    expect(result.data).toEqual([{ id: 1 }])
  })

  it('returns success false on operation error', async () => {
    const service = new DatabaseService() as any
    service.client = fakeClient
    const result = await service["executeQuery"](async (client: any) => ({ data: null, error: { message: 'fail' } }))
    expect(result.success).toBe(false)
    expect(result.error).toBe('fail')
    expect(result.data).toBeNull()
  })

  it('returns success false on thrown exception', async () => {
    const service = new DatabaseService() as any
    service.client = fakeClient
    const result = await service["executeQuery"](async () => { throw new Error('boom') })
    expect(result.success).toBe(false)
    expect(result.error).toBe('boom')
    expect(result.data).toBeNull()
  })
})

