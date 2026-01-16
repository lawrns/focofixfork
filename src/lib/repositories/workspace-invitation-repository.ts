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
   * Create invitation for a user to join a workspace
   */
  async createInvitation(
    workspaceId: string,
    email: string,
    role: 'owner' | 'admin' | 'member' | 'guest',
    invitedBy: string,
    message?: string
  ): Promise<Result<WorkspaceInvitation>> {
    // Check if there's already a pending invitation for this email
    const { data: existing } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      return Err({
        code: 'DUPLICATE_INVITATION',
        message: 'An invitation has already been sent to this email',
        details: { email },
      })
    }

    const { data, error } = await this.supabase
      .from(this.table)
      .insert({
        workspace_id: workspaceId,
        email,
        role,
        invited_by: invitedBy,
        message,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to create invitation',
        details: error,
      })
    }

    return Ok(data as WorkspaceInvitation)
  }

  /**
   * Cancel/delete invitation
   */
  async cancelInvitation(invitationId: string): Promise<Result<void>> {
    const { error } = await this.supabase
      .from(this.table)
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', invitationId)

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to cancel invitation',
        details: error,
      })
    }

    return Ok(undefined)
  }

  /**
   * Resend invitation - creates a new token and extends expiry
   */
  async resendInvitation(invitationId: string): Promise<Result<WorkspaceInvitation>> {
    const { data, error } = await this.supabase
      .from(this.table)
      .update({
        token: crypto.randomUUID(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .eq('status', 'pending')
      .select()
      .single()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to resend invitation',
        details: error,
      })
    }

    return Ok(data as WorkspaceInvitation)
  }

  /**
   * Find invitation by token
   */
  async findByToken(token: string): Promise<Result<WorkspaceInvitation | null>> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to find invitation by token',
        details: error,
      })
    }

    return Ok(data ? (data as WorkspaceInvitation) : null)
  }

  /**
   * Accept invitation - calls the database function
   */
  async acceptInvitation(token: string): Promise<Result<{ workspace_id: string }>> {
    const { data, error } = await this.supabase
      .rpc('accept_workspace_invitation', { invitation_token: token })

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to accept invitation',
        details: error,
      })
    }

    if (!data?.success) {
      return Err({
        code: 'INVITATION_ERROR',
        message: data?.error || 'Failed to accept invitation',
        details: data,
      })
    }

    return Ok({ workspace_id: data.workspace_id })
  }

  /**
   * Find all invitations for an email address
   */
  async findByEmail(email: string): Promise<Result<WorkspaceInvitation[]>> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('email', email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch invitations by email',
        details: error,
      })
    }

    return Ok((data || []) as WorkspaceInvitation[])
  }
}
