/**
 * Standardized API Response Helpers
 *
 * All API routes should use these helpers to ensure consistent response format:
 * - Success: { success: true, data: T, message?: string }
 * - Error: { success: false, error: string, details?: any }
 */

import { NextResponse } from 'next/server'

export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  message?: string
}

export interface ApiErrorResponse {
  success: false
  error: string
  details?: any
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Create a successful API response
 */
export function apiSuccess<T>(
  data: T,
  message?: string,
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message })
    },
    { status }
  )
}

/**
 * Create an error API response
 */
export function apiError(
  error: string,
  details?: any,
  status = 400
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(details && { details })
    },
    { status }
  )
}

/**
 * Wrap an async API handler with error handling
 */
export function withApiHandler<T = any>(
  handler: () => Promise<NextResponse<ApiResponse<T>>>
): Promise<NextResponse<ApiResponse<T>>> {
  return handler().catch((error) => {
    console.error('API Handler Error:', error)

    // Check if it's already a NextResponse
    if (error instanceof NextResponse) {
      return error
    }

    // Handle different error types
    if (error?.message) {
      return apiError(error.message, error.stack, 500)
    }

    return apiError('Internal server error', undefined, 500)
  })
}

/**
 * Parse and validate API response data
 * Ensures data is in the expected format and handles edge cases
 */
export function parseApiResponse<T>(response: any): ApiResponse<T> {
  // Already in correct format
  if (response?.success !== undefined) {
    return response
  }

  // Legacy format with just data
  if (response?.data !== undefined) {
    return {
      success: true,
      data: response.data
    }
  }

  // Legacy error format
  if (response?.error) {
    return {
      success: false,
      error: response.error,
      details: response.details
    }
  }

  // Assume raw data is successful response
  return {
    success: true,
    data: response
  }
}

/**
 * Type guard to check if response is successful
 */
export function isApiSuccess<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true
}

/**
 * Type guard to check if response is an error
 */
export function isApiError<T>(
  response: ApiResponse<T>
): response is ApiErrorResponse {
  return response.success === false
}

/**
 * Extract data from API response or throw error
 */
export function unwrapApiResponse<T>(response: ApiResponse<T>): T {
  if (isApiSuccess(response)) {
    return response.data
  }
  throw new Error(response.error)
}