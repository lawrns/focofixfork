import { NextRequest, NextResponse } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { BulkCreateProjectsSchema } from '@/lib/validation/schemas/project-team-api.schema'
import { checkRateLimit } from '@/server/utils/rateLimit'
import { z } from 'zod'
import { supabase } from '@/lib/supabase-client'

// Schema for bulk operations (update/delete/archive)
const BulkOperationSchema = z.object({
  body: z.object({
    operation: z.enum(['archive', 'delete', 'update_status']),
    project_ids: z.array(z.string()).min(1).max(50),
    parameters: z.object({
      status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
      force: z.boolean().optional()
    }).optional()
  }).strict(),
  query: z.object({}).optional()
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
 * Rate limited: 5 bulk operations per minute to prevent abuse
 */
export async function POST(request: NextRequest) {
  return wrapRoute(BulkOperationSchema, async ({ input, user, req, correlationId }) => {
    // Rate limit bulk operations (expensive, potential for abuse)
    await checkRateLimit(user.id, req.headers.get('x-forwarded-for'), 'api')

    const { operation, project_ids, parameters } = input.body

    const results = {
      successful: [] as string[],
      failed: [] as { id: string; error: string }[],
      total_processed: project_ids.length
    }

    // Process each operation type
    if (operation === 'archive') {
      for (const projectId of project_ids) {
        try {
          // Skip demo projects
          if (projectId.startsWith('demo-')) {
            results.successful.push(projectId)
            continue
          }

          // Check permissions
          const { data: project, error: fetchError } = await supabase
            .from('projects')
            .select('created_by')
            .eq('id', projectId)
            .single()

          if (fetchError) {
            results.failed.push({ id: projectId, error: 'Project not found' })
            continue
          }

          let hasPermission = project.created_by === user.id
          if (!hasPermission) {
            const { data: teamMember } = await supabase
              .from('project_team_assignments')
              .select('role')
              .eq('project_id', projectId)
              .eq('user_id', user.id)
              .eq('is_active', true)
              .single()

            hasPermission = teamMember ? ['owner', 'admin'].includes(teamMember.role) : false
          }

          if (!hasPermission) {
            results.failed.push({ id: projectId, error: 'Permission denied' })
            continue
          }

          // Check if project has active tasks
          const { count: activeTasks } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId)
            .neq('status', 'completed')

          if (activeTasks && activeTasks > 0) {
            results.failed.push({ id: projectId, error: 'Project has active tasks' })
            continue
          }

          const { error: updateError } = await supabase
            .from('projects')
            .update({ status: 'cancelled' })
            .eq('id', projectId)

          if (updateError) {
            results.failed.push({ id: projectId, error: 'Failed to archive' })
          } else {
            results.successful.push(projectId)
          }
        } catch (error) {
          results.failed.push({ id: projectId, error: 'Unexpected error' })
        }
      }
    } else if (operation === 'delete') {
      const { ProjectsService } = await import('@/features/projects/services/projectService')

      for (const projectId of project_ids) {
        try {
          if (projectId.startsWith('demo-')) {
            results.successful.push(projectId)
            continue
          }

          const result = await ProjectsService.deleteProject(user.id, projectId)

          if (result.success) {
            results.successful.push(projectId)
          } else {
            results.failed.push({ id: projectId, error: result.error || 'Failed to delete' })
          }
        } catch (error) {
          results.failed.push({ id: projectId, error: 'Unexpected error' })
        }
      }
    } else if (operation === 'update_status' && parameters?.status) {
      for (const projectId of project_ids) {
        try {
          if (projectId.startsWith('demo-')) {
            results.successful.push(projectId)
            continue
          }

          // Check permissions
          const { data: project, error: fetchError } = await supabase
            .from('projects')
            .select('created_by')
            .eq('id', projectId)
            .single()

          if (fetchError) {
            results.failed.push({ id: projectId, error: 'Project not found' })
            continue
          }

          let hasPermission = project.created_by === user.id
          if (!hasPermission) {
            const { data: teamMember } = await supabase
              .from('project_team_assignments')
              .select('role')
              .eq('project_id', projectId)
              .eq('user_id', user.id)
              .eq('is_active', true)
              .single()

            hasPermission = teamMember ? ['owner', 'admin'].includes(teamMember.role) : false
          }

          if (!hasPermission) {
            results.failed.push({ id: projectId, error: 'Permission denied' })
            continue
          }

          const { error: updateError } = await supabase
            .from('projects')
            .update({ status: parameters.status })
            .eq('id', projectId)

          if (updateError) {
            results.failed.push({ id: projectId, error: 'Failed to update' })
          } else {
            results.successful.push(projectId)
          }
        } catch (error) {
          results.failed.push({ id: projectId, error: 'Unexpected error' })
        }
      }
    }

    const allFailed = results.successful.length === 0

    if (allFailed) {
      const err: any = new Error('All bulk operations failed')
      err.code = 'BULK_OPERATION_FAILED'
      err.statusCode = 400
      err.details = results
      throw err
    }

    return {
      message: results.failed.length > 0
        ? `Bulk ${operation} completed with ${results.failed.length} failures`
        : `Bulk ${operation} completed successfully`,
      results
    }
  })(request)
}
