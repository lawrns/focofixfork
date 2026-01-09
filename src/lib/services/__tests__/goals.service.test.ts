import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GoalsService } from '../goals.service'
import { supabaseAdmin } from '../../supabase-server'

// Mock Supabase
vi.mock('../../supabase-server', () => ({
  supabaseAdmin: {
    from: vi.fn()
  }
}))

describe('GoalsService', () => {
  const mockUserId = 'user-123'
  const mockOrganizationId = 'org-456'
  const mockProjectId = 'project-789'
  const mockGoalId = 'goal-abc'

  const mockGoal = {
    id: mockGoalId,
    organization_id: mockOrganizationId,
    project_id: mockProjectId,
    name: 'Increase Revenue',
    description: 'Increase monthly recurring revenue by 50%',
    status: 'active',
    owner_id: mockUserId,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    created_at: '2026-01-01',
    updated_at: '2026-01-01'
  }

  const mockMilestone = {
    id: 'milestone-123',
    goal_id: mockGoalId,
    name: 'Key Result 1',
    description: 'Complete feature X',
    target_value: 100,
    current_value: 50,
    unit: 'percent',
    status: 'active',
    weight: 1,
    sort_order: 0,
    due_date: '2026-06-30',
    created_at: '2026-01-01',
    updated_at: '2026-01-01'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getGoals', () => {
    it('should fetch all goals for authenticated user', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)
      mockQuery.select.mockResolvedValue({
        data: [mockGoal],
        error: null
      })

      const result = await GoalsService.getGoals(mockUserId)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(mockGoal)
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('should filter goals by organization_id', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)
      mockQuery.select.mockResolvedValue({
        data: [mockGoal],
        error: null
      })

      const result = await GoalsService.getGoals(mockUserId, mockOrganizationId)

      expect(mockQuery.eq).toHaveBeenCalledWith('organization_id', mockOrganizationId)
      expect(result).toHaveLength(1)
    })

    it('should filter goals by project_id', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)
      mockQuery.select.mockResolvedValue({
        data: [mockGoal],
        error: null
      })

      const result = await GoalsService.getGoals(mockUserId, undefined, mockProjectId)

      expect(mockQuery.eq).toHaveBeenCalledWith('project_id', mockProjectId)
      expect(result).toHaveLength(1)
    })

    it('should return empty array on error', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis()
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)
      mockQuery.select.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })

      const result = await GoalsService.getGoals(mockUserId)

      expect(result).toEqual([])
    })

    it('should throw error for unauthenticated user', async () => {
      await expect(GoalsService.getGoals('')).rejects.toThrow('User not authenticated')
    })
  })

  describe('getGoal', () => {
    it('should fetch a single goal with details', async () => {
      const mockGoalQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockGoal,
          error: null
        })
      }

      const mockMilestonesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [mockMilestone],
          error: null
        })
      }

      const mockProjectLinksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(mockGoalQuery as any)
        .mockReturnValueOnce(mockMilestonesQuery as any)
        .mockReturnValueOnce(mockProjectLinksQuery as any)
        .mockReturnValueOnce(mockMilestonesQuery as any)
        .mockReturnValueOnce(mockGoalQuery as any)

      const result = await GoalsService.getGoal(mockGoalId, mockUserId)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(mockGoalId)
      expect(result?.milestones).toHaveLength(1)
      expect(result?.linked_projects).toEqual([])
      expect(result?.progress).toBeDefined()
    })

    it('should return null if goal not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)

      const result = await GoalsService.getGoal(mockGoalId, mockUserId)

      expect(result).toBeNull()
    })

    it('should throw error for unauthenticated user', async () => {
      await expect(GoalsService.getGoal(mockGoalId, '')).rejects.toThrow('User not authenticated')
    })
  })

  describe('createGoal', () => {
    it('should create a new goal', async () => {
      const newGoal = {
        organization_id: mockOrganizationId,
        name: 'New Goal',
        description: 'Test goal',
        status: 'draft' as const,
        start_date: '2026-01-01',
        end_date: '2026-12-31'
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockGoal, ...newGoal },
          error: null
        })
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)

      const result = await GoalsService.createGoal(mockUserId, newGoal)

      expect(result.name).toBe('New Goal')
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ...newGoal,
          owner_id: mockUserId
        })
      )
    })

    it('should throw error for unauthenticated user', async () => {
      await expect(GoalsService.createGoal('', {} as any)).rejects.toThrow('User not authenticated')
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

      await expect(
        GoalsService.createGoal(mockUserId, {
          name: 'Test',
          description: 'Test',
          status: 'active'
        } as any)
      ).rejects.toThrow('Failed to create goal')
    })
  })

  describe('updateGoal', () => {
    it('should update an existing goal', async () => {
      const updates = {
        name: 'Updated Goal',
        status: 'completed' as const
      }

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockGoal, ...updates },
          error: null
        })
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)

      const result = await GoalsService.updateGoal(mockGoalId, mockUserId, updates)

      expect(result.name).toBe('Updated Goal')
      expect(result.status).toBe('completed')
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining(updates)
      )
    })

    it('should throw error for unauthenticated user', async () => {
      await expect(GoalsService.updateGoal(mockGoalId, '', {})).rejects.toThrow('User not authenticated')
    })
  })

  describe('deleteGoal', () => {
    it('should delete a goal owned by user', async () => {
      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockGoal,
          error: null
        })
      }

      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      }

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(mockFetchQuery as any)
        .mockReturnValueOnce(mockDeleteQuery as any)

      await expect(GoalsService.deleteGoal(mockGoalId, mockUserId)).resolves.not.toThrow()
      expect(mockDeleteQuery.eq).toHaveBeenCalledWith('id', mockGoalId)
    })

    it('should deny deletion for non-owner without permissions', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockGoal, owner_id: 'different-user' },
          error: null
        })
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)

      await expect(GoalsService.deleteGoal(mockGoalId, mockUserId)).rejects.toThrow('Access denied')
    })

    it('should throw error for unauthenticated user', async () => {
      await expect(GoalsService.deleteGoal(mockGoalId, '')).rejects.toThrow('User not authenticated')
    })
  })

  describe('getMilestones', () => {
    it('should fetch milestones for a goal', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [mockMilestone],
          error: null
        })
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)

      const result = await GoalsService.getMilestones(mockGoalId, mockUserId)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(mockMilestone)
      expect(mockQuery.eq).toHaveBeenCalledWith('goal_id', mockGoalId)
      expect(mockQuery.order).toHaveBeenCalledWith('sort_order', { ascending: true })
    })

    it('should return empty array on error', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Error' }
        })
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)

      const result = await GoalsService.getMilestones(mockGoalId, mockUserId)

      expect(result).toEqual([])
    })
  })

  describe('createMilestone', () => {
    it('should create a milestone for a goal', async () => {
      const newMilestone = {
        name: 'Key Result',
        description: 'Test key result',
        target_value: 100,
        current_value: 0,
        unit: 'percent',
        status: 'active' as const,
        weight: 1,
        sort_order: 0
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

      const result = await GoalsService.createMilestone(mockGoalId, newMilestone, mockUserId)

      expect(result.name).toBe('Key Result')
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ...newMilestone,
          goal_id: mockGoalId
        })
      )
    })

    it('should throw error for unauthenticated user', async () => {
      await expect(
        GoalsService.createMilestone(mockGoalId, {} as any, '')
      ).rejects.toThrow('User not authenticated')
    })
  })

  describe('updateMilestone', () => {
    it('should update a milestone', async () => {
      const updates = {
        current_value: 75,
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

      const result = await GoalsService.updateMilestone(mockMilestone.id, updates)

      expect(result.current_value).toBe(75)
      expect(result.status).toBe('completed')
    })
  })

  describe('linkProject', () => {
    it('should link a project to a goal', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'link-123',
            goal_id: mockGoalId,
            project_id: mockProjectId,
            created_at: '2026-01-01',
            updated_at: '2026-01-01'
          },
          error: null
        })
      }

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)

      const result = await GoalsService.linkProject(mockGoalId, mockProjectId)

      expect(result.goal_id).toBe(mockGoalId)
      expect(result.project_id).toBe(mockProjectId)
    })
  })

  describe('unlinkProject', () => {
    it('should unlink a project from a goal', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      }

      mockQuery.eq.mockResolvedValue({
        error: null
      })

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any)

      await expect(GoalsService.unlinkProject(mockGoalId, mockProjectId)).resolves.not.toThrow()
    })
  })

  describe('getGoalProgress', () => {
    it('should calculate goal progress based on milestones', async () => {
      const milestones = [
        { ...mockMilestone, status: 'completed', weight: 2 },
        { ...mockMilestone, id: 'milestone-2', status: 'active', weight: 1 },
        { ...mockMilestone, id: 'milestone-3', status: 'completed', weight: 1 }
      ]

      const mockMilestonesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: milestones,
          error: null
        })
      }

      const mockGoalQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { end_date: '2026-12-31', status: 'active' },
          error: null
        })
      }

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(mockMilestonesQuery as any)
        .mockReturnValueOnce(mockGoalQuery as any)

      const result = await GoalsService.getGoalProgress(mockGoalId, mockUserId)

      expect(result.totalMilestones).toBe(3)
      expect(result.completedMilestones).toBe(2)
      expect(result.totalWeight).toBe(4)
      expect(result.completedWeight).toBe(3)
      expect(result.progressPercentage).toBe(75)
    })

    it('should detect overdue goals', async () => {
      const mockMilestonesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      const mockGoalQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { end_date: '2025-01-01', status: 'active' },
          error: null
        })
      }

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(mockMilestonesQuery as any)
        .mockReturnValueOnce(mockGoalQuery as any)

      const result = await GoalsService.getGoalProgress(mockGoalId, mockUserId)

      expect(result.isOverdue).toBe(true)
    })
  })
})
