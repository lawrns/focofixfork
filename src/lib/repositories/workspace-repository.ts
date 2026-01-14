/**
 * Workspace Repository
 * Type-safe database access for workspaces table
 */

import { BaseRepository, Result, Ok, Err, isError } from './base-repository'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface Workspace {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  settings: Record<string, any> | null
  ai_policy: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'guest'
  capacity_hours_per_week: number | null
  focus_hours_per_day: number | null
  timezone: string | null
  settings: Record<string, any> | null
  created_at: string
  updated_at: string
}

export class WorkspaceRepository extends BaseRepository<Workspace> {
  protected table = 'workspaces'

  constructor(supabase: SupabaseClient) {
    super(supabase)
  }

  /**
   * Find workspace by slug
   */
  async findBySlug(slug: string): Promise<Result<Workspace>> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch workspace by slug',
        details: error,
      })
    }

    if (!data) {
      return Err({
        code: 'NOT_FOUND',
        message: `Workspace with slug '${slug}' not found`,
        details: { slug },
      })
    }

    return Ok(data as Workspace)
  }

  /**
   * Find all workspaces for a user
   */
  async findByUser(userId: string): Promise<Result<Workspace[]>> {
    const { data, error } = await this.supabase
      .from('workspace_members')
      .select(`
        workspace_id,
        workspaces (
          id,
          name,
          slug,
          description,
          logo_url,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch user workspaces',
        details: error,
      })
    }

    // Extract workspaces and filter nulls
    const workspaces = (data || [])
      .map((item: any) => item.workspaces)
      .filter((ws: any) => ws !== null) as Workspace[]

    return Ok(workspaces)
  }

  /**
   * Check if user is member of workspace
   */
  async isMember(workspaceId: string, userId: string): Promise<Result<boolean>> {
    const { data, error } = await this.supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to check workspace membership',
        details: error,
      })
    }

    return Ok(!!data)
  }

  /**
   * Get user's role in workspace
   */
  async getUserRole(workspaceId: string, userId: string): Promise<Result<WorkspaceMember['role'] | null>> {
    const { data, error } = await this.supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch user role',
        details: error,
      })
    }

    return Ok(data?.role ?? null)
  }

  /**
   * Check if user has admin access to workspace
   */
  async hasAdminAccess(workspaceId: string, userId: string): Promise<Result<boolean>> {
    const roleResult = await this.getUserRole(workspaceId, userId)
    if (isError(roleResult)) {
      return Err({
        code: roleResult.error.code,
        message: roleResult.error.message,
        details: roleResult.error.details,
      })
    }

    const role = roleResult.data
    return Ok(role === 'owner' || role === 'admin')
  }

  /**
   * Get all members of a workspace
   */
  async getMembers(workspaceId: string): Promise<Result<WorkspaceMember[]>> {
    const { data, error } = await this.supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch workspace members',
        details: error,
      })
    }

    return Ok(data as WorkspaceMember[])
  }

  /**
   * Add member to workspace
   */
  async addMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceMember['role'] = 'member'
  ): Promise<Result<WorkspaceMember>> {
    const { data, error } = await this.supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      // Check for duplicate
      if (error.code === '23505') {
        return Err({
          code: 'DUPLICATE_ENTRY',
          message: 'User is already a member of this workspace',
          details: { workspaceId, userId },
        })
      }

      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to add workspace member',
        details: error,
      })
    }

    return Ok(data as WorkspaceMember)
  }

  /**
   * Remove member from workspace
   */
  async removeMember(workspaceId: string, userId: string): Promise<Result<void>> {
    const { error } = await this.supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to remove workspace member',
        details: error,
      })
    }

    return Ok(undefined)
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceMember['role']
  ): Promise<Result<WorkspaceMember>> {
    const { data, error } = await this.supabase
      .from('workspace_members')
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to update member role',
        details: error,
      })
    }

    return Ok(data as WorkspaceMember)
  }
}
