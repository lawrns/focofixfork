import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CursosRepository } from '../cursos-repository'

const mockSupabase = {
  from: vi.fn(),
}

describe('CursosRepository', () => {
  let repository: CursosRepository

  const workspaceId = 'ws-1'
  const userId = 'user-1'
  const courseId = 'course-1'

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new CursosRepository(mockSupabase as any)
  })

  it('findPublishedByWorkspace returns published courses', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: courseId, workspace_id: workspaceId, is_published: true, sections: [] }],
      error: null,
    })

    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order,
    }

    mockSupabase.from.mockReturnValue(query as any)

    const result = await repository.findPublishedByWorkspace(workspaceId)

    expect(result.ok).toBe(true)
    expect(result.data?.[0].id).toBe(courseId)
    expect(query.eq).toHaveBeenCalledWith('workspace_id', workspaceId)
    expect(query.eq).toHaveBeenCalledWith('is_published', true)
  })

  it('findBySlug calls referenced table ordering and returns course', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: courseId, slug: 'test-course', sections: [] },
      error: null,
    })

    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single,
    }

    mockSupabase.from.mockReturnValue(query as any)

    const result = await repository.findBySlug(workspaceId, 'test-course')

    expect(result.ok).toBe(true)
    expect(query.eq).toHaveBeenCalledWith('workspace_id', workspaceId)
    expect(query.eq).toHaveBeenCalledWith('slug', 'test-course')
    expect(query.eq).toHaveBeenCalledWith('is_published', true)
    expect(query.order).toHaveBeenCalledWith('sort_order', { referencedTable: 'cursos_sections' })
  })

  it('findBySlug returns NOT_FOUND for PGRST116', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    }

    mockSupabase.from.mockReturnValue(query as any)

    const result = await repository.findBySlug(workspaceId, 'missing')
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('getUserProgress returns maybeSingle progress row', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { user_id: userId, course_id: courseId, completed_section_ids: [] },
      error: null,
    })

    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle,
    }

    mockSupabase.from.mockReturnValue(query as any)

    const result = await repository.getUserProgress(userId, courseId)

    expect(result.ok).toBe(true)
    expect(result.data?.user_id).toBe(userId)
    expect(result.data?.course_id).toBe(courseId)
  })
})
