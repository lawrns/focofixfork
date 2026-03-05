import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validateNoFutureDate,
  validateFutureDate,
  validateDateRange,
  validateDates,
  getTodayDateString,
  isValidDateString,
  formatDateDisplay,
} from '../date-validation'

describe('date-validation utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('validateNoFutureDate blocks future dates', () => {
    expect(validateNoFutureDate('2025-01-10', 'Start date')).toBeNull()
    expect(validateNoFutureDate('2025-01-16', 'Start date')?.type).toBe('past_not_allowed')
  })

  it('validateFutureDate requires dates after today', () => {
    expect(validateFutureDate('2025-01-15', 'Due date')?.type).toBe('future_not_allowed')
    expect(validateFutureDate('2025-01-16', 'Due date')).toBeNull()
  })

  it('validateDateRange enforces ordering', () => {
    expect(validateDateRange('2025-01-10', '2025-01-10', true)).toBeNull()
    expect(validateDateRange('2025-01-10', '2025-01-10', false)?.type).toBe('invalid_range')
    expect(validateDateRange('2025-01-20', '2025-01-10', true)?.type).toBe('invalid_range')
  })

  it('validateDates aggregates configured checks', () => {
    const errors = validateDates(
      { start_date: '2025-01-16', due_date: '2025-01-10' },
      { allowPastStartDate: false, allowPastDueDate: false, allowSameDayRange: false }
    )

    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some((e) => e.type === 'past_not_allowed' || e.type === 'invalid_range')).toBe(true)
  })

  it('helper formatters behave consistently', () => {
    expect(getTodayDateString()).toBe('2025-01-15')
    expect(isValidDateString('2025-01-15')).toBe(true)
    expect(isValidDateString('')).toBe(false)
    expect(formatDateDisplay('2025-01-15')).toContain('2025')
  })
})
