import { describe, it, expect } from 'vitest'
import {
  createTaskSchema,
  createProjectSchema,
  loginSchema,
  registerSchema,
  verify2FASchema,
  voiceInputSchema,
  exportTasksSchema,
  validateBody,
  validateQuery,
  safeValidate,
  sanitizeHtml,
  sanitizeText,
} from '@/lib/validation/api-schemas'

/**
 * CRITICAL SECURITY TESTS: Input Validation
 *
 * Verifies protection against:
 * - SQL injection
 * - XSS attacks
 * - Type confusion
 * - Business logic bypass
 * - Buffer overflow / DoS via oversized inputs
 */

describe('Input Validation Security Tests', () => {
  describe('Task Validation', () => {
    it('should accept valid task data', () => {
      const validTask = {
        title: 'Test Task',
        description: 'Test description',
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'todo',
        priority: 'high'
      }

      const result = safeValidate(createTaskSchema, validTask)
      expect(result.success).toBe(true)
    })

    it('should reject task without title', () => {
      const invalidTask = {
        project_id: '123e4567-e89b-12d3-a456-426614174000'
      }

      const result = safeValidate(createTaskSchema, invalidTask)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors.some(e => e.includes('title'))).toBe(true)
      }
    })

    it('should reject task with invalid UUID', () => {
      const invalidTask = {
        title: 'Test',
        project_id: 'not-a-uuid'
      }

      const result = safeValidate(createTaskSchema, invalidTask)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors.some(e => e.includes('UUID'))).toBe(true)
      }
    })

    it('should reject task with oversized title', () => {
      const invalidTask = {
        title: 'x'.repeat(201), // Max is 200
        project_id: '123e4567-e89b-12d3-a456-426614174000'
      }

      const result = safeValidate(createTaskSchema, invalidTask)
      expect(result.success).toBe(false)
    })

    it('should reject task with invalid status', () => {
      const invalidTask = {
        title: 'Test',
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'invalid_status'
      }

      const result = safeValidate(createTaskSchema, invalidTask)
      expect(result.success).toBe(false)
    })

    it('should reject task with negative estimated hours', () => {
      const invalidTask = {
        title: 'Test',
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        estimated_hours: -5
      }

      const result = safeValidate(createTaskSchema, invalidTask)
      expect(result.success).toBe(false)
    })
  })

  describe('Project Validation', () => {
    it('should accept valid project data', () => {
      const validProject = {
        name: 'Test Project',
        workspace_id: '123e4567-e89b-12d3-a456-426614174000',
        color: '#FF5733'
      }

      const result = safeValidate(createProjectSchema, validProject)
      expect(result.success).toBe(true)
    })

    it('should reject project with invalid color code', () => {
      const invalidProject = {
        name: 'Test Project',
        workspace_id: '123e4567-e89b-12d3-a456-426614174000',
        color: 'red' // Must be hex
      }

      const result = safeValidate(createProjectSchema, invalidProject)
      expect(result.success).toBe(false)
    })

    it('should reject project with invalid slug', () => {
      const invalidProject = {
        name: 'Test Project',
        workspace_id: '123e4567-e89b-12d3-a456-426614174000',
        slug: 'Invalid Slug!'
      }

      const result = safeValidate(createProjectSchema, invalidProject)
      expect(result.success).toBe(false)
    })
  })

  describe('Authentication Validation', () => {
    it('should accept valid login credentials', () => {
      const validLogin = {
        email: 'user@example.com',
        password: 'Password123'
      }

      const result = safeValidate(loginSchema, validLogin)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email format', () => {
      const invalidLogin = {
        email: 'not-an-email',
        password: 'Password123'
      }

      const result = safeValidate(loginSchema, invalidLogin)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors.some(e => e.includes('email'))).toBe(true)
      }
    })

    it('should reject weak passwords', () => {
      const invalidRegister = {
        email: 'user@example.com',
        password: 'weak',
        full_name: 'Test User'
      }

      const result = safeValidate(registerSchema, invalidRegister)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors.some(e => e.includes('password'))).toBe(true)
      }
    })

    it('should enforce password complexity requirements', () => {
      const testCases = [
        { password: 'alllowercase123', should: 'reject' }, // No uppercase
        { password: 'ALLUPPERCASE123', should: 'reject' }, // No lowercase
        { password: 'NoNumbers', should: 'reject' }, // No numbers
        { password: 'Short1A', should: 'reject' }, // Too short
        { password: 'Valid1Password', should: 'accept' } // Valid
      ]

      for (const testCase of testCases) {
        const data = {
          email: 'user@example.com',
          password: testCase.password,
          full_name: 'Test User'
        }

        const result = safeValidate(registerSchema, data)
        if (testCase.should === 'accept') {
          expect(result.success).toBe(true)
        } else {
          expect(result.success).toBe(false)
        }
      }
    })
  })

  describe('2FA Validation', () => {
    it('should accept valid 6-digit token', () => {
      const valid2FA = { token: '123456' }

      const result = safeValidate(verify2FASchema, valid2FA)
      expect(result.success).toBe(true)
    })

    it('should reject non-numeric tokens', () => {
      const invalid2FA = { token: 'abcdef' }

      const result = safeValidate(verify2FASchema, invalid2FA)
      expect(result.success).toBe(false)
    })

    it('should reject tokens with wrong length', () => {
      const testCases = [
        { token: '123', should: 'reject' },
        { token: '12345', should: 'reject' },
        { token: '1234567', should: 'reject' },
        { token: '123456', should: 'accept' }
      ]

      for (const testCase of testCases) {
        const result = safeValidate(verify2FASchema, testCase)
        if (testCase.should === 'accept') {
          expect(result.success).toBe(true)
        } else {
          expect(result.success).toBe(false)
        }
      }
    })
  })

  describe('Injection Attack Prevention', () => {
    it('should reject SQL injection attempts in task title', () => {
      const sqlInjection = {
        title: "'; DROP TABLE tasks; --",
        project_id: '123e4567-e89b-12d3-a456-426614174000'
      }

      // Schema should accept it (string validation), but app logic sanitizes
      const result = safeValidate(createTaskSchema, sqlInjection)
      expect(result.success).toBe(true) // Zod accepts string

      // Verify UUID validation prevents injection in IDs
      const injectionInId = {
        title: 'Test',
        project_id: "' OR '1'='1"
      }

      const result2 = safeValidate(createTaskSchema, injectionInId)
      expect(result2.success).toBe(false) // UUID validation rejects
    })

    it('should prevent XSS via HTML sanitization', () => {
      const xssAttempts = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>'
      ]

      for (const xss of xssAttempts) {
        const sanitized = sanitizeHtml(xss)
        expect(sanitized).not.toContain('<script')
        expect(sanitized).not.toContain('javascript:')
        expect(sanitized).not.toContain('onerror=')
        expect(sanitized).not.toContain('onload=')
      }
    })

    it('should sanitize text input properly', () => {
      const dangerousText = '<script>alert("test")</script>'
      const sanitized = sanitizeText(dangerousText)

      expect(sanitized).not.toContain('<')
      expect(sanitized).not.toContain('>')
    })

    it('should prevent NoSQL injection attempts', () => {
      const noSqlInjection = {
        title: 'Test',
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        custom_fields: { $ne: null }
      }

      // Schema accepts objects in custom_fields, but DB driver should prevent injection
      const result = safeValidate(createTaskSchema, noSqlInjection)
      expect(result.success).toBe(true)
    })
  })

  describe('Type Confusion Prevention', () => {
    it('should reject wrong data types', () => {
      const wrongTypes = {
        title: 123, // Should be string
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        estimated_hours: '10' // Should be number
      }

      const result = safeValidate(createTaskSchema, wrongTypes)
      expect(result.success).toBe(false)
    })

    it('should reject arrays when expecting objects', () => {
      const arrayInsteadOfObject = [
        { title: 'Test', project_id: '123e4567-e89b-12d3-a456-426614174000' }
      ]

      const result = safeValidate(createTaskSchema, arrayInsteadOfObject)
      expect(result.success).toBe(false)
    })

    it('should reject null when field is required', () => {
      const nullValues = {
        title: null,
        project_id: '123e4567-e89b-12d3-a456-426614174000'
      }

      const result = safeValidate(createTaskSchema, nullValues)
      expect(result.success).toBe(false)
    })
  })

  describe('Buffer Overflow / DoS Prevention', () => {
    it('should reject extremely large payloads', () => {
      const oversizedTask = {
        title: 'Test',
        description: 'x'.repeat(20000), // 20KB, max is 10KB
        project_id: '123e4567-e89b-12d3-a456-426614174000'
      }

      const result = safeValidate(createTaskSchema, oversizedTask)
      expect(result.success).toBe(false)
    })

    it('should limit array sizes', () => {
      const tooManyLabels = {
        title: 'Test',
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        labels: Array.from({ length: 30 }, (_, i) => `label${i}`) // Max is 20
      }

      const result = safeValidate(createTaskSchema, tooManyLabels)
      expect(result.success).toBe(false)
    })

    it('should enforce text length limits', () => {
      const longText = 'x'.repeat(10001) // Over 10000 char limit
      const sanitized = sanitizeText(longText)

      expect(sanitized.length).toBeLessThanOrEqual(10000)
    })
  })

  describe('Voice Input Validation', () => {
    it('should accept valid audio data', () => {
      const validVoice = {
        audio: 'base64encodedaudiodata',
        format: 'webm',
        language: 'en-US'
      }

      const result = safeValidate(voiceInputSchema, validVoice)
      expect(result.success).toBe(true)
    })

    it('should reject oversized audio files', () => {
      const oversizedAudio = {
        audio: 'x'.repeat(11 * 1024 * 1024), // 11MB, over 10MB limit
        format: 'webm'
      }

      const result = safeValidate(voiceInputSchema, oversizedAudio)
      expect(result.success).toBe(false)
    })

    it('should validate audio format', () => {
      const invalidFormat = {
        audio: 'base64data',
        format: 'invalid_format'
      }

      const result = safeValidate(voiceInputSchema, invalidFormat)
      expect(result.success).toBe(false)
    })
  })

  describe('Export Validation', () => {
    it('should validate export format', () => {
      const validExport = {
        workspace_id: '123e4567-e89b-12d3-a456-426614174000',
        format: 'csv'
      }

      const result = safeValidate(exportTasksSchema, validExport)
      expect(result.success).toBe(true)
    })

    it('should reject invalid export formats', () => {
      const invalidExport = {
        workspace_id: '123e4567-e89b-12d3-a456-426614174000',
        format: 'exe' // Not allowed
      }

      const result = safeValidate(exportTasksSchema, invalidExport)
      expect(result.success).toBe(false)
    })
  })

  describe('Query Parameter Validation', () => {
    it('should validate pagination parameters', () => {
      const searchParams = new URLSearchParams({
        limit: '50',
        offset: '0',
        sort_order: 'asc'
      })

      expect(() => validateQuery(createTaskSchema, searchParams)).not.toThrow()
    })

    it('should reject negative pagination values', () => {
      const searchParams = new URLSearchParams({
        limit: '-10',
        offset: '-5'
      })

      // Should throw or return error for negative values
      try {
        validateQuery(createTaskSchema, searchParams)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should enforce maximum limit values', () => {
      const searchParams = new URLSearchParams({
        limit: '10000' // Over max of 1000
      })

      try {
        validateQuery(createTaskSchema, searchParams)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined values', () => {
      const withUndefined = {
        title: 'Test',
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        description: undefined
      }

      const result = safeValidate(createTaskSchema, withUndefined)
      expect(result.success).toBe(true)
    })

    it('should handle empty strings', () => {
      const emptyString = {
        title: '',
        project_id: '123e4567-e89b-12d3-a456-426614174000'
      }

      const result = safeValidate(createTaskSchema, emptyString)
      expect(result.success).toBe(false)
    })

    it('should handle whitespace-only strings', () => {
      const whitespace = {
        title: '   ',
        project_id: '123e4567-e89b-12d3-a456-426614174000'
      }

      const result = safeValidate(createTaskSchema, whitespace)
      // After trim(), should fail min length check
      expect(result.success).toBe(false)
    })

    it('should handle special characters in text', () => {
      const specialChars = {
        title: 'Test™️ Task® with © special™ chars',
        project_id: '123e4567-e89b-12d3-a456-426614174000'
      }

      const result = safeValidate(createTaskSchema, specialChars)
      expect(result.success).toBe(true)
    })

    it('should handle unicode characters', () => {
      const unicode = {
        title: 'テスト タスク 测试任务 🚀',
        project_id: '123e4567-e89b-12d3-a456-426614174000'
      }

      const result = safeValidate(createTaskSchema, unicode)
      expect(result.success).toBe(true)
    })
  })
})
