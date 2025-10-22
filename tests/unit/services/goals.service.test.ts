import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GoalsService } from '@/features/goals/services/goalService'
import { supabase } from '@/lib/supabase-client'

// Mock Supabase
vi.mock('@/lib/supabase-client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }
}))

describe('GoalsService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  }

  const mockGoal = {
    id: 'goal-123',
    title: 'Test Goal',
    description: 'Test Description',
    type: 'personal',
    status: 'active',
    priority: 'medium',
    owner_id: 'user-123',
    organization_id: 'org-123',
    progress_percentage: 50,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getGoals', () => {
    it('should fetch goals successfully', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [mockGoal],
          error: null
        })
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await GoalsService.getGoals('org-123')

      expect(result).toEqual([mockGoal])
      expect(supabase.from).toHaveBeenCalledWith('goals')
      expect(mockQuery.eq).toHaveBeenCalledWith('organization_id', 'org-123')
    })

    it('should return empty array when no goals found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await GoalsService.getGoals()

      expect(result).toEqual([])
    })

    it('should handle errors gracefully', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error')
        })
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await GoalsService.getGoals()

      expect(result).toEqual([])
    })

    it('should return empty array when user not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await GoalsService.getGoals()

      expect(result).toEqual([])
    })
  })

  describe('getGoalAnalytics', () => {
    it('should calculate analytics correctly', async () => {
      const mockGoals = [
        { ...mockGoal, status: 'active', progress_percentage: 30 },
        { ...mockGoal, id: 'goal-456', status: 'completed', progress_percentage: 100 },
        { ...mockGoal, id: 'goal-789', status: 'active', progress_percentage: 70 }
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockGoals,
          error: null
        })
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await GoalsService.getGoalAnalytics('org-123')

      expect(result).toEqual({
        totalGoals: 3,
        activeGoals: 2,
        completedGoals: 1,
        overdueGoals: 0,
        averageProgress: 66.67,
        goalsByType: { personal: 3 },
        goalsByPriority: { medium: 3 }
      })
    })

    it('should handle empty goals list', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await GoalsService.getGoalAnalytics()

      expect(result).toEqual({
        totalGoals: 0,
        activeGoals: 0,
        completedGoals: 0,
        overdueGoals: 0,
        averageProgress: 0,
        goalsByType: {},
        goalsByPriority: {}
      })
    })
  })

  describe('createGoal', () => {
    it('should create goal successfully', async () => {
      const goalData = {
        title: 'New Goal',
        description: 'New Description',
        type: 'personal' as const,
        priority: 'high' as const
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockGoal, ...goalData },
          error: null
        })
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await GoalsService.createGoal(goalData)

      expect(result).toEqual({ ...mockGoal, ...goalData })
      expect(mockQuery.insert).toHaveBeenCalledWith({
        ...goalData,
        owner_id: mockUser.id,
        status: 'active',
        progress_percentage: 0
      })
    })

    it('should handle creation errors', async () => {
      const goalData = {
        title: 'New Goal',
        description: 'New Description',
        type: 'personal' as const,
        priority: 'high' as const
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Creation failed')
        })
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(GoalsService.createGoal(goalData)).rejects.toThrow('Failed to create goal')
    })
  })

  describe('updateGoal', () => {
    it('should update goal successfully', async () => {
      const updateData = {
        title: 'Updated Goal',
        progress_percentage: 75
      }

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockGoal, ...updateData },
          error: null
        })
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await GoalsService.updateGoal('goal-123', updateData)

      expect(result).toEqual({ ...mockGoal, ...updateData })
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'goal-123')
    })

    it('should handle update errors', async () => {
      const updateData = {
        title: 'Updated Goal'
      }

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Update failed')
        })
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(GoalsService.updateGoal('goal-123', updateData)).rejects.toThrow('Failed to update goal')
    })
  })

  describe('deleteGoal', () => {
    it('should delete goal successfully', async () => {
      const mockQuery = {
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

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockQuery as any)
        .mockReturnValueOnce(mockDeleteQuery as any)

      await GoalsService.deleteGoal('goal-123')

      expect(mockDeleteQuery.eq).toHaveBeenCalledWith('id', 'goal-123')
      expect(mockDeleteQuery.eq).toHaveBeenCalledWith('owner_id', mockUser.id)
    })

    it('should throw error when goal not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Not found')
        })
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(GoalsService.deleteGoal('goal-123')).rejects.toThrow('Goal not found or access denied')
    })

    it('should throw error when user not owner', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockGoal, owner_id: 'other-user' },
          error: null
        })
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(GoalsService.deleteGoal('goal-123')).rejects.toThrow('Access denied')
    })
  })
})
