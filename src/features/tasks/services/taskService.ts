import { supabase } from '@/lib/supabase'
import type { Database } from '../supabase/types'

type Task = Database['public']['Tables']['tasks']['Row']
type TaskInsert = Database['public']['Tables']['tasks']['Insert']
type TaskUpdate = Database['public']['Tables']['tasks']['Update']

export interface TasksListResponse {
  success: boolean
  data?: Task[]
  pagination?: {
    total: number
    limit: number
    offset: number
  }
  error?: string
}

export interface TasksResponse<T = Task> {
  success: boolean
  data?: T
  error?: string
}

export class TasksService {
  /**
   * Get tasks for the authenticated user with filtering
   */
  static async getUserTasks(
    userId: string,
    options?: {
      project_id?: string
      milestone_id?: string
      status?: string
      priority?: string
      assignee_id?: string
      limit?: number
      offset?: number
    }
  ): Promise<TasksListResponse> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      let query = supabase
        .from('tasks')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      // Add filters
      if (options?.project_id) {
        query = query.eq('project_id', options.project_id)
      }

      if (options?.milestone_id) {
        query = query.eq('milestone_id', options.milestone_id)
      }

      if (options?.status && options.status !== 'all') {
        query = query.eq('status', options.status)
      }

      if (options?.priority && options.priority !== 'all') {
        query = query.eq('priority', options.priority)
      }

      if (options?.assignee_id && options.assignee_id !== 'all') {
        query = query.eq('assignee_id', options.assignee_id)
      }

      // Add pagination
      if (options?.offset !== undefined) {
        const limit = options.limit || 10
        query = query.range(options.offset, options.offset + limit - 1)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Tasks fetch error:', error)
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
      console.error('Tasks service error:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch tasks'
      }
    }
  }

  /**
   * Get a single task by ID
   */
  static async getTaskById(
    userId: string,
    taskId: string
  ): Promise<TasksResponse<Task>> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (error) {
        console.error('Task fetch error:', error)
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Task not found'
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
      console.error('Task service error:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch task'
      }
    }
  }

  /**
   * Create a new task
   */
  static async createTask(
    userId: string,
    taskData: TaskInsert
  ): Promise<TasksResponse<Task>> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      // Ensure the user is creating the task
      const dataToInsert = {
        ...taskData,
        reporter_id: userId,
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert(dataToInsert)
        .select()
        .single()

      if (error) {
        console.error('Task creation error:', error)
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
      console.error('Task creation service error:', error)
      return {
        success: false,
        error: error.message || 'Failed to create task'
      }
    }
  }

  /**
   * Update an existing task
   */
  static async updateTask(
    userId: string,
    taskId: string,
    updates: TaskUpdate
  ): Promise<TasksResponse<Task>> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single()

      if (error) {
        console.error('Task update error:', error)
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Task not found'
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
      console.error('Task update service error:', error)
      return {
        success: false,
        error: error.message || 'Failed to update task'
      }
    }
  }

  /**
   * Delete a task
   */
  static async deleteTask(
    userId: string,
    taskId: string
  ): Promise<TasksResponse<null>> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) {
        console.error('Task deletion error:', error)
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
      console.error('Task deletion service error:', error)
      return {
        success: false,
        error: error.message || 'Failed to delete task'
      }
    }
  }

  /**
   * Get task statistics for a project
   */
  static async getTaskStats(
    userId: string,
    projectId?: string
  ): Promise<{
    success: boolean
    data?: {
      total: number
      todo: number
      in_progress: number
      review: number
      done: number
      overdue: number
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
        .from('tasks')
        .select('status, due_date')

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data: tasks, error } = await query

      if (error) {
        console.error('Task stats error:', error)
        return {
          success: false,
          error: error.message
        }
      }

      const stats = {
        total: tasks?.length || 0,
        todo: tasks?.filter(t => t.status === 'todo').length || 0,
        in_progress: tasks?.filter(t => t.status === 'in_progress').length || 0,
        review: tasks?.filter(t => t.status === 'review').length || 0,
        done: tasks?.filter(t => t.status === 'done').length || 0,
        overdue: tasks?.filter(t => {
          if (t.status === 'done' || !t.due_date) return false
          return new Date(t.due_date) < new Date()
        }).length || 0,
      }

      return {
        success: true,
        data: stats
      }
    } catch (error: any) {
      console.error('Task stats service error:', error)
      return {
        success: false,
        error: error.message || 'Failed to get task statistics'
      }
    }
  }

  /**
   * Update task status with validation
   */
  static async updateTaskStatus(
    userId: string,
    taskId: string,
    newStatus: 'todo' | 'in_progress' | 'review' | 'done'
  ): Promise<TasksResponse<Task>> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      // Validate status transition (optional business logic)
      const validTransitions = {
        todo: ['in_progress'],
        in_progress: ['review', 'done'],
        review: ['in_progress', 'done'],
        done: [], // Done is final state
      }

      // Get current task status
      const { data: currentTask, error: fetchError } = await supabase
        .from('tasks')
        .select('status')
        .eq('id', taskId)
        .single()

      if (fetchError) {
        return {
          success: false,
          error: 'Task not found'
        }
      }

      // Allow any status change for now (can add validation later)
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)
        .select()
        .single()

      if (error) {
        console.error('Task status update error:', error)
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
      console.error('Task status update service error:', error)
      return {
        success: false,
        error: error.message || 'Failed to update task status'
      }
    }
  }
}


