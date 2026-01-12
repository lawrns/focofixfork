import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  validateNoFutureDate,
  validateFutureDate,
  validateDateRange,
  validateDates,
  getTodayDateString,
  isValidDateString,
  formatDateDisplay,
} from '../date-validation'

describe('Date Validation Utilities', () => {
  let mockToday: Date

  beforeEach(() => {
    // Set a fixed date for testing (January 15, 2025)
    mockToday = new Date('2025-01-15T00:00:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(mockToday)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('validateNoFutureDate', () => {
    it('should pass for today\'s date', () => {
      const error = validateNoFutureDate('2025-01-15', 'Test Date')
      expect(error).toBeNull()
    })

    it('should pass for dates in the past', () => {
      const error = validateNoFutureDate('2025-01-01', 'Test Date')
      expect(error).toBeNull()
    })

    it('should fail for dates in the future', () => {
      const error = validateNoFutureDate('2025-01-20', 'Test Date')
      expect(error).not.toBeNull()
      expect(error?.type).toBe('past_not_allowed')
      expect(error?.message).toContain('cannot be in the past')
    })

    it('should return null for empty string', () => {
      const error = validateNoFutureDate('', 'Test Date')
      expect(error).toBeNull()
    })

    it('should handle invalid date strings', () => {
      const error = validateNoFutureDate('invalid-date', 'Test Date')
      expect(error).not.toBeNull()
      expect(error?.type).toBe('invalid_date')
    })

    it('should use custom field name in error message', () => {
      const error = validateNoFutureDate('2025-01-20', 'Custom Field')
      expect(error?.message).toContain('Custom Field')
    })
  })

  describe('validateFutureDate', () => {
    it('should fail for today\'s date', () => {
      const error = validateFutureDate('2025-01-15', 'Future Date')
      expect(error).not.toBeNull()
      expect(error?.type).toBe('future_not_allowed')
    })

    it('should fail for past dates', () => {
      const error = validateFutureDate('2025-01-01', 'Future Date')
      expect(error).not.toBeNull()
      expect(error?.type).toBe('future_not_allowed')
    })

    it('should pass for future dates', () => {
      const error = validateFutureDate('2025-01-20', 'Future Date')
      expect(error).toBeNull()
    })

    it('should return null for empty string', () => {
      const error = validateFutureDate('', 'Future Date')
      expect(error).toBeNull()
    })

    it('should handle invalid date strings', () => {
      const error = validateFutureDate('invalid-date', 'Future Date')
      expect(error).not.toBeNull()
      expect(error?.type).toBe('invalid_date')
    })
  })

  describe('validateDateRange', () => {
    describe('with allowSameDay = true (default)', () => {
      it('should pass when due date equals start date', () => {
        const error = validateDateRange('2025-01-15', '2025-01-15', true)
        expect(error).toBeNull()
      })

      it('should pass when due date is after start date', () => {
        const error = validateDateRange('2025-01-10', '2025-01-20', true)
        expect(error).toBeNull()
      })

      it('should fail when due date is before start date', () => {
        const error = validateDateRange('2025-01-20', '2025-01-10', true)
        expect(error).not.toBeNull()
        expect(error?.type).toBe('invalid_range')
        expect(error?.message).toContain('on or after')
      })
    })

    describe('with allowSameDay = false', () => {
      it('should fail when due date equals start date', () => {
        const error = validateDateRange('2025-01-15', '2025-01-15', false)
        expect(error).not.toBeNull()
        expect(error?.type).toBe('invalid_range')
        expect(error?.message).toContain('after')
      })

      it('should pass when due date is after start date', () => {
        const error = validateDateRange('2025-01-10', '2025-01-20', false)
        expect(error).toBeNull()
      })

      it('should fail when due date is before start date', () => {
        const error = validateDateRange('2025-01-20', '2025-01-10', false)
        expect(error).not.toBeNull()
        expect(error?.type).toBe('invalid_range')
      })
    })

    it('should return null when either date is missing', () => {
      const error1 = validateDateRange('2025-01-15', '', true)
      const error2 = validateDateRange('', '2025-01-20', true)
      const error3 = validateDateRange('', '', true)

      expect(error1).toBeNull()
      expect(error2).toBeNull()
      expect(error3).toBeNull()
    })

    it('should handle invalid date strings', () => {
      const error = validateDateRange('invalid', '2025-01-20', true)
      expect(error).not.toBeNull()
      expect(error?.type).toBe('invalid_date')
    })

    it('should set field as due_date in error', () => {
      const error = validateDateRange('2025-01-20', '2025-01-10', true)
      expect(error?.field).toBe('due_date')
    })
  })

  describe('validateDates', () => {
    it('should return empty array for no errors', () => {
      const errors = validateDates({
        start_date: '2025-01-10',
        due_date: '2025-01-20',
      })
      expect(errors).toHaveLength(0)
    })

    it('should validate date range', () => {
      const errors = validateDates({
        start_date: '2025-01-20',
        due_date: '2025-01-10',
      })
      expect(errors).toHaveLength(1)
      expect(errors[0].type).toBe('invalid_range')
    })

    it('should validate start date with allowPastStartDate = false', () => {
      const errors = validateDates(
        {
          start_date: '2025-01-20',
        },
        { allowPastStartDate: false }
      )
      expect(errors).toHaveLength(1)
      expect(errors[0].field).toBe('Start date')
    })

    it('should validate due date with allowPastDueDate = false', () => {
      const errors = validateDates(
        {
          due_date: '2025-01-20',
        },
        { allowPastDueDate: false }
      )
      expect(errors).toHaveLength(1)
      expect(errors[0].field).toBe('Due date')
    })

    it('should respect allowSameDayRange option', () => {
      const errors = validateDates(
        {
          start_date: '2025-01-15',
          due_date: '2025-01-15',
        },
        { allowSameDayRange: false }
      )
      expect(errors).toHaveLength(1)
      expect(errors[0].type).toBe('invalid_range')
    })

    it('should return multiple errors when multiple constraints are violated', () => {
      const errors = validateDates(
        {
          start_date: '2025-01-20',
          due_date: '2025-01-10',
        },
        {
          allowPastStartDate: false,
          allowPastDueDate: false,
        }
      )
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should handle empty dates gracefully', () => {
      const errors = validateDates({
        start_date: '',
        due_date: '',
      })
      expect(errors).toHaveLength(0)
    })

    it('should handle missing dates gracefully', () => {
      const errors = validateDates({})
      expect(errors).toHaveLength(0)
    })
  })

  describe('getTodayDateString', () => {
    it('should return today\'s date in YYYY-MM-DD format', () => {
      const todayString = getTodayDateString()
      expect(todayString).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(todayString).toBe('2025-01-15')
    })

    it('should return consistent format', () => {
      const today1 = getTodayDateString()
      const today2 = getTodayDateString()
      expect(today1).toBe(today2)
    })
  })

  describe('isValidDateString', () => {
    it('should return true for valid date strings', () => {
      expect(isValidDateString('2025-01-15')).toBe(true)
      expect(isValidDateString('2024-12-31')).toBe(true)
      expect(isValidDateString('2000-01-01')).toBe(true)
    })

    it('should return false for invalid date strings', () => {
      expect(isValidDateString('invalid-date')).toBe(false)
      expect(isValidDateString('2025-13-45')).toBe(false)
      expect(isValidDateString('not-a-date')).toBe(false)
    })

    it('should return false for empty strings', () => {
      expect(isValidDateString('')).toBe(false)
    })

    it('should return false for null/undefined', () => {
      expect(isValidDateString(null as any)).toBe(false)
      expect(isValidDateString(undefined as any)).toBe(false)
    })

    it('should handle different date formats', () => {
      // YYYY-MM-DD format should work
      expect(isValidDateString('2025-01-15')).toBe(true)
    })
  })

  describe('formatDateDisplay', () => {
    it('should format valid dates correctly', () => {
      const formatted = formatDateDisplay('2025-01-15')
      expect(formatted).toBe('January 15, 2025')
    })

    it('should handle different dates', () => {
      expect(formatDateDisplay('2025-12-31')).toBe('December 31, 2025')
      expect(formatDateDisplay('2024-01-01')).toBe('January 1, 2024')
    })

    it('should return empty string for empty input', () => {
      expect(formatDateDisplay('')).toBe('')
    })

    it('should return original string for invalid dates', () => {
      expect(formatDateDisplay('invalid-date')).toBe('invalid-date')
    })
  })

  describe('Edge Cases and Timezone Handling', () => {
    it('should handle timezone differences consistently', () => {
      // Both dates should be normalized to midnight UTC
      const error = validateDateRange('2025-01-10', '2025-01-10', false)
      expect(error).not.toBeNull()

      const noError = validateDateRange('2025-01-10', '2025-01-10', true)
      expect(noError).toBeNull()
    })

    it('should handle leap year dates', () => {
      const error = validateDateRange('2024-02-29', '2024-03-01', true)
      expect(error).toBeNull()
    })

    it('should handle year boundaries', () => {
      const error1 = validateDateRange('2024-12-31', '2025-01-01', true)
      expect(error1).toBeNull()

      const error2 = validateDateRange('2025-01-01', '2024-12-31', true)
      expect(error2).not.toBeNull()
    })

    it('should handle dates far in the past and future', () => {
      const pastError = validateNoFutureDate('1970-01-01', 'Old Date')
      expect(pastError).toBeNull()

      const futureError = validateNoFutureDate('2099-12-31', 'Future Date')
      expect(futureError).not.toBeNull()
    })
  })

  describe('Integration Scenarios', () => {
    it('should validate a complete project form', () => {
      const formData = {
        start_date: '2025-01-15',
        due_date: '2025-03-15',
      }

      const errors = validateDates(formData, {
        allowPastStartDate: true,
        allowPastDueDate: false,
      })

      expect(errors).toHaveLength(0)
    })

    it('should catch invalid project dates', () => {
      const formData = {
        start_date: '2025-03-15',
        due_date: '2025-01-15', // before start date
      }

      const errors = validateDates(formData)
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should validate a new task with no past dates', () => {
      const formData = {
        due_date: '2025-01-20',
      }

      const errors = validateDates(formData, {
        allowPastDueDate: false,
      })

      expect(errors).toHaveLength(0)
    })

    it('should catch past due dates for new tasks', () => {
      const formData = {
        due_date: '2025-01-20',
      }

      const errors = validateDates(formData, {
        allowPastDueDate: false,
      })

      expect(errors).toHaveLength(1)
    })
  })
})
