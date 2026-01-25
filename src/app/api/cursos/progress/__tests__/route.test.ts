import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'

// Mock dependencies
const mockGetAuthUser = vi.fn()
const mockMergeAuthResponse = vi.fn((res) => res)
const mockCursosRepository = vi.fn()

vi.mock('@/lib/api/auth-helper', () => ({
  getAuthUser: () => mockGetAuthUser(),
  mergeAuthResponse: (res: any) => mockMergeAuthResponse(res),
}))

vi.mock('@/lib/repositories/cursos-repository', () => ({
  CursosRepository: class {
    constructor(...args: any[]) {
      return mockCursosRepository(...args)
    }
  },
}))

vi.mock('@/lib/middleware/enhanced-rate-limit', () => ({
  cursosProgressRateLimiter: {},
  withRateLimit: (limiter: any, handler: any) => handler,
}))

describe('POST /api/cursos/progress - P0 Tests', () => {
  const mockUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'test@example.com',
  }

  const mockCourseId = '00000000-0000-0000-0000-000000000002'
  const mockSectionId = '00000000-0000-0000-0000-000000000003'

  const mockProgress = {
    id: '00000000-0000-0000-0000-000000000004',
    user_id: mockUser.id,
    course_id: mockCourseId,
    completed_section_ids: [],
    last_position: 0,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication & Validation', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetAuthUser.mockResolvedValue({
        user: null,
        supabase: null,
        error: { message: 'Unauthorized' },
        response: null,
      })

      const request = new NextRequest('http://localhost:3000/api/cursos/progress', {
        method: 'POST',
        body: JSON.stringify({ courseId: mockCourseId }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should return 400 when courseId is missing', async () => {
      mockGetAuthUser.mockResolvedValue({
        user: mockUser,
        supabase: {} as any,
        error: null,
        response: null,
      })

      const request = new NextRequest('http://localhost:3000/api/cursos/progress', {
        method: 'POST',
        body: JSON.stringify({ lastPosition: 0 }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const result = await response.json()
      expect(result.error).toBeDefined()
    })

    it('should accept valid progress update request', async () => {
      mockGetAuthUser.mockResolvedValue({
        user: mockUser,
        supabase: {} as any,
        error: null,
        response: null,
      })

      const mockRepo = {
        getUserProgress: vi.fn().mockResolvedValue({
          ok: true,
          data: mockProgress,
        }),
        upsertProgress: vi.fn().mockResolvedValue({
          ok: true,
          data: { ...mockProgress, last_position: 5 },
        }),
      }

      mockCursosRepository.mockImplementation(() => mockRepo as any)

      const request = new NextRequest('http://localhost:3000/api/cursos/progress', {
        method: 'POST',
        body: JSON.stringify({
          courseId: mockCourseId,
          lastPosition: 5,
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockRepo.upsertProgress).toHaveBeenCalledWith(
        mockUser.id,
        mockCourseId,
        expect.objectContaining({
          last_position: 5,
        })
      )
    })

    it('should mark section as complete when sectionId is provided', async () => {
      mockGetAuthUser.mockResolvedValue({
        user: mockUser,
        supabase: {} as any,
        error: null,
        response: null,
      })

      const mockRepo = {
        getUserProgress: vi.fn().mockResolvedValue({
          ok: true,
          data: mockProgress,
        }),
        markSectionComplete: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            ...mockProgress,
            completed_section_ids: [mockSectionId],
          },
        }),
      }

      mockCursosRepository.mockImplementation(() => mockRepo as any)

      const request = new NextRequest('http://localhost:3000/api/cursos/progress', {
        method: 'POST',
        body: JSON.stringify({
          courseId: mockCourseId,
          sectionId: mockSectionId,
          lastPosition: 0,
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockRepo.markSectionComplete).toHaveBeenCalledWith(
        mockUser.id,
        mockCourseId,
        mockSectionId
      )
    })
  })

  describe('Progress Update Operations', () => {
    it('should update last position without completing section', async () => {
      mockGetAuthUser.mockResolvedValue({
        user: mockUser,
        supabase: {} as any,
        error: null,
        response: null,
      })

      const mockRepo = {
        getUserProgress: vi.fn().mockResolvedValue({
          ok: true,
          data: mockProgress,
        }),
        upsertProgress: vi.fn().mockResolvedValue({
          ok: true,
          data: { ...mockProgress, last_position: 10 },
        }),
      }

      mockCursosRepository.mockImplementation(() => mockRepo as any)

      const request = new NextRequest('http://localhost:3000/api/cursos/progress', {
        method: 'POST',
        body: JSON.stringify({
          courseId: mockCourseId,
          lastPosition: 10,
        }),
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.ok).toBe(true)
      expect(result.data.progress.last_position).toBe(10)
      expect(mockRepo.upsertProgress).toHaveBeenCalled()
    })

    it('should create new progress record if none exists', async () => {
      mockGetAuthUser.mockResolvedValue({
        user: mockUser,
        supabase: {} as any,
        error: null,
        response: null,
      })

      const mockRepo = {
        getUserProgress: vi.fn().mockResolvedValue({
          ok: true,
          data: null,
        }),
        upsertProgress: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            id: '00000000-0000-0000-0000-000000000005',
            user_id: mockUser.id,
            course_id: mockCourseId,
            completed_section_ids: [],
            last_position: 0,
          },
        }),
      }

      mockCursosRepository.mockImplementation(() => mockRepo as any)

      const request = new NextRequest('http://localhost:3000/api/cursos/progress', {
        method: 'POST',
        body: JSON.stringify({
          courseId: mockCourseId,
          lastPosition: 0,
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockRepo.upsertProgress).toHaveBeenCalledWith(
        mockUser.id,
        mockCourseId,
        expect.objectContaining({
          completed_section_ids: [],
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should return 500 when database operation fails', async () => {
      mockGetAuthUser.mockResolvedValue({
        user: mockUser,
        supabase: {} as any,
        error: null,
        response: null,
      })

      const mockRepo = {
        getUserProgress: vi.fn().mockResolvedValue({
          ok: true,
          data: mockProgress,
        }),
        upsertProgress: vi.fn().mockResolvedValue({
          ok: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to save progress',
            details: {},
          },
        }),
      }

      mockCursosRepository.mockImplementation(() => mockRepo as any)

      const request = new NextRequest('http://localhost:3000/api/cursos/progress', {
        method: 'POST',
        body: JSON.stringify({
          courseId: mockCourseId,
          lastPosition: 5,
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      const result = await response.json()
      expect(result.error).toBeDefined()
    })

    it('should handle markSectionComplete failure gracefully', async () => {
      mockGetAuthUser.mockResolvedValue({
        user: mockUser,
        supabase: {} as any,
        error: null,
        response: null,
      })

      const mockRepo = {
        getUserProgress: vi.fn().mockResolvedValue({
          ok: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch progress',
          },
        }),
        markSectionComplete: vi.fn(),
      }

      mockCursosRepository.mockImplementation(() => mockRepo as any)

      const request = new NextRequest('http://localhost:3000/api/cursos/progress', {
        method: 'POST',
        body: JSON.stringify({
          courseId: mockCourseId,
          sectionId: mockSectionId,
          lastPosition: 0,
        }),
      })

      const response = await POST(request)

      // Should return 500 due to database error
      expect([500, 400]).toContain(response.status)
    })

    it('should handle invalid JSON body', async () => {
      mockGetAuthUser.mockResolvedValue({
        user: mockUser,
        supabase: {} as any,
        error: null,
        response: null,
      })

      const request = new NextRequest('http://localhost:3000/api/cursos/progress', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)

      // Should return 500 due to JSON parse error
      expect([500, 400]).toContain(response.status)
    })
  })

  describe('Response Format', () => {
    it('should return updated progress in response', async () => {
      mockGetAuthUser.mockResolvedValue({
        user: mockUser,
        supabase: {} as any,
        error: null,
        response: null,
      })

      const updatedProgress = {
        ...mockProgress,
        completed_section_ids: [mockSectionId],
        last_position: 5,
      }

      const mockRepo = {
        getUserProgress: vi.fn().mockResolvedValue({
          ok: true,
          data: mockProgress,
        }),
        upsertProgress: vi.fn().mockResolvedValue({
          ok: true,
          data: updatedProgress,
        }),
      }

      mockCursosRepository.mockImplementation(() => mockRepo as any)

      const request = new NextRequest('http://localhost:3000/api/cursos/progress', {
        method: 'POST',
        body: JSON.stringify({
          courseId: mockCourseId,
          lastPosition: 5,
        }),
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.ok).toBe(true)
      expect(result.data.progress).toBeDefined()
      expect(result.data.progress.last_position).toBe(5)
    })
  })
})
