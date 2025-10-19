import * as chrono from 'chrono-node'

export interface ParsedDate {
  date: Date | null
  text: string
  isValid: boolean
  error?: string
}

export interface DateParserOptions {
  referenceDate?: Date
  timezone?: string
  strictMode?: boolean
}

export class DateParser {
  private referenceDate: Date
  private timezone: string
  private strictMode: boolean

  constructor(options: DateParserOptions = {}) {
    this.referenceDate = options.referenceDate || new Date()
    this.timezone = options.timezone || 'America/Mexico_City'
    this.strictMode = options.strictMode || false
  }

  parse(input: string): ParsedDate {
    if (!input || input.trim() === '') {
      return {
        date: null,
        text: '',
        isValid: true
      }
    }

    try {
      // Clean input
      const cleanInput = input.trim().toLowerCase()

      // Handle special cases
      if (cleanInput === 'today') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return {
          date: today,
          text: this.formatDate(today),
          isValid: true
        }
      }

      if (cleanInput === 'tomorrow') {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        return {
          date: tomorrow,
          text: this.formatDate(tomorrow),
          isValid: true
        }
      }

      if (cleanInput === 'yesterday') {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setHours(0, 0, 0, 0)
        return {
          date: yesterday,
          text: this.formatDate(yesterday),
          isValid: true
        }
      }

      // Handle relative days
      const relativeDayMatch = cleanInput.match(/^(\d+)\s*days?\s*(ago|from now)?$/i)
      if (relativeDayMatch) {
        const days = parseInt(relativeDayMatch[1])
        const direction = relativeDayMatch[2] || 'from now'
        const date = new Date()
        
        if (direction === 'ago') {
          date.setDate(date.getDate() - days)
        } else {
          date.setDate(date.getDate() + days)
        }
        date.setHours(0, 0, 0, 0)
        
        return {
          date,
          text: this.formatDate(date),
          isValid: true
        }
      }

      // Handle weeks
      const weekMatch = cleanInput.match(/^(next|last)\s*week$/i)
      if (weekMatch) {
        const direction = weekMatch[1].toLowerCase()
        const date = new Date()
        
        if (direction === 'next') {
          date.setDate(date.getDate() + 7)
        } else {
          date.setDate(date.getDate() - 7)
        }
        date.setHours(0, 0, 0, 0)
        
        return {
          date,
          text: this.formatDate(date),
          isValid: true
        }
      }

      // Use chrono for complex parsing
      const results = chrono.parse(input, this.referenceDate, {
        forwardDate: true
      })

      if (results.length === 0) {
        return {
          date: null,
          text: input,
          isValid: false,
          error: 'Could not parse date'
        }
      }

      const result = results[0]
      const parsedDate = result.start.date()

      // Validate date is not too far in the past (unless explicitly allowed)
      if (this.strictMode && parsedDate < new Date() && !this.isExplicitlyPast(input)) {
        return {
          date: null,
          text: input,
          isValid: false,
          error: 'Date cannot be in the past'
        }
      }

      return {
        date: parsedDate,
        text: this.formatDate(parsedDate),
        isValid: true
      }
    } catch (error) {
      return {
        date: null,
        text: input,
        isValid: false,
        error: error instanceof Error ? error.message : 'Parse error'
      }
    }
  }

  private formatDate(date: Date): string {
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // Relative formatting for recent dates
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`
    if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`

    // Absolute formatting for other dates
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  private isExplicitlyPast(input: string): boolean {
    const pastKeywords = ['ago', 'yesterday', 'last', 'past']
    return pastKeywords.some(keyword => input.toLowerCase().includes(keyword))
  }

  // Static method for quick parsing
  static parse(input: string, options?: DateParserOptions): ParsedDate {
    const parser = new DateParser(options)
    return parser.parse(input)
  }

  // Validate if input looks like a date
  static looksLikeDate(input: string): boolean {
    if (!input || input.trim() === '') return false
    
    const cleanInput = input.trim().toLowerCase()
    
    // Common date patterns
    const datePatterns = [
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // MM/DD/YYYY
      /^\d{1,2}-\d{1,2}-\d{2,4}$/, // MM-DD-YYYY
      /^\d{4}-\d{1,2}-\d{1,2}$/, // YYYY-MM-DD
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i, // Month names
      /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, // Day names
      /^(today|tomorrow|yesterday)/i, // Relative
      /^(next|last)\s+(week|month|year)/i, // Relative periods
      /^\d+\s+(days?|weeks?|months?|years?)\s+(ago|from now)/i // Relative numbers
    ]
    
    return datePatterns.some(pattern => pattern.test(cleanInput))
  }
}

// Export convenience functions
export const parseDate = DateParser.parse
export const looksLikeDate = DateParser.looksLikeDate
