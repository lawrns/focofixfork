import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { GetProjectTeamSchema, AddTeamMemberSchema } from '@/lib/validation/schemas/project-team-api.schema'
import { supabaseAdmin } from '@/lib/supabase-server'
import { ForbiddenError } from '@/server/auth/requireAuth'

interface RouteContext {
  params: {
    id: string
  }
}

/**
 * GET /api/projects/[id]/team - Get team members for a project
 */
export async function GET(request: NextRequest, context: RouteContext) {
  return wrapRoute(GetProjectTeamSchema, async ({ user, correlationId }) => {
    const projectId = context.params.id

    // Check if user has access to this project
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

    // Check if user is owner or team member
    const isOwner = project.created_by === user.id
    const { data: teamMember } = await supabaseAdmin
      .from('project_team_assignments')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!isOwner && !teamMember) {
      throw new ForbiddenError('You do not have access to this project')
    }

    // Get all team members
    const { data: teamMembers, error } = await supabaseAdmin
      .from('project_team_assignments')
      .select(`
        id,
        user_id,
        role,
        added_by,
        added_at
      `)
      .eq('project_id', projectId)

    if (error) {
      const err: any = new Error('Failed to fetch team members')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    return { members: teamMembers || [] }
  })(request)
}

/**
 * POST /api/projects/[id]/team - Add a team member to a project
 */
export async function POST(request: NextRequest, context: RouteContext) {
  return wrapRoute(AddTeamMemberSchema, async ({ input, user, correlationId }) => {
    const projectId = context.params.id

    // Check if user has permission to add team members (must be owner or admin)
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
        throw new ForbiddenError('Only project owners and admins can add team members')
      }
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseAdmin
      .from('project_team_assignments')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', input.body.userId)
      .single()

    if (existingMember) {
      const err: any = new Error('User is already a member of this project')
      err.code = 'ALREADY_MEMBER'
      err.statusCode = 409
      throw err
    }

    // Add the team member
    const { data: newMember, error: insertError } = await supabaseAdmin
      .from('project_team_assignments')
      .insert({
        project_id: projectId,
        user_id: input.body.userId,
        role: input.body.role,
        added_by: user.id
      })
      .select()
      .single()

    if (insertError) {
      const err: any = new Error('Failed to add team member')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    return {
      message: 'Team member added successfully',
      member: newMember
    }
  })(request)
}
