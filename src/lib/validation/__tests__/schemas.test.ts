import { describe, it, expect } from 'vitest'
import {
  validateData,
  emailSchema,
  uuidSchema,
  sanitizeString,
  sanitizeHtml,
} from '../schemas'

describe('validation schemas', () => {
  it('validates email payloads', () => {
    expect(validateData(emailSchema, 'test@example.com').success).toBe(true)
    expect(validateData(emailSchema, 'invalid').success).toBe(false)
  })

  it('validates uuid values', () => {
    expect(validateData(uuidSchema, '12345678-1234-1234-1234-123456789012').success).toBe(true)
    expect(validateData(uuidSchema, 'bad-uuid').success).toBe(false)
  })

  it('sanitizes plain and html strings', () => {
    expect(sanitizeString('  hello  ')).toBe('hello')
    expect(sanitizeHtml('<p>ok</p><script>alert(1)</script>')).not.toContain('<script>')
  })
})
