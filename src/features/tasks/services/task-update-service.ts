import { supabase } from '@/lib/supabase-client'

export interface TaskUpdateData {
  title?: string
  description?: string | null
  status?: 'todo' | 'in_progress' | 'review' | 'done'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  assignee_id?: string | null
  estimated_hours?: number | null
  actual_hours?: number | null
  due_date?: string | null
  milestone_id?: string | null
}

export class TaskUpdateService {
  /**
   * Update a task with the provided data
   */
  static async updateTask(taskId: string, updates: TaskUpdateData): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select(`
          *,
          assignee:assignee_id (
            id,
            email,
            user_metadata
          ),
          reporter:reporter_id (
            id,
            email,
            user_metadata
          )
        `)
        .single()

      if (error) {
        console.error('Task update error:', error)
        throw new Error(error.message || 'Failed to update task')
      }

      return data
    } catch (error) {
      console.error('Task update failed:', error)
      throw error
    }
  }

  /**
   * Update task status
   */
  static async updateTaskStatus(taskId: string, status: string): Promise<any> {
    return this.updateTask(taskId, { status: status as any })
  }

  /**
   * Update task priority
   */
  static async updateTaskPriority(taskId: string, priority: string): Promise<any> {
    return this.updateTask(taskId, { priority: priority as any })
  }

  /**
   * Update task assignee
   */
  static async updateTaskAssignee(taskId: string, assigneeId: string | null): Promise<any> {
    return this.updateTask(taskId, { assignee_id: assigneeId })
  }

  /**
   * Update task due date
   */
  static async updateTaskDueDate(taskId: string, dueDate: string | null): Promise<any> {
    return this.updateTask(taskId, { due_date: dueDate })
  }

  /**
   * Update task estimated hours
   */
  static async updateTaskEstimatedHours(taskId: string, hours: number | null): Promise<any> {
    return this.updateTask(taskId, { estimated_hours: hours })
  }

  /**
   * Update task actual hours
   */
  static async updateTaskActualHours(taskId: string, hours: number | null): Promise<any> {
    return this.updateTask(taskId, { actual_hours: hours })
  }

  /**
   * Update task milestone
   */
  static async updateTaskMilestone(taskId: string, milestoneId: string | null): Promise<any> {
    return this.updateTask(taskId, { milestone_id: milestoneId })
  }

  /**
   * Batch update multiple tasks
   */
  static async batchUpdateTasks(updates: Array<{ taskId: string; updates: TaskUpdateData }>): Promise<any[]> {
    const promises = updates.map(({ taskId, updates }) => 
      this.updateTask(taskId, updates)
    )

    try {
      const results = await Promise.allSettled(promises)
      
      const successful = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value)

      const failed = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => result.reason)

      if (failed.length > 0) {
        console.warn('Some task updates failed:', failed)
      }

      return successful
    } catch (error) {
      console.error('Batch task update failed:', error)
      throw error
    }
  }

  /**
   * Validate task update data
   */
  static validateTaskUpdate(updates: TaskUpdateData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (updates.title !== undefined) {
      if (typeof updates.title !== 'string') {
        errors.push('Title must be a string')
      } else if (updates.title.trim().length === 0) {
        errors.push('Title cannot be empty')
      } else if (updates.title.length > 500) {
        errors.push('Title must be less than 500 characters')
      }
    }

    if (updates.description !== undefined && updates.description !== null) {
      if (typeof updates.description !== 'string') {
        errors.push('Description must be a string')
      } else if (updates.description.length > 2000) {
        errors.push('Description must be less than 2000 characters')
      }
    }

    if (updates.status !== undefined) {
      const validStatuses = ['todo', 'in_progress', 'review', 'done']
      if (!validStatuses.includes(updates.status)) {
        errors.push('Invalid status')
      }
    }

    if (updates.priority !== undefined) {
      const validPriorities = ['low', 'medium', 'high', 'urgent']
      if (!validPriorities.includes(updates.priority)) {
        errors.push('Invalid priority')
      }
    }

    if (updates.estimated_hours !== undefined && updates.estimated_hours !== null) {
      if (typeof updates.estimated_hours !== 'number' || updates.estimated_hours < 0) {
        errors.push('Estimated hours must be a positive number')
      }
    }

    if (updates.actual_hours !== undefined && updates.actual_hours !== null) {
      if (typeof updates.actual_hours !== 'number' || updates.actual_hours < 0) {
        errors.push('Actual hours must be a positive number')
      }
    }

    if (updates.due_date !== undefined && updates.due_date !== null) {
      const date = new Date(updates.due_date)
      if (isNaN(date.getTime())) {
        errors.push('Invalid due date format')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

