import { describe, expect, it } from 'vitest'
import { containsSensitiveText, redactSensitiveText } from '@/lib/security/redaction'

describe('redaction', () => {
  it('redacts postgres connection strings', () => {
    const input = 'postgresql://postgres:secret@db.example.supabase.co:5432/postgres'
    expect(redactSensitiveText(input)).toContain('[REDACTED_DATABASE_URL]')
    expect(containsSensitiveText(input)).toBe(true)
  })

  it('redacts jwt-like tokens', () => {
    const input = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature'
    expect(redactSensitiveText(input)).toContain('Bearer [REDACTED_TOKEN]')
    expect(containsSensitiveText(input)).toBe(true)
  })

  it('leaves normal prompts unchanged', () => {
    const input = 'Think about how to mature this product and make it market ready.'
    expect(redactSensitiveText(input)).toBe(input)
    expect(containsSensitiveText(input)).toBe(false)
  })
})
