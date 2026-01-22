import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { ProjectRepository } from '@/lib/repositories/project-repository'
import { AuditRepository } from '@/lib/repositories/audit-repository'
import { isError } from '@/lib/repositories/base-repository'
import {
  authRequiredResponse,
  successResponse,
  validationFailedResponse,
  forbiddenResponse,
  databaseErrorResponse,
  internalErrorResponse,
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

type BulkOperation = 'archive' | 'unarchive' | 'delete'

interface BulkOperationRequest {
  project_ids: string[]
  operation: BulkOperation
}

// Define which operations require admin/owner role
const ADMIN_REQUIRED_OPERATIONS: BulkOperation[] = ['delete']
const MEMBER_ALLOWED_OPERATIONS: BulkOperation[] = ['archive', 'unarchive']

// Role hierarchy for permission checks
const ROLE_LEVELS: Record<string, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  guest: 1,
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const body: BulkOperationRequest = await req.json()

    // Validate request
    if (!body.project_ids || !Array.isArray(body.project_ids) || body.project_ids.length === 0) {
      return validationFailedResponse('project_ids must be a non-empty array')
    }

    if (!body.operation || !['archive', 'unarchive', 'delete'].includes(body.operation)) {
      return validationFailedResponse('Invalid operation type')
    }

    const repo = new ProjectRepository(supabase)

    // Verify user has access AND get their role
    const roleResult = await repo.verifyUserRoleForBatch(body.project_ids, user.id)
    if (isError(roleResult)) {
      if (roleResult.error.code === 'NOT_FOUND') {
        return validationFailedResponse('No projects found', { projectIds: body.project_ids })
      }
      return databaseErrorResponse(roleResult.error.message, roleResult.error.details)
    }

    if (!roleResult.data.hasAccess) {
      return forbiddenResponse('You do not have access to all selected projects')
    }

    const userRole = roleResult.data.role
    const userRoleLevel = userRole ? ROLE_LEVELS[userRole] || 0 : 0

    // Check role-based permissions for the operation
    if (ADMIN_REQUIRED_OPERATIONS.includes(body.operation)) {
      // Admin or owner required for delete operations
      if (userRoleLevel < ROLE_LEVELS.admin) {
        return forbiddenResponse(
          `Operation '${body.operation}' requires admin or owner role. Your role: ${userRole || 'none'}`
        )
      }
    } else if (MEMBER_ALLOWED_OPERATIONS.includes(body.operation)) {
      // Member or above required for archive/unarchive
      if (userRoleLevel < ROLE_LEVELS.member) {
        return forbiddenResponse(
          `Operation '${body.operation}' requires member role or above. Your role: ${userRole || 'none'}`
        )
      }
    }

    const successful: string[] = []
    const failed: Array<{ id: string; error: string }> = []

    // Get request metadata for audit log
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null
    const userAgent = req.headers.get('user-agent') || null

    // Log the batch operation for audit purposes
    console.log('[BulkProjectOperation]', {
      userId: user.id,
      userRole,
      operation: body.operation,
      projectCount: body.project_ids.length,
      workspaceIds: roleResult.data.workspaceIds,
      timestamp: new Date().toISOString(),
    })

    // Create audit log entry
    const auditRepo = new AuditRepository(supabase)
    await auditRepo.logAction({
      user_id: user.id,
      workspace_id: roleResult.data.workspaceIds[0] || null,
      action: `bulk_project_${body.operation}`,
      entity_type: 'project',
      entity_ids: body.project_ids,
      details: {
        operation: body.operation,
        projectCount: body.project_ids.length,
        userRole,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    // Perform bulk operation
    if (operation === 'archive') {
      // Archive projects by setting archived_at to current timestamp
      const { error: updateError } = await supabase
        .from('foco_projects')
        .update({ archived_at: new Date().toISOString() })
        .in('id', project_ids)

      if (updateError) {
        return databaseErrorResponse('Failed to archive projects', updateError)
      }

      // All projects were successfully archived
      successful.push(...project_ids)
    } else if (operation === 'unarchive') {
      // Unarchive projects by setting archived_at to null
      const { error: updateError } = await supabase
        .from('foco_projects')
        .update({ archived_at: null })
        .in('id', project_ids)

      if (updateError) {
        return databaseErrorResponse('Failed to unarchive projects', updateError)
      }

      // All projects were successfully unarchived
      successful.push(...project_ids)
    } else if (operation === 'delete') {
      // Delete projects
      const { error: deleteError } = await supabase
        .from('foco_projects')
        .delete()
        .in('id', project_ids)

      if (deleteError) {
        return databaseErrorResponse('Failed to delete projects', deleteError)
      }

      // All projects were successfully deleted
      successful.push(...project_ids)
    }

    return mergeAuthResponse(successResponse({
      operation: body.operation,
      updated: successful.length,
      failed: failed.length,
      projectIds: successful,
    }), authResponse)
  } catch (err: any) {
    console.error('Bulk project operations error:', err)
    return internalErrorResponse('Failed to perform bulk project operation', err)
  }
}
