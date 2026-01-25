import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export interface CursosAccessContext {
  workspaceId: string
  isAuthorized: boolean
  workspaceName: string
  userRole: 'owner' | 'admin' | 'member' | 'guest'
}

/**
 * Cursos Access Control Middleware
 *
 * Restricts access to /cursos routes to @fyves.com organization members only.
 * Verifies that the workspace website/domain is 'fyves.com' or that the user's
 * email belongs to @fyves.com domain.
 *
 * @param req - NextRequest object
 * @param workspaceId - The workspace/organization ID to check
 * @returns Object with context or error response
 */
export async function cursosAccessMiddleware(
  req: NextRequest,
  workspaceId: string
): Promise<{ context?: CursosAccessContext; error?: NextResponse }> {
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
      // Log unauthorized access attempt
      console.warn('[Cursos] Unauthorized access attempt: No session', {
        workspaceId,
        ip: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      })

      return {
        error: NextResponse.redirect(
          new URL('/login?redirect=' + encodeURIComponent(req.url), req.url)
        )
      }
    }

    // Get workspace details
    const { data: workspace, error: workspaceError } = await supabaseClient
      .from('foco_workspaces')
      .select('id, name, website')
      .eq('id', workspaceId)
      .single()

    if (workspaceError || !workspace) {
      console.warn('[Cursos] Workspace not found', { workspaceId })
      return {
        error: NextResponse.redirect(
          new URL('/organizations?error=workspace_not_found', req.url)
        )
      }
    }

    // Check if workspace is @fyves.com (via website field)
    const isFyvesWorkspace = workspace.website === 'fyves.com' ||
                             workspace.website?.includes('fyves.com')

    // Also check user's email domain
    const userEmailDomain = session.user.email?.split('@')[1]
    const isFyvesUser = userEmailDomain === 'fyves.com'

    // User must be either in a fyves.com workspace OR have a fyves.com email
    if (!isFyvesWorkspace && !isFyvesUser) {
      // Log unauthorized access attempt
      console.warn('[Cursos] Unauthorized access attempt: Non-Fyves user', {
        workspaceId,
        workspaceName: workspace.name,
        userId: session.user.id,
        userEmail: session.user.email,
        ip: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      })

      return {
        error: NextResponse.redirect(
          new URL('/dashboard?error=cursos_restricted_fyves_only', req.url)
        )
      }
    }

    // Get user's role in workspace
    const { data: membership } = await supabaseClient
      .from('foco_workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', session.user.id)
      .maybeSingle()

    const userRole = membership?.role as 'owner' | 'admin' | 'member' | 'guest' || 'guest'

    const context: CursosAccessContext = {
      workspaceId,
      isAuthorized: true,
      workspaceName: workspace.name,
      userRole,
    }

    return { context }
  } catch (error) {
    console.error('[Cursos] Access control error:', error)
    return {
      error: NextResponse.redirect(
        new URL('/dashboard?error=cursos_access_error', req.url)
      )
    }
  }
}
