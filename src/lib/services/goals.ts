import { supabase } from '@/lib/supabase';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  type: 'project' | 'milestone' | 'task' | 'organization' | 'personal';
  status: 'draft' | 'active' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'critical';
  target_value?: number;
  current_value?: number;
  unit?: string;
  start_date?: string;
  end_date?: string;
  progress_percentage: number;
  owner_id: string;
  organization_id?: string;
  project_id?: string;
  milestone_id?: string;
  task_id?: string;
  parent_goal_id?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface GoalProgress {
  id: string;
  goal_id: string;
  user_id: string;
  value: number;
  note?: string;
  created_at: string;
}

export interface GoalComment {
  id: string;
  goal_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export class GoalsService {
  // Goal CRUD operations
  static async getGoals(organizationId?: string, projectId?: string, userId?: string): Promise<Goal[]> {
    try {
      let query = supabase.from('goals').select('*').order('created_at', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      if (userId) {
        query = query.eq('owner_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching goals:', error);
      return [];
    }
  }

  static async getGoalById(id: string): Promise<Goal | null> {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching goal:', error);
      return null;
    }
  }

  static async createGoal(goal: Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'progress_percentage'>): Promise<Goal | null> {
    try {
      const goalData = {
        ...goal,
        progress_percentage: 0,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('goals')
        .insert(goalData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating goal:', error);
      return null;
    }
  }

  static async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal | null> {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('goals')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating goal:', error);
      return null;
    }
  }

  static async deleteGoal(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting goal:', error);
      return false;
    }
  }

  // Goal progress tracking
  static async updateGoalProgress(goalId: string, newValue: number, note?: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get current goal
      const goal = await this.getGoalById(goalId);
      if (!goal) throw new Error('Goal not found');

      // Calculate new progress percentage
      let progressPercentage = 0;
      if (goal.target_value && goal.target_value > 0) {
        progressPercentage = Math.min(100, (newValue / goal.target_value) * 100);
      }

      // Update goal with new values
      const updateData: Partial<Goal> = {
        current_value: newValue,
        progress_percentage: progressPercentage,
      };

      // Auto-complete goal if target reached
      if (progressPercentage >= 100 && goal.status === 'active') {
        updateData.status = 'completed';
      }

      await this.updateGoal(goalId, updateData);

      // Record progress entry
      const { error } = await supabase
        .from('goal_progress')
        .insert({
          goal_id: goalId,
          user_id: user.id,
          value: newValue,
          note,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating goal progress:', error);
      return false;
    }
  }

  static async getGoalProgress(goalId: string, userId: string): Promise<GoalProgress[]> {
    try {
      const { data, error } = await supabase
        .from('goal_progress')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching goal progress:', error);
      return [];
    }
  }

  // Goal comments
  static async addGoalComment(goalId: string, content: string): Promise<GoalComment | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('goal_comments')
        .insert({
          goal_id: goalId,
          user_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding goal comment:', error);
      return null;
    }
  }

  static async getGoalComments(goalId: string): Promise<GoalComment[]> {
    try {
      const { data, error } = await supabase
        .from('goal_comments')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching goal comments:', error);
      return [];
    }
  }

  // Goal templates
  static async getGoalTemplates(): Promise<Partial<Goal>[]> {
    // Predefined goal templates
    return [
      {
        title: 'Complete Project Launch',
        description: 'Successfully launch the project within the planned timeline',
        type: 'project',
        priority: 'high',
        target_value: 100,
        unit: 'percentage',
      },
      {
        title: 'Reduce Bug Count',
        description: 'Decrease the number of open bugs by a specific percentage',
        type: 'project',
        priority: 'high',
        target_value: 50,
        unit: 'bugs',
      },
      {
        title: 'Increase Team Productivity',
        description: 'Boost team productivity metrics by a target percentage',
        type: 'organization',
        priority: 'medium',
        target_value: 25,
        unit: 'percentage',
      },
      {
        title: 'Complete Code Reviews',
        description: 'Ensure all pull requests have been reviewed within SLA',
        type: 'milestone',
        priority: 'medium',
        target_value: 100,
        unit: 'reviews',
      },
      {
        title: 'Achieve Sprint Velocity',
        description: 'Meet the planned sprint velocity target',
        type: 'milestone',
        priority: 'medium',
        target_value: 80,
        unit: 'story points',
      },
    ];
  }

  // Goal analytics
  static async getGoalAnalytics(organizationId?: string): Promise<{
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    overdueGoals: number;
    averageProgress: number;
    goalsByType: Record<string, number>;
    goalsByPriority: Record<string, number>;
  }> {
    try {
      const goals = await this.getGoals(organizationId);
      const now = new Date();

      const activeGoals = goals.filter(g => g.status === 'active');
      const completedGoals = goals.filter(g => g.status === 'completed');
      const overdueGoals = goals.filter(g =>
        g.end_date &&
        new Date(g.end_date) < now &&
        g.status === 'active'
      );

      const averageProgress = goals.length > 0
        ? goals.reduce((sum, g) => sum + g.progress_percentage, 0) / goals.length
        : 0;

      const goalsByType = goals.reduce((acc, goal) => {
        acc[goal.type] = (acc[goal.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const goalsByPriority = goals.reduce((acc, goal) => {
        acc[goal.priority] = (acc[goal.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalGoals: goals.length,
        activeGoals: activeGoals.length,
        completedGoals: completedGoals.length,
        overdueGoals: overdueGoals.length,
        averageProgress,
        goalsByType,
        goalsByPriority,
      };
    } catch (error) {
      console.error('Error fetching goal analytics:', error);
      return {
        totalGoals: 0,
        activeGoals: 0,
        completedGoals: 0,
        overdueGoals: 0,
        averageProgress: 0,
        goalsByType: {},
        goalsByPriority: {},
      };
    }
  }

  // Bulk operations
  static async bulkUpdateGoals(goalIds: string[], updates: Partial<Goal>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('goals')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .in('id', goalIds);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error bulk updating goals:', error);
      return false;
    }
  }

  static async bulkDeleteGoals(goalIds: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .in('id', goalIds);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error bulk deleting goals:', error);
      return false;
    }
  }
}
