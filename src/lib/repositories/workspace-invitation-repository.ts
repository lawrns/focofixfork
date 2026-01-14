/**
 * Workspace Invitation Repository
 * Type-safe database access for workspace invitations
 */

import { BaseRepository, Result, Ok, Err, isError } from './base-repository'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface WorkspaceInvitation {
  id: string
  workspace_id: string
  email: string
  role: 'owner' | 'admin' | 'member' | 'guest'
  invited_by: string
  status: 'pending' | 'accepted' | 'cancelled'
  token: string
  expires_at: string
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  email: string
}

export class WorkspaceInvitationRepository extends BaseRepository<WorkspaceInvitation> {
  protected table = 'workspace_invitations'

  constructor(supabase: SupabaseClient) {
    super(supabase)
  }

  /**
   * Find all pending invitations for a workspace
   */
  async findPendingByWorkspace(workspaceId: string): Promise<Result<WorkspaceInvitation[]>> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch workspace invitations',
        details: error,
      })
    }

    return Ok((data || []) as WorkspaceInvitation[])
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<Result<UserProfile | null>> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to find user by email',
        details: error,
      })
    }

    return Ok(data ? (data as UserProfile) : null)
  }

  /**
   * Check if user is already a member of workspace
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
   * Add user directly as workspace member
   */
  async addMemberDirectly(
    workspaceId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member' | 'guest' = 'member'
  ): Promise<Result<void>> {
    const { error } = await this.supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        role,
      })

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to add workspace member',
        details: error,
      })
    }

    return Ok(undefined)
  }

  /**
   * Create invitation (placeholder - invitations table not implemented yet)
   */
  async createInvitation(
    workspaceId: string,
    email: string,
    role: 'owner' | 'admin' | 'member' | 'guest',
    invitedBy: string
  ): Promise<Result<WorkspaceInvitation>> {
    // TODO: Implement when invitations table exists
    return Err({
      code: 'NOT_IMPLEMENTED',
      message: 'Invitations table not yet implemented',
      details: { workspaceId, email, role, invitedBy },
    })
  }

  /**
   * Cancel/delete invitation
   */
  async cancelInvitation(invitationId: string): Promise<Result<void>> {
    // TODO: Implement when invitations table exists
    return Err({
      code: 'NOT_IMPLEMENTED',
      message: 'Invitations table not yet implemented',
      details: { invitationId },
    })
  }

  /**
   * Resend invitation
   */
  async resendInvitation(invitationId: string): Promise<Result<void>> {
    // TODO: Implement when invitations table exists
    return Err({
      code: 'NOT_IMPLEMENTED',
      message: 'Invitations table not yet implemented',
      details: { invitationId },
    })
  }
}
