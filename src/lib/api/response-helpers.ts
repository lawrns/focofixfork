/**
 * Response Helper Functions
 * Provides type-safe builders for API responses
 */

import { NextResponse } from 'next/server'
import type { APIResponse, APISuccess, APIError, ErrorDetails, ResponseMeta } from './response-envelope'
import { ErrorCode, getStatusCode } from './response-envelope'

/**
 * Create a successful API response
 */
export function success<T>(
  data: T,
  meta?: ResponseMeta
): APISuccess<T> {
  return {
    ok: true,
    data,
    error: null,
    meta,
  }
}

/**
 * Create an error API response
 */
export function error(
  code: ErrorCode,
  message: string,
  details?: unknown,
  requestId?: string
): APIError {
  const errorDetails: ErrorDetails = {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    requestId,
  }
  
  // Include stack trace in development only
  if (process.env.NODE_ENV === 'development' && details instanceof Error) {
    errorDetails.stack = details.stack
  }
  
  return {
    ok: false,
    data: null,
    error: errorDetails,
  }
}

/**
 * Create a NextResponse with successful data
 */
export function successResponse<T>(
  data: T,
  meta?: ResponseMeta,
  status: number = 200
): NextResponse<APISuccess<T>> {
  return NextResponse.json(success(data, meta), { status })
}

/**
 * Create a NextResponse with error
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown,
  requestId?: string
): NextResponse<APIError> {
  const statusCode = getStatusCode(code)
  return NextResponse.json(error(code, message, details, requestId), { status: statusCode })
}

/**
 * Auth error helpers
 */
export function authRequiredResponse(message: string = 'Authentication required'): NextResponse<APIError> {
  return errorResponse(ErrorCode.AUTH_REQUIRED, message)
}

export function tokenExpiredResponse(message: string = 'Token has expired'): NextResponse<APIError> {
  return errorResponse(ErrorCode.TOKEN_EXPIRED, message)
}

export function tokenInvalidResponse(message: string = 'Invalid authentication token'): NextResponse<APIError> {
  return errorResponse(ErrorCode.TOKEN_INVALID, message)
}

/**
 * Authorization error helpers
 */
export function forbiddenResponse(message: string = 'Access forbidden'): NextResponse<APIError> {
  return errorResponse(ErrorCode.FORBIDDEN, message)
}

export function workspaceAccessDeniedResponse(workspaceId: string): NextResponse<APIError> {
  return errorResponse(
    ErrorCode.WORKSPACE_ACCESS_DENIED,
    `Access denied to workspace ${workspaceId}`,
    { workspaceId }
  )
}

export function projectAccessDeniedResponse(projectId: string): NextResponse<APIError> {
  return errorResponse(
    ErrorCode.PROJECT_ACCESS_DENIED,
    `Access denied to project ${projectId}`,
    { projectId }
  )
}

/**
 * Not found error helpers
 */
export function notFoundResponse(resource: string, id: string): NextResponse<APIError> {
  return errorResponse(
    ErrorCode.NOT_FOUND,
    `${resource} not found`,
    { resource, id }
  )
}

export function workspaceNotFoundResponse(workspaceId: string): NextResponse<APIError> {
  return errorResponse(
    ErrorCode.WORKSPACE_NOT_FOUND,
    `Workspace ${workspaceId} not found`,
    { workspaceId }
  )
}

export function projectNotFoundResponse(projectId: string): NextResponse<APIError> {
  return errorResponse(
    ErrorCode.PROJECT_NOT_FOUND,
    `Project ${projectId} not found`,
    { projectId }
  )
}

export function taskNotFoundResponse(taskId: string): NextResponse<APIError> {
  return errorResponse(
    ErrorCode.TASK_NOT_FOUND,
    `Task ${taskId} not found`,
    { taskId }
  )
}

/**
 * Validation error helpers
 */
export function validationFailedResponse(message: string, details?: unknown): NextResponse<APIError> {
  return errorResponse(ErrorCode.VALIDATION_FAILED, message, details)
}

export function invalidUUIDResponse(field: string, value: string): NextResponse<APIError> {
  return errorResponse(
    ErrorCode.INVALID_UUID,
    `Invalid UUID format for ${field}`,
    { field, value }
  )
}

export function missingFieldResponse(field: string): NextResponse<APIError> {
  return errorResponse(
    ErrorCode.MISSING_REQUIRED_FIELD,
    `Missing required field: ${field}`,
    { field }
  )
}

export function badRequestResponse(message: string, details?: unknown): NextResponse<APIError> {
  return errorResponse(ErrorCode.VALIDATION_FAILED, message, details)
}

/**
 * Conflict error helpers
 */
export function duplicateSlugResponse(slug: string): NextResponse<APIError> {
  return errorResponse(
    ErrorCode.DUPLICATE_SLUG,
    `A resource with slug '${slug}' already exists`,
    { slug }
  )
}

export function conflictResponse(message: string, details?: unknown): NextResponse<APIError> {
  return errorResponse(ErrorCode.CONFLICT, message, details)
}

/**
 * Server error helpers
 */
export function internalErrorResponse(message: string = 'Internal server error', details?: unknown): NextResponse<APIError> {
  return errorResponse(ErrorCode.INTERNAL_ERROR, message, details)
}

export function databaseErrorResponse(message: string, details?: unknown): NextResponse<APIError> {
  return errorResponse(ErrorCode.DATABASE_ERROR, message, details)
}

/**
 * Utility to validate UUID format
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value)
}

/**
 * Validate UUID and return error response if invalid
 */
export function validateUUID(field: string, value: string): NextResponse<APIError> | null {
  if (!isValidUUID(value)) {
    return invalidUUIDResponse(field, value)
  }
  return null
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  total: number,
  limit: number,
  offset: number
): ResponseMeta {
  return {
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  }
}
