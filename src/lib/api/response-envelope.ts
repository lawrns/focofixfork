/**
 * Canonical API Response Envelope
 * ALL endpoints MUST return this shape
 * 
 * This enforces:
 * - Explicit success/failure discrimination via `ok` field
 * - Type-safe data access (data XOR error, never both)
 * - Machine-readable error codes
 * - Consistent metadata structure
 */

export type APIResponse<T> = APISuccess<T> | APIError

export interface APISuccess<T> {
  ok: true
  data: T
  error: null
  meta?: ResponseMeta
}

export interface APIError {
  ok: false
  data: null
  error: ErrorDetails
  meta?: ResponseMeta
}

export interface ErrorDetails {
  code: ErrorCode
  message: string
  details?: unknown
  timestamp: string
  requestId?: string
  stack?: string
}

export interface ResponseMeta {
  pagination?: PaginationMeta
  timing?: TimingMeta
  version?: string
}

export interface PaginationMeta {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface TimingMeta {
  duration: number
  queries: number
}

/**
 * Comprehensive error code taxonomy
 * Enables machine-readable error handling
 */
export enum ErrorCode {
  // Authentication errors (401)
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  
  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  WORKSPACE_ACCESS_DENIED = 'WORKSPACE_ACCESS_DENIED',
  PROJECT_ACCESS_DENIED = 'PROJECT_ACCESS_DENIED',
  RESOURCE_ACCESS_DENIED = 'RESOURCE_ACCESS_DENIED',
  
  // Not found errors (404)
  NOT_FOUND = 'NOT_FOUND',
  WORKSPACE_NOT_FOUND = 'WORKSPACE_NOT_FOUND',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  MILESTONE_NOT_FOUND = 'MILESTONE_NOT_FOUND',
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  
  // Validation errors (400)
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_UUID = 'INVALID_UUID',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_ENUM_VALUE = 'INVALID_ENUM_VALUE',
  
  // Conflict errors (409)
  CONFLICT = 'CONFLICT',
  DUPLICATE_SLUG = 'DUPLICATE_SLUG',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  DEPENDENCY_CYCLE = 'DEPENDENCY_CYCLE',
  
  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  INVALID_RESPONSE_SHAPE = 'INVALID_RESPONSE_SHAPE',
}

/**
 * Map error codes to HTTP status codes
 */
export function getStatusCode(code: ErrorCode): number {
  const statusMap: Record<ErrorCode, number> = {
    // 401
    [ErrorCode.AUTH_REQUIRED]: 401,
    [ErrorCode.TOKEN_EXPIRED]: 401,
    [ErrorCode.TOKEN_INVALID]: 401,
    [ErrorCode.TOKEN_REFRESH_FAILED]: 401,
    
    // 403
    [ErrorCode.FORBIDDEN]: 403,
    [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
    [ErrorCode.WORKSPACE_ACCESS_DENIED]: 403,
    [ErrorCode.PROJECT_ACCESS_DENIED]: 403,
    [ErrorCode.RESOURCE_ACCESS_DENIED]: 403,
    
    // 404
    [ErrorCode.NOT_FOUND]: 404,
    [ErrorCode.WORKSPACE_NOT_FOUND]: 404,
    [ErrorCode.PROJECT_NOT_FOUND]: 404,
    [ErrorCode.TASK_NOT_FOUND]: 404,
    [ErrorCode.USER_NOT_FOUND]: 404,
    [ErrorCode.MILESTONE_NOT_FOUND]: 404,
    [ErrorCode.TEMPLATE_NOT_FOUND]: 404,
    
    // 400
    [ErrorCode.VALIDATION_FAILED]: 400,
    [ErrorCode.INVALID_UUID]: 400,
    [ErrorCode.INVALID_INPUT]: 400,
    [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
    [ErrorCode.INVALID_FORMAT]: 400,
    [ErrorCode.INVALID_ENUM_VALUE]: 400,
    
    // 409
    [ErrorCode.CONFLICT]: 409,
    [ErrorCode.DUPLICATE_SLUG]: 409,
    [ErrorCode.DUPLICATE_ENTRY]: 409,
    [ErrorCode.DEPENDENCY_CYCLE]: 409,
    
    // 429
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
    
    // 500
    [ErrorCode.INTERNAL_ERROR]: 500,
    [ErrorCode.DATABASE_ERROR]: 500,
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: 500,
    [ErrorCode.CONFIGURATION_ERROR]: 500,
    [ErrorCode.INVALID_RESPONSE_SHAPE]: 500,
  }
  
  return statusMap[code] ?? 500
}

/**
 * Type guard to check if response is successful
 */
export function isSuccess<T>(response: APIResponse<T>): response is APISuccess<T> {
  return response.ok === true
}

/**
 * Type guard to check if response is an error
 */
export function isError<T>(response: APIResponse<T>): response is APIError {
  return response.ok === false
}
