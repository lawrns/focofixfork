/**
 * Task Repository
 * Type-safe database access for work_items table
 */

import { BaseRepository, Result, Ok, Err, isError } from './base-repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import { generateFractionalIndex } from '@/lib/utils/fractional-indexing'

export interface Task {
  id: string
  workspace_id: string
  project_id: string
  parent_id: string | null
  type: 'task' | 'bug' | 'feature' | 'milestone'
  title: string
  description: string | null
  status: 'backlog' | 'next' | 'in_progress' | 'review' | 'blocked' | 'done'
  priority: 'urgent' | 'high' | 'medium' | 'low' | 'none'
  assignee_id: string | null
  reporter_id: string | null
  due_date: string | null
  start_date: string | null
  completed_at: string | null
  estimate_hours: number | null
  actual_hours: number | null
  position: string
  section: string | null
  blocked_reason: string | null
  blocked_by_id: string | null
  closure_note: string | null
  ai_context_sources: unknown[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreateTaskData {
  workspace_id: string
  project_id: string
  title: string
  description?: string | null
  status?: Task['status']
  priority?: Task['priority']
  assignee_id?: string | null
  reporter_id: string
  due_date?: string | null
  position?: string
  type?: Task['type']
}

export interface UpdateTaskData {
  title?: string
  description?: string | null
  status?: Task['status']
  priority?: Task['priority']
  assignee_id?: string | null
  due_date?: string | null
  position?: string
  section?: string | null
  blocked_reason?: string | null
  blocked_by_id?: string | null
}

export interface TaskFilters {
  project_id?: string
  workspace_id?: string
  status?: Task['status']
  assignee_id?: string
  reporter_id?: string
  type?: Task['type']
}

export interface TasksWithPagination {
  data: Task[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

export class TaskRepository extends BaseRepository<Task> {
  protected table = 'work_items'

  constructor(supabase: SupabaseClient) {
    super(supabase)
  }

  /**
   * Find tasks with filters and pagination
   */
  async findTasks(
    filters?: TaskFilters,
    options?: {
      limit?: number
      offset?: number
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
    }
  ): Promise<Result<TasksWithPagination>> {
    const limit = Math.min(options?.limit || 100, 200)
    const offset = options?.offset || 0

    let query = this.supabase
      .from(this.table)
      .select(`
        id,
        title,
        description,
        status,
        priority,
        type,
        project_id,
        workspace_id,
        assignee_id,
        reporter_id,
        due_date,
        position,
        created_at,
        updated_at
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id)
    }
    if (filters?.workspace_id) {
      query = query.eq('workspace_id', filters.workspace_id)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.assignee_id) {
      query = query.eq('assignee_id', filters.assignee_id)
    }
    if (filters?.reporter_id) {
      query = query.eq('reporter_id', filters.reporter_id)
    }
    if (filters?.type) {
      query = query.eq('type', filters.type)
    }

    // Apply sorting
    if (options?.sortBy) {
      query = query.order(options.sortBy, {
        ascending: options.sortOrder === 'asc',
      })
    } else {
      // Default sorting: position asc, created_at desc
      query = query
        .order('position', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
    }

    const { data, error, count } = await query

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch tasks',
        details: error,
      })
    }

    return Ok({
      data: data as Task[],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      },
    })
  }

  /**
   * Find tasks by workspace
   */
  async findByWorkspace(
    workspaceId: string,
    options?: {
      status?: Task['status']
      limit?: number
      offset?: number
    }
  ): Promise<Result<TasksWithPagination>> {
    return this.findTasks(
      { workspace_id: workspaceId, status: options?.status },
      { limit: options?.limit, offset: options?.offset }
    )
  }

  /**
   * Find tasks by project
   */
  async findByProject(
    projectId: string,
    options?: {
      status?: Task['status']
      limit?: number
      offset?: number
    }
  ): Promise<Result<TasksWithPagination>> {
    return this.findTasks(
      { project_id: projectId, status: options?.status },
      { limit: options?.limit, offset: options?.offset }
    )
  }

  /**
   * Create a new task
   */
  async createTask(data: CreateTaskData): Promise<Result<Task>> {
    const taskData = {
      workspace_id: data.workspace_id,
      project_id: data.project_id,
      title: data.title,
      description: data.description || null,
      status: data.status || 'backlog',
      priority: data.priority || 'none',
      assignee_id: data.assignee_id || null,
      reporter_id: data.reporter_id,
      due_date: data.due_date || null,
      position: data.position || generateFractionalIndex(),
      type: data.type || 'task',
      ai_context_sources: [],
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return this.create(taskData)
  }

  /**
   * Update a task
   */
  async updateTask(id: string, data: UpdateTaskData): Promise<Result<Task>> {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    }

    return this.update(id, updateData)
  }

  /**
   * Delete a task
   */
  async deleteTask(id: string): Promise<Result<void>> {
    return this.delete(id)
  }

  /**
   * Get task with full details (including relations)
   */
  async getTaskWithDetails(id: string): Promise<Result<Task>> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('id', id)
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
        message: `Task with id ${id} not found`,
        details: { id },
      })
    }

    return Ok(data as Task)
  }

  /**
   * Find multiple tasks by IDs
   */
  async findByIds(taskIds: string[]): Promise<Result<Task[]>> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .in('id', taskIds)

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch tasks by IDs',
        details: error,
      })
    }

    return Ok((data || []) as Task[])
  }

  /**
   * Batch update tasks
   */
  async batchUpdate(
    taskIds: string[],
    updates: Partial<Task>
  ): Promise<Result<Task[]>> {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await this.supabase
      .from(this.table)
      .update(updateData)
      .in('id', taskIds)
      .select()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to batch update tasks',
        details: error,
      })
    }

    return Ok((data || []) as Task[])
  }

  /**
   * Batch delete tasks
   */
  async batchDelete(taskIds: string[]): Promise<Result<number>> {
    const { error } = await this.supabase
      .from(this.table)
      .delete()
      .in('id', taskIds)

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to batch delete tasks',
        details: error,
      })
    }

    return Ok(taskIds.length)
  }

  /**
   * Verify user has access to all tasks (via workspace membership)
   */
  async verifyUserAccess(
    taskIds: string[],
    userId: string
  ): Promise<Result<boolean>> {
    // Get user's workspace IDs
    const { data: userWorkspaces, error: wsError } = await this.supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)

    if (wsError) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch user workspaces',
        details: wsError,
      })
    }

    const userWorkspaceIds = (userWorkspaces || []).map((w: any) => w.workspace_id)

    // Fetch tasks to check workspace_id
    const tasksResult = await this.findByIds(taskIds)
    if (isError(tasksResult)) {
      return tasksResult
    }

    const tasks = tasksResult.data

    if (tasks.length === 0) {
      return Err({
        code: 'NOT_FOUND',
        message: 'No tasks found',
      })
    }

    // Verify all tasks belong to user's workspaces
    const hasAccessToAll = tasks.every((task) =>
      userWorkspaceIds.includes(task.workspace_id)
    )

    return Ok(hasAccessToAll)
  }

  /**
   * Verify user has required role for batch operations on tasks
   * Returns the user's highest role across all workspaces containing the tasks
   */
  async verifyUserRoleForBatch(
    taskIds: string[],
    userId: string
  ): Promise<Result<{ hasAccess: boolean; role: string | null; workspaceIds: string[] }>> {
    // Fetch tasks to get workspace_ids
    const tasksResult = await this.findByIds(taskIds)
    if (isError(tasksResult)) {
      return tasksResult
    }

    const tasks = tasksResult.data
    if (tasks.length === 0) {
      return Err({
        code: 'NOT_FOUND',
        message: 'No tasks found',
      })
    }

    // Get unique workspace IDs from tasks
    const taskWorkspaceIds = [...new Set(tasks.map((t) => t.workspace_id))]

    // Get user's roles in these workspaces
    const { data: memberships, error: memberError } = await this.supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', userId)
      .in('workspace_id', taskWorkspaceIds)

    if (memberError) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch user workspace roles',
        details: memberError,
      })
    }

    // Check if user has membership in ALL workspaces
    const memberWorkspaceIds = (memberships || []).map((m: any) => m.workspace_id)
    const hasAccessToAll = taskWorkspaceIds.every((wsId) =>
      memberWorkspaceIds.includes(wsId)
    )

    if (!hasAccessToAll) {
      return Ok({ hasAccess: false, role: null, workspaceIds: taskWorkspaceIds })
    }

    // Get highest role (owner > admin > member > guest)
    const roleOrder = ['owner', 'admin', 'member', 'guest']
    const roles = (memberships || []).map((m: any) => m.role)
    const highestRole = roleOrder.find((r) => roles.includes(r)) || null

    return Ok({ hasAccess: true, role: highestRole, workspaceIds: taskWorkspaceIds })
  }
}
