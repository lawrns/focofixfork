import { z } from 'zod'
import { randomUUID } from 'crypto'

/**
 * Uniform error model for all FOCO API endpoints v1.0.0
 * Matches the JSON Schema in schemas/api-error.v1.json
 */

// Error code enum for type safety
export const ErrorCodeEnum = z.enum([
  'PLAN_SCHEMA_INVALID',
  'RATE_LIMIT_EXCEEDED', 
  'TRANSIENT_ASR_ERROR',
  'VOICE_SESSION_EXPIRED',
  'ORGANIZATION_NOT_FOUND',
  'INSUFFICIENT_PERMISSIONS',
  'DEPENDENCY_CYCLE',
  'VALIDATION_FAILED',
  'COMMIT_FAILED',
  'IDEMPOTENCY_CONFLICT',
  'AUDIO_FORMAT_UNSUPPORTED',
  'TRANSCRIPTION_FAILED',
  'AI_MODEL_UNAVAILABLE',
  'PLAN_GENERATION_FAILED',
  'TASK_DEPENDENCY_INVALID',
  'MILESTONE_DATE_CONFLICT',
  'PROJECT_DATE_CONFLICT',
  'DUPLICATE_PROJECT_NAME',
  'RESOURCE_NOT_FOUND',
  'QUOTA_EXCEEDED',
  'AUDIO_PROCESSING_TIMEOUT',
  'WEBSOCKET_CONNECTION_FAILED',
  'FEATURE_FLAG_DISABLED',
  'DATABASE_CONNECTION_FAILED',
  'EXTERNAL_SERVICE_ERROR',
  'INTERNAL_SERVER_ERROR',
  'INVALID_REQUEST_FORMAT',
  'MISSING_REQUIRED_FIELD',
  'FIELD_VALUE_INVALID',
  'UNAUTHORIZED_ACCESS',
  'FORBIDDEN_OPERATION',
  'METHOD_NOT_ALLOWED',
  'ENDPOINT_NOT_FOUND',
  'REQUEST_TIMEOUT',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'INVALID_QUERY_PARAMETER',
  'INVALID_PATH_PARAMETER',
  'CORS_POLICY_VIOLATION',
  'CSRF_TOKEN_INVALID',
  'SESSION_EXPIRED',
  'INVALID_API_KEY',
  'API_KEY_EXPIRED',
  'BRAINTREE_PAYMENT_FAILED',
  'STRIPE_PAYMENT_FAILED',
  'EMAIL_SENDING_FAILED',
  'FILE_UPLOAD_FAILED',
  'FILE_TYPE_NOT_ALLOWED',
  'FILE_SIZE_EXCEEDED',
  'IMAGE_PROCESSING_FAILED',
  'PDF_GENERATION_FAILED',
  'EXPORT_FAILED',
  'IMPORT_FAILED',
  'BACKUP_FAILED',
  'RESTORE_FAILED',
  'MIGRATION_FAILED',
  'INDEX_REBUILD_FAILED',
  'CACHE_MISS',
  'CACHE_WRITE_FAILED',
  'REDIS_CONNECTION_FAILED',
  'QUEUE_MESSAGE_FAILED',
  'WEBHOOK_DELIVERY_FAILED',
  'NOTIFICATION_SENDING_FAILED',
  'SLACK_INTEGRATION_FAILED',
  'GITHUB_INTEGRATION_FAILED',
  'JIRA_INTEGRATION_FAILED',
  'GOOGLE_CALENDAR_FAILED',
  'OUTLOOK_CALENDAR_FAILED',
  'ZOOM_INTEGRATION_FAILED',
  'TEAMS_INTEGRATION_FAILED',
  'DISCORD_INTEGRATION_FAILED'
])

// Retry strategy enum
export const RetryBackoffEnum = z.enum(['linear', 'exponential', 'fixed'])

// Validation error schema
export const ValidationErrorSchema = z.object({
  path: z.array(z.string()),
  message: z.string(),
  code: z.string()
})

// Error details schema
export const ErrorDetailsSchema = z.object({
  field: z.string().optional(),
  value: z.any().optional(),
  expected: z.any().optional(),
  validation_errors: z.array(ValidationErrorSchema).optional(),
  retry_after: z.number().min(1).max(3600).optional(),
  max_retries: z.number().min(0).max(10).optional(),
  retry_backoff: RetryBackoffEnum.optional(),
  service_name: z.string().optional(),
  timestamp: z.string().datetime().optional(),
  request_id: z.string().optional(),
  user_id: z.string().uuid().optional(),
  organization_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
  audio_duration_ms: z.number().min(0).optional(),
  transcript_length: z.number().min(0).optional(),
  plan_complexity_score: z.number().min(1).max(10).optional(),
  dependency_chain: z.array(z.string()).optional(),
  quota_limit: z.number().min(0).optional(),
  quota_usage: z.number().min(0).optional(),
  quota_reset_time: z.string().datetime().optional()
}).passthrough() // Allow additional properties for extensibility

// Main error response schema
export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: ErrorCodeEnum,
    message: z.string().min(1).max(500),
    retriable: z.boolean(),
    correlationId: z.string().uuid(),
    details: ErrorDetailsSchema.optional()
  })
})

// Type exports
export type ErrorCode = z.infer<typeof ErrorCodeEnum>
export type ValidationError = z.infer<typeof ValidationErrorSchema>
export type ErrorDetails = z.infer<typeof ErrorDetailsSchema>
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>

/**
 * Error class for standardized API errors
 */
export class ApiError extends Error {
  public readonly code: ErrorCode
  public readonly retriable: boolean
  public readonly correlationId: string
  public readonly details?: ErrorDetails
  public readonly statusCode: number

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    retriable: boolean = false,
    details?: ErrorDetails
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.statusCode = statusCode
    this.retriable = retriable
    this.correlationId = randomUUID()
    this.details = {
      timestamp: new Date().toISOString(),
      ...details
    }
  }

  toJSON(): ApiErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        retriable: this.retriable,
        correlationId: this.correlationId,
        details: this.details
      }
    }
  }

  static fromZodError(zodError: z.ZodError, context?: { field?: string; sessionId?: string }): ApiError {
    const validationErrors: ValidationError[] = zodError.errors.map(error => ({
      path: error.path.map(String),
      message: error.message,
      code: error.code
    }))

    return new ApiError(
      'VALIDATION_FAILED',
      'Request validation failed',
      400,
      false,
      {
        field: context?.field,
        session_id: context?.sessionId,
        validation_errors: validationErrors
      }
    )
  }
}

/**
 * Error factory functions for common error scenarios
 */
export class ErrorFactory {
  static planSchemaInvalid(validationErrors: ValidationError[], sessionId?: string): ApiError {
    return new ApiError(
      'PLAN_SCHEMA_INVALID',
      'The generated plan does not conform to the required schema',
      400,
      false,
      {
        session_id: sessionId,
        validation_errors: validationErrors
      }
    )
  }

  static rateLimitExceeded(
    retryAfter: number = 60,
    quotaLimit?: number,
    quotaUsage?: number,
    quotaResetTime?: string
  ): ApiError {
    return new ApiError(
      'RATE_LIMIT_EXCEEDED',
      'You have exceeded the rate limit for this operation',
      429,
      true,
      {
        retry_after: retryAfter,
        max_retries: 3,
        retry_backoff: 'exponential',
        quota_limit: quotaLimit,
        quota_usage: quotaUsage,
        quota_reset_time: quotaResetTime
      }
    )
  }

  static transientAsrError(audioDurationMs?: number): ApiError {
    return new ApiError(
      'TRANSIENT_ASR_ERROR',
      'Temporary speech recognition service error',
      503,
      true,
      {
        audio_duration_ms: audioDurationMs,
        retry_after: 5,
        max_retries: 2,
        retry_backoff: 'linear'
      }
    )
  }

  static voiceSessionExpired(sessionId: string): ApiError {
    return new ApiError(
      'VOICE_SESSION_EXPIRED',
      'Voice session has expired, please start a new session',
      410,
      false,
      { session_id: sessionId }
    )
  }

  static organizationNotFound(organizationId: string): ApiError {
    return new ApiError(
      'ORGANIZATION_NOT_FOUND',
      'Organization not found or access denied',
      404,
      false,
      { organization_id: organizationId }
    )
  }

  static insufficientPermissions(operation: string): ApiError {
    return new ApiError(
      'INSUFFICIENT_PERMISSIONS',
      `Insufficient permissions to perform operation: ${operation}`,
      403,
      false,
      { field: 'permissions' }
    )
  }

  static dependencyCycle(dependencyChain: string[]): ApiError {
    return new ApiError(
      'DEPENDENCY_CYCLE',
      'Circular dependency detected in task relationships',
      400,
      false,
      {
        dependency_chain: dependencyChain,
        retry_after: 0,
        max_retries: 0
      }
    )
  }

  static commitFailed(reason: string, sessionId?: string): ApiError {
    return new ApiError(
      'COMMIT_FAILED',
      `Failed to commit plan: ${reason}`,
      500,
      true,
      {
        session_id: sessionId,
        service_name: 'plan_commit_service',
        retry_after: 10,
        max_retries: 3,
        retry_backoff: 'exponential'
      }
    )
  }

  static idempotencyConflict(idempotencyKey: string): ApiError {
    return new ApiError(
      'IDEMPOTENCY_CONFLICT',
      'Request with this idempotency key has already been processed',
      409,
      false,
      {
        field: 'idempotency_key',
        value: idempotencyKey
      }
    )
  }

  static audioFormatUnsupported(format: string): ApiError {
    return new ApiError(
      'AUDIO_FORMAT_UNSUPPORTED',
      `Audio format '${format}' is not supported`,
      415,
      false,
      {
        field: 'audio_format',
        value: format,
        expected: 'webm, mp3, wav, m4a'
      }
    )
  }

  static transcriptionFailed(reason: string, audioDurationMs?: number): ApiError {
    return new ApiError(
      'TRANSCRIPTION_FAILED',
      `Speech transcription failed: ${reason}`,
      500,
      true,
      {
        audio_duration_ms: audioDurationMs,
        service_name: 'openai_whisper',
        retry_after: 15,
        max_retries: 2,
        retry_backoff: 'exponential'
      }
    )
  }

  static aiModelUnavailable(model: string): ApiError {
    return new ApiError(
      'AI_MODEL_UNAVAILABLE',
      `AI model '${model}' is currently unavailable`,
      503,
      true,
      {
        service_name: 'openai_api',
        retry_after: 30,
        max_retries: 3,
        retry_backoff: 'exponential'
      }
    )
  }

  static planGenerationFailed(reason: string, complexityScore?: number): ApiError {
    return new ApiError(
      'PLAN_GENERATION_FAILED',
      `Plan generation failed: ${reason}`,
      500,
      true,
      {
        plan_complexity_score: complexityScore,
        service_name: 'plan_orchestrator',
        retry_after: 20,
        max_retries: 2,
        retry_backoff: 'exponential'
      }
    )
  }

  static resourceNotFound(resource: string, id: string): ApiError {
    return new ApiError(
      'RESOURCE_NOT_FOUND',
      `${resource} with ID '${id}' not found`,
      404,
      false
    )
  }

  static quotaExceeded(
    quotaType: string,
    currentUsage: number,
    limit: number,
    resetTime: string
  ): ApiError {
    return new ApiError(
      'QUOTA_EXCEEDED',
      `${quotaType} quota exceeded`,
      429,
      true,
      {
        quota_limit: limit,
        quota_usage: currentUsage,
        quota_reset_time: resetTime,
        retry_after: 3600,
        max_retries: 1,
        retry_backoff: 'fixed'
      }
    )
  }

  static featureFlagDisabled(feature: string): ApiError {
    return new ApiError(
      'FEATURE_FLAG_DISABLED',
      `Feature '${feature}' is currently disabled`,
      503,
      false,
      { field: 'feature', value: feature }
    )
  }

  static internalServerError(message: string = 'An unexpected error occurred'): ApiError {
    return new ApiError(
      'INTERNAL_SERVER_ERROR',
      message,
      500,
      true,
      {
        service_name: 'api_gateway',
        retry_after: 5,
        max_retries: 2,
        retry_backoff: 'exponential'
      }
    )
  }
}

/**
 * Error handling utilities
 */
export class ErrorHandler {
  /**
   * Convert any error to a standardized ApiError
   */
  static normalize(error: unknown, context?: { sessionId?: string; userId?: string }): ApiError {
    if (error instanceof ApiError) {
      return error
    }

    if (error instanceof z.ZodError) {
      return ApiError.fromZodError(error, context)
    }

    if (error instanceof Error) {
      // Log the original error for debugging
      console.error('Unexpected error:', error, {
        correlationId: randomUUID(),
        context
      })

      return ErrorFactory.internalServerError(error.message)
    }

    // Unknown error type
    console.error('Unknown error type:', error, {
      correlationId: randomUUID(),
      context
    })

    return ErrorFactory.internalServerError()
  }

  /**
   * Determine HTTP status code from error
   */
  static getStatusCode(error: ApiError): number {
    return error.statusCode
  }

  /**
   * Check if error is retriable
   */
  static isRetriable(error: ApiError): boolean {
    return error.retriable
  }

  /**
   * Get retry delay for retriable errors
   */
  static getRetryDelay(error: ApiError): number {
    return error.details?.retry_after || 5
  }

  /**
   * Get maximum retry attempts
   */
  static getMaxRetries(error: ApiError): number {
    return error.details?.max_retries || 3
  }

  /**
   * Get retry backoff strategy
   */
  static getRetryBackoff(error: ApiError): 'linear' | 'exponential' | 'fixed' {
    return error.details?.retry_backoff || 'exponential'
  }
}

/**
 * Express.js error handling middleware
 */
export function apiErrorHandler(
  error: unknown,
  req: any,
  res: any,
  next: any
) {
  const apiError = ErrorHandler.normalize(error, {
    sessionId: req.session?.id,
    userId: req.user?.id
  })

  // Log error for monitoring
  console.error('API Error:', {
    code: apiError.code,
    message: apiError.message,
    correlationId: apiError.correlationId,
    statusCode: apiError.statusCode,
    path: req.path,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    details: apiError.details
  })

  res.status(apiError.statusCode).json(apiError.toJSON())
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return (...args: T): Promise<R> => {
    return fn(...args).catch((error) => {
      throw ErrorHandler.normalize(error)
    })
  }
}

// Types are already exported through their interface declarations
