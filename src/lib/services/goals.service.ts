import { supabase } from '@/lib/supabase-client'
import { supabaseAdmin } from '@/lib/supabase-server'
import type {
  Goal,
  CreateGoal,
  UpdateGoal,
  GoalMilestone,
  CreateMilestone,
  UpdateMilestone,
  GoalProjectLink,
  CreateGoalProjectLink,
  GoalWithDetails,
  GoalProgress
} from '@/lib/validation/schemas/goals'

// GoalsService class for managing goal-related operations
// TODO: Implement when goals tables are added to database
export class GoalsService {
  // ===============================
  // GOAL CRUD OPERATIONS
  // ===============================

  /**
   * Get all goals accessible to the current user
   */
  static async getGoals(userId: string, organizationId?: string, projectId?: string): Promise<Goal[]> {
    if (!userId) throw new Error('User not authenticated')

    try {
      let query = (supabase as any)
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false })

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching goals:', error)
      return []
    }
  }

  /**
   * Get a single goal with full details
   */
  static async getGoal(id: string, userId: string): Promise<GoalWithDetails | null> {
    if (!userId) throw new Error('User not authenticated')

    try {
      const { data: goal, error: goalError } = await (supabase as any)
        .from('goals')
        .select('*')
        .eq('id', id)
        .single()

      if (goalError) throw goalError
      if (!goal) return null

      // Fetch milestones
      const { data: milestones } = await (supabase as any)
        .from('goal_milestones')
        .select('*')
        .eq('goal_id', id)
        .order('sort_order', { ascending: true })

      // Fetch linked projects
      const { data: projectLinks } = await (supabase as any)
        .from('goal_project_links')
        .select('*, projects(*)')
        .eq('goal_id', id)

      return {
        ...goal,
        milestones: milestones || [],
        linked_projects: projectLinks || [],
        progress: await this.getGoalProgress(id, userId)
      } as GoalWithDetails
    } catch (error) {
      console.error('Error fetching goal:', error)
      return null
    }
  }

  /**
   * Create a new goal
   */
  static async createGoal(userId: string, goalData: CreateGoal): Promise<Goal> {
    if (!userId) throw new Error('User not authenticated')

    try {
      const { data, error } = await (supabase as any)
        .from('goals')
        .insert({
          ...goalData,
          owner_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating goal:', error)
      throw new Error('Failed to create goal')
    }
  }

  /**
   * Update an existing goal
   */
  static async updateGoal(id: string, userId: string, updates: UpdateGoal): Promise<Goal> {
    if (!userId) throw new Error('User not authenticated')

    try {
      const { data, error } = await (supabase as any)
        .from('goals')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating goal:', error)
      throw new Error('Failed to update goal')
    }
  }

  /**
   * Delete a goal
   */
  static async deleteGoal(id: string, userId: string): Promise<void> {
    if (!userId) throw new Error('User not authenticated')

    try {
      const { error } = await (supabase as any)
        .from('goals')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting goal:', error)
      throw new Error('Failed to delete goal')
    }
  }

  // ===============================
  // MILESTONE OPERATIONS
  // ===============================

  /**
   * Get milestones for a goal
   */
  static async getMilestones(goalId: string, userId: string): Promise<GoalMilestone[]> {
    if (!userId) throw new Error('User not authenticated')

    try {
      const { data, error } = await (supabase as any)
        .from('goal_milestones')
        .select('*')
        .eq('goal_id', goalId)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching milestones:', error)
      return []
    }
  }

  /**
   * Create a milestone for a goal
   */
  static async createMilestone(goalId: string, milestoneData: CreateMilestone, userId: string): Promise<GoalMilestone> {
    if (!userId) throw new Error('User not authenticated')

    try {
      const { data, error } = await (supabase as any)
        .from('goal_milestones')
        .insert({
          ...milestoneData,
          goal_id: goalId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating milestone:', error)
      throw new Error('Failed to create milestone')
    }
  }

  /**
   * Update a milestone
   */
  static async updateMilestone(id: string, updates: UpdateMilestone): Promise<GoalMilestone> {
    try {
      const { data, error } = await (supabase as any)
        .from('goal_milestones')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating milestone:', error)
      throw new Error('Failed to update milestone')
    }
  }

  // ===============================
  // PROJECT LINKING OPERATIONS
  // ===============================

  /**
   * Get projects linked to a goal
   */
  static async getLinkedProjects(goalId: string): Promise<any[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('goal_project_links')
        .select('*, projects(*)')
        .eq('goal_id', goalId)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching linked projects:', error)
      return []
    }
  }

  /**
   * Link a project to a goal
   */
  static async linkProject(goalId: string, projectId: string): Promise<GoalProjectLink> {
    try {
      const { data, error } = await (supabase as any)
        .from('goal_project_links')
        .insert({
          goal_id: goalId,
          project_id: projectId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error linking project:', error)
      throw new Error('Failed to link project')
    }
  }

  /**
   * Unlink a project from a goal
   */
  static async unlinkProject(goalId: string, projectId: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('goal_project_links')
        .delete()
        .eq('goal_id', goalId)
        .eq('project_id', projectId)

      if (error) throw error
    } catch (error) {
      console.error('Error unlinking project:', error)
      throw new Error('Failed to unlink project')
    }
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  /**
   * Get goal IDs accessible to a user (through project membership)
   */
  private static async getAccessibleGoalIds(userId: string): Promise<string[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('goals')
        .select('id')

      if (error) throw error
      return data?.map(g => g.id) || []
    } catch (error) {
      console.error('Error fetching accessible goal IDs:', error)
      return []
    }
  }

  /**
   * Calculate goal progress based on milestones
   */
  private static calculateGoalProgress(goalId: string, milestones: GoalMilestone[], goal?: any): GoalProgress {
    const totalMilestones = milestones.length
    const completedMilestones = milestones.filter(m => m.status === 'completed').length
    const totalWeight = milestones.reduce((sum, m) => sum + (m.weight || 1), 0)
    const completedWeight = milestones
      .filter(m => m.status === 'completed')
      .reduce((sum, m) => sum + (m.weight || 1), 0)

    const progressPercentage = totalWeight > 0
      ? Math.round((completedWeight / totalWeight) * 100)
      : 0

    const isOverdue = goal?.end_date
      ? new Date(goal.end_date) < new Date() && goal.status !== 'completed'
      : false

    return {
      goalId,
      completedMilestones,
      totalMilestones,
      totalWeight,
      completedWeight,
      progressPercentage,
      isOverdue
    }
  }

  /**
   * Get goal progress summary
   */
  static async getGoalProgress(goalId: string, userId: string): Promise<GoalProgress> {
    try {
      const milestones = await this.getMilestones(goalId, userId)
      const { data: goal } = await (supabase as any)
        .from('goals')
        .select('end_date, status')
        .eq('id', goalId)
        .single()

      return this.calculateGoalProgress(goalId, milestones, goal)
    } catch (error) {
      console.error('Error calculating goal progress:', error)
      return this.calculateGoalProgress(goalId, [])
    }
  }
}

// Export singleton instance
export const goalsService = GoalsService
