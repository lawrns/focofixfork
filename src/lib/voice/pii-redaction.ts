import { z } from 'zod'

/**
 * PII Redaction Service
 * Automatically detects and redacts personally identifiable information from voice data
 */

// PII types
export enum PIIType {
  EMAIL = 'email',
  PHONE = 'phone',
  SSN = 'ssn',
  CREDIT_CARD = 'credit_card',
  BANK_ACCOUNT = 'bank_account',
  ADDRESS = 'address',
  NAME = 'name',
  DATE_OF_BIRTH = 'date_of_birth',
  ID_NUMBER = 'id_number',
  PASSPORT = 'passport',
  LICENSE = 'license',
  IP_ADDRESS = 'ip_address',
  URL = 'url',
  CUSTOM_KEYWORD = 'custom_keyword'
}

// PII detection result schema
export const PIIDetectionResultSchema = z.object({
  originalText: z.string(),
  redactedText: z.string(),
  detectedPII: z.array(z.object({
    type: z.nativeEnum(PIIType),
    value: z.string(),
    startIndex: z.number(),
    endIndex: z.number(),
    confidence: z.number().min(0).max(100),
    redactedValue: z.string()
  })),
  processingTime: z.number().min(0),
  method: z.enum(['regex', 'nlp', 'hybrid'])
})

export type PIIDetectionResult = z.infer<typeof PIIDetectionResultSchema>

// Redaction options
export interface RedactionOptions {
  methods: Array<'regex' | 'nlp'>
  customKeywords?: string[]
  preserveFormat?: boolean
  redactionChar?: string
  minConfidence?: number
  enabledTypes?: PIIType[]
}

/**
 * PII Redaction Service
 */
export class PIIRedactionService {
  private options: RedactionOptions
  private patterns: Map<PIIType, RegExp[]>
  private customKeywords: Set<string>

  constructor(options: Partial<RedactionOptions> = {}) {
    this.options = {
      methods: ['regex', 'nlp'],
      customKeywords: [],
      preserveFormat: true,
      redactionChar: '*',
      minConfidence: 70,
      enabledTypes: Object.values(PIIType),
      ...options
    }

    this.customKeywords = new Set(this.options.customKeywords || [])
    this.initializePatterns()
  }

  /**
   * Redact PII from text
   */
  async redactPII(text: string): Promise<PIIDetectionResult> {
    const startTime = Date.now()

    try {
      let detectedPII: any[] = []
      let method: 'regex' | 'nlp' | 'hybrid' = 'regex'

      // Step 1: Regex-based detection
      if (this.options.methods.includes('regex')) {
        const regexResults = this.detectWithRegex(text)
        detectedPII = [...detectedPII, ...regexResults]
      }

      // Step 2: NLP-based detection (mock implementation)
      if (this.options.methods.includes('nlp')) {
        const nlpResults = await this.detectWithNLP(text)
        detectedPII = [...detectedPII, ...nlpResults]
        method = this.options.methods.includes('regex') ? 'hybrid' : 'nlp'
      }

      // Step 3: Remove duplicates and filter by confidence
      const uniquePII = this.deduplicatePII(detectedPII)
      const filteredPII = uniquePII.filter(pii => 
        pii.confidence >= (this.options.minConfidence || 70) &&
        (!this.options.enabledTypes || this.options.enabledTypes.includes(pii.type))
      )

      // Step 4: Apply redaction
      const redactedText = this.applyRedaction(text, filteredPII)

      return {
        originalText: text,
        redactedText,
        detectedPII: filteredPII,
        processingTime: Date.now() - startTime,
        method
      }

    } catch (error) {
      console.error('PII redaction failed:', error)
      
      // Return original text if redaction fails
      return {
        originalText: text,
        redactedText: text,
        detectedPII: [],
        processingTime: Date.now() - startTime,
        method: 'regex'
      }
    }
  }

  /**
   * Initialize regex patterns for PII detection
   */
  private initializePatterns(): void {
    this.patterns = new Map()

    // Email patterns
    this.patterns.set(PIIType.EMAIL, [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    ])

    // Phone patterns (US and international)
    this.patterns.set(PIIType.PHONE, [
      /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
      /\b(?:\+?(\d{1,3})[-.\s]?)?\(?([0-9]{1,4})\)?[-.\s]?([0-9]{1,4})[-.\s]?([0-9]{1,9})\b/g
    ])

    // SSN patterns
    this.patterns.set(PIIType.SSN, [
      /\b\d{3}-\d{2}-\d{4}\b/g,
      /\b\d{3}\s\d{2}\s\d{4}\b/g
    ])

    // Credit card patterns
    this.patterns.set(PIIType.CREDIT_CARD, [
      /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
      /\b\d{13,19}\b/g
    ])

    // Bank account patterns
    this.patterns.set(PIIType.BANK_ACCOUNT, [
      /\baccount\s+(?:number|#)?\s*[:\-]?\s*\d{8,17}\b/gi,
      /\b\d{8,17}\s*(?:account|acct)\b/gi
    ])

    // Address patterns
    this.patterns.set(PIIType.ADDRESS, [
      /\b\d+\s+([A-Z][a-z]*\s*){1,3}(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|way|place|pl)\b/gi,
      /\b\d+\s+([A-Z][a-z]*\s*){2,4},\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?\b/gi
    ])

    // Name patterns (simplified)
    this.patterns.set(PIIType.NAME, [
      /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
      /\b(?:Mr|Mrs|Ms|Dr|Prof)\.\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/g
    ])

    // Date of birth patterns
    this.patterns.set(PIIType.DATE_OF_BIRTH, [
      /\b(?:born|birthdate|DOB|date\s+of\s+birth)[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/gi,
      /\b(?:born|birthdate|DOB|date\s+of\s+birth)[:\-]?\s*(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/gi
    ])

    // ID number patterns
    this.patterns.set(PIIType.ID_NUMBER, [
      /\b(?:ID|identification|employee\s+ID|student\s+ID)\s*(?:number|#)?\s*[:\-]?\s*[A-Z0-9]{6,15}\b/gi
    ])

    // Passport patterns
    this.patterns.set(PIIType.PASSPORT, [
      /\bpassport\s*(?:number|#)?\s*[:\-]?\s*[A-Z0-9]{6,9}\b/gi
    ])

    // License patterns
    this.patterns.set(PIIType.LICENSE, [
      /\b(?:driver'?s?\s*license|license)\s*(?:number|#)?\s*[:\-]?\s*[A-Z0-9]{6,15}\b/gi
    ])

    // IP address patterns
    this.patterns.set(PIIType.IP_ADDRESS, [
      /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g
    ])

    // URL patterns
    this.patterns.set(PIIType.URL, [
      /\bhttps?:\/\/(?:[-\w.])+(?:[:\d]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:\w*))?)?\b/g
    ])
  }

  /**
   * Detect PII using regex patterns
   */
  private detectWithRegex(text: string): any[] {
    const detectedPII: any[] = []

    for (const [piiType, patterns] of this.patterns.entries()) {
      for (const pattern of patterns) {
        const matches = text.matchAll(pattern)
        
        for (const match of matches) {
          if (match.index !== undefined) {
            detectedPII.push({
              type: piiType,
              value: match[0],
              startIndex: match.index,
              endIndex: match.index + match[0].length,
              confidence: this.calculateRegexConfidence(match[0], piiType),
              redactedValue: this.redactValue(match[0], piiType)
            })
          }
        }
      }
    }

    // Check custom keywords
    for (const keyword of this.customKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
      const matches = text.matchAll(regex)
      
      for (const match of matches) {
        if (match.index !== undefined) {
          detectedPII.push({
            type: PIIType.CUSTOM_KEYWORD,
            value: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            confidence: 90,
            redactedValue: this.redactValue(match[0], PIIType.CUSTOM_KEYWORD)
          })
        }
      }
    }

    return detectedPII
  }

  /**
   * Detect PII using NLP (mock implementation)
   */
  private async detectWithNLP(text: string): Promise<any[]> {
    // Simulate NLP processing delay
    await new Promise(resolve => setTimeout(resolve, 50))

    const detectedPII: any[] = []

    // Mock NLP detection for names (more sophisticated than regex)
    const nameMatches = text.matchAll(/\b([A-Z][a-z]+)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g)
    for (const match of nameMatches) {
      if (match.index !== undefined) {
        // Additional validation for names
        if (this.isValidName(match[0])) {
          detectedPII.push({
            type: PIIType.NAME,
            value: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            confidence: 85,
            redactedValue: this.redactValue(match[0], PIIType.NAME)
          })
        }
      }
    }

    return detectedPII
  }

  /**
   * Calculate confidence for regex detection
   */
  private calculateRegexConfidence(value: string, type: PIIType): number {
    let confidence = 75 // Base confidence

    switch (type) {
      case PIIType.EMAIL:
        // Higher confidence for well-formed emails
        if (value.includes('.') && value.split('@')[1].includes('.')) {
          confidence = 95
        }
        break
      case PIIType.PHONE:
        // Higher confidence for phone numbers with proper formatting
        if (value.includes('(') && value.includes(')')) {
          confidence = 90
        }
        break
      case PIIType.SSN:
        // Very high confidence for SSN patterns
        confidence = 98
        break
      case PIIType.CREDIT_CARD:
        // High confidence for credit card patterns
        if (value.length >= 13 && value.length <= 19) {
          confidence = 92
        }
        break
      case PIIType.ADDRESS:
        // Medium confidence for addresses
        confidence = 70
        break
      case PIIType.NAME:
        // Lower confidence for names (need NLP confirmation)
        confidence = 65
        break
    }

    return confidence
  }

  /**
   * Validate if a string is likely a name
   */
  private isValidName(text: string): boolean {
    // Simple validation: should contain at least two words, each starting with capital
    const words = text.trim().split(/\s+/)
    if (words.length < 2) return false

    // Check if most words start with capital letter
    const capitalWords = words.filter(word => /^[A-Z]/.test(word))
    return capitalWords.length / words.length > 0.7
  }

  /**
   * Remove duplicate PII detections
   */
  private deduplicatePII(piiList: any[]): any[] {
    const uniquePII: any[] = []
    const seen = new Set<string>()

    for (const pii of piiList) {
      const key = `${pii.type}-${pii.startIndex}-${pii.endIndex}`
      if (!seen.has(key)) {
        seen.add(key)
        uniquePII.push(pii)
      }
    }

    return uniquePII
  }

  /**
   * Apply redaction to text
   */
  private applyRedaction(text: string, piiList: any[]): string {
    let redactedText = text

    // Sort PII by start index in reverse order to avoid index shifting
    const sortedPII = [...piiList].sort((a, b) => b.startIndex - a.startIndex)

    for (const pii of sortedPII) {
      const before = redactedText.substring(0, pii.startIndex)
      const after = redactedText.substring(pii.endIndex)
      redactedText = before + pii.redactedValue + after
    }

    return redactedText
  }

  /**
   * Redact a specific value
   */
  private redactValue(value: string, type: PIIType): string {
    const redactionChar = this.options.redactionChar || '*'

    switch (type) {
      case PIIType.EMAIL:
        // Show first 2 letters of username, hide domain
        const [username, domain] = value.split('@')
        if (username && domain) {
          const visibleUsername = username.substring(0, 2)
          const hiddenUsername = redactionChar.repeat(username.length - 2)
          const hiddenDomain = redactionChar.repeat(domain.length)
          return `${visibleUsername}${hiddenUsername}@${hiddenDomain}`
        }
        break

      case PIIType.PHONE:
        // Show area code only
        const cleanPhone = value.replace(/\D/g, '')
        if (cleanPhone.length >= 10) {
          const areaCode = cleanPhone.substring(0, 3)
          const hidden = redactionChar.repeat(cleanPhone.length - 3)
          return `${areaCode}${hidden}`
        }
        break

      case PIIType.CREDIT_CARD:
        // Show last 4 digits only
        const cleanCard = value.replace(/\D/g, '')
        if (cleanCard.length >= 13) {
          const hidden = redactionChar.repeat(cleanCard.length - 4)
          const last4 = cleanCard.substring(cleanCard.length - 4)
          return `${hidden}${last4}`
        }
        break

      case PIIType.SSN:
        // Show last 4 digits only
        if (value.length >= 9) {
          return `${redactionChar.repeat(5)}${value.substring(5)}`
        }
        break

      case PIIType.NAME:
        // Show first initial only
        const names = value.split(' ')
        if (names.length >= 2) {
          const firstInitial = names[0][0]
          const hidden = redactionChar.repeat(value.length - 1)
          return `${firstInitial}${hidden}`
        }
        break

      default:
        // Full redaction for other types
        return redactionChar.repeat(value.length)
    }

    return redactionChar.repeat(value.length)
  }

  /**
   * Add custom keywords for redaction
   */
  addCustomKeywords(keywords: string[]): void {
    for (const keyword of keywords) {
      this.customKeywords.add(keyword.toLowerCase())
    }
  }

  /**
   * Remove custom keywords
   */
  removeCustomKeywords(keywords: string[]): void {
    for (const keyword of keywords) {
      this.customKeywords.delete(keyword.toLowerCase())
    }
  }

  /**
   * Get current custom keywords
   */
  getCustomKeywords(): string[] {
    return Array.from(this.customKeywords)
  }

  /**
   * Update redaction options
   */
  updateOptions(options: Partial<RedactionOptions>): void {
    this.options = { ...this.options, ...options }
    if (options.customKeywords) {
      this.customKeywords = new Set(options.customKeywords)
    }
  }
}

// Export default instance
export const piiRedactionService = new PIIRedactionService()

// Convenience functions
export async function redactPII(
  text: string,
  options?: Partial<RedactionOptions>
): Promise<PIIDetectionResult> {
  const service = new PIIRedactionService(options)
  return await service.redactPII(text)
}

// Export types and schemas (schemas are already exported inline above)
