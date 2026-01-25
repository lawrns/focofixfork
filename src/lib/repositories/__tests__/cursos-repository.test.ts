import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CursosRepository } from '../cursos-repository'
import { Ok, Err } from '../base-repository'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
}

describe('CursosRepository - P0 Tests', () => {
  let repository: CursosRepository

  const mockWorkspaceId = '00000000-0000-0000-0000-000000000001'
  const mockUserId = '00000000-0000-0000-0000-000000000002'
  const mockCourseId = '00000000-0000-0000-0000-000000000003'
  const mockSectionId = '00000000-0000-0000-0000-000000000004'

  const mockCourse = {
    id: mockCourseId,
    workspace_id: mockWorkspaceId,
    slug: 'test-course',
    title: 'Test Course',
    description: 'A test course',
    duration_minutes: 60,
    is_published: true,
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sections: [
      {
        id: mockSectionId,
        course_id: mockCourseId,
        title: 'Section 1',
        content: 'Content 1',
        sort_order: 0,
      },
    ],
  }

  const mockProgress = {
    id: '00000000-0000-0000-0000-000000000005',
    user_id: mockUserId,
    course_id: mockCourseId,
    completed_section_ids: [mockSectionId],
    last_position: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new CursosRepository(mockSupabase as any)
  })

  describe('findPublishedByWorkspace', () => {
    it('should return published courses for workspace', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn(),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)
      mockQuery.order.mockResolvedValue({
        data: [mockCourse],
        error: null,
      })

      const result = await repository.findPublishedByWorkspace(mockWorkspaceId)

      expect(result.ok).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].id).toBe(mockCourseId)
      expect(mockSupabase.from).toHaveBeenCalledWith('cursos_courses')
      expect(mockQuery.eq).toHaveBeenCalledWith('workspace_id', mockWorkspaceId)
      expect(mockQuery.eq).toHaveBeenCalledWith('is_published', true)
    })

    it('should return empty array when no courses found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn(),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)
      mockQuery.order.mockResolvedValue({
        data: [],
        error: null,
      })

      const result = await repository.findPublishedByWorkspace(mockWorkspaceId)

      expect(result.ok).toBe(true)
      expect(result.data).toEqual([])
    })

    it('should return error when database query fails', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn(),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)
      const dbError = { message: 'Connection failed', code: 'CONNECTION_ERROR' }
      mockQuery.order.mockResolvedValue({
        data: null,
        error: dbError,
      })

      const result = await repository.findPublishedByWorkspace(mockWorkspaceId)

      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('DATABASE_ERROR')
      expect(result.error?.message).toBe('Failed to fetch courses')
      expect(result.error?.details).toBe(dbError)
    })

    it('should include sections with courses', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn(),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)
      mockQuery.order.mockResolvedValue({
        data: [mockCourse],
        error: null,
      })

      const result = await repository.findPublishedByWorkspace(mockWorkspaceId)

      expect(result.ok).toBe(true)
      expect(result.data?.[0].sections).toBeDefined()
      expect(result.data?.[0].sections).toHaveLength(1)
      expect(mockQuery.select).toHaveBeenCalledWith(
        expect.stringContaining('sections')
      )
    })
  })

  describe('findBySlug', () => {
    it('should return course by slug for workspace', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)
      mockQuery.single.mockResolvedValue({
        data: mockCourse,
        error: null,
      })

      const result = await repository.findBySlug(mockWorkspaceId, 'test-course')

      expect(result.ok).toBe(true)
      expect(result.data?.id).toBe(mockCourseId)
      expect(result.data?.slug).toBe('test-course')
      expect(mockSupabase.from).toHaveBeenCalledWith('cursos_courses')
    })

    it('should return error when course not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)
      const dbError = { message: 'Not found', code: 'PGRST116' }
      mockQuery.single.mockResolvedValue({
        data: null,
        error: dbError,
      })

      const result = await repository.findBySlug(mockWorkspaceId, 'nonexistent')

      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('DATABASE_ERROR')
      expect(result.error?.message).toBe('Failed to fetch course')
    })

    it('should filter by workspace_id', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)
      mockQuery.single.mockResolvedValue({
        data: mockCourse,
        error: null,
      })

      await repository.findBySlug(mockWorkspaceId, 'test-course')

      expect(mockQuery.eq).toHaveBeenCalledWith('workspace_id', mockWorkspaceId)
      expect(mockQuery.eq).toHaveBeenCalledWith('slug', 'test-course')
    })

    it('should return error for database connection issues', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)
      const dbError = { message: 'Network error', code: 'NETWORK_ERROR' }
      mockQuery.single.mockResolvedValue({
        data: null,
        error: dbError,
      })

      const result = await repository.findBySlug(mockWorkspaceId, 'test-course')

      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('DATABASE_ERROR')
    })
  })

  describe('getUserProgress', () => {
    it('should return user progress for course', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)
      mockQuery.maybeSingle.mockResolvedValue({
        data: mockProgress,
        error: null,
      })

      const result = await repository.getUserProgress(mockUserId, mockCourseId)

      expect(result.ok).toBe(true)
      expect(result.data?.user_id).toBe(mockUserId)
      expect(result.data?.course_id).toBe(mockCourseId)
      expect(mockSupabase.from).toHaveBeenCalledWith('cursos_progress')
    })

    it('should return null when no progress exists', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)
      mockQuery.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await repository.getUserProgress(mockUserId, mockCourseId)

      expect(result.ok).toBe(true)
      expect(result.data).toBeNull()
    })

    it('should return error when database query fails', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)
      const dbError = { message: 'Query failed', code: 'QUERY_ERROR' }
      mockQuery.maybeSingle.mockResolvedValue({
        data: null,
        error: dbError,
      })

      const result = await repository.getUserProgress(mockUserId, mockCourseId)

      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('DATABASE_ERROR')
      expect(result.error?.message).toBe('Failed to fetch progress')
    })
  })

  describe('upsertProgress', () => {
    it('should create new progress record', async () => {
      const newProgress = {
        user_id: mockUserId,
        course_id: mockCourseId,
        completed_section_ids: [mockSectionId],
        last_position: 0,
      }

      const mockQuery = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)
      mockQuery.single.mockResolvedValue({
        data: { ...mockProgress, ...newProgress },
        error: null,
      })

      const result = await repository.upsertProgress(
        mockUserId,
        mockCourseId,
        {
          completed_section_ids: [mockSectionId],
          last_position: 0,
        }
      )

      expect(result.ok).toBe(true)
      expect(result.data?.user_id).toBe(mockUserId)
      expect(result.data?.course_id).toBe(mockCourseId)
      expect(mockSupabase.from).toHaveBeenCalledWith('cursos_progress')
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          course_id: mockCourseId,
        })
      )
    })

    it('should update existing progress record', async () => {
      const updatedProgress = {
        ...mockProgress,
        completed_section_ids: [mockSectionId, '00000000-0000-0000-0000-000000000006'],
        last_position: 1,
      }

      const mockQuery = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)
      mockQuery.single.mockResolvedValue({
        data: updatedProgress,
        error: null,
      })

      const result = await repository.upsertProgress(
        mockUserId,
        mockCourseId,
        {
          completed_section_ids: updatedProgress.completed_section_ids,
          last_position: 1,
        }
      )

      expect(result.ok).toBe(true)
      expect(result.data?.completed_section_ids).toHaveLength(2)
      expect(result.data?.last_position).toBe(1)
    })

    it('should return error when upsert fails', async () => {
      const mockQuery = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)
      const dbError = { message: 'Constraint violation', code: '23505' }
      mockQuery.single.mockResolvedValue({
        data: null,
        error: dbError,
      })

      const result = await repository.upsertProgress(
        mockUserId,
        mockCourseId,
        {
          completed_section_ids: [],
          last_position: 0,
        }
      )

      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('DATABASE_ERROR')
      expect(result.error?.message).toBe('Failed to save progress')
    })

    it('should handle empty completed_section_ids', async () => {
      const mockQuery = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)
      mockQuery.single.mockResolvedValue({
        data: {
          ...mockProgress,
          completed_section_ids: [],
        },
        error: null,
      })

      const result = await repository.upsertProgress(
        mockUserId,
        mockCourseId,
        {
          completed_section_ids: [],
          last_position: 0,
        }
      )

      expect(result.ok).toBe(true)
      expect(result.data?.completed_section_ids).toEqual([])
    })
  })
})
