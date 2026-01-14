/**
 * Subtask Repository
 * Type-safe database access for task_subtasks table
 */

import { BaseRepository, Result, Ok, Err } from './base-repository'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface Subtask {
  id: string
  task_id: string
  title: string
  completed: boolean
  position: string
  created_at: string
  updated_at: string
}

export interface CreateSubtaskData {
  task_id: string
  title: string
  completed?: boolean
  position: string
}

export interface UpdateSubtaskData {
  title?: string
  completed?: boolean
  position?: string
}

export class SubtaskRepository extends BaseRepository<Subtask> {
  protected table = 'task_subtasks'

  constructor(supabase: SupabaseClient) {
    super(supabase)
  }

  /**
   * Find all subtasks for a task, ordered by position
   */
  async findByTaskId(taskId: string): Promise<Result<Subtask[]>> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('task_id', taskId)
      .order('position', { ascending: true })

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch subtasks',
        details: error,
      })
    }

    return Ok(data as Subtask[])
  }

  /**
   * Get the last subtask for a task to determine next position
   */
  async getLastSubtask(taskId: string): Promise<Result<Subtask | null>> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('task_id', taskId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch last subtask',
        details: error,
      })
    }

    return Ok(data as Subtask | null)
  }

  /**
   * Create a new subtask
   */
  async createSubtask(data: CreateSubtaskData): Promise<Result<Subtask>> {
    const subtaskData = {
      ...data,
      completed: data.completed ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return this.create(subtaskData)
  }

  /**
   * Update a subtask, ensuring it belongs to the specified task
   */
  async updateSubtask(
    subtaskId: string,
    taskId: string,
    data: UpdateSubtaskData
  ): Promise<Result<Subtask>> {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error } = await this.supabase
      .from(this.table)
      .update(updateData)
      .eq('id', subtaskId)
      .eq('task_id', taskId)
      .select()
      .single()

    if (error) {
      // Check if record not found
      if (error.code === 'PGRST116') {
        return Err({
          code: 'NOT_FOUND',
          message: `Subtask with id ${subtaskId} not found`,
          details: { subtaskId, taskId },
        })
      }

      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to update subtask',
        details: error,
      })
    }

    return Ok(updated as Subtask)
  }

  /**
   * Delete a subtask, ensuring it belongs to the specified task
   */
  async deleteSubtask(subtaskId: string, taskId: string): Promise<Result<void>> {
    const { error } = await this.supabase
      .from(this.table)
      .delete()
      .eq('id', subtaskId)
      .eq('task_id', taskId)

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to delete subtask',
        details: error,
      })
    }

    return Ok(undefined)
  }
}
