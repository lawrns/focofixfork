/**
 * Organizations Service Layer
 * Handles organization CRUD operations and member management
 */

// ✅ FIXED(DB_ALIGNMENT): All table and column names aligned with actual database schema
// | Table mappings: organizations → workspaces, organization_members → workspace_members
// | Column mappings: organization_id → workspace_id
// Note: Service class keeps 'OrganizationsService' name for API consistency while using correct DB tables

import { supabaseAdmin } from '../supabase-server'
import type { Workspace } from '../models/organizations'
import { WorkspaceModel } from '../models/organizations'
import type { WorkspaceMember, WorkspaceMemberWithDetails, MemberRole } from '../models/organization-members'
import { WorkspaceMemberModel } from '../models/organization-members'
import type { InviteMemberData, UpdateMemberRoleData } from '../models/organization-members'
import type { WorkspaceInvitation, InvitationWithDetails } from '../models/invitations'
import { InvitationModel } from '../models/invitations'

export interface CreateWorkspaceData {
  name: string
  description?: string | null
  website?: string | null
  owner_id: string
}

export interface WorkspacesResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export class WorkspacesService {
  /**
   * Get all workspaces for the current user
   */
  static async getUserWorkspaces(userId: string, supabaseClient?: any): Promise<WorkspacesResponse<Workspace[]>> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      // Use provided client or admin client for RLS-enforced queries
      const client = supabaseClient || supabaseAdmin
      
      // Get workspaces owned by user
      const { data: ownedWorkspaces, error: ownedError } = await client
        .from('workspaces')
        .select(`
          id,
          name,
          owner_id,
          created_at,
          updated_at
        `)
        .eq('owner_id', userId)

      if (ownedError) {
        console.error('Get owned workspaces error:', ownedError)
        return {
          success: false,
          error: ownedError.message
        }
      }

      // Get workspaces where user is a member
      const { data: memberWorkspaces, error: memberError } = await client
        .from('workspace_members')
        .select(`
          workspaces (
            id,
            name,
            owner_id,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)

      if (memberError) {
        console.error('Get member workspaces error:', memberError)
        return {
          success: false,
          error: memberError.message
        }
      }

      // Combine and deduplicate workspaces
      const ownedWorkspacesList = ownedWorkspaces?.map(ws => WorkspaceModel.fromDatabase(ws)) || []
      const memberWorkspacesList = memberWorkspaces
        ?.map(item => item.workspaces)
        .filter(Boolean)
        .map(ws => WorkspaceModel.fromDatabase(ws)) || []

      // Remove duplicates (workspaces owned by user also appear in memberships)
      const allWorkspaces = [...ownedWorkspacesList]
      const seenIds = new Set(ownedWorkspacesList.map(ws => ws.id))
      
      for (const ws of memberWorkspacesList) {
        if (!seenIds.has(ws.id)) {
          allWorkspaces.push(ws)
          seenIds.add(ws.id)
        }
      }

      return {
        success: true,
        data: allWorkspaces
      }
    } catch (error) {
      console.error('Get workspaces error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch workspaces'
      }
    }
  }

  /**
   * Create a new workspace
   */
  static async createWorkspace(data: CreateWorkspaceData, supabaseClient?: any): Promise<WorkspacesResponse<Workspace>> {
    try {
      console.log('WorkspacesService.createWorkspace called with:', data)

      if (!data.owner_id) {
        console.error('No owner_id user ID provided')
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      // Validate input
      const validation = WorkspaceModel.validateCreate(data)
      if (!validation.isValid) {
        console.error('Validation failed:', validation.errors)
        return {
          success: false,
          error: validation.errors.join(', ')
        }
      }

      // Use provided client or admin client
      const client = supabaseClient || supabaseAdmin

      // Create workspace with unique slug
      let baseSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      let slug = baseSlug;
      let counter = 1;

      // Check if slug exists and generate unique slug
      while (true) {
        const { data: existingWs } = await client
          .from('workspaces')
          .select('id')
          .eq('slug', slug)
          .single();

        if (!existingWs) {
          break; // Slug is unique
        }

        slug = `${baseSlug}-${counter}`;
        counter++;

        // Prevent infinite loop
        if (counter > 100) {
          slug = `${baseSlug}-${Date.now()}`;
          break;
        }
      }

      console.log('Inserting workspace:', { name: data.name, slug, owner_id: data.owner_id })

      const { data: workspace, error: wsError } = await client
        .from('workspaces')
        .insert({
          name: data.name,
          slug: slug,
          description: data.description,
          website: data.website,
          owner_id: data.owner_id
        })
        .select()
        .single()

      if (wsError) {
        console.error('Create workspace database error:', wsError)

        // Handle specific database constraint errors with user-friendly messages
        if (wsError.code === '23505') { // unique_violation
          if (wsError.message.includes('workspaces_name_key')) {
            return {
              success: false,
              error: 'A workspace with this name already exists. Please choose a different name.'
            }
          }
        }

        return {
          success: false,
          error: `Failed to create workspace: ${wsError.message}`
        }
      }

      console.log('Workspace created:', workspace)

      // Add creator as owner of the workspace
      console.log('Adding owner as member:', { workspace_id: workspace.id, user_id: data.owner_id })

      const { error: memberError } = await client
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: data.owner_id,
          role: 'owner'
        })

      if (memberError) {
        console.error('Add owner to workspace error:', memberError)
      } else {
        console.log('Owner added as workspace member successfully')
      }

      const result = WorkspaceModel.fromDatabase(workspace)
      console.log('Returning workspace data:', result)

      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error('Create workspace service error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Get workspace members
   */
  static async getWorkspaceMembers(workspaceId: string): Promise<WorkspacesResponse<WorkspaceMemberWithDetails[]>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('workspace_members')
        .select(`
          id,
          workspace_id,
          user_id,
          role,
          created_at
        `)
        .eq('workspace_id', workspaceId)

      if (error) {
        console.error('Get members error:', error)
        return {
          success: false,
          error: 'Failed to fetch workspace members'
        }
      }

      const members = data.map(member =>
        WorkspaceMemberModel.fromDatabaseWithDetails({
          ...member,
          email: null // Email will need to be fetched separately if needed
        })
      )

      return {
        success: true,
        data: members
      }
    } catch (error) {
      console.error('Get members error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Get workspace invitations
   */
  static async getWorkspaceInvitations(workspaceId: string): Promise<WorkspacesResponse<InvitationWithDetails[]>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('workspace_invitations')
        .select(`
          id,
          workspace_id,
          email,
          role,
          invited_by,
          status,
          invited_at,
          expires_at,
          accepted_at,
          token,
          profiles!workspace_invitations_invited_by_fkey (
            full_name,
            email
          )
        `)
        .eq('workspace_id', workspaceId)
        .order('invited_at', { ascending: false })

      if (error) {
        console.error('Get invitations error:', error)
        return {
          success: false,
          error: 'Failed to fetch workspace invitations'
        }
      }

      const invitations = data.map(invitation => {
        const profile = Array.isArray(invitation.profiles) ? invitation.profiles[0] : invitation.profiles
        return InvitationModel.fromDatabaseWithDetails({
          ...invitation,
          invited_by_name: profile?.full_name || profile?.email || 'Unknown',
          workspace_name: '' // Will be set by caller if needed
        })
      })

      return {
        success: true,
        data: invitations
      }
    } catch (error) {
      console.error('Get invitations error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
    * Invite member to workspace
    */
   static async inviteMember(workspaceId: string, userId: string, data: InviteMemberData): Promise<WorkspacesResponse<{ invitation_sent: boolean; message: string }>> {
     try {
       if (!userId) {
         return {
           success: false,
           error: 'User not authenticated'
         }
       }

      // Validate input
      const validation = WorkspaceMemberModel.validateInvite(data)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        }
      }

      // Get workspace details
      const { data: wsData, error: wsError } = await supabaseAdmin
        .from('workspaces')
        .select('name')
        .eq('id', workspaceId)
        .single()

      if (wsError || !wsData) {
        return {
          success: false,
          error: 'Workspace not found'
        }
      }

      // Get inviter details
      const { data: inviterData, error: inviterError } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single()

      const inviterName = inviterData?.full_name || inviterData?.email || 'Someone'

      // Check if user already exists in profiles
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', data.email)
        .single()

      if (existingProfile) {
        // User exists, check if already a member
        const { data: existingMember } = await supabaseAdmin
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('user_id', existingProfile.id)
          .maybeSingle()

        if (existingMember) {
          return {
            success: false,
            error: 'User is already a member of this workspace'
          }
        }

        // Add existing user directly
        const { error: memberError } = await supabaseAdmin
          .from('workspace_members')
          .insert({
            workspace_id: workspaceId,
            user_id: existingProfile.id,
            role: data.role || 'member'
          })

        if (memberError) {
          return {
            success: false,
            error: 'Failed to add member'
          }
        }

        return {
          success: true,
          data: {
            invitation_sent: false,
            message: 'User added to workspace successfully'
          }
        }
      }

      // User doesn't exist, create invitation
      const token = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { error: inviteError } = await supabaseAdmin
        .from('workspace_invitations')
        .insert({
          workspace_id: workspaceId,
          email: data.email,
          role: data.role,
          invited_by: userId,
          status: 'pending',
          token,
          invited_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        })

      if (inviteError) {
        console.error('Database invitation error:', inviteError)
        return {
          success: false,
          error: 'Failed to create invitation'
        }
      }

      // Send email invitation
      const { EmailService } = await import('./email')
      const emailResult = await EmailService.sendInvitationEmail(
        data.email,
        wsData.name,
        inviterName,
        token,
        data.role || 'member'
      )

      if (!emailResult.success) {
        console.error('Email sending failed:', emailResult.error)
      }

      return {
        success: true,
        data: {
          invitation_sent: emailResult.success,
          message: emailResult.success
            ? 'Invitation sent successfully!'
            : 'Invitation created but email failed to send'
        }
      }
    } catch (error) {
      console.error('Invite member error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
    * Update member role
    */
   static async updateMemberRole(workspaceId: string, memberId: string, userId: string, data: UpdateMemberRoleData): Promise<WorkspacesResponse<WorkspaceMember>> {
     try {
       if (!userId) {
         return {
           success: false,
           error: 'User not authenticated'
         }
       }

      // Validate input
      const validation = WorkspaceMemberModel.validateRoleUpdate(data)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        }
      }

      // Get current member data
      const { data: currentMember, error: fetchError } = await supabaseAdmin
        .from('workspace_members')
        .select('*')
        .eq('id', memberId)
        .eq('workspace_id', workspaceId)
        .single()

      if (fetchError || !currentMember) {
        return {
          success: false,
          error: 'Member not found'
        }
      }

      // Check permissions
      const currentUserRole = await this.getUserRoleInWorkspace(userId, workspaceId)
      const canUpdate = WorkspaceMemberModel.canUpdateRole(
        currentUserRole,
        currentMember.role as 'admin' | 'member',
        currentMember.user_id === userId
      )

      if (!canUpdate) {
        return {
          success: false,
          error: 'Insufficient permissions to update member role'
        }
      }

      // Update role
      const { data: updatedMember, error: updateError } = await supabaseAdmin
        .from('workspace_members')
        .update({ role: data.role })
        .eq('id', memberId)
        .eq('workspace_id', workspaceId)
        .select()
        .single()

      if (updateError) {
        console.error('Update member role error:', updateError)
        return {
          success: false,
          error: 'Failed to update member role'
        }
      }

      return {
        success: true,
        data: WorkspaceMemberModel.fromDatabase(updatedMember)
      }
    } catch (error) {
      console.error('Update member role error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
    * Remove member from workspace
    */
   static async removeMember(workspaceId: string, memberId: string, userId: string): Promise<WorkspacesResponse<{ message: string }>> {
     try {
       if (!userId) {
         return {
           success: false,
           error: 'User not authenticated'
         }
       }

      // Get member data
      const { data: member, error: fetchError } = await supabaseAdmin
        .from('workspace_members')
        .select('*')
        .eq('id', memberId)
        .eq('workspace_id', workspaceId)
        .single()

      if (fetchError || !member) {
        return {
          success: false,
          error: 'Member not found'
        }
      }

      // Get total owners/admins count
      const { data: admins } = await supabaseAdmin
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .in('role', ['owner', 'admin'])

      const totalAdmins = admins?.length || 0
      const canRemove = WorkspaceMemberModel.canRemoveMember(member.role as MemberRole, totalAdmins)

      if (!canRemove) {
        return {
          success: false,
          error: 'Cannot remove the last owner/admin from workspace'
        }
      }

      // Remove member
      const { error: deleteError } = await supabaseAdmin
        .from('workspace_members')
        .delete()
        .eq('id', memberId)
        .eq('workspace_id', workspaceId)

      if (deleteError) {
        console.error('Remove member error:', deleteError)
        return {
          success: false,
          error: 'Failed to remove member'
        }
      }

      return {
        success: true,
        data: { message: 'Member removed successfully' }
      }
    } catch (error) {
      console.error('Remove member error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Get user's role in workspace
   */
  private static async getUserRoleInWorkspace(userId: string, workspaceId: string): Promise<MemberRole> {
    try {
      const { data, error } = await supabaseAdmin
        .from('workspace_members')
        .select('role')
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)
        .maybeSingle()

      if (error || !data) {
        return 'member'
      }

      return data.role as MemberRole
    } catch (error) {
      console.error('Get user role error:', error)
      return 'member'
    }
  }
}
