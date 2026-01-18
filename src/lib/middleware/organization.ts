import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabase } from '@/lib/supabase-client'

export interface OrganizationContext {
  organizationId: string
  userRole: 'owner' | 'admin' | 'member' | 'guest'
  isMember: boolean
  canEdit: boolean
  canDelete: boolean
  canInvite: boolean
}

/**
 * Middleware to validate organization access and provide context
 */
export async function organizationMiddleware(
  req: NextRequest,
  organizationId: string
): Promise<{ context?: OrganizationContext; error?: NextResponse }> {
  try {
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll().map(cookie => ({
              name: cookie.name,
              value: cookie.value,
            }))
          },
          setAll() {
            // Read-only in middleware
          },
        },
      }
    )

    // Get authenticated user
    const { data: { session } } = await supabaseClient.auth.getSession()

    if (!session) {
      return {
        error: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    // Check if user is a member of the organization
    const { data: membership, error } = await supabaseClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', organizationId)
      .eq('user_id', session.user.id)
      .single()

    if (error || !membership) {
      return {
        error: NextResponse.json(
          { error: 'Access denied: Not a member of this workspace' },
          { status: 403 }
        )
      }
    }

    // Determine permissions based on role
    const userRole = membership.role as 'owner' | 'admin' | 'member' | 'guest'
    const canEdit = userRole === 'owner' || userRole === 'admin'
    const canDelete = userRole === 'owner' || userRole === 'admin'
    const canInvite = userRole === 'owner' || userRole === 'admin'

    const context: OrganizationContext = {
      organizationId,
      userRole,
      isMember: true,
      canEdit,
      canDelete,
      canInvite
    }

    return { context }
  } catch (error) {
    console.error('Organization middleware error:', error)
    return {
      error: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Project context middleware - validates project access within organization
 */
export interface ProjectContext extends OrganizationContext {
  projectId: string
  projectStatus: string
  canEditProject: boolean
  canDeleteProject: boolean
  canCreateMilestones: boolean
}

export async function projectMiddleware(
  req: NextRequest,
  projectId: string
): Promise<{ context?: ProjectContext; error?: NextResponse }> {
  try {
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll().map(cookie => ({
              name: cookie.name,
              value: cookie.value,
            }))
          },
          setAll() {
            // Read-only in middleware
          },
        },
      }
    )

    // Get authenticated user
    const { data: { session } } = await supabaseClient.auth.getSession()

    if (!session) {
      return {
        error: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    // First validate organization access
    const { data: project, error: projectError } = await supabaseClient
      .from('foco_projects')
      .select('workspace_id, status')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return {
        error: NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        )
      }
    }

    const orgResult = await organizationMiddleware(req, project.workspace_id)
    if (orgResult.error) {
      return { error: orgResult.error }
    }

    const orgContext = orgResult.context!

    // Additional project-specific permissions
    const canEditProject = orgContext.canEdit
    const canDeleteProject = orgContext.userRole === 'owner' || orgContext.userRole === 'admin'
    const canCreateMilestones = orgContext.isMember

    const context: ProjectContext = {
      ...orgContext,
      projectId,
      projectStatus: project.status,
      canEditProject,
      canDeleteProject,
      canCreateMilestones
    }

    return { context }
  } catch (error) {
    console.error('Project middleware error:', error)
    return {
      error: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Milestone context middleware - validates milestone access within project
 */
export interface MilestoneContext extends ProjectContext {
  milestoneId: string
  milestoneStatus: string
  assignedTo: string | null
  canEditMilestone: boolean
  canDeleteMilestone: boolean
  canAssignMilestone: boolean
  canComment: boolean
}

export async function milestoneMiddleware(
  req: NextRequest,
  milestoneId: string
): Promise<{ context?: MilestoneContext; error?: NextResponse }> {
  try {
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll().map(cookie => ({
              name: cookie.name,
              value: cookie.value,
            }))
          },
          setAll() {
            // Read-only in middleware
          },
        },
      }
    )

    // Get authenticated user
    const { data: { session } } = await supabaseClient.auth.getSession()

    if (!session) {
      return {
        error: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    // First validate project access
    const { data: milestone, error: milestoneError } = await supabaseClient
      .from('milestones')
      .select('project_id, status, assigned_to')
      .eq('id', milestoneId)
      .single()

    if (milestoneError || !milestone) {
      return {
        error: NextResponse.json(
          { error: 'Milestone not found' },
          { status: 404 }
        )
      }
    }

    const projectResult = await projectMiddleware(req, milestone.project_id)
    if (projectResult.error) {
      return { error: projectResult.error }
    }

    const projectContext = projectResult.context!

    // Milestone-specific permissions
    const canEditMilestone = projectContext.canEditProject ||
                            milestone.assigned_to === session?.user.id
    const canDeleteMilestone = projectContext.canDeleteProject ||
                              (projectContext.userRole === 'admin' && milestone.assigned_to === session?.user.id)
    const canAssignMilestone = projectContext.canEditProject
    const canComment = projectContext.isMember

    const context: MilestoneContext = {
      ...projectContext,
      milestoneId,
      milestoneStatus: milestone.status,
      assignedTo: milestone.assigned_to,
      canEditMilestone,
      canDeleteMilestone,
      canAssignMilestone,
      canComment
    }

    return { context }
  } catch (error) {
    console.error('Milestone middleware error:', error)
    return {
      error: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}


// Types are already exported as interfaces above
