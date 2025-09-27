import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

// Schema for bulk operations
const bulkOperationSchema = z.object({
  operation: z.enum(['archive', 'delete', 'update_status']),
  project_ids: z.array(z.string()).min(1).max(50),
  parameters: z.object({
    status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  }).optional(),
})

/**
 * POST /api/projects/bulk - Perform bulk operations on projects
 */
export async function POST(request: NextRequest) {
  try {
    let userId = request.headers.get('x-user-id')

    // For demo purposes, allow real user
    if (!userId || userId === 'demo-user-123') {
      userId = '0c2af3ff-bd5e-4fbe-b8e2-b5b73266b562'
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate request body
    const validationResult = bulkOperationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { operation, project_ids, parameters } = validationResult.data

    console.log('Processing bulk operation:', {
      operation,
      projectCount: project_ids.length,
      userId,
      parameters
    })

    const results = {
      successful: [] as string[],
      failed: [] as { id: string; error: string }[],
      total_processed: project_ids.length
    }

    // Validate user has permission for all projects
    // Skip permission check for demo projects (they don't have project_members entries)
    const demoProjectIds = project_ids.filter(id => id.startsWith('demo-'))
    const realProjectIds = project_ids.filter(id => !id.startsWith('demo-'))

    if (realProjectIds.length > 0) {
      const { data: userProjects, error: permissionError } = await supabase
        .from('project_members')
        .select('project_id, role')
        .eq('user_id', userId)
        .in('project_id', realProjectIds)

      if (permissionError) {
        console.error('Error checking permissions:', permissionError)
        return NextResponse.json(
          { success: false, error: 'Failed to validate permissions' },
          { status: 500 }
        )
      }

      // Filter projects where user has admin/owner permissions
      const allowedProjects = userProjects?.filter(member =>
        ['owner', 'admin'].includes(member.role)
      ).map(member => member.project_id) || []

      const unauthorizedProjects = realProjectIds.filter(id => !allowedProjects.includes(id))

      if (unauthorizedProjects.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'You do not have permission to perform bulk operations on some projects',
            details: { unauthorized_projects: unauthorizedProjects }
          },
          { status: 403 }
        )
      }
    }

    // Demo projects are always allowed (no permission check needed)

    // Process each operation type
    if (operation === 'archive') {
      // Archive projects (set status to 'cancelled')
      for (const projectId of project_ids) {
        try {
          // Skip database operations for demo projects
          if (projectId.startsWith('demo-')) {
            results.successful.push(projectId)
            continue
          }

          // Check if project has active tasks
          const { count: activeTasks } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId)
            .neq('status', 'completed')

          if (activeTasks && activeTasks > 0) {
            results.failed.push({
              id: projectId,
              error: 'Project has active tasks and cannot be archived'
            })
            continue
          }

          const { error: updateError } = await supabase
            .from('projects')
            .update({ status: 'cancelled' })
            .eq('id', projectId)

          if (updateError) {
            results.failed.push({
              id: projectId,
              error: 'Failed to archive project'
            })
          } else {
            results.successful.push(projectId)
          }
        } catch (error) {
          results.failed.push({
            id: projectId,
            error: 'Unexpected error during archiving'
          })
        }
      }
    } else if (operation === 'delete') {
      // Delete projects (with cascading deletes)
      for (const projectId of project_ids) {
        try {
          // Skip database operations for demo projects
          if (projectId.startsWith('demo-')) {
            results.successful.push(projectId)
            continue
          }

          // Check for dependencies before deletion
          const { count: taskCount } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId)

          if (taskCount && taskCount > 0) {
            results.failed.push({
              id: projectId,
              error: 'Project contains tasks and cannot be deleted'
            })
            continue
          }

          const { error: deleteError } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId)

          if (deleteError) {
            results.failed.push({
              id: projectId,
              error: 'Failed to delete project'
            })
          } else {
            results.successful.push(projectId)
          }
        } catch (error) {
          results.failed.push({
            id: projectId,
            error: 'Unexpected error during deletion'
          })
        }
      }
    } else if (operation === 'update_status' && parameters?.status) {
      // Update project status
      const realProjectIds = project_ids.filter(id => !id.startsWith('demo-'))
      const demoProjectIds = project_ids.filter(id => id.startsWith('demo-'))

      // Handle demo projects (always succeed)
      results.successful.push(...demoProjectIds)

      if (realProjectIds.length > 0) {
        const { error: updateError } = await supabase
          .from('projects')
          .update({ status: parameters.status })
          .in('id', realProjectIds)

        if (updateError) {
          // If bulk update fails, try individual updates to identify which ones failed
          for (const projectId of realProjectIds) {
            const { error: individualError } = await supabase
              .from('projects')
              .update({ status: parameters.status })
              .eq('id', projectId)

            if (individualError) {
              results.failed.push({
                id: projectId,
                error: 'Failed to update project status'
              })
            } else {
              results.successful.push(projectId)
            }
          }
        } else {
          // Bulk update succeeded
          results.successful.push(...realProjectIds)
        }
      }
    }

    const hasFailures = results.failed.length > 0
    const allFailed = results.successful.length === 0

    if (allFailed) {
      return NextResponse.json(
        {
          success: false,
          error: 'All bulk operations failed',
          details: results
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: hasFailures
        ? `Bulk ${operation} completed with ${results.failed.length} failures`
        : `Bulk ${operation} completed successfully`,
      data: results
    })
  } catch (error: any) {
    console.error('Bulk operations API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

