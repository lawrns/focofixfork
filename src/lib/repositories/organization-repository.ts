/**
 * Organization Repository
 * Type-safe database access for workspaces (organizations) table
 *
 * Note: "Organizations" is an alias for "workspaces" in the UI/API,
 * but the underlying database table is still "workspaces"
 */

import { BaseRepository, Result, Ok, Err, isError } from './base-repository'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface Organization {
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

export interface OrganizationWithRole extends Organization {
  role: 'owner' | 'admin' | 'member' | 'guest'
}

export interface OrganizationMember {
  id: string
  workspace_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'guest'
  created_at: string
  updated_at: string
}

export class OrganizationRepository extends BaseRepository<Organization> {
  protected table = 'workspaces'

  constructor(supabase: SupabaseClient) {
    super(supabase)
  }

  /**
   * Find all organizations for a user with their role
   */
  async findByUser(userId: string): Promise<Result<OrganizationWithRole[]>> {
    const { data, error } = await this.supabase
      .from('workspace_members')
      .select(`
        workspace_id,
        role,
        workspaces!inner (
          id,
          name,
          slug,
          description,
          logo_url,
          settings,
          ai_policy,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch user organizations',
        details: error,
      })
    }

    // Transform the nested structure to flat organization with role
    const organizations = (data || [])
      .filter((item: any) => item.workspaces !== null)
      .map((item: any) => ({
        ...item.workspaces,
        role: item.role,
      })) as OrganizationWithRole[]

    return Ok(organizations)
  }

  /**
   * Create organization and add creator as admin
   */
  async createWithMember(
    orgData: {
      name: string
      slug: string
      description?: string | null
      logo_url?: string | null
    },
    userId: string
  ): Promise<Result<Organization>> {
    // Create organization
    const { data: organization, error: createError } = await this.supabase
      .from(this.table)
      .insert({
        name: orgData.name,
        slug: orgData.slug,
        description: orgData.description ?? null,
        logo_url: orgData.logo_url ?? null,
      })
      .select()
      .single()

    if (createError) {
      // Check for duplicate slug
      if (createError.code === '23505') {
        return Err({
          code: 'DUPLICATE_ENTRY',
          message: `An organization with slug '${orgData.slug}' already exists`,
          details: { slug: orgData.slug },
        })
      }

      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to create organization',
        details: createError,
      })
    }

    // Add creator as admin
    const { error: memberError } = await this.supabase
      .from('workspace_members')
      .insert({
        workspace_id: organization.id,
        user_id: userId,
        role: 'admin',
      })

    if (memberError) {
      // Log but don't fail - organization was created
      console.error('Failed to add creator as member:', memberError)
      // Note: In production, you might want to implement compensation logic here
    }

    return Ok(organization as Organization)
  }

  /**
   * Check if user is member of organization
   */
  async isMember(organizationId: string, userId: string): Promise<Result<boolean>> {
    const { data, error } = await this.supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to check organization membership',
        details: error,
      })
    }

    return Ok(!!data)
  }

  /**
   * Get user's role in organization
   */
  async getUserRole(organizationId: string, userId: string): Promise<Result<OrganizationMember['role'] | null>> {
    const { data, error } = await this.supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', organizationId)
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
   * Check if user has admin access to organization
   */
  async hasAdminAccess(organizationId: string, userId: string): Promise<Result<boolean>> {
    const roleResult = await this.getUserRole(organizationId, userId)
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
}
