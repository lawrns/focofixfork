import { PRESET_SCHEDULES } from './loop-types'

/**
 * Parse a 5-field cron expression into its component parts.
 * Returns null if the string is not a valid 5-field cron expression.
 */
interface CronFields {
  minute: string
  hour: string
  dom: string
  month: string
  dow: string
}

function parseCronFields(expr: string): CronFields | null {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return null
  return { minute: parts[0], hour: parts[1], dom: parts[2], month: parts[3], dow: parts[4] }
}

/**
 * Check whether a numeric value matches a cron field.
 * Supports: *, N, * /N (step), N-M, and comma-separated combinations.
 */
function matchesCronField(field: string, value: number, min: number, max: number): boolean {
  for (const part of field.split(',')) {
    const trimmed = part.trim()

    // Wildcard
    if (trimmed === '*') return true

    // Step: */N or M-N/S
    if (trimmed.includes('/')) {
      const [rangeStr, stepStr] = trimmed.split('/')
      const step = parseInt(stepStr, 10)
      if (!Number.isFinite(step) || step < 1) continue

      let rangeMin = min
      let rangeMax = max

      if (rangeStr !== '*') {
        if (rangeStr.includes('-')) {
          const [lo, hi] = rangeStr.split('-').map((n) => parseInt(n, 10))
          rangeMin = lo
          rangeMax = hi
        } else {
          rangeMin = parseInt(rangeStr, 10)
        }
      }

      if (value >= rangeMin && value <= rangeMax && (value - rangeMin) % step === 0) return true
      continue
    }

    // Range: N-M
    if (trimmed.includes('-')) {
      const [lo, hi] = trimmed.split('-').map((n) => parseInt(n, 10))
      if (value >= lo && value <= hi) return true
      continue
    }

    // Exact
    const exact = parseInt(trimmed, 10)
    if (Number.isFinite(exact) && value === exact) return true
  }
  return false
}

/**
 * Decompose a Date into its wall-clock parts in the given IANA timezone.
 */
interface WallClock {
  year: number
  month: number // 1-12
  day: number   // 1-31
  hour: number  // 0-23
  minute: number // 0-59
  weekday: number // 0=Sun … 6=Sat
}

function getWallClock(date: Date, timezone: string): WallClock {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      weekday: 'short',
    })

    const parts = fmt.formatToParts(date)
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0'

    const weekdayStr = get('weekday')
    const weekdayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    }

    return {
      year: parseInt(get('year'), 10),
      month: parseInt(get('month'), 10),
      day: parseInt(get('day'), 10),
      hour: parseInt(get('hour'), 10) % 24, // guard against 24:00 edge
      minute: parseInt(get('minute'), 10),
      weekday: weekdayMap[weekdayStr] ?? 0,
    }
  } catch {
    // Fallback to local time when timezone is invalid
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      weekday: date.getDay(),
    }
  }
}

/**
 * Find the next Date >= (from + 1 minute) that satisfies the given cron fields,
 * evaluated in the target timezone.
 *
 * Iterates minute-by-minute up to a maximum of 366 days to avoid infinite loops.
 */
function nextMatchingDate(fields: CronFields, from: Date, timezone: string): Date {
  // Start from the next full minute
  const start = new Date(from.getTime() + 60_000)
  start.setSeconds(0, 0)

  const MAX_ITERATIONS = 366 * 24 * 60 // 1 year in minutes
  let cursor = start

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const wc = getWallClock(cursor, timezone)

    if (
      matchesCronField(fields.month, wc.month, 1, 12) &&
      matchesCronField(fields.dom, wc.day, 1, 31) &&
      matchesCronField(fields.dow, wc.weekday, 0, 6) &&
      matchesCronField(fields.hour, wc.hour, 0, 23) &&
      matchesCronField(fields.minute, wc.minute, 0, 59)
    ) {
      return cursor
    }

    // Advance by one minute
    cursor = new Date(cursor.getTime() + 60_000)
  }

  // Fallback: 24 hours from now (should never reach here for valid cron)
  return new Date(from.getTime() + 24 * 60 * 60 * 1000)
}

/**
 * Compute the next tick time for a loop schedule.
 *
 * @param scheduleKind - 'preset' (looks up PRESET_SCHEDULES) or 'cron' (raw 5-field cron)
 * @param scheduleValue - the preset key or raw cron expression
 * @param timezone - IANA timezone string (e.g. 'America/New_York')
 * @param from - reference time (defaults to now). Result will be >= from + 1 minute.
 */
export function computeNextTick(
  scheduleKind: 'preset' | 'cron',
  scheduleValue: string,
  timezone: string,
  from?: Date,
): Date {
  const base = from ?? new Date()

  let cronExpr: string
  if (scheduleKind === 'preset') {
    cronExpr = PRESET_SCHEDULES[scheduleValue] ?? PRESET_SCHEDULES['every_6h']
  } else {
    cronExpr = scheduleValue
  }

  const fields = parseCronFields(cronExpr)
  if (!fields) {
    // Fallback: 6 hours from base if cron is unparseable
    return new Date(base.getTime() + 6 * 60 * 60 * 1000)
  }

  const next = nextMatchingDate(fields, base, timezone)

  // Enforce minimum 5-minute gap from base
  const minNext = new Date(base.getTime() + 5 * 60_000)
  return next < minNext ? minNext : next
}
