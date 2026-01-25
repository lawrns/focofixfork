import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RecurrencePattern,
  RecurrenceType,
  validateRecurrencePattern,
  calculateNextRecurrenceDate,
  shouldCreateNextInstance,
  createRecurrencePattern,
} from '@/features/tasks/services/recurrence.service';

describe('Task Recurrence Feature', () => {
  describe('Recurrence Pattern Validation', () => {
    it('should validate a valid daily recurrence pattern', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endAfter: undefined,
        endsNever: true,
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.success).toBe(true);
    });

    it('should validate a valid weekly recurrence pattern with selected days', () => {
      const pattern: RecurrencePattern = {
        type: 'weekly',
        interval: 1,
        daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
        endAfter: undefined,
        endsNever: true,
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.success).toBe(true);
    });

    it('should validate a valid monthly recurrence pattern', () => {
      const pattern: RecurrencePattern = {
        type: 'monthly',
        interval: 1,
        endAfter: undefined,
        endsNever: true,
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.success).toBe(true);
    });

    it('should validate a recurrence with endAfter limit', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endAfter: 10,
        endsNever: false,
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.success).toBe(true);
    });

    it('should validate custom interval', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 3,
        endAfter: undefined,
        endsNever: true,
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.success).toBe(true);
    });

    it('should reject invalid interval', () => {
      const pattern: any = {
        type: 'daily',
        interval: 0,
        endsNever: true,
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.success).toBe(false);
    });

    it('should reject missing daysOfWeek for weekly recurrence', () => {
      const pattern: any = {
        type: 'weekly',
        interval: 1,
        endsNever: true,
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.success).toBe(false);
    });

    it('should reject invalid recurrence type', () => {
      const pattern: any = {
        type: 'invalid',
        interval: 1,
        endsNever: true,
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.success).toBe(false);
    });
  });

  describe('Daily Recurrence', () => {
    it('should calculate next daily recurrence', () => {
      const baseDate = new Date('2025-01-12T00:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endsNever: true,
      };

      const nextDate = calculateNextRecurrenceDate(baseDate, pattern);
      expect(nextDate.getUTCDate()).toBe(13);
      expect(nextDate.getUTCMonth()).toBe(0); // January
      expect(nextDate.getUTCFullYear()).toBe(2025);
    });

    it('should calculate next daily recurrence with custom interval', () => {
      const baseDate = new Date('2025-01-12T00:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 3,
        endsNever: true,
      };

      const nextDate = calculateNextRecurrenceDate(baseDate, pattern);
      expect(nextDate.getUTCDate()).toBe(15);
    });

    it('should handle month rollover for daily recurrence', () => {
      const baseDate = new Date('2025-01-30T00:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endsNever: true,
      };

      const nextDate = calculateNextRecurrenceDate(baseDate, pattern);
      expect(nextDate.getUTCDate()).toBe(31);
      expect(nextDate.getUTCMonth()).toBe(0);
    });
  });

  describe('Weekly Recurrence', () => {
    it('should calculate next weekly recurrence with single day', () => {
      const baseDate = new Date('2025-01-12T00:00:00Z'); // Sunday
      const pattern: RecurrencePattern = {
        type: 'weekly',
        interval: 1,
        daysOfWeek: [0], // Sunday
        endsNever: true,
      };

      const nextDate = calculateNextRecurrenceDate(baseDate, pattern);
      expect(nextDate.getUTCDate()).toBe(19);
    });

    it('should calculate next weekly recurrence with multiple days (next closest)', () => {
      const baseDate = new Date('2025-01-12T00:00:00Z'); // Sunday
      const pattern: RecurrencePattern = {
        type: 'weekly',
        interval: 1,
        daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
        endsNever: true,
      };

      const nextDate = calculateNextRecurrenceDate(baseDate, pattern);
      expect(nextDate.getUTCDay()).toBe(1); // Monday
      expect(nextDate.getUTCDate()).toBe(13);
    });

    it('should wrap to next week if no matching days remain', () => {
      const baseDate = new Date('2025-01-10T00:00:00Z'); // Friday
      const pattern: RecurrencePattern = {
        type: 'weekly',
        interval: 1,
        daysOfWeek: [0, 1, 2], // Sun, Mon, Tue
        endsNever: true,
      };

      const nextDate = calculateNextRecurrenceDate(baseDate, pattern);
      expect(nextDate.getUTCDay()).toBe(0); // Sunday
      expect(nextDate.getUTCDate()).toBe(12);
    });

    it('should handle custom weekly interval', () => {
      const baseDate = new Date('2025-01-12T00:00:00Z'); // Sunday
      const pattern: RecurrencePattern = {
        type: 'weekly',
        interval: 2,
        daysOfWeek: [0], // Sunday every 2 weeks
        endsNever: true,
      };

      const nextDate = calculateNextRecurrenceDate(baseDate, pattern);
      expect(nextDate.getUTCDate()).toBe(26);
    });
  });

  describe('Monthly Recurrence', () => {
    it('should calculate next monthly recurrence on same day', () => {
      const baseDate = new Date('2025-01-12T00:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'monthly',
        interval: 1,
        endsNever: true,
      };

      const nextDate = calculateNextRecurrenceDate(baseDate, pattern);
      expect(nextDate.getUTCDate()).toBe(12);
      expect(nextDate.getUTCMonth()).toBe(1); // February
    });

    it('should handle end-of-month dates correctly', () => {
      const baseDate = new Date('2025-01-31T00:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'monthly',
        interval: 1,
        endsNever: true,
      };

      const nextDate = calculateNextRecurrenceDate(baseDate, pattern);
      expect(nextDate.getUTCMonth()).toBe(1); // February
      expect(nextDate.getUTCDate()).toBe(28); // Last day of Feb 2025
    });

    it('should handle custom monthly interval', () => {
      const baseDate = new Date('2025-01-12T00:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'monthly',
        interval: 3,
        endsNever: true,
      };

      const nextDate = calculateNextRecurrenceDate(baseDate, pattern);
      expect(nextDate.getUTCDate()).toBe(12);
      expect(nextDate.getUTCMonth()).toBe(3); // April (0-indexed: Jan=0, Feb=1, Mar=2, Apr=3)
    });

    it('should handle year rollover for monthly recurrence', () => {
      const baseDate = new Date('2025-11-12T00:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'monthly',
        interval: 3,
        endsNever: true,
      };

      const nextDate = calculateNextRecurrenceDate(baseDate, pattern);
      expect(nextDate.getUTCDate()).toBe(12);
      expect(nextDate.getUTCMonth()).toBe(1); // February next year
      expect(nextDate.getUTCFullYear()).toBe(2026);
    });
  });

  describe('Recurrence End Conditions', () => {
    it('should return null when recurrence ends after N occurrences', () => {
      const baseDate = new Date('2025-01-12T00:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endAfter: 1,
        endsNever: false,
      };

      const nextDate = calculateNextRecurrenceDate(baseDate, pattern, 1); // occurrenceCount = 1 (last one)
      expect(nextDate).toBeNull();
    });

    it('should calculate next date when occurrences remaining', () => {
      const baseDate = new Date('2025-01-12T00:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endAfter: 5,
        endsNever: false,
      };

      const nextDate = calculateNextRecurrenceDate(baseDate, pattern, 2); // occurrenceCount = 2 of 5
      expect(nextDate).not.toBeNull();
      expect(nextDate?.getUTCDate()).toBe(13);
    });
  });

  describe('shouldCreateNextInstance', () => {
    it('should return true for recurring task that was completed', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endsNever: true,
      };
      const taskCompletedAt = new Date();

      const should = shouldCreateNextInstance(pattern, taskCompletedAt);
      expect(should).toBe(true);
    });

    it('should return false when recurrence has ended', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endAfter: 1,
        endsNever: false,
      };
      const taskCompletedAt = new Date();
      const occurrenceCount = 1;

      const should = shouldCreateNextInstance(pattern, taskCompletedAt, occurrenceCount);
      expect(should).toBe(false);
    });

    it('should return true when more occurrences available', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endAfter: 5,
        endsNever: false,
      };
      const taskCompletedAt = new Date();
      const occurrenceCount = 2;

      const should = shouldCreateNextInstance(pattern, taskCompletedAt, occurrenceCount);
      expect(should).toBe(true);
    });
  });

  describe('createRecurrencePattern', () => {
    it('should create a valid daily pattern', () => {
      const pattern = createRecurrencePattern({
        type: 'daily',
        interval: 1,
        endsNever: true,
      });

      expect(pattern.type).toBe('daily');
      expect(pattern.interval).toBe(1);
      expect(pattern.endsNever).toBe(true);
    });

    it('should create a valid weekly pattern with days', () => {
      const pattern = createRecurrencePattern({
        type: 'weekly',
        interval: 1,
        daysOfWeek: [1, 3, 5],
        endsNever: true,
      });

      expect(pattern.type).toBe('weekly');
      expect(pattern.daysOfWeek).toEqual([1, 3, 5]);
    });

    it('should create a pattern with endAfter', () => {
      const pattern = createRecurrencePattern({
        type: 'monthly',
        interval: 1,
        endAfter: 12,
        endsNever: false,
      });

      expect(pattern.endAfter).toBe(12);
      expect(pattern.endsNever).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle leap year correctly for monthly recurrence', () => {
      const baseDate = new Date('2024-01-29T00:00:00Z'); // Leap year
      const pattern: RecurrencePattern = {
        type: 'monthly',
        interval: 1,
        endsNever: true,
      };

      const nextDate = calculateNextRecurrenceDate(baseDate, pattern);
      expect(nextDate.getUTCMonth()).toBe(1); // February
      expect(nextDate.getUTCDate()).toBe(29); // 2024 is leap year
    });

    it('should handle leap year correctly for non-leap year', () => {
      const baseDate = new Date('2025-01-29T00:00:00Z'); // Non-leap year
      const pattern: RecurrencePattern = {
        type: 'monthly',
        interval: 1,
        endsNever: true,
      };

      const nextDate = calculateNextRecurrenceDate(baseDate, pattern);
      expect(nextDate.getUTCMonth()).toBe(1); // February
      expect(nextDate.getUTCDate()).toBe(28); // 2025 is not leap year
    });

    it('should handle Sunday as 0 and Saturday as 6 in daysOfWeek', () => {
      const baseDate = new Date('2025-01-10T00:00:00Z'); // Friday
      const pattern: RecurrencePattern = {
        type: 'weekly',
        interval: 1,
        daysOfWeek: [0], // Sunday
        endsNever: true,
      };

      const nextDate = calculateNextRecurrenceDate(baseDate, pattern);
      expect(nextDate.getUTCDay()).toBe(0);
      expect(nextDate.getUTCDate()).toBe(12);
    });

    it('should preserve time of day for all recurrence calculations', () => {
      const baseDate = new Date('2025-01-12T14:30:00Z');
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endsNever: true,
      };

      const nextDate = calculateNextRecurrenceDate(baseDate, pattern);
      expect(nextDate.getUTCHours()).toBe(14);
      expect(nextDate.getUTCMinutes()).toBe(30);
    });
  });
});
