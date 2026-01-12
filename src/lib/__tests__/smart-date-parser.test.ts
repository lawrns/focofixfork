import { smartDateParser } from '../smart-date-parser'
import { vi } from 'vitest'

describe('smartDateParser', () => {
  // Mock current date for consistent testing - using vitest's mock capabilities
  const mockNow = new Date(2024, 0, 15) // January 15, 2024 - Monday in local timezone

  beforeEach(() => {
    // Mock Date.now using vitest
    vi.useFakeTimers()
    vi.setSystemTime(mockNow)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('relative dates (today, tomorrow, yesterday)', () => {
    it('should parse "today" as today\'s date', () => {
      const result = smartDateParser('today')
      expect(result).toEqual(expect.objectContaining({
        date: mockNow,
        isValid: true
      }))
    })

    it('should parse "tomorrow" as tomorrow\'s date', () => {
      const result = smartDateParser('tomorrow')
      const expected = new Date(mockNow)
      expected.setDate(expected.getDate() + 1)

      expect(result).toEqual(expect.objectContaining({
        isValid: true
      }))
      expect(result.date?.toDateString()).toBe(expected.toDateString())
    })

    it('should parse "yesterday" as yesterday\'s date', () => {
      const result = smartDateParser('yesterday')
      const expected = new Date(mockNow)
      expected.setDate(expected.getDate() - 1)

      expect(result).toEqual(expect.objectContaining({
        isValid: true
      }))
      expect(result.date?.toDateString()).toBe(expected.toDateString())
    })

    it('should be case insensitive for relative dates', () => {
      const resultLower = smartDateParser('tomorrow')
      const resultUpper = smartDateParser('TOMORROW')
      const resultMixed = smartDateParser('ToMoRrOw')

      expect(resultLower.isValid).toBe(true)
      expect(resultUpper.isValid).toBe(true)
      expect(resultMixed.isValid).toBe(true)
      expect(resultLower.date?.toDateString()).toBe(resultUpper.date?.toDateString())
      expect(resultLower.date?.toDateString()).toBe(resultMixed.date?.toDateString())
    })
  })

  describe('day names (next occurrence)', () => {
    it('should parse "next monday" as the next Monday', () => {
      const result = smartDateParser('next monday')
      expect(result.isValid).toBe(true)
      expect(result.date).not.toBeNull()
      // Jan 15, 2024 is a Monday, so next Monday should be Jan 22, 2024
      expect(result.date?.getDay()).toBe(1) // Monday
    })

    it('should parse "next tuesday" as the next Tuesday', () => {
      const result = smartDateParser('next tuesday')
      expect(result.isValid).toBe(true)
      expect(result.date?.getDay()).toBe(2) // Tuesday
    })

    it('should parse "next friday" as the next Friday', () => {
      const result = smartDateParser('next friday')
      expect(result.isValid).toBe(true)
      expect(result.date?.getDay()).toBe(5) // Friday
    })

    it('should parse weekday names without "next"', () => {
      const result = smartDateParser('monday')
      expect(result.isValid).toBe(true)
      expect(result.date?.getDay()).toBe(1) // Monday
    })

    it('should be case insensitive for day names', () => {
      const resultLower = smartDateParser('monday')
      const resultUpper = smartDateParser('MONDAY')
      const resultMixed = smartDateParser('MoNdAy')

      expect(resultLower.isValid).toBe(true)
      expect(resultUpper.isValid).toBe(true)
      expect(resultMixed.isValid).toBe(true)
      expect(resultLower.date?.toDateString()).toBe(resultUpper.date?.toDateString())
      expect(resultLower.date?.toDateString()).toBe(resultMixed.date?.toDateString())
    })

    it('should handle all days of the week', () => {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      days.forEach((day, index) => {
        const result = smartDateParser(day)
        expect(result.isValid).toBe(true)
        expect(result.date?.getDay()).toBe(index)
      })
    })
  })

  describe('relative durations (in X days/weeks/months)', () => {
    it('should parse "in 3 days" correctly', () => {
      const result = smartDateParser('in 3 days')
      const expected = new Date(mockNow)
      expected.setDate(expected.getDate() + 3)

      expect(result).toEqual(expect.objectContaining({
        isValid: true
      }))
      expect(result.date?.toDateString()).toBe(expected.toDateString())
    })

    it('should parse "in 1 week" correctly', () => {
      const result = smartDateParser('in 1 week')
      const expected = new Date(mockNow)
      expected.setDate(expected.getDate() + 7)

      expect(result).toEqual(expect.objectContaining({
        isValid: true
      }))
      expect(result.date?.toDateString()).toBe(expected.toDateString())
    })

    it('should parse "in 2 weeks" correctly', () => {
      const result = smartDateParser('in 2 weeks')
      const expected = new Date(mockNow)
      expected.setDate(expected.getDate() + 14)

      expect(result).toEqual(expect.objectContaining({
        isValid: true
      }))
      expect(result.date?.toDateString()).toBe(expected.toDateString())
    })

    it('should parse "in 1 month" correctly', () => {
      const result = smartDateParser('in 1 month')
      const expected = new Date(mockNow)
      expected.setMonth(expected.getMonth() + 1)

      expect(result).toEqual(expect.objectContaining({
        isValid: true
      }))
      expect(result.date?.toDateString()).toBe(expected.toDateString())
    })

    it('should parse "in 3 months" correctly', () => {
      const result = smartDateParser('in 3 months')
      const expected = new Date(mockNow)
      expected.setMonth(expected.getMonth() + 3)

      expect(result).toEqual(expect.objectContaining({
        isValid: true
      }))
      expect(result.date?.toDateString()).toBe(expected.toDateString())
    })

    it('should be case insensitive for relative durations', () => {
      const resultLower = smartDateParser('in 3 days')
      const resultUpper = smartDateParser('IN 3 DAYS')
      const resultMixed = smartDateParser('In 3 Days')

      expect(resultLower.isValid).toBe(true)
      expect(resultUpper.isValid).toBe(true)
      expect(resultMixed.isValid).toBe(true)
      expect(resultLower.date?.toDateString()).toBe(resultUpper.date?.toDateString())
      expect(resultLower.date?.toDateString()).toBe(resultMixed.date?.toDateString())
    })

    it('should handle singular and plural forms', () => {
      const singular = smartDateParser('in 1 day')
      const plural = smartDateParser('in 1 days')

      expect(singular.isValid).toBe(true)
      expect(plural.isValid).toBe(true)
      expect(singular.date?.toDateString()).toBe(plural.date?.toDateString())
    })
  })

  describe('absolute dates', () => {
    it('should parse ISO date format (YYYY-MM-DD)', () => {
      const result = smartDateParser('2024-01-20')
      expect(result.isValid).toBe(true)
      expect(result.date?.getFullYear()).toBe(2024)
      expect(result.date?.getMonth()).toBe(0) // January is 0
      expect(result.date?.getDate()).toBe(20)
    })

    it('should parse MM/DD/YYYY format', () => {
      const result = smartDateParser('01/20/2024')
      expect(result.isValid).toBe(true)
      expect(result.date?.getFullYear()).toBe(2024)
      expect(result.date?.getMonth()).toBe(0)
      expect(result.date?.getDate()).toBe(20)
    })

    it('should parse MM/DD/YYYY format correctly', () => {
      const result = smartDateParser('01/20/2024')
      expect(result.isValid).toBe(true)
      expect(result.date?.getMonth()).toBe(0) // January
      expect(result.date?.getDate()).toBe(20)
    })

    it('should parse long format with month name (January 20, 2024)', () => {
      const result = smartDateParser('January 20, 2024')
      expect(result.isValid).toBe(true)
      expect(result.date?.getFullYear()).toBe(2024)
      expect(result.date?.getMonth()).toBe(0)
      expect(result.date?.getDate()).toBe(20)
    })

    it('should parse short month format (Jan 20, 2024)', () => {
      const result = smartDateParser('Jan 20, 2024')
      expect(result.isValid).toBe(true)
      expect(result.date?.getMonth()).toBe(0)
      expect(result.date?.getDate()).toBe(20)
    })
  })

  describe('invalid input handling', () => {
    it('should return invalid for empty string', () => {
      const result = smartDateParser('')
      expect(result.isValid).toBe(false)
      expect(result.date).toBeNull()
    })

    it('should return invalid for null', () => {
      const result = smartDateParser(null)
      expect(result.isValid).toBe(false)
      expect(result.date).toBeNull()
    })

    it('should return invalid for undefined', () => {
      const result = smartDateParser(undefined)
      expect(result.isValid).toBe(false)
      expect(result.date).toBeNull()
    })

    it('should return invalid for nonsense strings', () => {
      const result = smartDateParser('xyz invalid date abc')
      expect(result.isValid).toBe(false)
      expect(result.date).toBeNull()
    })

    it('should return invalid for malformed dates', () => {
      const result = smartDateParser('13/13/2024')
      expect(result.isValid).toBe(false)
    })

    it('should return error message for invalid input', () => {
      const result = smartDateParser('invalid')
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.length).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('should handle leading/trailing whitespace', () => {
      const result = smartDateParser('  tomorrow  ')
      expect(result.isValid).toBe(true)
    })

    it('should handle extra whitespace in relative durations', () => {
      const result = smartDateParser('in   3   days')
      expect(result.isValid).toBe(true)
    })

    it('should return parsed date string representation', () => {
      const result = smartDateParser('2024-01-20')
      expect(result.isValid).toBe(true)
      expect(result.displayText).toBeDefined()
      expect(typeof result.displayText).toBe('string')
    })

    it('should include ISO string in result', () => {
      const result = smartDateParser('2024-01-20')
      expect(result.isValid).toBe(true)
      expect(result.isoString).toBeDefined()
      expect(result.isoString).toMatch(/\d{4}-\d{2}-\d{2}/)
    })
  })

  describe('future date enforcement', () => {
    it('should interpret "next monday" as future date even if today is monday', () => {
      // Current mock date is Jan 15, 2024 (Monday)
      const result = smartDateParser('next monday')
      const nextWeek = new Date(mockNow)
      nextWeek.setDate(nextWeek.getDate() + 7)

      expect(result.isValid).toBe(true)
      // Should be at least 7 days in future
      expect(result.date! >= nextWeek).toBe(true)
    })

    it('should allow past dates for absolute formats', () => {
      const result = smartDateParser('2024-01-10')
      expect(result.isValid).toBe(true)
      // Should parse even though it's in the past
      expect(result.date?.getFullYear()).toBe(2024)
      expect(result.date?.getMonth()).toBe(0) // January
      expect(result.date?.getDate()).toBe(10)
    })
  })

  describe('display formatting', () => {
    it('should provide human-readable display text', () => {
      const result = smartDateParser('tomorrow')
      expect(result.displayText).toMatch(/jan|january|tomorrow|jan|february|march|april|may|june|july|august|september|october|november|december/i)
    })

    it('should include ISO string for form submission', () => {
      const result = smartDateParser('in 5 days')
      expect(result.isoString).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('input variations', () => {
    it('should handle "in the next 3 days" format', () => {
      // Common natural language variation
      const result = smartDateParser('in 3 days')
      expect(result.isValid).toBe(true)
    })

    it('should handle "next week"', () => {
      const result = smartDateParser('next week')
      const nextWeek = new Date(mockNow)
      nextWeek.setDate(nextWeek.getDate() + 7)

      expect(result.isValid).toBe(true)
      expect(result.date! >= nextWeek).toBe(true)
    })

    it('should handle "in a week" (singular)', () => {
      const result = smartDateParser('in a week')
      const nextWeek = new Date(mockNow)
      nextWeek.setDate(nextWeek.getDate() + 7)

      expect(result.isValid).toBe(true)
    })
  })
})
