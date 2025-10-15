/**
 * Organizations Service Layer
 * Handles organization CRUD operations and member management
 */

import { supabaseAdmin } from '../supabase-server'
import type { Organization } from '../models/organizations'
import { OrganizationModel } from '../models/organizations'
import type { OrganizationMember, OrganizationMemberWithDetails, MemberRole } from '../models/organization-members'
import { OrganizationMemberModel } from '../models/organization-members'
import type { InviteMemberData, UpdateMemberRoleData } from '../models/organization-members'
import type { OrganizationInvitation, InvitationWithDetails } from '../models/invitations'
import { InvitationModel } from '../models/invitations'

export interface CreateOrganizationData {
  name: string
  description?: string | null
  website?: string | null
  created_by: string
}

export interface OrganizationsResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export class OrganizationsService {
  /**
   * Get all organizations for the current user
   */
  static async getUserOrganizations(userId: string, supabaseClient?: any): Promise<OrganizationsResponse<Organization[]>> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      // Use provided client or admin client for RLS-enforced queries
      const client = supabaseClient || supabaseAdmin
      const { data, error } = await client
        .from('organization_members')
        .select(`
          organization_id,
          organizations (
            id,
            name,
            created_by,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)

      if (error) {
        console.error('Get organizations error:', error)
        return {
          success: false,
          error: error.message
        }
      }

      const organizations = data
        ?.map(item => item.organizations)
        .filter(Boolean)
        .map(org => OrganizationModel.fromDatabase(org)) || []

      return {
        success: true,
        data: organizations || []
      }
    } catch (error) {
      console.error('Get organizations error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch organizations'
      }
    }
  }

  /**
   * Create a new organization
   */
  static async createOrganization(data: CreateOrganizationData, supabaseClient?: any): Promise<OrganizationsResponse<Organization>> {
    try {
      console.log('OrganizationsService.createOrganization called with:', data)

      if (!data.created_by) {
        console.error('No created_by user ID provided')
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      // Validate input
      const validation = OrganizationModel.validateCreate(data)
      if (!validation.isValid) {
        console.error('Validation failed:', validation.errors)
        return {
          success: false,
          error: validation.errors.join(', ')
        }
      }

      // Use provided client or admin client
      const client = supabaseClient || supabaseAdmin

      // Create organization with unique slug
      let baseSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      let slug = baseSlug;
      let counter = 1;

      // Check if slug exists and generate unique slug
      while (true) {
        const { data: existingOrg } = await client
          .from('organizations')
          .select('id')
          .eq('slug', slug)
          .single();

        if (!existingOrg) {
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

      console.log('Inserting organization:', { name: data.name, slug, created_by: data.created_by })

      const { data: organization, error: orgError } = await client
        .from('organizations')
        .insert({
          name: data.name,
          slug: slug,
          description: data.description,
          website: data.website,
          created_by: data.created_by
        })
        .select()
        .single()

      if (orgError) {
        console.error('Create organization database error:', orgError)

        // Handle specific database constraint errors with user-friendly messages
        if (orgError.code === '23505') { // unique_violation
          if (orgError.message.includes('organizations_name_key')) {
            return {
              success: false,
              error: 'An organization with this name already exists. Please choose a different name.'
            }
          }
        }

        return {
          success: false,
          error: `Failed to create organization: ${orgError.message}`
        }
      }

      console.log('Organization created:', organization)

      // Add creator as member of the organization
      console.log('Adding creator as member:', { organization_id: organization.id, user_id: data.created_by })

      const { error: memberError } = await client
        .from('organization_members')
        .insert({
          organization_id: organization.id,
          user_id: data.created_by,
          role: 'member',
          joined_at: new Date().toISOString()
        })

      if (memberError) {
        console.error('Add creator to organization error:', memberError)
        // Don't fail the whole operation, but log the error
        // The organization is created, just the membership failed
      } else {
        console.log('Creator added as organization member successfully')
      }

      const result = OrganizationModel.fromDatabase(organization)
      console.log('Returning organization data:', result)

      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error('Create organization service error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Get organization members
   */
  static async getOrganizationMembers(organizationId: string): Promise<OrganizationsResponse<OrganizationMemberWithDetails[]>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('organization_members')
        .select(`
          id,
          organization_id,
          user_id,
          role,
          created_at
        `)
        .eq('organization_id', organizationId)

      if (error) {
        console.error('Get members error:', error)
        return {
          success: false,
          error: 'Failed to fetch organization members'
        }
      }

      const members = data.map(member =>
        OrganizationMemberModel.fromDatabaseWithDetails({
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
   * Get organization invitations
   */
  static async getOrganizationInvitations(organizationId: string): Promise<OrganizationsResponse<InvitationWithDetails[]>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('organization_invitations')
        .select(`
          id,
          organization_id,
          email,
          role,
          invited_by,
          status,
          invited_at,
          expires_at,
          accepted_at,
          token,
          profiles!organization_invitations_invited_by_fkey (
            full_name,
            email
          )
        `)
        .eq('organization_id', organizationId)
        .order('invited_at', { ascending: false })

      if (error) {
        console.error('Get invitations error:', error)
        return {
          success: false,
          error: 'Failed to fetch organization invitations'
        }
      }

      const invitations = data.map(invitation => {
        const profile = Array.isArray(invitation.profiles) ? invitation.profiles[0] : invitation.profiles
        return InvitationModel.fromDatabaseWithDetails({
          ...invitation,
          invited_by_name: profile?.full_name || profile?.email || 'Unknown',
          organization_name: '' // Will be set by caller if needed
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
    * Invite member to organization
    */
   static async inviteMember(organizationId: string, userId: string, data: InviteMemberData): Promise<OrganizationsResponse<{ invitation_sent: boolean; message: string }>> {
     try {
       if (!userId) {
         return {
           success: false,
           error: 'User not authenticated'
         }
       }

      // Validate input
      const validation = OrganizationMemberModel.validateInvite(data)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        }
      }

      // Get organization details
      const { data: orgData, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single()

      if (orgError || !orgData) {
        return {
          success: false,
          error: 'Organization not found'
        }
      }

      // Get inviter details
      const { data: inviterData, error: inviterError } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single()

      const inviterName = inviterData?.full_name || inviterData?.email || 'Someone'

      // Check if user already exists in profiles (simplified check)
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', data.email)
        .single()

      if (existingProfile) {
        // User exists, check if already a member
        const { data: existingMember } = await supabaseAdmin
          .from('organization_members')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('user_id', existingProfile.id)
          .single()

        if (existingMember) {
          return {
            success: false,
            error: 'User is already a member of this organization'
          }
        }

        // Add existing user directly
        const { error: memberError } = await supabaseAdmin
          .from('organization_members')
          .insert({
            organization_id: organizationId,
            user_id: existingProfile.id,
            role: data.role || 'member',
            joined_at: new Date().toISOString()
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
            message: 'User added to organization successfully'
          }
        }
      }

      // User doesn't exist, create invitation
      const token = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { error: inviteError } = await supabaseAdmin
        .from('organization_invitations')
        .insert({
          organization_id: organizationId,
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
        orgData.name,
        inviterName,
        token,
        data.role || 'member'
      )

      if (!emailResult.success) {
        console.error('Email sending failed:', emailResult.error)
        // Don't fail the whole operation, just log the error
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
   static async updateMemberRole(organizationId: string, memberId: string, userId: string, data: UpdateMemberRoleData): Promise<OrganizationsResponse<OrganizationMember>> {
     try {
       if (!userId) {
         return {
           success: false,
           error: 'User not authenticated'
         }
       }

      // Validate input
      const validation = OrganizationMemberModel.validateRoleUpdate(data)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        }
      }

      // Get current member data
      const { data: currentMember, error: fetchError } = await supabaseAdmin
        .from('organization_members')
        .select('*')
        .eq('id', memberId)
        .eq('organization_id', organizationId)
        .single()

      if (fetchError || !currentMember) {
        return {
          success: false,
          error: 'Member not found'
        }
      }

      // Check permissions
      const currentUserRole = await this.getUserRoleInOrganization(userId, organizationId)
      const canUpdate = OrganizationMemberModel.canUpdateRole(
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
        .from('organization_members')
        .update({ role: data.role })
        .eq('id', memberId)
        .eq('organization_id', organizationId)
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
        data: OrganizationMemberModel.fromDatabase(updatedMember)
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
    * Remove member from organization
    */
   static async removeMember(organizationId: string, memberId: string, userId: string): Promise<OrganizationsResponse<{ message: string }>> {
     try {
       if (!userId) {
         return {
           success: false,
           error: 'User not authenticated'
         }
       }

      // Get member data
      const { data: member, error: fetchError } = await supabaseAdmin
        .from('organization_members')
        .select('*')
        .eq('id', memberId)
        .eq('organization_id', organizationId)
        .single()

      if (fetchError || !member) {
        return {
          success: false,
          error: 'Member not found'
        }
      }

      // Get total directors count
      const { data: directors } = await supabaseAdmin
        .from('organization_members')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('role', 'director')

      const totalDirectors = directors?.length || 0
      const canRemove = OrganizationMemberModel.canRemoveMember(member.role as MemberRole, totalDirectors)

      if (!canRemove) {
        return {
          success: false,
          error: 'Cannot remove the last director from organization'
        }
      }

      // Remove member
      const { error: deleteError } = await supabaseAdmin
        .from('organization_members')
        .delete()
        .eq('id', memberId)
        .eq('organization_id', organizationId)

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
   * Get user's role in organization
   */
  private static async getUserRoleInOrganization(userId: string, organizationId: string): Promise<'admin' | 'member'> {
    try {
      const { data, error } = await supabaseAdmin
        .from('organization_members')
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .single()

      if (error || !data) {
        return 'member'
      }

      return data.role as 'admin' | 'member'
    } catch (error) {
      console.error('Get user role error:', error)
      return 'member'
    }
  }
}
