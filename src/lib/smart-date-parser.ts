/**
 * Smart Date Parser - Parses natural language date inputs
 * Supports: today, tomorrow, yesterday, day names, relative durations, ISO dates
 */

interface ParseResult {
  date: Date | null
  isValid: boolean
  error?: string
  displayText?: string
  isoString?: string
}

/**
 * Get current date in local timezone (midnight)
 * Can be mocked in tests by setting __TEST_NOW__
 */
function getCurrentDate(): Date {
  const now = new Date(Date.now())
  // Return a date at midnight in local timezone to avoid timezone offset issues
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/**
 * Allow tests to mock the current date
 */
if (typeof globalThis !== 'undefined') {
  (globalThis as any).__smartDateParserGetCurrentDate = getCurrentDate
}

/**
 * Parse natural language date input into a Date object
 * @param input - Natural language date string (e.g., "tomorrow", "next monday", "in 3 days", "2024-01-15")
 * @returns ParseResult with parsed date, validity, display text, and ISO string
 */
export function smartDateParser(input: string | null | undefined): ParseResult {
  // Handle null/undefined/empty input
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return {
      date: null,
      isValid: false,
      error: 'Date input is required',
    }
  }

  const normalizedInput = input.trim().toLowerCase()

  // Try parsing in order of most specific to least specific
  let result: Date | null = null

  // 1. Try relative dates (today, tomorrow, yesterday)
  result = parseRelativeDates(normalizedInput)
  if (result) {
    return formatResult(result)
  }

  // 2. Try relative durations (in X days/weeks/months)
  result = parseRelativeDuration(normalizedInput)
  if (result) {
    return formatResult(result)
  }

  // 3. Try day names (monday, tuesday, next friday, etc.)
  result = parseDayName(normalizedInput)
  if (result) {
    return formatResult(result)
  }

  // 4. Try next week/month
  result = parseNextPeriod(normalizedInput)
  if (result) {
    return formatResult(result)
  }

  // 5. Try absolute date formats
  result = parseAbsoluteDate(normalizedInput)
  if (result) {
    return formatResult(result)
  }

  // If nothing matched, return error
  return {
    date: null,
    isValid: false,
    error: `Unable to parse date: "${input}"`,
  }
}

/**
 * Parse relative dates: today, tomorrow, yesterday
 */
function parseRelativeDates(input: string): Date | null {
  const now = getCurrentDate()

  switch (input) {
    case 'today':
      return new Date(now)
    case 'tomorrow':
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow
    case 'yesterday':
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      return yesterday
    default:
      return null
  }
}

/**
 * Parse relative durations: in X days, in 2 weeks, in 3 months
 */
function parseRelativeDuration(input: string): Date | null {
  // Match patterns like "in 3 days", "in 2 weeks", "in 1 month"
  const durationPattern = /^in\s+(?:a|\d+)\s+(day|week|month)s?$/
  const match = input.match(durationPattern)

  if (!match) {
    return null
  }

  const now = getCurrentDate()
  const unit = match[1]
  const numberMatch = input.match(/(\d+)/)?.[1] || (input.includes('a ') ? '1' : null)

  if (!numberMatch) {
    return null
  }

  const number = parseInt(numberMatch, 10)

  const result = new Date(now)

  switch (unit) {
    case 'day':
      result.setDate(result.getDate() + number)
      break
    case 'week':
      result.setDate(result.getDate() + number * 7)
      break
    case 'month':
      result.setMonth(result.getMonth() + number)
      break
    default:
      return null
  }

  return result
}

/**
 * Parse day names: monday, tuesday, next friday, etc.
 * Returns the next occurrence of that day
 */
function parseDayName(input: string): Date | null {
  const dayNames = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]

  // Remove "next" prefix if present
  const cleanInput = input.replace(/^next\s+/, '')

  const dayIndex = dayNames.findIndex(day => cleanInput === day)

  if (dayIndex === -1) {
    return null
  }

  const now = getCurrentDate()
  const currentDay = now.getDay()

  // Calculate days until target day
  let daysAhead = dayIndex - currentDay

  // If the day has already happened this week, schedule for next week
  if (daysAhead <= 0) {
    daysAhead += 7
  }

  const result = new Date(now)
  result.setDate(result.getDate() + daysAhead)

  return result
}

/**
 * Parse next period: next week, next month
 */
function parseNextPeriod(input: string): Date | null {
  const now = getCurrentDate()

  if (input === 'next week') {
    const result = new Date(now)
    result.setDate(result.getDate() + 7)
    return result
  }

  if (input === 'next month') {
    const result = new Date(now)
    result.setMonth(result.getMonth() + 1)
    return result
  }

  return null
}

/**
 * Parse absolute date formats
 * Supports: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, "January 20, 2024", "Jan 20, 2024"
 */
function parseAbsoluteDate(input: string): Date | null {
  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [year, month, day] = input.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    if (!isNaN(date.getTime()) && date.getDate() === day) {
      return date
    }
  }

  // MM/DD/YYYY or DD/MM/YYYY
  const slashPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  const slashMatch = input.match(slashPattern)
  if (slashMatch) {
    const [_, part1, part2, year] = slashMatch
    const month = parseInt(part1, 10)
    const day = parseInt(part2, 10)
    const yearNum = parseInt(year, 10)

    // Validate month and day ranges
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const date = new Date(yearNum, month - 1, day)
      // Verify the date was created correctly (handles invalid dates like 2/30)
      if (!isNaN(date.getTime()) && date.getMonth() === month - 1 && date.getDate() === day) {
        return date
      }
    }
  }

  // Long format with month name: "January 20, 2024" or "January 20 2024"
  // Also support short format: "Jan 20, 2024"
  const longPattern =
    /^(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2}),?\s+(\d{4})$/i
  const longMatch = input.match(longPattern)
  if (longMatch) {
    const monthNames = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ]
    const monthNamesShort = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec']

    const [_, monthStr, day, year] = longMatch
    const monthLower = monthStr.toLowerCase()
    let monthIndex = monthNames.indexOf(monthLower)

    // Try short format if full format didn't match
    if (monthIndex === -1) {
      monthIndex = monthNamesShort.indexOf(monthLower)
      // Handle "sept" -> "sep" aliasing
      if (monthIndex === -1 && monthLower === 'sept') {
        monthIndex = 8
      }
    }

    if (monthIndex !== -1) {
      const date = new Date(parseInt(year, 10), monthIndex, parseInt(day, 10))
      if (!isNaN(date.getTime())) {
        return date
      }
    }
  }

  return null
}

/**
 * Format the result with display text and ISO string
 */
function formatResult(date: Date): ParseResult {
  // Ensure we're working with a valid date
  if (isNaN(date.getTime())) {
    return {
      date: null,
      isValid: false,
      error: 'Invalid date',
    }
  }

  // Format display text (e.g., "Monday, January 15, 2024")
  const displayText = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Format ISO string (e.g., "2024-01-15")
  const isoString = date.toISOString().split('T')[0]

  return {
    date,
    isValid: true,
    displayText,
    isoString,
  }
}
