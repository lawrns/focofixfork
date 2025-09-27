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
export class GoalsService {
  // ===============================
  // GOAL CRUD OPERATIONS
  // ===============================

  /**
   * Get all goals accessible to the current user
   */
  static async getGoals(userId: string): Promise<Goal[]> {
    if (!userId) throw new Error('User not authenticated')

    // For now, just return goals created by the user
    const { data, error } = await supabaseAdmin
      .from('goals')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching goals:', error)
      throw error
    }
    return data || []
  }

  /**
   * Get a single goal with full details
   */
  static async getGoal(id: string, userId: string): Promise<GoalWithDetails | null> {
    if (!userId) throw new Error('User not authenticated')

    // First get the goal
    const { data: goal, error: goalError } = await supabaseAdmin
      .from('goals')
      .select('*')
      .eq('id', id)
      .single()

    if (goalError) throw goalError
    if (!goal) return null

    // Check access permissions - for now, allow if user created the goal
    if (goal.created_by !== userId) {
      throw new Error('Access denied')
    }

    // Get milestones
    const { data: milestones, error: milestonesError } = await supabaseAdmin
      .from('goal_milestones')
      .select('*')
      .eq('goal_id', id)
      .order('created_at', { ascending: true })

    if (milestonesError) throw milestonesError

    // Get linked projects
    const { data: linkedProjects, error: linksError } = await supabaseAdmin
      .from('goal_project_links')
      .select(`
        project_id,
        projects:project_id (
          id,
          name,
          description,
          status
        )
      `)
      .eq('goal_id', id)

    if (linksError) throw linksError

    // Calculate progress
    const progress = this.calculateGoalProgress(milestones || [])

    // Check if overdue
    const isOverdue = goal.target_date && new Date(goal.target_date) < new Date() && progress.progressPercentage < 100

    return {
      ...goal,
      milestones: milestones || [],
      linkedProjects: linkedProjects?.map(lp => lp.projects).filter(Boolean) || [],
      progress: progress.progressPercentage,
      isOverdue
    }
  }

  /**
   * Create a new goal
   */
  static async createGoal(userId: string, goalData: CreateGoal): Promise<Goal> {
    if (!userId) throw new Error('User not authenticated')

    // Transform targetDate to target_date for database
    const dbGoalData = {
      ...goalData,
      target_date: goalData.targetDate,
      created_by: userId
    }
    delete dbGoalData.targetDate

    const { data, error } = await supabaseAdmin
      .from('goals')
      .insert(dbGoalData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update an existing goal
   */
  static async updateGoal(id: string, userId: string, updates: UpdateGoal): Promise<Goal> {
    if (!userId) throw new Error('User not authenticated')

    // Check ownership
    const { data: existingGoal } = await supabase
      .from('goals')
      .select('created_by')
      .eq('id', id)
      .single()

    if (!existingGoal || existingGoal.created_by !== userId) {
      throw new Error('Access denied')
    }

    const { data, error } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Delete a goal
   */
  static async deleteGoal(id: string, userId: string): Promise<void> {
    if (!userId) throw new Error('User not authenticated')

    // Check ownership
    const { data: existingGoal } = await supabase
      .from('goals')
      .select('created_by')
      .eq('id', id)
      .single()

    if (!existingGoal || existingGoal.created_by !== userId) {
      throw new Error('Access denied')
    }

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ===============================
  // MILESTONE OPERATIONS
  // ===============================

  /**
   * Get milestones for a goal
   */
  static async getMilestones(goalId: string, userId: string): Promise<GoalMilestone[]> {
    if (!userId) throw new Error('User not authenticated')

    // First verify user has access to the goal
    const { data: ownedGoal } = await supabaseAdmin
      .from('goals')
      .select('id')
      .eq('id', goalId)
      .eq('created_by', userId)
      .single()

    if (!ownedGoal) {
      throw new Error('Access denied')
    }

    const { data, error } = await supabaseAdmin
      .from('goal_milestones')
      .select('*')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Create a milestone for a goal
   */
  static async createMilestone(goalId: string, milestoneData: CreateMilestone, userId: string): Promise<GoalMilestone> {
    if (!userId) throw new Error('User not authenticated')

    // Verify goal ownership
    const { data: goal } = await supabase
      .from('goals')
      .select('created_by')
      .eq('id', goalId)
      .single()

    if (!goal || goal.created_by !== userId) {
      throw new Error('Access denied')
    }

    const { data, error } = await supabase
      .from('goal_milestones')
      .insert({
        ...milestoneData,
        goal_id: goalId
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update a milestone
   */
  static async updateMilestone(id: string, updates: UpdateMilestone): Promise<GoalMilestone> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Verify milestone ownership through goal
    const { data: milestone } = await supabase
      .from('goal_milestones')
      .select('goal_id, goal_milestones(*)')
      .eq('id', id)
      .single()

    if (!milestone) throw new Error('Milestone not found')

    const { data: goal } = await supabase
      .from('goals')
      .select('created_by')
      .eq('id', milestone.goal_id)
      .single()

    if (!goal || goal.created_by !== user.id) {
      throw new Error('Access denied')
    }

    const { data, error } = await supabase
      .from('goal_milestones')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ===============================
  // PROJECT LINKING OPERATIONS
  // ===============================

  /**
   * Get projects linked to a goal
   */
  static async getLinkedProjects(goalId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('goal_project_links')
      .select(`
        project_id,
        projects:project_id (
          id,
          name,
          description,
          status
        )
      `)
      .eq('goal_id', goalId)

    if (error) throw error
    return data?.map(lp => lp.projects).filter(Boolean) || []
  }

  /**
   * Link a project to a goal
   */
  static async linkProject(goalId: string, projectId: string): Promise<GoalProjectLink> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Verify goal ownership
    const { data: goal } = await supabase
      .from('goals')
      .select('created_by')
      .eq('id', goalId)
      .single()

    if (!goal || goal.created_by !== user.id) {
      throw new Error('Access denied')
    }

    // Verify project access
    const { data: projectMember } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!projectMember) {
      throw new Error('Project access denied')
    }

    const { data, error } = await supabase
      .from('goal_project_links')
      .insert({
        goal_id: goalId,
        project_id: projectId
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Unlink a project from a goal
   */
  static async unlinkProject(goalId: string, projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Verify goal ownership
    const { data: goal } = await supabase
      .from('goals')
      .select('created_by')
      .eq('id', goalId)
      .single()

    if (!goal || goal.created_by !== user.id) {
      throw new Error('Access denied')
    }

    const { error } = await supabase
      .from('goal_project_links')
      .delete()
      .eq('goal_id', goalId)
      .eq('project_id', projectId)

    if (error) throw error
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  /**
   * Get goal IDs accessible to a user (through project membership)
   */
  private static async getAccessibleGoalIds(userId: string): Promise<string[]> {
    try {
      // First get user's project IDs using admin client to bypass RLS
      const { data: userProjects, error: projectsError } = await supabaseAdmin
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId)

      if (projectsError) {
        console.error('Error fetching user projects:', projectsError)
        throw projectsError
      }

      const projectIds = userProjects?.map(p => p.project_id) || []
      console.log('User project IDs:', projectIds)

      if (projectIds.length === 0) {
        return []
      }

      // Then get goal IDs from those projects
      const { data, error } = await supabaseAdmin
        .from('goal_project_links')
        .select('goal_id')
        .in('project_id', projectIds)

      if (error) {
        console.error('Error fetching goal links:', error)
        throw error
      }

      const goalIds = data?.map(link => link.goal_id) || []
      console.log('Accessible goal IDs:', goalIds)
      return goalIds
    } catch (error) {
      console.error('getAccessibleGoalIds error:', error)
      throw error
    }
  }

  /**
   * Calculate goal progress based on milestones
   */
  private static calculateGoalProgress(milestones: GoalMilestone[]): GoalProgress {
    if (milestones.length === 0) {
      return {
        goalId: '',
        completedMilestones: 0,
        totalMilestones: 0,
        totalWeight: 0,
        completedWeight: 0,
        progressPercentage: 0,
        isOverdue: false
      }
    }

    const totalWeight = milestones.reduce((sum, m) => sum + m.weight, 0)
    const completedWeight = milestones
      .filter(m => m.status === 'completed')
      .reduce((sum, m) => sum + m.weight, 0)

    const progressPercentage = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0

    return {
      goalId: milestones[0]?.goalId || '',
      completedMilestones: milestones.filter(m => m.status === 'completed').length,
      totalMilestones: milestones.length,
      totalWeight,
      completedWeight,
      progressPercentage: Math.round(progressPercentage * 100) / 100, // Round to 2 decimal places
      isOverdue: false // Calculated at goal level
    }
  }

  /**
   * Get goal progress summary
   */
  static async getGoalProgress(goalId: string, userId: string): Promise<GoalProgress> {
    const milestones = await this.getMilestones(goalId, userId)
    return this.calculateGoalProgress(milestones)
  }
}

// Export singleton instance
export const goalsService = GoalsService
