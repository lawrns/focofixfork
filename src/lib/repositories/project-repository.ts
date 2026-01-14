/**
 * Project Repository
 * Type-safe database access for foco_projects table
 */

import { BaseRepository, Result, Ok, Err, isError } from './base-repository'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface Project {
  id: string
  workspace_id: string
  name: string
  slug: string
  description: string | null
  brief: string | null
  color: string
  icon: string
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  owner_id: string
  is_pinned: boolean | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateProjectData {
  workspace_id: string
  name: string
  slug: string
  description?: string | null
  brief?: string | null
  color?: string
  icon?: string
  status?: Project['status']
  owner_id: string
}

export interface UpdateProjectData {
  name?: string
  slug?: string
  description?: string | null
  brief?: string | null
  color?: string
  icon?: string
  status?: Project['status']
  is_pinned?: boolean
  archived_at?: string | null
}

export class ProjectRepository extends BaseRepository<Project> {
  protected table = 'foco_projects'

  constructor(supabase: SupabaseClient) {
    super(supabase)
  }

  /**
   * Find project by slug within a workspace
   */
  async findBySlug(workspaceId: string, slug: string): Promise<Result<Project>> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch project by slug',
        details: error,
      })
    }

    if (!data) {
      return Err({
        code: 'NOT_FOUND',
        message: `Project with slug '${slug}' not found in workspace`,
        details: { workspaceId, slug },
      })
    }

    return Ok(data as Project)
  }

  /**
   * Find all projects in a workspace
   */
  async findByWorkspace(
    workspaceId: string,
    options?: {
      status?: Project['status']
      archived?: boolean
      limit?: number
      offset?: number
    }
  ): Promise<Result<Project[]>> {
    let query = this.supabase
      .from(this.table)
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)

    // Filter by status
    if (options?.status) {
      query = query.eq('status', options.status)
    }

    // Filter by archived status
    if (options?.archived === true) {
      query = query.not('archived_at', 'is', null)
    } else if (options?.archived === false) {
      query = query.is('archived_at', null)
    }

    // Apply pagination
    if (options?.limit !== undefined) {
      const offset = options.offset ?? 0
      query = query.range(offset, offset + options.limit - 1)
    }

    // Sort by updated_at descending
    query = query.order('updated_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch workspace projects',
        details: error,
      })
    }

    return Ok(data as Project[], { count: count ?? undefined })
  }

  /**
   * Check if slug is available in workspace
   */
  async isSlugAvailable(workspaceId: string, slug: string, excludeId?: string): Promise<Result<boolean>> {
    let query = this.supabase
      .from(this.table)
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('slug', slug)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to check slug availability',
        details: error,
      })
    }

    return Ok(!data)
  }

  /**
   * Create a new project with validation
   */
  async createProject(data: CreateProjectData): Promise<Result<Project>> {
    // Check slug availability
    const slugCheck = await this.isSlugAvailable(data.workspace_id, data.slug)
    if (isError(slugCheck)) {
      return Err({
        code: slugCheck.error.code,
        message: slugCheck.error.message,
        details: slugCheck.error.details,
      })
    }

    if (!slugCheck.data) {
      return Err({
        code: 'DUPLICATE_SLUG',
        message: `Project with slug '${data.slug}' already exists in workspace`,
        details: { slug: data.slug },
      })
    }

    // Create project
    const projectData = {
      ...data,
      color: data.color ?? '#6366F1',
      icon: data.icon ?? 'folder',
      status: data.status ?? 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return this.create(projectData)
  }

  /**
   * Update project with validation
   */
  async updateProject(id: string, data: UpdateProjectData): Promise<Result<Project>> {
    // If slug is being updated, check availability
    if (data.slug) {
      const existingResult = await this.findById(id)
      if (isError(existingResult)) {
        return existingResult
      }

      const slugCheck = await this.isSlugAvailable(
        existingResult.data.workspace_id,
        data.slug,
        id
      )

      if (isError(slugCheck)) {
        return Err({
          code: slugCheck.error.code,
          message: slugCheck.error.message,
          details: slugCheck.error.details,
        })
      }

      if (!slugCheck.data) {
        return Err({
          code: 'DUPLICATE_SLUG',
          message: `Project with slug '${data.slug}' already exists`,
          details: { slug: data.slug },
        })
      }
    }

    // Update project
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    }

    return this.update(id, updateData)
  }

  /**
   * Archive a project
   */
  async archive(id: string): Promise<Result<Project>> {
    return this.update(id, {
      archived_at: new Date().toISOString(),
    })
  }

  /**
   * Unarchive a project
   */
  async unarchive(id: string): Promise<Result<Project>> {
    return this.update(id, {
      archived_at: null,
    })
  }

  /**
   * Pin a project for a user
   */
  async pin(projectId: string, userId: string): Promise<Result<void>> {
    const { error } = await this.supabase
      .from('user_project_pins')
      .insert({
        user_id: userId,
        project_id: projectId,
      })

    if (error) {
      // Check for duplicate
      if (error.code === '23505') {
        return Ok(undefined) // Already pinned, treat as success
      }

      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to pin project',
        details: error,
      })
    }

    return Ok(undefined)
  }

  /**
   * Unpin a project for a user
   */
  async unpin(projectId: string, userId: string): Promise<Result<void>> {
    const { error } = await this.supabase
      .from('user_project_pins')
      .delete()
      .eq('user_id', userId)
      .eq('project_id', projectId)

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to unpin project',
        details: error,
      })
    }

    return Ok(undefined)
  }
}
