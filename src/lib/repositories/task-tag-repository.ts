/**
 * Task Tag Repository
 * Type-safe database access for task tags and tag management
 */

import { BaseRepository, Result, Ok, Err, isError } from './base-repository'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface Tag {
  id: string
  name: string
  color: string
  workspace_id: string
  created_at: string
  updated_at: string
}

export interface TaskTag {
  task_id: string
  tag_id: string
  created_at: string
}

export interface TaskTagsResponse {
  task_id: string
  tags: Tag[]
}

export class TaskTagRepository extends BaseRepository<TaskTag> {
  protected table = 'task_tags'

  constructor(supabase: SupabaseClient) {
    super(supabase)
  }

  /**
   * Get all tags for a task
   */
  async getTagsForTask(taskId: string): Promise<Result<TaskTagsResponse>> {
    const { data, error } = await this.supabase
      .from('task_tags')
      .select('tag_id, tags(id, name, color, workspace_id)')
      .eq('task_id', taskId)

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch task tags',
        details: error,
      })
    }

    const tags = (data || [])
      .map((t: any) => t.tags)
      .filter(Boolean) as Tag[]

    return Ok({
      task_id: taskId,
      tags,
    })
  }

  /**
   * Get task by ID with workspace verification
   */
  async getTaskWithWorkspace(taskId: string): Promise<Result<{ id: string; workspace_id: string }>> {
    const { data, error } = await this.supabase
      .from('work_items')
      .select('id, workspace_id')
      .eq('id', taskId)
      .maybeSingle()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch task',
        details: error,
      })
    }

    if (!data) {
      return Err({
        code: 'NOT_FOUND',
        message: 'Task not found',
        details: { taskId },
      })
    }

    return Ok(data)
  }

  /**
   * Verify user has access to workspace
   */
  async verifyWorkspaceAccess(workspaceId: string, userId: string): Promise<Result<{ role: string }>> {
    const { data, error } = await this.supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to verify workspace access',
        details: error,
      })
    }

    if (!data) {
      return Err({
        code: 'WORKSPACE_ACCESS_DENIED',
        message: 'Access denied to workspace',
        details: { workspaceId, userId },
      })
    }

    return Ok(data)
  }

  /**
   * Verify tags belong to workspace
   */
  async verifyTagsInWorkspace(tagIds: string[], workspaceId: string): Promise<Result<Tag[]>> {
    const { data, error } = await this.supabase
      .from('tags')
      .select('id, name, color, workspace_id')
      .in('id', tagIds)

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch tags',
        details: error,
      })
    }

    const tags = (data || []) as Tag[]

    if (tags.length !== tagIds.length) {
      return Err({
        code: 'NOT_FOUND',
        message: 'One or more tags not found',
        details: { tagIds, found: tags.length },
      })
    }

    if (!tags.every(t => t.workspace_id === workspaceId)) {
      return Err({
        code: 'VALIDATION_FAILED',
        message: 'Tags must belong to the same workspace',
        details: { workspaceId, tagIds },
      })
    }

    return Ok(tags)
  }

  /**
   * Get existing tag IDs for a task
   */
  async getExistingTagIds(taskId: string): Promise<Result<string[]>> {
    const { data, error } = await this.supabase
      .from('task_tags')
      .select('tag_id')
      .eq('task_id', taskId)

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch existing tags',
        details: error,
      })
    }

    const tagIds = (data || []).map(t => t.tag_id)
    return Ok(tagIds)
  }

  /**
   * Assign multiple tags to a task
   */
  async assignTagsToTask(taskId: string, tagIds: string[]): Promise<Result<number>> {
    if (tagIds.length === 0) {
      return Ok(0)
    }

    const insertData = tagIds.map(tag_id => ({
      task_id: taskId,
      tag_id,
    }))

    const { error } = await this.supabase
      .from('task_tags')
      .insert(insertData)

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to assign tags to task',
        details: error,
      })
    }

    return Ok(tagIds.length)
  }

  /**
   * Verify tag exists in workspace
   */
  async verifyTagInWorkspace(tagId: string, workspaceId: string): Promise<Result<Tag>> {
    const { data, error } = await this.supabase
      .from('tags')
      .select('id, name, color, workspace_id')
      .eq('id', tagId)
      .maybeSingle()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch tag',
        details: error,
      })
    }

    if (!data || data.workspace_id !== workspaceId) {
      return Err({
        code: 'NOT_FOUND',
        message: 'Tag not found',
        details: { tagId, workspaceId },
      })
    }

    return Ok(data as Tag)
  }

  /**
   * Remove tag from task (idempotent)
   */
  async removeTagFromTask(taskId: string, tagId: string): Promise<Result<void>> {
    const { error } = await this.supabase
      .from('task_tags')
      .delete()
      .eq('task_id', taskId)
      .eq('tag_id', tagId)

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to remove tag from task',
        details: error,
      })
    }

    return Ok(undefined)
  }
}
