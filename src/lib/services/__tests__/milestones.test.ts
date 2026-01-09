import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MilestonesService } from '../milestones'
import { supabaseAdmin } from '../../supabase-server'

// Mock Supabase
vi.mock('../../supabase-server', () => ({
  supabaseAdmin: {
    from: vi.fn()
  }
}))

describe('MilestonesService', () => {
  const mockUserId = 'user-123'
  const mockProjectId = 'project-456'
  const mockMilestoneId = 'milestone-789'

  const mockMilestone = {
    id: mockMilestoneId,
    project_id: mockProjectId,
    name: 'Launch MVP',
    description: 'Launch minimum viable product',
    status: 'active',
    priority: 'high',
    due_date: '2026-03-01',
    created_by: mockUserId,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    progress_percentage: 50
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUserMilestones', () => {
    it('should fetch milestones for authenticated user', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis()
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)
      mockQuery.select.mockResolvedValue({
        data: [mockMilestone],
        error: null,
        count: 1
      })

      const result = await MilestonesService.getUserMilestones(mockUserId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual([mockMilestone])
      expect(result.pagination?.total).toBe(1)
    })

    it('should filter milestones by project_id', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis()
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)
      mockQuery.select.mockResolvedValue({
        data: [mockMilestone],
        error: null,
        count: 1
      })

      const result = await MilestonesService.getUserMilestones(mockUserId, {
        project_id: mockProjectId
      })

      expect(mockQuery.eq).toHaveBeenCalledWith('project_id', mockProjectId)
      expect(result.success).toBe(true)
    })

    it('should filter milestones by status', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis()
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)
      mockQuery.select.mockResolvedValue({
        data: [mockMilestone],
        error: null,
        count: 1
      })

      const result = await MilestonesService.getUserMilestones(mockUserId, {
        status: 'active'
      })

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'active')
      expect(result.success).toBe(true)
    })

    it('should apply pagination', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis()
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)
      mockQuery.select.mockResolvedValue({
        data: [mockMilestone],
        error: null,
        count: 1
      })

      const result = await MilestonesService.getUserMilestones(mockUserId, {
        limit: 20,
        offset: 10
      })

      expect(mockQuery.range).toHaveBeenCalledWith(10, 29)
      expect(result.pagination?.limit).toBe(20)
      expect(result.pagination?.offset).toBe(10)
    })

    it('should handle database errors', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis()
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)
      mockQuery.select.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
        count: 0
      })

      const result = await MilestonesService.getUserMilestones(mockUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database connection failed')
    })

    it('should return error for unauthenticated user', async () => {
      const result = await MilestonesService.getUserMilestones('')

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })
  })

  describe('getMilestoneById', () => {
    it('should fetch a single milestone by ID', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockMilestone,
          error: null
        })
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)

      const result = await MilestonesService.getMilestoneById(mockUserId, mockMilestoneId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockMilestone)
    })

    it('should handle milestone not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)

      const result = await MilestonesService.getMilestoneById(mockUserId, mockMilestoneId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Milestone not found')
    })
  })

  describe('createMilestone', () => {
    it('should create a new milestone', async () => {
      const newMilestone = {
        project_id: mockProjectId,
        name: 'New Milestone',
        description: 'Test milestone',
        status: 'planned' as const,
        priority: 'medium' as const,
        due_date: '2026-03-01'
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockMilestone, ...newMilestone },
          error: null
        })
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)

      const result = await MilestonesService.createMilestone(mockUserId, newMilestone)

      expect(result.success).toBe(true)
      expect(result.data?.name).toBe('New Milestone')
      expect(mockQuery.insert).toHaveBeenCalledWith({
        ...newMilestone,
        created_by: mockUserId
      })
    })

    it('should return error for unauthenticated user', async () => {
      const result = await MilestonesService.createMilestone('', {} as any)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })

    it('should handle creation errors', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Constraint violation' }
        })
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)

      const result = await MilestonesService.createMilestone(mockUserId, {
        project_id: mockProjectId,
        name: 'Test',
        status: 'planned',
        priority: 'low'
      } as any)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Constraint violation')
    })
  })

  describe('updateMilestone', () => {
    it('should update an existing milestone', async () => {
      const updates = {
        name: 'Updated Milestone',
        status: 'completed' as const
      }

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockMilestone, ...updates },
          error: null
        })
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)

      const result = await MilestonesService.updateMilestone(mockUserId, mockMilestoneId, updates)

      expect(result.success).toBe(true)
      expect(result.data?.name).toBe('Updated Milestone')
      expect(result.data?.status).toBe('completed')
    })

    it('should handle update of non-existent milestone', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)

      const result = await MilestonesService.updateMilestone(mockUserId, mockMilestoneId, {})

      expect(result.success).toBe(false)
      expect(result.error).toBe('Milestone not found')
    })
  })

  describe('deleteMilestone', () => {
    it('should delete a milestone', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)

      const result = await MilestonesService.deleteMilestone(mockUserId, mockMilestoneId)

      expect(result.success).toBe(true)
      expect(mockQuery.eq).toHaveBeenCalledWith('id', mockMilestoneId)
    })

    it('should handle deletion errors', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: { message: 'Foreign key constraint' }
        })
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)

      const result = await MilestonesService.deleteMilestone(mockUserId, mockMilestoneId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Foreign key constraint')
    })
  })

  describe('completeMilestone', () => {
    it('should complete a milestone and set progress to 100%', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            ...mockMilestone,
            status: 'completed',
            progress_percentage: 100
          },
          error: null
        })
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)

      const result = await MilestonesService.completeMilestone(mockUserId, mockMilestoneId)

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('completed')
      expect(result.data?.progress_percentage).toBe(100)
    })
  })

  describe('getMilestonesWithTaskCounts', () => {
    it('should fetch milestones with task counts', async () => {
      const mockMilestonesQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      }

      const mockTasksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            { status: 'done' },
            { status: 'in-progress' },
            { status: 'done' }
          ],
          error: null
        })
      }

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce({
          ...mockMilestonesQuery,
          select: vi.fn().mockResolvedValue({
            data: [mockMilestone],
            error: null,
            count: 1
          })
        } as any)
        .mockReturnValue(mockTasksQuery as any)

      const result = await MilestonesService.getMilestonesWithTaskCounts(mockUserId, mockProjectId)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].task_count).toBe(3)
      expect(result.data?.[0].completed_tasks).toBe(2)
    })
  })

  describe('getMilestoneStats', () => {
    it('should return milestone statistics', async () => {
      const mockMilestones = [
        { status: 'planned', due_date: '2026-03-01' },
        { status: 'active', due_date: '2026-02-01' },
        { status: 'completed', due_date: '2026-01-15' },
        { status: 'cancelled', due_date: '2026-01-20' }
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockMilestones,
          error: null
        })
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)

      const result = await MilestonesService.getMilestoneStats(mockUserId, mockProjectId)

      expect(result.success).toBe(true)
      expect(result.data?.total).toBe(4)
      expect(result.data?.planned).toBe(1)
      expect(result.data?.active).toBe(1)
      expect(result.data?.completed).toBe(1)
      expect(result.data?.cancelled).toBe(1)
    })
  })
})
