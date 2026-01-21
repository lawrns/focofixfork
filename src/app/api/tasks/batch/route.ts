import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { TaskRepository } from '@/lib/repositories/task-repository'
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

type BatchOperation = 'complete' | 'move' | 'priority' | 'assign' | 'tag' | 'delete'

interface BatchOperationRequest {
  taskIds: string[]
  operation: BatchOperation
  value?: any
}

// Define which operations require admin/owner role
const ADMIN_REQUIRED_OPERATIONS: BatchOperation[] = ['delete', 'move']
const MEMBER_ALLOWED_OPERATIONS: BatchOperation[] = ['complete', 'priority', 'assign', 'tag']

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

    const body: BatchOperationRequest = await req.json()

    // Validate request
    if (!body.taskIds || !Array.isArray(body.taskIds) || body.taskIds.length === 0) {
      return validationFailedResponse('taskIds must be a non-empty array')
    }

    if (!body.operation || !['complete', 'move', 'priority', 'assign', 'tag', 'delete'].includes(body.operation)) {
      return validationFailedResponse('Invalid operation type')
    }

    const repo = new TaskRepository(supabase)

    // Verify user has access AND get their role
    const roleResult = await repo.verifyUserRoleForBatch(body.taskIds, user.id)
    if (isError(roleResult)) {
      if (roleResult.error.code === 'NOT_FOUND') {
        return validationFailedResponse('No tasks found', { taskIds: body.taskIds })
      }
      return databaseErrorResponse(roleResult.error.message, roleResult.error.details)
    }

    if (!roleResult.data.hasAccess) {
      return forbiddenResponse('You do not have access to all selected tasks')
    }

    const userRole = roleResult.data.role
    const userRoleLevel = userRole ? ROLE_LEVELS[userRole] || 0 : 0

    // Check role-based permissions for the operation
    if (ADMIN_REQUIRED_OPERATIONS.includes(body.operation)) {
      // Admin or owner required for destructive/move operations
      if (userRoleLevel < ROLE_LEVELS.admin) {
        return forbiddenResponse(
          `Operation '${body.operation}' requires admin or owner role. Your role: ${userRole || 'none'}`
        )
      }
    } else if (MEMBER_ALLOWED_OPERATIONS.includes(body.operation)) {
      // Member or above required for standard operations
      if (userRoleLevel < ROLE_LEVELS.member) {
        return forbiddenResponse(
          `Operation '${body.operation}' requires member role or above. Your role: ${userRole || 'none'}`
        )
      }
    }

    // Get request metadata for audit log
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null
    const userAgent = req.headers.get('user-agent') || null

    // Log the batch operation for audit purposes
    console.log('[BatchOperation]', {
      userId: user.id,
      userRole,
      operation: body.operation,
      taskCount: body.taskIds.length,
      workspaceIds: roleResult.data.workspaceIds,
      timestamp: new Date().toISOString(),
    })

    // Create audit log entry
    const auditRepo = new AuditRepository(supabase)
    await auditRepo.logAction({
      user_id: user.id,
      workspace_id: roleResult.data.workspaceIds[0] || null,
      action: `batch_${body.operation}`,
      entity_type: 'task',
      entity_ids: body.taskIds,
      details: {
        operation: body.operation,
        value: body.value,
        taskCount: body.taskIds.length,
        userRole,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    // Prepare update data based on operation
    let updateData: any = {}
    let isDelete = false

    switch (body.operation) {
      case 'complete':
        updateData = { status: 'done' }
        break
      case 'move':
        if (!body.value) {
          return validationFailedResponse('value (project_id) is required for move operation')
        }
        updateData = { project_id: body.value }
        break
      case 'priority':
        if (!body.value || !['low', 'medium', 'high', 'urgent', 'none'].includes(body.value)) {
          return validationFailedResponse('value must be a valid priority level')
        }
        updateData = { priority: body.value }
        break
      case 'assign':
        updateData = { assignee_id: body.value || null }
        break
      case 'tag':
        if (!body.value || !Array.isArray(body.value)) {
          return validationFailedResponse('value must be an array of tags')
        }
        updateData = { tags: body.value }
        break
      case 'delete':
        isDelete = true
        break
    }

    // Perform batch operation
    if (isDelete) {
      const deleteResult = await repo.batchDelete(body.taskIds)
      if (isError(deleteResult)) {
        return databaseErrorResponse(deleteResult.error.message, deleteResult.error.details)
      }

      return mergeAuthResponse(successResponse({
        operation: body.operation,
        updated: deleteResult.data,
        failed: 0,
      }), authResponse)
    } else {
      const updateResult = await repo.batchUpdate(body.taskIds, updateData)
      if (isError(updateResult)) {
        return databaseErrorResponse(updateResult.error.message, updateResult.error.details)
      }

      const updatedCount = updateResult.data.length
      const failedCount = body.taskIds.length - updatedCount

      return mergeAuthResponse(successResponse({
        operation: body.operation,
        updated: updatedCount,
        failed: failedCount,
        tasks: updateResult.data,
      }), authResponse)
    }
  } catch (err: any) {
    console.error('Batch operations error:', err)
    return internalErrorResponse('Failed to perform batch operation', err)
  }
}
