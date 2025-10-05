import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

// Schema for bulk operations
const bulkOperationSchema = z.object({
  operation: z.enum(['archive', 'delete', 'update_status']),
  project_ids: z.array(z.string()).min(1).max(50),
  parameters: z.object({
    status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
    force: z.boolean().optional(), // Allow force deletion of projects with dependencies
  }).optional(),
})

/**
 * GET /api/projects/bulk - Get info about bulk operations endpoint
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Bulk operations endpoint',
    supportedOperations: ['archive', 'delete', 'update_status'],
    method: 'POST'
  })
}

/**
 * POST /api/projects/bulk - Perform bulk operations on projects
 */
export async function POST(request: NextRequest) {
  try {
    let userId = request.headers.get('x-user-id')

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

    // For bulk operations, we'll validate permissions during each operation
    // to allow partial success/failure handling
    // Skip permission check for demo projects (they don't have project_members entries)
    const demoProjectIds = project_ids.filter(id => id.startsWith('demo-'))
    const realProjectIds = project_ids.filter(id => !id.startsWith('demo-'))

    // Demo projects are always allowed (no permission check needed)

    // Process each operation type
    if (operation === 'archive') {
      // Archive projects (set status to 'cancelled')
      for (const projectId of project_ids) {
        try {
          // Skip database operations for demo projects
          if (projectId.startsWith('demo-')) {
            if (!results.successful.includes(projectId)) results.successful.push(projectId)
            continue
          }

          // Check permissions for real projects
          const { data: project, error: fetchError } = await supabase
            .from('projects')
            .select('created_by')
            .eq('id', projectId)
            .single()

          if (fetchError) {
            if (!results.failed.find(f => f.id === projectId)) results.failed.push({ id: projectId, error: 'Project not found' })
            continue
          }

          let hasPermission = project.created_by === userId
          if (!hasPermission) {
            const { data: teamMember } = await supabase
              .from('project_team_assignments')
              .select('role')
              .eq('project_id', projectId)
              .eq('user_id', userId)
              .eq('is_active', true)
              .single()

            hasPermission = teamMember ? ['owner', 'admin'].includes(teamMember.role) : false
          }

          if (!hasPermission) {
            if (!results.failed.find(f => f.id === projectId)) results.failed.push({ id: projectId, error: 'Permission denied' })
            continue
          }

          // Check if project has active tasks
          const { count: activeTasks } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId)
            .neq('status', 'completed')

          if (activeTasks && activeTasks > 0) {
            if (!results.failed.find(f => f.id === projectId)) results.failed.push({ id: projectId, error: 'Project has active tasks and cannot be archived' })
            continue
          }

          const { error: updateError } = await supabase
            .from('projects')
            .update({ status: 'cancelled' })
            .eq('id', projectId)

          if (updateError) {
            if (!results.failed.find(f => f.id === projectId)) results.failed.push({ id: projectId, error: 'Failed to archive project' })
          } else {
            if (!results.successful.includes(projectId)) results.successful.push(projectId)
          }
        } catch (error) {
          if (!results.failed.find(f => f.id === projectId)) results.failed.push({ id: projectId, error: 'Unexpected error during archiving' })
        }
      }
    } else if (operation === 'delete') {
      // Import the ProjectsService for proper deletion with cascading
      const { ProjectsService } = await import('@/features/projects/services/projectService')

      for (const projectId of project_ids) {
        try {
          // Skip database operations for demo projects
          if (projectId.startsWith('demo-')) {
            if (!results.successful.includes(projectId)) results.successful.push(projectId)
            continue
          }

          // Use the ProjectsService deleteProject method which handles permissions and cascading
          const result = await ProjectsService.deleteProject(userId, projectId)

          if (result.success) {
            if (!results.successful.includes(projectId)) results.successful.push(projectId)
          } else {
            if (!results.failed.find(f => f.id === projectId)) results.failed.push({ id: projectId, error: result.error || 'Failed to delete project' })
          }
        } catch (error) {
            if (!results.failed.find(f => f.id === projectId)) results.failed.push({ id: projectId, error: 'Unexpected error during deletion' })
        }
      }
    } else if (operation === 'update_status' && parameters?.status) {
      // Update project status
      for (const projectId of project_ids) {
        try {
          // Skip database operations for demo projects
          if (projectId.startsWith('demo-')) {
            if (!results.successful.includes(projectId)) results.successful.push(projectId)
            continue
          }

          // Check permissions for real projects
          const { data: project, error: fetchError } = await supabase
            .from('projects')
            .select('created_by')
            .eq('id', projectId)
            .single()

          if (fetchError) {
            if (!results.failed.find(f => f.id === projectId)) results.failed.push({ id: projectId, error: 'Project not found' })
            continue
          }

          let hasPermission = project.created_by === userId
          if (!hasPermission) {
            const { data: teamMember } = await supabase
              .from('project_team_assignments')
              .select('role')
              .eq('project_id', projectId)
              .eq('user_id', userId)
              .eq('is_active', true)
              .single()

            hasPermission = teamMember ? ['owner', 'admin'].includes(teamMember.role) : false
          }

          if (!hasPermission) {
            if (!results.failed.find(f => f.id === projectId)) results.failed.push({ id: projectId, error: 'Permission denied' })
            continue
          }

          const { error: updateError } = await supabase
            .from('projects')
            .update({ status: parameters.status })
            .eq('id', projectId)

          if (updateError) {
            if (!results.failed.find(f => f.id === projectId)) results.failed.push({ id: projectId, error: 'Failed to update project status' })
          } else {
            if (!results.successful.includes(projectId)) results.successful.push(projectId)
          }
        } catch (error) {
          if (!results.failed.find(f => f.id === projectId)) results.failed.push({ id: projectId, error: 'Unexpected error during status update' })
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

