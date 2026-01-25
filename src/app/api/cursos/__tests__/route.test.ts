import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '../route'
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
  cursosRateLimiter: {},
  withRateLimit: (limiter: any, handler: any) => handler,
}))

describe('GET /api/cursos - P0 Tests', () => {
  const mockUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'test@example.com',
  }

  const mockWorkspaceId = '00000000-0000-0000-0000-000000000002'
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
    sections: [
      {
        id: mockSectionId,
        course_id: mockCourseId,
        title: 'Section 1',
        sort_order: 0,
      },
    ],
  }

  const mockProgress = {
    id: '00000000-0000-0000-0000-000000000005',
    user_id: mockUser.id,
    course_id: mockCourseId,
    completed_section_ids: [mockSectionId],
    last_position: 0,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication & Authorization', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetAuthUser.mockResolvedValue({
        user: null,
        supabase: null,
        error: { message: 'Unauthorized' },
        response: null,
      })

      const request = new NextRequest(
        `http://localhost:3000/api/cursos?workspaceId=${mockWorkspaceId}`
      )

      const response = await GET(request)

      expect(response.status).toBe(401)
      const result = await response.json()
      expect(result.error).toBeDefined()
    })

    it('should return 400 when workspaceId is missing', async () => {
      mockGetAuthUser.mockResolvedValue({
        user: mockUser,
        supabase: {} as any,
        error: null,
        response: null,
      })

      const request = new NextRequest('http://localhost:3000/api/cursos')

      const response = await GET(request)

      expect(response.status).toBe(400)
      const result = await response.json()
      expect(result.error).toBeDefined()
    })

    it('should return 200 for authenticated user with valid workspaceId', async () => {
      mockGetAuthUser.mockResolvedValue({
        user: mockUser,
        supabase: {} as any,
        error: null,
        response: null,
      })

      const mockRepo = {
        findPublishedByWorkspace: vi.fn().mockResolvedValue({
          ok: true,
          data: [mockCourse],
        }),
        getUserProgress: vi.fn().mockResolvedValue({
          ok: true,
          data: mockProgress,
        }),
      }

      mockCursosRepository.mockImplementation(() => mockRepo as any)

      const request = new NextRequest(
        `http://localhost:3000/api/cursos?workspaceId=${mockWorkspaceId}`
      )

      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockRepo.findPublishedByWorkspace).toHaveBeenCalledWith(mockWorkspaceId)
    })
  })

  describe('Data Retrieval', () => {
    it('should return courses with progress data', async () => {
      mockGetAuthUser.mockResolvedValue({
        user: mockUser,
        supabase: {} as any,
        error: null,
        response: null,
      })

      const mockRepo = {
        findPublishedByWorkspace: vi.fn().mockResolvedValue({
          ok: true,
          data: [mockCourse],
        }),
        getUserProgress: vi.fn().mockResolvedValue({
          ok: true,
          data: mockProgress,
        }),
      }

      mockCursosRepository.mockImplementation(() => mockRepo as any)

      const request = new NextRequest(
        `http://localhost:3000/api/cursos?workspaceId=${mockWorkspaceId}`
      )

      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.ok).toBe(true)
      expect(result.data.courses).toBeDefined()
      expect(result.data.courses).toHaveLength(1)
      expect(result.data.courses[0].id).toBe(mockCourseId)
      expect(result.data.courses[0].progress).toBeDefined()
    })

    it('should calculate progress percentage correctly', async () => {
      mockGetAuthUser.mockResolvedValue({
        user: mockUser,
        supabase: {} as any,
        error: null,
        response: null,
      })

      const mockRepo = {
        findPublishedByWorkspace: vi.fn().mockResolvedValue({
          ok: true,
          data: [mockCourse],
        }),
        getUserProgress: vi.fn().mockResolvedValue({
          ok: true,
          data: mockProgress,
        }),
      }

      mockCursosRepository.mockImplementation(() => mockRepo as any)

      const request = new NextRequest(
        `http://localhost:3000/api/cursos?workspaceId=${mockWorkspaceId}`
      )

      const response = await GET(request)
      const result = await response.json()

      expect(result.data.courses[0].progressPercentage).toBe(100)
      expect(result.data.courses[0].completedSections).toBe(1)
      expect(result.data.courses[0].totalSections).toBe(1)
    })

    it('should return empty courses array when no courses found', async () => {
      mockGetAuthUser.mockResolvedValue({
        user: mockUser,
        supabase: {} as any,
        error: null,
        response: null,
      })

      const mockRepo = {
        findPublishedByWorkspace: vi.fn().mockResolvedValue({
          ok: true,
          data: [],
        }),
        getUserProgress: vi.fn().mockResolvedValue({
          ok: true,
          data: null,
        }),
      }

      mockCursosRepository.mockImplementation(() => mockRepo as any)

      const request = new NextRequest(
        `http://localhost:3000/api/cursos?workspaceId=${mockWorkspaceId}`
      )

      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.ok).toBe(true)
      expect(result.data.courses).toEqual([])
      expect(result.data.total).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('should return 500 when database query fails', async () => {
      mockGetAuthUser.mockResolvedValue({
        user: mockUser,
        supabase: {} as any,
        error: null,
        response: null,
      })

      const mockRepo = {
        findPublishedByWorkspace: vi.fn().mockResolvedValue({
          ok: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Connection failed',
            details: {},
          },
        }),
      }

      mockCursosRepository.mockImplementation(() => mockRepo as any)

      const request = new NextRequest(
        `http://localhost:3000/api/cursos?workspaceId=${mockWorkspaceId}`
      )

      const response = await GET(request)

      expect(response.status).toBe(500)
      const result = await response.json()
      expect(result.error).toBeDefined()
    })

    it('should handle null progress gracefully', async () => {
      mockGetAuthUser.mockResolvedValue({
        user: mockUser,
        supabase: {} as any,
        error: null,
        response: null,
      })

      const mockRepo = {
        findPublishedByWorkspace: vi.fn().mockResolvedValue({
          ok: true,
          data: [mockCourse],
        }),
        getUserProgress: vi.fn().mockResolvedValue({
          ok: true,
          data: null,
        }),
      }

      mockCursosRepository.mockImplementation(() => mockRepo as any)

      const request = new NextRequest(
        `http://localhost:3000/api/cursos?workspaceId=${mockWorkspaceId}`
      )

      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.ok).toBe(true)
      expect(result.data.courses[0].progress).toBeNull()
      expect(result.data.courses[0].progressPercentage).toBe(0)
    })

    it('should handle unexpected errors gracefully', async () => {
      mockGetAuthUser.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const request = new NextRequest(
        `http://localhost:3000/api/cursos?workspaceId=${mockWorkspaceId}`
      )

      const response = await GET(request)

      expect(response.status).toBe(500)
    })
  })

  describe('Response Format', () => {
    it('should include total count in response', async () => {
      mockGetAuthUser.mockResolvedValue({
        user: mockUser,
        supabase: {} as any,
        error: null,
        response: null,
      })

      const mockRepo = {
        findPublishedByWorkspace: vi.fn().mockResolvedValue({
          ok: true,
          data: [mockCourse, { ...mockCourse, id: '00000000-0000-0000-0000-000000000006' }],
        }),
        getUserProgress: vi.fn().mockResolvedValue({
          ok: true,
          data: mockProgress,
        }),
      }

      mockCursosRepository.mockImplementation(() => mockRepo as any)

      const request = new NextRequest(
        `http://localhost:3000/api/cursos?workspaceId=${mockWorkspaceId}`
      )

      const response = await GET(request)
      const result = await response.json()

      expect(result.data.total).toBe(2)
      expect(result.data.courses).toHaveLength(2)
    })

    it('should set course status based on progress', async () => {
      mockGetAuthUser.mockResolvedValue({
        user: mockUser,
        supabase: {} as any,
        error: null,
        response: null,
      })

      const mockRepo = {
        findPublishedByWorkspace: vi.fn().mockResolvedValue({
          ok: true,
          data: [mockCourse],
        }),
        getUserProgress: vi.fn().mockResolvedValue({
          ok: true,
          data: mockProgress,
        }),
      }

      mockCursosRepository.mockImplementation(() => mockRepo as any)

      const request = new NextRequest(
        `http://localhost:3000/api/cursos?workspaceId=${mockWorkspaceId}`
      )

      const response = await GET(request)
      const result = await response.json()

      expect(result.data.courses[0].status).toBe('completed')
    })
  })
})
