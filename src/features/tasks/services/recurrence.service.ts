import { z } from 'zod';

export type RecurrenceType = 'daily' | 'weekly' | 'monthly';

export interface RecurrencePattern {
  type?: RecurrenceType;
  interval?: number;
  daysOfWeek?: number[]; // 0-6, where 0 is Sunday
  endAfter?: number; // Number of occurrences before recurrence ends
  endsNever?: boolean;
}

/**
 * Schema for validating recurrence patterns
 */
const RecurrencePatternSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly']),
  interval: z.number().int().positive('Interval must be a positive integer'),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  endAfter: z.number().int().positive().optional(),
  endsNever: z.boolean(),
}).refine(
  (data) => {
    // Weekly recurrence must have daysOfWeek
    if (data.type === 'weekly' && (!data.daysOfWeek || data.daysOfWeek.length === 0)) {
      return false;
    }
    // Either endsNever is true OR endAfter is provided
    return data.endsNever || data.endAfter !== undefined;
  },
  'Weekly recurrence requires daysOfWeek, and either endsNever or endAfter must be set'
);

export type RecurrencePatternInput = z.infer<typeof RecurrencePatternSchema>;

/**
 * Validate a recurrence pattern
 */
export function validateRecurrencePattern(pattern: unknown) {
  return RecurrencePatternSchema.safeParse(pattern);
}

/**
 * Create a validated recurrence pattern
 */
export function createRecurrencePattern(data: unknown): RecurrencePattern {
  const result = validateRecurrencePattern(data);
  if (!result.success) {
    throw new Error(`Invalid recurrence pattern: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Calculate the next recurrence date based on a pattern
 * @param baseDate The base date to calculate from
 * @param pattern The recurrence pattern
 * @param occurrenceCount Current occurrence count (for endAfter validation)
 * @returns The next recurrence date, or null if recurrence should end
 */
export function calculateNextRecurrenceDate(
  baseDate: Date,
  pattern: RecurrencePattern,
  occurrenceCount?: number
): Date | null {
  // Check if recurrence should end
  if (!pattern.endsNever && pattern.endAfter !== undefined) {
    const currentOccurrence = occurrenceCount || 0;
    if (currentOccurrence >= pattern.endAfter) {
      return null;
    }
  }

  const nextDate = new Date(baseDate);

  switch (pattern.type) {
    case 'daily':
      return calculateNextDailyDate(nextDate, pattern.interval || 1);

    case 'weekly':
      return calculateNextWeeklyDate(nextDate, pattern.interval || 1, pattern.daysOfWeek || []);

    case 'monthly':
      return calculateNextMonthlyDate(nextDate, pattern.interval || 1);

    default:
      throw new Error(`Unknown recurrence type: ${pattern.type}`);
  }
}

/**
 * Calculate next daily recurrence
 */
function calculateNextDailyDate(baseDate: Date, interval: number): Date {
  const nextDate = new Date(baseDate.getTime());
  nextDate.setDate(nextDate.getDate() + interval);
  return nextDate;
}

/**
 * Calculate next weekly recurrence
 */
function calculateNextWeeklyDate(baseDate: Date, interval: number, daysOfWeek: number[]): Date {
  const nextDate = new Date(baseDate.getTime());
  const currentDay = nextDate.getDay();

  // Find the next occurrence of any of the selected days
  // First, check if any selected days remain this week
  const remainingDaysThisWeek = daysOfWeek.filter((day) => day > currentDay);

  if (remainingDaysThisWeek.length > 0 && interval === 1) {
    // Go to the next occurrence of the closest day in the same week
    const nextDay = Math.min(...remainingDaysThisWeek);
    const daysToAdd = nextDay - currentDay;
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    return nextDate;
  }

  // No remaining days this week, or custom interval - go to next occurrence
  const targetDay = Math.min(...daysOfWeek);
  const daysUntilNextWeek = (7 - currentDay + targetDay) % 7 || 7;
  const totalDaysToAdd = daysUntilNextWeek + (interval - 1) * 7;
  nextDate.setDate(nextDate.getDate() + totalDaysToAdd);
  return nextDate;
}

/**
 * Calculate next monthly recurrence
 */
function calculateNextMonthlyDate(baseDate: Date, interval: number): Date {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const dayOfMonth = baseDate.getDate();
  const hours = baseDate.getHours();
  const minutes = baseDate.getMinutes();
  const seconds = baseDate.getSeconds();
  const milliseconds = baseDate.getMilliseconds();
  
  // Calculate target month and year
  const targetMonth = month + interval;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  
  // Get the last day of the target month
  const lastDayOfMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  
  // Use the original day or the last day of the month, whichever is smaller
  const targetDay = Math.min(dayOfMonth, lastDayOfMonth);
  
  // Create the next date with all time components preserved
  return new Date(targetYear, normalizedMonth, targetDay, hours, minutes, seconds, milliseconds);
}

/**
 * Determine if a next instance should be created for a recurring task
 */
export function shouldCreateNextInstance(
  pattern: RecurrencePattern,
  completedAt: Date,
  occurrenceCount?: number
): boolean {
  // If recurrence never ends, always create next instance
  if (pattern.endsNever) {
    return true;
  }

  // If there's a limit on occurrences
  if (pattern.endAfter !== undefined) {
    const currentCount = occurrenceCount || 0;
    return currentCount < pattern.endAfter;
  }

  return false;
}

/**
 * Get human-readable description of recurrence pattern
 */
export function getRecurrenceDescription(pattern: RecurrencePattern): string {
  const baseDescription = getBaseRecurrenceDescription(pattern);
  const endDescription = getEndDescription(pattern);

  return `${baseDescription}${endDescription ? `. ${endDescription}` : ''}`;
}

function getBaseRecurrenceDescription(pattern: RecurrencePattern): string {
  switch (pattern.type) {
    case 'daily':
      return pattern.interval === 1
        ? 'Every day'
        : `Every ${pattern.interval} days`;

    case 'weekly': {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayLabels = (pattern.daysOfWeek || []).map((day) => dayNames[day]).join(', ');
      return pattern.interval === 1
        ? `Every ${dayLabels}`
        : `Every ${pattern.interval} weeks on ${dayLabels}`;
    }

    case 'monthly':
      return pattern.interval === 1
        ? 'Every month'
        : `Every ${pattern.interval} months`;

    default:
      return 'Unknown recurrence';
  }
}

function getEndDescription(pattern: RecurrencePattern): string {
  if (pattern.endsNever) {
    return '';
  }

  if (pattern.endAfter !== undefined) {
    return `for ${pattern.endAfter} ${pattern.endAfter === 1 ? 'time' : 'times'}`;
  }

  return '';
}

/**
 * Calculate all occurrences of a recurring task within a date range
 */
export function getRecurrenceOccurrences(
  startDate: Date,
  pattern: RecurrencePattern,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const occurrences: Date[] = [];
  let currentDate = new Date(startDate);
  let count = 0;

  while (currentDate <= rangeEnd) {
    if (currentDate >= rangeStart) {
      occurrences.push(new Date(currentDate));
    }

    const nextDate = calculateNextRecurrenceDate(currentDate, pattern, count + 1);
    if (nextDate === null) {
      break;
    }

    currentDate = nextDate;
    count++;
  }

  return occurrences;
}
