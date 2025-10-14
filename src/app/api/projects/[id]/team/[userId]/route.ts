import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { RemoveTeamMemberSchema } from '@/lib/validation/schemas/project-team-api.schema'
import { supabaseAdmin } from '@/lib/supabase-server'
import { ForbiddenError } from '@/server/auth/requireAuth'
import { z } from 'zod'

// Schema for updating team member role
const UpdateTeamMemberRoleSchema = z.object({
  body: z.object({
    role: z.enum(['owner', 'editor', 'viewer'])
  }).strict(),
  query: z.object({}).optional()
})

interface RouteContext {
  params: {
    id: string
    userId: string
  }
}

/**
 * PUT /api/projects/[id]/team/[userId] - Update team member role
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  return wrapRoute(UpdateTeamMemberRoleSchema, async ({ input, user, correlationId }) => {
    const { id: projectId, userId: targetUserId } = context.params

    // Prevent users from modifying their own role
    if (user.id === targetUserId) {
      throw new ForbiddenError('Cannot modify your own role')
    }

    // Check if current user has permission to manage roles
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('created_by')
      .eq('id', projectId)
      .single()

    if (!project) {
      const err: any = new Error('Project not found')
      err.code = 'PROJECT_NOT_FOUND'
      err.statusCode = 404
      throw err
    }

    const isOwner = project.created_by === user.id
    if (!isOwner) {
      const { data: teamMember } = await supabaseAdmin
        .from('project_team_assignments')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single()

      if (!teamMember || !['owner', 'admin'].includes(teamMember.role)) {
        throw new ForbiddenError('Only project owners and admins can update team member roles')
      }
    }

    // Update the team member's role
    const { data: updatedMember, error: updateError } = await supabaseAdmin
      .from('project_team_assignments')
      .update({ role: input.body.role })
      .eq('project_id', projectId)
      .eq('user_id', targetUserId)
      .select()
      .single()

    if (updateError) {
      const err: any = new Error('Failed to update team member role')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    return {
      message: 'Team member role updated successfully',
      member: updatedMember
    }
  })(request)
}

/**
 * DELETE /api/projects/[id]/team/[userId] - Remove team member from project
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  return wrapRoute(RemoveTeamMemberSchema, async ({ user, correlationId }) => {
    const { id: projectId, userId: targetUserId } = context.params

    // Check if current user has permission to remove members
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('created_by')
      .eq('id', projectId)
      .single()

    if (!project) {
      const err: any = new Error('Project not found')
      err.code = 'PROJECT_NOT_FOUND'
      err.statusCode = 404
      throw err
    }

    const isOwner = project.created_by === user.id
    if (!isOwner) {
      const { data: teamMember } = await supabaseAdmin
        .from('project_team_assignments')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single()

      if (!teamMember || !['owner', 'admin'].includes(teamMember.role)) {
        throw new ForbiddenError('Only project owners and admins can remove team members')
      }
    }

    // Prevent owner from removing themselves
    if (isOwner && user.id === targetUserId) {
      throw new ForbiddenError('Project owner cannot remove themselves')
    }

    // Remove the team member
    const { error: deleteError } = await supabaseAdmin
      .from('project_team_assignments')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', targetUserId)

    if (deleteError) {
      const err: any = new Error('Failed to remove team member')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    return {
      message: 'Team member removed successfully'
    }
  })(request)
}
