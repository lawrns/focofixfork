import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MilestonesService } from '../milestones'
import { supabaseAdmin } from '../../supabase-server'

vi.mock('../../supabase-server', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

function makeAwaitableQuery(result: any) {
  const query: any = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    eq: vi.fn(() => query),
    range: vi.fn(() => query),
    then: (resolve: any) => Promise.resolve(resolve(result)),
  }
  return query
}

describe('MilestonesService', () => {
  const userId = 'user-123'
  const milestoneId = 'milestone-1'
  const milestone = {
    id: milestoneId,
    project_id: 'project-1',
    name: 'Launch MVP',
    status: 'active',
    priority: 'high',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns auth error when user is missing', async () => {
    const result = await MilestonesService.getUserMilestones('')
    expect(result.success).toBe(false)
    expect(result.error).toBe('User not authenticated')
  })

  it('fetches milestones with pagination metadata', async () => {
    const query = makeAwaitableQuery({ data: [milestone], error: null, count: 1 })
    vi.mocked(supabaseAdmin.from).mockReturnValue(query)

    const result = await MilestonesService.getUserMilestones(userId)

    expect(result.success).toBe(true)
    expect(result.data).toEqual([milestone])
    expect(result.pagination).toEqual({ total: 1, limit: 10, offset: 0 })
    expect(query.order).toHaveBeenCalledWith('due_date', { ascending: true, nullsFirst: false })
  })

  it('applies project/status filters and range', async () => {
    const query = makeAwaitableQuery({ data: [milestone], error: null, count: 1 })
    vi.mocked(supabaseAdmin.from).mockReturnValue(query)

    await MilestonesService.getUserMilestones(userId, {
      project_id: 'project-1',
      status: 'active',
      limit: 20,
      offset: 10,
    })

    expect(query.eq).toHaveBeenCalledWith('project_id', 'project-1')
    expect(query.eq).toHaveBeenCalledWith('status', 'active')
    expect(query.range).toHaveBeenCalledWith(10, 29)
  })

  it('handles fetch errors from query builder', async () => {
    const query = makeAwaitableQuery({ data: null, error: { message: 'Database down' }, count: 0 })
    vi.mocked(supabaseAdmin.from).mockReturnValue(query)

    const result = await MilestonesService.getUserMilestones(userId)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Database down')
  })

  it('creates milestone with owner_id', async () => {
    const insert = vi.fn().mockReturnThis()
    const select = vi.fn().mockReturnThis()
    const single = vi.fn().mockResolvedValue({ data: milestone, error: null })

    vi.mocked(supabaseAdmin.from).mockReturnValue({ insert, select, single } as any)

    const result = await MilestonesService.createMilestone(userId, {
      project_id: 'project-1',
      name: 'Launch MVP',
      status: 'planned',
      priority: 'medium',
    } as any)

    expect(result.success).toBe(true)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: userId }))
  })

  it('returns not found for missing milestone by id', async () => {
    const select = vi.fn().mockReturnThis()
    const eq = vi.fn().mockReturnThis()
    const single = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

    vi.mocked(supabaseAdmin.from).mockReturnValue({ select, eq, single } as any)

    const result = await MilestonesService.getMilestoneById(userId, milestoneId)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Milestone not found')
  })

  it('deletes milestone successfully', async () => {
    const del = vi.fn().mockReturnThis()
    const eq = vi.fn().mockResolvedValue({ error: null })

    vi.mocked(supabaseAdmin.from).mockReturnValue({ delete: del, eq } as any)

    const result = await MilestonesService.deleteMilestone(userId, milestoneId)
    expect(result.success).toBe(true)
    expect(del).toHaveBeenCalled()
    expect(eq).toHaveBeenCalledWith('id', milestoneId)
  })
})
