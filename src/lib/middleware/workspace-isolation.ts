import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { logger } from '@/lib/logger'

/**
 * Workspace Isolation Middleware
 *
 * CRITICAL SECURITY: Prevents Insecure Direct Object References (IDOR)
 * Ensures users can only access resources within their authorized workspaces
 *
 * This middleware must be applied to ALL API routes that access workspace resources
 */

export interface WorkspaceContext {
  userId: string
  authorizedWorkspaceIds: string[]
  primaryWorkspaceId: string | null
}

/**
 * Get user's authorized workspace IDs from database
 * Returns list of all workspaces user has access to
 */
export async function getUserWorkspaces(req: NextRequest): Promise<{
  success: boolean
  workspaces?: WorkspaceContext
  error?: string
}> {
  try {
    let response = NextResponse.next()

    const supabase = createServerClient(
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
          setAll(cookies) {
            cookies.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // Get all workspaces user has access to
    const { data: memberships, error: memberError } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(id, name)')
      .eq('user_id', user.id)

    if (memberError) {
      logger.error('Failed to fetch workspace memberships', {
        userId: user.id,
        error: memberError
      })
      return {
        success: false,
        error: 'Failed to verify workspace access'
      }
    }

    if (!memberships || memberships.length === 0) {
      return {
        success: false,
        error: 'No workspace access found'
      }
    }

    const authorizedWorkspaceIds = memberships.map(m => m.workspace_id)
    const primaryWorkspaceId = memberships[0]?.workspace_id || null

    return {
      success: true,
      workspaces: {
        userId: user.id,
        authorizedWorkspaceIds,
        primaryWorkspaceId
      }
    }
  } catch (error) {
    logger.error('getUserWorkspaces error', { error })
    return {
      success: false,
      error: 'Internal server error'
    }
  }
}

/**
 * Verify user has access to specified workspace
 * Logs security violations for monitoring
 */
export async function verifyWorkspaceAccess(
  req: NextRequest,
  workspaceId: string
): Promise<{
  authorized: boolean
  userId?: string
  error?: string
}> {
  const result = await getUserWorkspaces(req)

  if (!result.success || !result.workspaces) {
    return {
      authorized: false,
      error: result.error
    }
  }

  const { userId, authorizedWorkspaceIds } = result.workspaces

  // Check if user has access to requested workspace
  const hasAccess = authorizedWorkspaceIds.includes(workspaceId)

  if (!hasAccess) {
    // Log security violation
    logger.warn('Unauthorized workspace access attempt', {
      event: 'unauthorized_workspace_access',
      userId,
      requestedWorkspaceId: workspaceId,
      authorizedWorkspaces: authorizedWorkspaceIds,
      endpoint: req.url,
      ip: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    })
  }

  return {
    authorized: hasAccess,
    userId
  }
}

/**
 * Verify user has access to project and return its workspace
 * Used for routes like /api/tasks?project_id=X
 */
export async function verifyProjectAccess(
  req: NextRequest,
  projectId: string
): Promise<{
  authorized: boolean
  workspaceId?: string
  userId?: string
  error?: string
}> {
  try {
    let response = NextResponse.next()

    const supabase = createServerClient(
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
          setAll(cookies) {
            cookies.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        authorized: false,
        error: 'Authentication required'
      }
    }

    // Get project's workspace
    const { data: project, error: projectError } = await supabase
      .from('foco_projects')
      .select('workspace_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      logger.warn('Project not found during access check', {
        event: 'project_not_found',
        userId: user.id,
        projectId,
        endpoint: req.url
      })

      return {
        authorized: false,
        error: 'Project not found'
      }
    }

    // Verify user has access to this workspace
    const workspaceCheck = await verifyWorkspaceAccess(req, project.workspace_id)

    return {
      authorized: workspaceCheck.authorized,
      workspaceId: project.workspace_id,
      userId: user.id,
      error: workspaceCheck.error
    }
  } catch (error) {
    logger.error('verifyProjectAccess error', { error })
    return {
      authorized: false,
      error: 'Internal server error'
    }
  }
}

/**
 * Verify user has access to task and return its workspace
 * Used for routes like /api/tasks/[id]
 */
export async function verifyTaskAccess(
  req: NextRequest,
  taskId: string
): Promise<{
  authorized: boolean
  workspaceId?: string
  projectId?: string
  userId?: string
  error?: string
}> {
  try {
    let response = NextResponse.next()

    const supabase = createServerClient(
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
          setAll(cookies) {
            cookies.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        authorized: false,
        error: 'Authentication required'
      }
    }

    // Get task's workspace via project
    const { data: task, error: taskError } = await supabase
      .from('work_items')
      .select('workspace_id, project_id')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      logger.warn('Task not found during access check', {
        event: 'task_not_found',
        userId: user.id,
        taskId,
        endpoint: req.url
      })

      return {
        authorized: false,
        error: 'Task not found'
      }
    }

    // Verify user has access to this workspace
    const workspaceCheck = await verifyWorkspaceAccess(req, task.workspace_id)

    return {
      authorized: workspaceCheck.authorized,
      workspaceId: task.workspace_id,
      projectId: task.project_id,
      userId: user.id,
      error: workspaceCheck.error
    }
  } catch (error) {
    logger.error('verifyTaskAccess error', { error })
    return {
      authorized: false,
      error: 'Internal server error'
    }
  }
}

/**
 * Middleware wrapper to enforce workspace isolation on API routes
 *
 * Usage:
 * ```typescript
 * export const GET = withWorkspaceIsolation(async (req, context) => {
 *   const { workspaceId } = context
 *   // workspaceId is guaranteed to be authorized
 *   // ... your route logic
 * })
 * ```
 */
export function withWorkspaceIsolation(
  handler: (
    req: NextRequest,
    context: { workspaceId: string; userId: string }
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(req.url)
      const workspaceId = searchParams.get('workspace_id')

      if (!workspaceId) {
        return NextResponse.json(
          {
            success: false,
            error: 'workspace_id is required'
          },
          { status: 400 }
        )
      }

      const verification = await verifyWorkspaceAccess(req, workspaceId)

      if (!verification.authorized) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized workspace access'
          },
          { status: 403 }
        )
      }

      return await handler(req, {
        workspaceId,
        userId: verification.userId!
      })
    } catch (error) {
      logger.error('withWorkspaceIsolation error', { error })
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error'
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Middleware wrapper for project-based routes
 * Automatically verifies project access and returns workspace context
 */
export function withProjectIsolation(
  handler: (
    req: NextRequest,
    context: { projectId: string; workspaceId: string; userId: string }
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(req.url)
      const projectId = searchParams.get('project_id')

      if (!projectId) {
        return NextResponse.json(
          {
            success: false,
            error: 'project_id is required'
          },
          { status: 400 }
        )
      }

      const verification = await verifyProjectAccess(req, projectId)

      if (!verification.authorized) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized project access'
          },
          { status: 403 }
        )
      }

      return await handler(req, {
        projectId,
        workspaceId: verification.workspaceId!,
        userId: verification.userId!
      })
    } catch (error) {
      logger.error('withProjectIsolation error', { error })
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error'
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Middleware wrapper for task-based routes
 * Automatically verifies task access and returns full context
 */
export function withTaskIsolation(
  handler: (
    req: NextRequest,
    context: { taskId: string; projectId: string; workspaceId: string; userId: string }
  ) => Promise<NextResponse>
) {
  return async (
    req: NextRequest,
    routeContext: { params: { id: string } }
  ): Promise<NextResponse> => {
    try {
      const taskId = routeContext.params.id

      if (!taskId) {
        return NextResponse.json(
          {
            success: false,
            error: 'task_id is required'
          },
          { status: 400 }
        )
      }

      const verification = await verifyTaskAccess(req, taskId)

      if (!verification.authorized) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized task access'
          },
          { status: 403 }
        )
      }

      return await handler(req, {
        taskId,
        projectId: verification.projectId!,
        workspaceId: verification.workspaceId!,
        userId: verification.userId!
      })
    } catch (error) {
      logger.error('withTaskIsolation error', { error })
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error'
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Extract workspace ID from request body for POST/PUT requests
 * Verifies the workspace is authorized before allowing the operation
 */
export async function validateWorkspaceInBody(
  req: NextRequest,
  body: any
): Promise<{
  valid: boolean
  userId?: string
  error?: string
}> {
  const workspaceId = body.workspace_id

  if (!workspaceId) {
    return {
      valid: false,
      error: 'workspace_id is required in request body'
    }
  }

  const verification = await verifyWorkspaceAccess(req, workspaceId)

  return {
    valid: verification.authorized,
    userId: verification.userId,
    error: verification.error
  }
}
