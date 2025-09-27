import { supabaseAdmin as supabase } from '../supabase-server'
import type { Database } from '@/lib/supabase'

type Milestone = Database['public']['Tables']['milestones']['Row']
type MilestoneInsert = Database['public']['Tables']['milestones']['Insert']
type MilestoneUpdate = Database['public']['Tables']['milestones']['Update']

export interface MilestonesListResponse {
  success: boolean
  data?: Milestone[]
  pagination?: {
    total: number
    limit: number
    offset: number
  }
  error?: string
}

export interface MilestonesResponse<T = Milestone> {
  success: boolean
  data?: T
  error?: string
}

export class MilestonesService {
  /**
   * Get milestones for the authenticated user with filtering
   */
  static async getUserMilestones(
    userId: string,
    options?: {
      project_id?: string
      status?: string
      limit?: number
      offset?: number
    }
  ): Promise<MilestonesListResponse> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      let query = supabase
        .from('milestones')
        .select('*', { count: 'exact' })
        .order('due_date', { ascending: true, nullsFirst: false })

      // Add filters
      if (options?.project_id) {
        query = query.eq('project_id', options.project_id)
      }

      if (options?.status && options.status !== 'all') {
        query = query.eq('status', options.status)
      }

      // Add pagination
      if (options?.offset !== undefined) {
        const limit = options.limit || 10
        query = query.range(options.offset, options.offset + limit - 1)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Milestones fetch error:', error)
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data: data || [],
        pagination: {
          total: count || 0,
          limit: options?.limit || 10,
          offset: options?.offset || 0,
        }
      }
    } catch (error: any) {
      console.error('Milestones service error:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch milestones'
      }
    }
  }

  /**
   * Get a single milestone by ID
   */
  static async getMilestoneById(
    userId: string,
    milestoneId: string
  ): Promise<MilestonesResponse<Milestone>> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('id', milestoneId)
        .single()

      if (error) {
        console.error('Milestone fetch error:', error)
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Milestone not found'
          }
        }
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data
      }
    } catch (error: any) {
      console.error('Milestone service error:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch milestone'
      }
    }
  }

  /**
   * Create a new milestone
   */
  static async createMilestone(
    userId: string,
    milestoneData: MilestoneInsert
  ): Promise<MilestonesResponse<Milestone>> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      // Ensure the user is creating the milestone
      const dataToInsert = {
        ...milestoneData,
        created_by: userId,
      }

      const { data, error } = await supabase
        .from('milestones')
        .insert(dataToInsert)
        .select()
        .single()

      if (error) {
        console.error('Milestone creation error:', error)
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data
      }
    } catch (error: any) {
      console.error('Milestone creation service error:', error)
      return {
        success: false,
        error: error.message || 'Failed to create milestone'
      }
    }
  }

  /**
   * Update an existing milestone
   */
  static async updateMilestone(
    userId: string,
    milestoneId: string,
    updates: MilestoneUpdate
  ): Promise<MilestonesResponse<Milestone>> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      const { data, error } = await supabase
        .from('milestones')
        .update(updates)
        .eq('id', milestoneId)
        .select()
        .single()

      if (error) {
        console.error('Milestone update error:', error)
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Milestone not found'
          }
        }
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data
      }
    } catch (error: any) {
      console.error('Milestone update service error:', error)
      return {
        success: false,
        error: error.message || 'Failed to update milestone'
      }
    }
  }

  /**
   * Delete a milestone
   */
  static async deleteMilestone(
    userId: string,
    milestoneId: string
  ): Promise<MilestonesResponse<null>> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      const { error } = await supabase
        .from('milestones')
        .delete()
        .eq('id', milestoneId)

      if (error) {
        console.error('Milestone deletion error:', error)
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data: null
      }
    } catch (error: any) {
      console.error('Milestone deletion service error:', error)
      return {
        success: false,
        error: error.message || 'Failed to delete milestone'
      }
    }
  }

  /**
   * Get milestone statistics for a project
   */
  static async getMilestoneStats(
    userId: string,
    projectId?: string
  ): Promise<{
    success: boolean
    data?: {
      total: number
      planned: number
      active: number
      completed: number
      cancelled: number
      overdue: number
      on_track: number
    }
    error?: string
  }> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      let query = supabase
        .from('milestones')
        .select('status, due_date')

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data: milestones, error } = await query

      if (error) {
        console.error('Milestone stats error:', error)
        return {
          success: false,
          error: error.message
        }
      }

      const now = new Date()
      const stats = {
        total: milestones?.length || 0,
        planned: milestones?.filter(m => m.status === 'planned').length || 0,
        active: milestones?.filter(m => m.status === 'active').length || 0,
        completed: milestones?.filter(m => m.status === 'completed').length || 0,
        cancelled: milestones?.filter(m => m.status === 'cancelled').length || 0,
        overdue: milestones?.filter(m => {
          if (m.status === 'completed' || m.status === 'cancelled' || !m.due_date) return false
          return new Date(m.due_date) < now
        }).length || 0,
        on_track: milestones?.filter(m => {
          if (m.status === 'completed' || m.status === 'cancelled' || !m.due_date) return false
          return new Date(m.due_date) >= now
        }).length || 0,
      }

      return {
        success: true,
        data: stats
      }
    } catch (error: any) {
      console.error('Milestone stats service error:', error)
      return {
        success: false,
        error: error.message || 'Failed to get milestone statistics'
      }
    }
  }

  /**
   * Complete a milestone (sets status to completed and completion_date)
   */
  static async completeMilestone(
    userId: string,
    milestoneId: string
  ): Promise<MilestonesResponse<Milestone>> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      const now = new Date().toISOString()
      const updates = {
        status: 'completed' as const,
        completion_date: now,
        progress_percentage: 100,
      }

      const { data, error } = await supabase
        .from('milestones')
        .update(updates)
        .eq('id', milestoneId)
        .select()
        .single()

      if (error) {
        console.error('Milestone completion error:', error)
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Milestone not found'
          }
        }
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data
      }
    } catch (error: any) {
      console.error('Milestone completion service error:', error)
      return {
        success: false,
        error: error.message || 'Failed to complete milestone'
      }
    }
  }

  /**
   * Get milestones with associated task counts
   */
  static async getMilestonesWithTaskCounts(
    userId: string,
    projectId?: string
  ): Promise<{
    success: boolean
    data?: Array<Milestone & {
      task_count: number
      completed_tasks: number
    }>
    error?: string
  }> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      // Get milestones
      const milestonesResult = await this.getUserMilestones(userId, { project_id: projectId })
      if (!milestonesResult.success) {
        return milestonesResult as any
      }

      // For each milestone, get task counts
      const milestonesWithCounts = await Promise.all(
        (milestonesResult.data || []).map(async (milestone) => {
          // Get tasks for this milestone
          const { data: tasks, error } = await supabase
            .from('tasks')
            .select('status')
            .eq('milestone_id', milestone.id)

          if (error) {
            console.error('Task count error:', error)
            return {
              ...milestone,
              task_count: 0,
              completed_tasks: 0,
            }
          }

          const taskCount = tasks?.length || 0
          const completedTasks = tasks?.filter(task => task.status === 'done').length || 0

          return {
            ...milestone,
            task_count: taskCount,
            completed_tasks: completedTasks,
          }
        })
      )

      return {
        success: true,
        data: milestonesWithCounts,
      }
    } catch (error: any) {
      console.error('Milestones with task counts service error:', error)
      return {
        success: false,
        error: error.message || 'Failed to get milestones with task counts'
      }
    }
  }
}