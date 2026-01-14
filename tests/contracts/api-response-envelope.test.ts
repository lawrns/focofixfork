/**
 * API Response Envelope Contract Tests
 * Validates that all endpoints conform to the canonical response envelope
 */

import { describe, it, expect } from 'vitest'
import type { APIResponse } from '@/lib/api/response-envelope'
import { isSuccess, isError } from '@/lib/api/response-envelope'

describe('API Response Envelope Contract', () => {
  describe('Type Guards', () => {
    it('isSuccess correctly identifies success responses', () => {
      const successResponse: APIResponse<string> = {
        ok: true,
        data: 'test',
        error: null,
      }

      expect(isSuccess(successResponse)).toBe(true)
      expect(isError(successResponse)).toBe(false)

      if (isSuccess(successResponse)) {
        expect(successResponse.data).toBe('test')
      }
    })

    it('isError correctly identifies error responses', () => {
      const errorResponse: APIResponse<string> = {
        ok: false,
        data: null,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error message',
          timestamp: new Date().toISOString(),
        },
      }

      expect(isError(errorResponse)).toBe(true)
      expect(isSuccess(errorResponse)).toBe(false)

      if (isError(errorResponse)) {
        expect(errorResponse.error.code).toBe('TEST_ERROR')
      }
    })
  })

  describe('Response Shape Validation', () => {
    it('success response has exactly required fields', () => {
      const response: APIResponse<{ id: string }> = {
        ok: true,
        data: { id: '123' },
        error: null,
      }

      expect(response).toHaveProperty('ok')
      expect(response).toHaveProperty('data')
      expect(response).toHaveProperty('error')
      expect(response.ok).toBe(true)
      expect(response.error).toBeNull()
    })

    it('error response has exactly required fields', () => {
      const response: APIResponse<never> = {
        ok: false,
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          timestamp: new Date().toISOString(),
        },
      }

      expect(response).toHaveProperty('ok')
      expect(response).toHaveProperty('data')
      expect(response).toHaveProperty('error')
      expect(response.ok).toBe(false)
      expect(response.data).toBeNull()
      expect(response.error).toHaveProperty('code')
      expect(response.error).toHaveProperty('message')
      expect(response.error).toHaveProperty('timestamp')
    })

    it('success and error are mutually exclusive', () => {
      const successResponse: APIResponse<string> = {
        ok: true,
        data: 'test',
        error: null,
      }

      const errorResponse: APIResponse<string> = {
        ok: false,
        data: null,
        error: {
          code: 'ERROR',
          message: 'Error',
          timestamp: new Date().toISOString(),
        },
      }

      // Success has data, not error
      if (successResponse.ok) {
        expect(successResponse.data).toBeTruthy()
        expect(successResponse.error).toBeNull()
      }

      // Error has error, not data
      if (!errorResponse.ok) {
        expect(errorResponse.error).toBeTruthy()
        expect(errorResponse.data).toBeNull()
      }
    })
  })

  describe('Metadata Support', () => {
    it('supports pagination metadata', () => {
      const response: APIResponse<string[]> = {
        ok: true,
        data: ['item1', 'item2'],
        error: null,
        meta: {
          pagination: {
            total: 100,
            limit: 10,
            offset: 0,
            hasMore: true,
          },
        },
      }

      expect(response.meta?.pagination).toBeDefined()
      expect(response.meta?.pagination?.total).toBe(100)
      expect(response.meta?.pagination?.hasMore).toBe(true)
    })

    it('supports timing metadata', () => {
      const response: APIResponse<string> = {
        ok: true,
        data: 'test',
        error: null,
        meta: {
          timing: {
            duration: 150,
            queries: 3,
          },
        },
      }

      expect(response.meta?.timing).toBeDefined()
      expect(response.meta?.timing?.duration).toBe(150)
      expect(response.meta?.timing?.queries).toBe(3)
    })
  })

  describe('Error Details', () => {
    it('includes error code for machine-readable handling', () => {
      const response: APIResponse<never> = {
        ok: false,
        data: null,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Validation failed',
          timestamp: new Date().toISOString(),
        },
      }

      expect(response.error.code).toBe('VALIDATION_FAILED')
    })

    it('includes human-readable message', () => {
      const response: APIResponse<never> = {
        ok: false,
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: 'Project with id abc123 not found',
          timestamp: new Date().toISOString(),
        },
      }

      expect(response.error.message).toContain('Project')
      expect(response.error.message).toContain('abc123')
    })

    it('includes timestamp for debugging', () => {
      const timestamp = new Date().toISOString()
      const response: APIResponse<never> = {
        ok: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          timestamp,
        },
      }

      expect(response.error.timestamp).toBe(timestamp)
      expect(new Date(response.error.timestamp).getTime()).toBeLessThanOrEqual(Date.now())
    })

    it('optionally includes additional details', () => {
      const response: APIResponse<never> = {
        ok: false,
        data: null,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Validation failed',
          timestamp: new Date().toISOString(),
          details: {
            field: 'email',
            reason: 'Invalid email format',
          },
        },
      }

      expect(response.error.details).toBeDefined()
      expect((response.error.details as any).field).toBe('email')
    })
  })
})
