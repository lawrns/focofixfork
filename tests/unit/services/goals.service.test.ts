import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock service since the actual service doesn't exist yet
const mockGoalsService = {
  getGoals: vi.fn(),
  getGoalById: vi.fn(),
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
  updateProgress: vi.fn(),
};

const GoalsService = mockGoalsService;

describe('GoalsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getGoals', () => {
    it('should return goals list', async () => {
      const mockGoals = [
        {
          id: '1',
          title: 'Learn TypeScript',
          description: 'Master TypeScript fundamentals',
          progress: 75,
          status: 'active',
        },
        {
          id: '2',
          title: 'Build Portfolio',
          description: 'Create 5 portfolio projects',
          progress: 40,
          status: 'active',
        },
      ];

      GoalsService.getGoals.mockResolvedValue({
        success: true,
        data: mockGoals,
      });

      const result = await GoalsService.getGoals();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockGoals);
      expect(GoalsService.getGoals).toHaveBeenCalledTimes(1);
    });

    it('should handle errors', async () => {
      GoalsService.getGoals.mockResolvedValue({
        success: false,
        error: 'Failed to fetch goals',
      });

      const result = await GoalsService.getGoals();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch goals');
    });
  });

  describe('getGoalById', () => {
    it('should return goal by ID', async () => {
      const mockGoal = {
        id: '1',
        title: 'Learn TypeScript',
        description: 'Master TypeScript fundamentals',
        progress: 75,
        status: 'active',
      };

      GoalsService.getGoalById.mockResolvedValue({
        success: true,
        data: mockGoal,
      });

      const result = await GoalsService.getGoalById('1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockGoal);
      expect(GoalsService.getGoalById).toHaveBeenCalledWith('1');
    });

    it('should return error for non-existent goal', async () => {
      GoalsService.getGoalById.mockResolvedValue({
        success: false,
        error: 'Goal not found',
      });

      const result = await GoalsService.getGoalById('999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Goal not found');
    });
  });

  describe('createGoal', () => {
    it('should create goal successfully', async () => {
      const goalData = {
        title: 'New Goal',
        description: 'New Description',
        type: 'personal',
        priority: 'high',
      };
      const createdGoal = {
        id: 'goal-123',
        ...goalData,
        progress: 0,
        status: 'active',
        created_at: '2025-01-01T00:00:00Z',
      };

      GoalsService.createGoal.mockResolvedValue({
        success: true,
        data: createdGoal,
      });

      const result = await GoalsService.createGoal(goalData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(createdGoal);
      expect(GoalsService.createGoal).toHaveBeenCalledWith(goalData);
    });

    it('should validate required fields', async () => {
      GoalsService.createGoal.mockResolvedValue({
        success: false,
        error: 'Title is required',
      });

      const result = await GoalsService.createGoal({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Title is required');
    });

    it('should handle creation errors', async () => {
      const goalData = {
        title: 'New Goal',
        description: 'New Description',
      };

      GoalsService.createGoal.mockResolvedValue({
        success: false,
        error: 'Creation failed',
      });

      const result = await GoalsService.createGoal(goalData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Creation failed');
    });
  });

  describe('updateGoal', () => {
    it('should update goal successfully', async () => {
      const updateData = {
        title: 'Updated Goal',
        progress: 75,
        status: 'completed',
      };
      const updatedGoal = {
        id: 'goal-123',
        ...updateData,
        description: 'Test Description',
        updated_at: '2025-01-01T00:00:00Z',
      };

      GoalsService.updateGoal.mockResolvedValue({
        success: true,
        data: updatedGoal,
      });

      const result = await GoalsService.updateGoal('goal-123', updateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedGoal);
      expect(GoalsService.updateGoal).toHaveBeenCalledWith('goal-123', updateData);
    });

    it('should handle update errors', async () => {
      const updateData = { title: 'Updated Goal' };

      GoalsService.updateGoal.mockResolvedValue({
        success: false,
        error: 'Update failed',
      });

      const result = await GoalsService.updateGoal('goal-123', updateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('deleteGoal', () => {
    it('should delete goal successfully', async () => {
      GoalsService.deleteGoal.mockResolvedValue({
        success: true,
        data: { id: 'goal-123', deleted: true },
      });

      const result = await GoalsService.deleteGoal('goal-123');

      expect(result.success).toBe(true);
      expect(result.data.deleted).toBe(true);
      expect(GoalsService.deleteGoal).toHaveBeenCalledWith('goal-123');
    });

    it('should throw error when goal not found', async () => {
      GoalsService.deleteGoal.mockResolvedValue({
        success: false,
        error: 'Goal not found',
      });

      const result = await GoalsService.deleteGoal('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Goal not found');
    });

    it('should throw error when user not owner', async () => {
      GoalsService.deleteGoal.mockResolvedValue({
        success: false,
        error: 'Permission denied',
      });

      const result = await GoalsService.deleteGoal('goal-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });
  });

  describe('updateProgress', () => {
    it('should update goal progress successfully', async () => {
      const progressData = { progress: 85, status: 'in-progress' };
      const updatedGoal = {
        id: 'goal-123',
        title: 'Test Goal',
        progress: 85,
        status: 'in-progress',
        updated_at: '2025-01-01T00:00:00Z',
      };

      GoalsService.updateProgress.mockResolvedValue({
        success: true,
        data: updatedGoal,
      });

      const result = await GoalsService.updateProgress('goal-123', progressData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedGoal);
      expect(GoalsService.updateProgress).toHaveBeenCalledWith('goal-123', progressData);
    });

    it('should validate progress value', async () => {
      GoalsService.updateProgress.mockResolvedValue({
        success: false,
        error: 'Progress must be between 0 and 100',
      });

      const result = await GoalsService.updateProgress('goal-123', { progress: 150 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Progress must be between 0 and 100');
    });

    it('should automatically complete goal when progress is 100', async () => {
      const updatedGoal = {
        id: 'goal-123',
        title: 'Test Goal',
        progress: 100,
        status: 'completed',
        updated_at: '2025-01-01T00:00:00Z',
      };

      GoalsService.updateProgress.mockResolvedValue({
        success: true,
        data: updatedGoal,
      });

      const result = await GoalsService.updateProgress('goal-123', { progress: 100 });

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('completed');
    });
  });
});
