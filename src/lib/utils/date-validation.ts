/**
 * Date validation utilities for form inputs
 * Ensures proper date constraints across the application
 */

export interface DateValidationError {
  field: string
  message: string
  type: 'future_not_allowed' | 'past_not_allowed' | 'invalid_range' | 'invalid_date'
}

/**
 * Validate that a date is not in the future
 * Used for new items where only past/today dates are allowed
 */
export function validateNoFutureDate(
  dateString: string,
  fieldName: string = 'Date'
): DateValidationError | null {
  if (!dateString) return null

  try {
    const date = new Date(dateString + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (date > today) {
      return {
        field: fieldName,
        message: `${fieldName} cannot be in the future`,
        type: 'past_not_allowed',
      }
    }
  } catch {
    return {
      field: fieldName,
      message: `${fieldName} is not a valid date`,
      type: 'invalid_date',
    }
  }

  return null
}

/**
 * Validate that a date is in the future (not today or past)
 * Used for future-only dates
 */
export function validateFutureDate(
  dateString: string,
  fieldName: string = 'Date'
): DateValidationError | null {
  if (!dateString) return null

  try {
    const date = new Date(dateString + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (date <= today) {
      return {
        field: fieldName,
        message: `${fieldName} must be in the future`,
        type: 'future_not_allowed',
      }
    }
  } catch {
    return {
      field: fieldName,
      message: `${fieldName} is not a valid date`,
      type: 'invalid_date',
    }
  }

  return null
}

/**
 * Validate that due date is after start date
 * Both dates should be provided as YYYY-MM-DD strings
 */
export function validateDateRange(
  startDateString: string,
  dueDateString: string,
  allowSameDay: boolean = true
): DateValidationError | null {
  if (!startDateString || !dueDateString) return null

  try {
    const startDate = new Date(startDateString + 'T00:00:00')
    const dueDate = new Date(dueDateString + 'T00:00:00')

    if (allowSameDay) {
      if (dueDate < startDate) {
        return {
          field: 'due_date',
          message: 'Due date must be on or after the start date',
          type: 'invalid_range',
        }
      }
    } else {
      if (dueDate <= startDate) {
        return {
          field: 'due_date',
          message: 'Due date must be after the start date',
          type: 'invalid_range',
        }
      }
    }
  } catch {
    return {
      field: 'due_date',
      message: 'Invalid date format',
      type: 'invalid_date',
    }
  }

  return null
}

/**
 * Validate all date constraints for a form
 * Returns all validation errors found
 */
export function validateDates(
  dates: {
    start_date?: string
    due_date?: string
  },
  options: {
    allowPastStartDate?: boolean
    allowPastDueDate?: boolean
    allowSameDayRange?: boolean
  } = {}
): DateValidationError[] {
  const {
    allowPastStartDate = true,
    allowPastDueDate = false,
    allowSameDayRange = true,
  } = options

  const errors: DateValidationError[] = []

  // Validate start date if provided
  if (dates.start_date && !allowPastStartDate) {
    const startDateError = validateNoFutureDate(dates.start_date, 'Start date')
    if (startDateError) errors.push(startDateError)
  }

  // Validate due date if provided
  if (dates.due_date && !allowPastDueDate) {
    const dueDateError = validateNoFutureDate(dates.due_date, 'Due date')
    if (dueDateError) errors.push(dueDateError)
  }

  // Validate date range if both dates are provided
  if (dates.start_date && dates.due_date) {
    const rangeError = validateDateRange(
      dates.start_date,
      dates.due_date,
      allowSameDayRange
    )
    if (rangeError) errors.push(rangeError)
  }

  return errors
}

/**
 * Get today's date in YYYY-MM-DD format
 * Useful for setting min attributes on date inputs
 */
export function getTodayDateString(): string {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

/**
 * Check if a date string is valid
 */
export function isValidDateString(dateString: string): boolean {
  if (!dateString) return false
  try {
    const date = new Date(dateString)
    return date instanceof Date && !isNaN(date.getTime())
  } catch {
    return false
  }
}

/**
 * Format a date string for display
 */
export function formatDateDisplay(dateString: string): string {
  if (!dateString) return ''
  try {
    const date = new Date(dateString + 'T00:00:00')
    if (isNaN(date.getTime())) {
      return dateString
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}
