import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  PIIRedactionService,
  redactPII,
  PIIRedactionService as PIIService,
  PIIType,
  RedactionOptions
} from '../pii-redaction'

describe('PIIRedactionService', () => {
  let service: PIIRedactionService

  beforeEach(() => {
    service = new PIIRedactionService()
  })

  describe('PII Detection', () => {
    it('should detect email addresses', async () => {
      const text = "Contact me at john.doe@example.com for more information"
      const result = service.redactPII(text)

      expect(result.detectedPII).toHaveLength(1)
      expect(result.entities).toContainEqual({
        type: PIIType.EMAIL,
        value: 'john.doe@example.com',
        confidence: expect.any(Number),
        position: { start: 14, end: 34 }
      })
    })

    it('should detect phone numbers', async () => {
      const text = "Call me at (555) 123-4567 or 555-987-6543"
      const result = service.redactPII(text)

      expect(result.detectedPII).toHaveLength(1)
      expect(result.entities.length).toBeGreaterThanOrEqual(2)
      expect(result.entities.some(e => e.type === PIIType.PHONE)).toBe(true)
    })

    it('should detect social security numbers', async () => {
      const text = "My SSN is 123-45-6789, please keep it confidential"
      const result = service.redactPII(text)

      expect(result.detectedPII).toHaveLength(1)
      expect(result.entities).toContainEqual({
        type: PIIType.SSN,
        value: '123-45-6789',
        confidence: expect.any(Number),
        position: expect.any(Object)
      })
    })

    it('should detect credit card numbers', async () => {
      const text = "Pay with card 4532-1234-5678-9012 or 4532123456789012"
      const result = service.redactPII(text)

      expect(result.detectedPII).toHaveLength(1)
      expect(result.detectedPII[0].type).toBe(PIIType.CREDIT_CARD)
    })

    it('should detect addresses', async () => {
      const text = "I live at 123 Main Street, New York, NY 10001"
      const result = service.redactPII(text)

      expect(result.detectedPII).toHaveLength(1)
      expect(result.entities.some(e => e.type === PIIType.ADDRESS)).toBe(true)
    })

    it('should detect names', async () => {
      const text = "John Smith and Mary Johnson will attend the meeting"
      const result = service.redactPII(text)

      expect(result.detectedPII).toHaveLength(1)
      expect(result.entities.some(e => e.type === PIIType.NAME)).toBe(true)
    })

    it('should detect dates of birth', async () => {
      const text = "I was born on January 15, 1990 or 01/15/1990"
      const result = service.redactPII(text)

      expect(result.detectedPII).toHaveLength(1)
      expect(result.entities.some(e => e.type === PIIType.DATE_OF_BIRTH)).toBe(true)
    })

    it('should detect medical information', async () => {
      const text = "Patient has diabetes and takes metformin 500mg twice daily"
      const result = service.redactPII(text)

      expect(result.detectedPII).toHaveLength(1)
      expect(result.detectedPII[0].type).toBe(PIIType.MEDICAL)
    })

    it('should detect financial information', async () => {
      const text = "My bank account is 123456789 and routing number is 987654321"
      const result = service.redactPII(text)

      expect(result.detectedPII).toHaveLength(1)
      expect(result.detectedPII[0].type).toBe(PIIType.BANK_ACCOUNT)
    })

    it('should return no PII for clean text', async () => {
      const text = "This is a clean text with no personal information"
      const result = service.redactPII(text)

      expect(result.detected).toBe(false)
      expect(result.entities).toEqual([])
    })
  })

  describe('PII Redaction', () => {
    it('should redact email addresses with default options', async () => {
      const text = "Contact john.doe@example.com for details"
      const result = await service.redactPII(text)

      expect(result.redactedText).toContain("[EMAIL]")
      expect(result.redactedText).not.toContain("john.doe@example.com")
      expect(result.entities.length).toBe(1)
    })

    it('should redact multiple PII types in one text', async () => {
      const text = "John Smith at john.doe@example.com, call (555) 123-4567"
      const result = await service.redactPII(text)

      expect(result.redactedText).toContain("[NAME]")
      expect(result.redactedText).toContain("[EMAIL]")
      expect(result.redactedText).toContain("[PHONE]")
      expect(result.entities.length).toBe(3)
    })

    it('should preserve original text structure', async () => {
      const text = "Contact: john@example.com, Phone: 555-123-4567"
      const result = await service.redactPII(text)

      expect(result.redactedText).toContain("Contact:")
      expect(result.redactedText).toContain("Phone:")
    })

    it('should handle overlapping PII entities', async () => {
      const text = "John Doe's email is john.doe@example.com"
      const result = await service.redactPII(text)

      expect(result.redactedText).toContain("[NAME]")
      expect(result.redactedText).toContain("[EMAIL]")
      expect(result.entities.length).toBe(2)
    })
  })

  describe('Redaction Options', () => {
    it('should use custom redaction token', async () => {
      const result = service.redactPII("Email: john@example.com", {
        redactionChar: '*'
      })

      expect(result.redactedText).toContain('***')
    })

    it('should only redact specified PII types', async () => {
      const options: Partial<RedactionOptions> = {
        enabledTypes: [PIIType.EMAIL, PIIType.PHONE]
      }
      const text = "John Smith at john@example.com, call 555-123-4567"
      const result = await service.redactPII(text, options)

      expect(result.redactedText).toContain("[EMAIL]")
      expect(result.redactedText).toContain("[PHONE]")
      expect(result.redactedText).toContain("John Smith") // Name not redacted
    })

    it('should preserve PII type information when enabled', async () => {
      const result = service.redactPII("Email: john@example.com", {
        preserveFormat: true
      })

      expect(result.redactedText).toContain("[EMAIL:john@example.com]")
    })

    it('should include position information when enabled', async () => {
      const result = service.redactPII("Email: john@example.com")

      expect(result.entities[0].position).toBeDefined()
      expect(result.entities[0].position.start).toBeGreaterThanOrEqual(0)
    })

    it('should handle case sensitivity', async () => {
      const result = service.redactPII("EMAIL: JOHN@EXAMPLE.COM")

      expect(result.entities.length).toBeGreaterThan(0)
    })
  })

  describe('Regex Pattern Matching', () => {
    it('should match email patterns correctly', () => {
      const emails = [
        'john@example.com',
        'john.doe@company.co.uk',
        'user+tag@example.org',
        'test123@sub.domain.com'
      ]

      emails.forEach(email => {
        const text = `Contact ${email} for details`
        expect(service['matchesEmailPattern'](email)).toBe(true)
      })
    })

    it('should match phone number patterns correctly', () => {
      const phones = [
        '(555) 123-4567',
        '555-123-4567',
        '555.123.4567',
        '5551234567',
        '+1-555-123-4567'
      ]

      phones.forEach(phone => {
        expect(service['matchesPhonePattern'](phone)).toBe(true)
      })
    })

    it('should match SSN patterns correctly', () => {
      const ssns = [
        '123-45-6789',
        '123456789'
      ]

      ssns.forEach(ssn => {
        expect(service['matchesSSNPattern'](ssn)).toBe(true)
      })
    })

    it('should match credit card patterns correctly', () => {
      const cards = [
        '4532-1234-5678-9012',
        '4532123456789012',
        '4532 1234 5678 9012'
      ]

      cards.forEach(card => {
        expect(service['matchesCreditCardPattern'](card)).toBe(true)
      })
    })
  })

  describe('NLP Enhancement', () => {
    it('should enhance detection with NLP when enabled', async () => {
      const serviceWithNLP = new PIIRedactionService({
        enableNLP: true
      })

      const text = "Dr. John Smith will perform the surgery"
      const result = await serviceWithNLP.redactPII(text)

      expect(result.entities.some(e => e.type === PIIType.NAME)).toBe(true)
    })

    it('should fallback to regex when NLP fails', async () => {
      // Mock NLP failure
      const mockNLP = vi.spyOn(service as any, 'processWithNLP').mockRejectedValue(new Error('NLP failed'))

      const text = "Email: john@example.com"
      const result = await service.redactPII(text)

      expect(result.entities.some(e => e.type === PIIType.EMAIL)).toBe(true)
      mockNLP.mockRestore()
    })

    it('should handle NLP timeout gracefully', async () => {
      const serviceWithTimeout = new PIIRedactionService({
        nlpTimeout: 1 // 1ms timeout
      })

      const text = "John Smith has an appointment"
      const result = await serviceWithTimeout.redactPII(text)

      expect(result.entities.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Confidence Scoring', () => {
    it('should assign high confidence for clear PII patterns', async () => {
      const text = "Email: john.doe@example.com"
      const result = await service.redactPII(text)

      expect(result.entities[0].confidence).toBeGreaterThan(0.9)
    })

    it('should assign medium confidence for ambiguous patterns', async () => {
      const text = "Contact john at example dot com"
      const result = await service.redactPII(text)

      expect(result.entities[0].confidence).toBeGreaterThan(0.5)
      expect(result.entities[0].confidence).toBeLessThan(0.9)
    })

    it('should assign low confidence for weak patterns', async () => {
      const text = "Maybe it's john123@example"
      const result = await service.redactPII(text)

      if (result.entities.length > 0) {
        expect(result.entities[0].confidence).toBeLessThan(0.7)
      }
    })
  })

  describe('Performance', () => {
    it('should handle large texts efficiently', async () => {
      const largeText = "Contact john@example.com ".repeat(1000)
      const startTime = Date.now()
      
      const result = await service.redactPII(largeText)
      
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
      expect(result.entities.length).toBeGreaterThan(0)
    })

    it('should handle multiple PII instances efficiently', async () => {
      const text = Array(100).fill(0).map((_, i) => `email${i}@example.com`).join(' ')
      const result = service.redactPII(text, {
        methods: ['nlp']
      })

      expect(result.entities.length).toBe(100)
    })
  })

  describe('Error Handling', () => {
    it('should handle empty text gracefully', async () => {
      const result = await service.redactPII("")

      expect(result.redactedText).toBe("")
      expect(result.entities).toEqual([])
    })

    it('should handle null text gracefully', async () => {
      const result = await service.redactPII(null as any)

      expect(result.redactedText).toBe("")
      expect(result.entities).toEqual([])
    })

    it('should handle invalid options gracefully', async () => {
      const result = await service.redactPII("test", null as any)

      expect(result.redactedText).toBe("test")
    })
  })

  describe('Statistics and Reporting', () => {
    it('should provide accurate statistics', async () => {
      const text = "John Smith at john@example.com, call (555) 123-4567"
      const result = await service.redactPII(text)

      expect(result.statistics.totalEntities).toBe(3)
      expect(result.statistics.entitiesByType[PIIType.EMAIL]).toBe(1)
      expect(result.statistics.entitiesByType[PIIType.NAME]).toBe(1)
      expect(result.statistics.entitiesByType[PIIType.PHONE]).toBe(1)
    })

    it('should calculate redaction percentage', async () => {
      const text = "Contact john@example.com for details"
      const result = await service.redactPII(text)

      expect(result.statistics.redactionPercentage).toBeGreaterThan(0)
      expect(result.statistics.redactionPercentage).toBeLessThanOrEqual(100)
    })
  })

  describe('Convenience Functions', () => {
    it('should work with standalone redactPII function', async () => {
      const result = await redactPII("Email: john@example.com")

      expect(result.redactedText).toContain("[EMAIL]")
      expect(result.entities.length).toBe(1)
    })

    it('should accept options in standalone function', async () => {
      const options = { redactionToken: 'HIDDEN' }
      const result = await redactPII("Email: john@example.com", options)

      expect(result.redactedText).toContain("HIDDEN")
    })
  })
})
