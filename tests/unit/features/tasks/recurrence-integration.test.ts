import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateNextRecurrenceDate,
  getRecurrenceOccurrences,
  getRecurrenceDescription,
  shouldCreateNextInstance,
} from '@/features/tasks/services/recurrence.service';
import type { RecurrencePattern } from '@/lib/validation/schemas/task.schema';

describe('Task Recurrence Integration Tests', () => {
  describe('Recurrence Description Generation', () => {
    it('should generate description for daily recurrence', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endsNever: true,
      };
      const desc = getRecurrenceDescription(pattern);
      expect(desc).toBe('Every day');
    });

    it('should generate description for daily with custom interval', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 3,
        endsNever: true,
      };
      const desc = getRecurrenceDescription(pattern);
      expect(desc).toBe('Every 3 days');
    });

    it('should generate description for weekly recurrence', () => {
      const pattern: RecurrencePattern = {
        type: 'weekly',
        interval: 1,
        daysOfWeek: [1, 3, 5],
        endsNever: true,
      };
      const desc = getRecurrenceDescription(pattern);
      expect(desc).toContain('Every');
      expect(desc).toContain('Mon');
      expect(desc).toContain('Wed');
      expect(desc).toContain('Fri');
    });

    it('should generate description for monthly recurrence', () => {
      const pattern: RecurrencePattern = {
        type: 'monthly',
        interval: 1,
        endsNever: true,
      };
      const desc = getRecurrenceDescription(pattern);
      expect(desc).toBe('Every month');
    });

    it('should include end condition in description', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endAfter: 5,
        endsNever: false,
      };
      const desc = getRecurrenceDescription(pattern);
      expect(desc).toContain('for 5 times');
    });
  });

  describe('Get Recurrence Occurrences', () => {
    it('should generate correct number of daily occurrences', () => {
      const startDate = new Date('2025-01-12T00:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endAfter: 5,
        endsNever: false,
      };
      const rangeStart = new Date('2025-01-12T00:00:00Z');
      const rangeEnd = new Date('2025-01-31T00:00:00Z');

      const occurrences = getRecurrenceOccurrences(startDate, pattern, rangeStart, rangeEnd);
      expect(occurrences).toHaveLength(5);
      expect(occurrences[0].getUTCDate()).toBe(12);
      expect(occurrences[4].getUTCDate()).toBe(16);
    });

    it('should generate weekly occurrences within range', () => {
      const startDate = new Date('2025-01-12T00:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'weekly',
        interval: 1,
        daysOfWeek: [0], // Sundays
        endAfter: 4,
        endsNever: false,
      };
      const rangeStart = new Date('2025-01-12T00:00:00Z');
      const rangeEnd = new Date('2025-02-28T00:00:00Z');

      const occurrences = getRecurrenceOccurrences(startDate, pattern, rangeStart, rangeEnd);
      expect(occurrences).toHaveLength(4);
      occurrences.forEach((date) => {
        expect(date.getUTCDay()).toBe(0); // All should be Sundays
      });
    });

    it('should generate monthly occurrences', () => {
      const startDate = new Date('2025-01-12T00:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'monthly',
        interval: 1,
        endAfter: 3,
        endsNever: false,
      };
      const rangeStart = new Date('2025-01-12T00:00:00Z');
      const rangeEnd = new Date('2025-12-31T00:00:00Z');

      const occurrences = getRecurrenceOccurrences(startDate, pattern, rangeStart, rangeEnd);
      expect(occurrences).toHaveLength(3);
      expect(occurrences[0].getUTCDate()).toBe(12);
      expect(occurrences[1].getUTCDate()).toBe(12);
      expect(occurrences[2].getUTCDate()).toBe(12);
    });

    it('should respect range boundaries', () => {
      const startDate = new Date('2025-01-12T00:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endAfter: 100,
        endsNever: false,
      };
      const rangeStart = new Date('2025-01-15T00:00:00Z'); // After start date
      const rangeEnd = new Date('2025-01-20T00:00:00Z'); // Limits range

      const occurrences = getRecurrenceOccurrences(startDate, pattern, rangeStart, rangeEnd);
      expect(occurrences.length).toBeLessThanOrEqual(6);
      occurrences.forEach((date) => {
        expect(date.getTime()).toBeGreaterThanOrEqual(rangeStart.getTime());
        expect(date.getTime()).toBeLessThanOrEqual(rangeEnd.getTime());
      });
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle daily standup (Mon-Fri)', () => {
      const startDate = new Date('2025-01-13T00:00:00Z'); // Monday
      const pattern: RecurrencePattern = {
        type: 'weekly',
        interval: 1,
        daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
        endsNever: true,
      };

      const rangeStart = new Date('2025-01-13T00:00:00Z');
      const rangeEnd = new Date('2025-01-17T00:00:00Z');

      const occurrences = getRecurrenceOccurrences(startDate, pattern, rangeStart, rangeEnd);
      expect(occurrences).toHaveLength(5); // Mon, Tue, Wed, Thu, Fri
    });

    it('should handle bi-weekly reports', () => {
      const startDate = new Date('2025-01-06T00:00:00Z'); // Monday
      const pattern: RecurrencePattern = {
        type: 'weekly',
        interval: 2,
        daysOfWeek: [1], // Every other Monday
        endAfter: 6,
        endsNever: false,
      };

      const occurrences = getRecurrenceOccurrences(
        startDate,
        pattern,
        startDate,
        new Date('2025-03-31T00:00:00Z')
      );

      expect(occurrences).toHaveLength(6);
      // Check intervals are 2 weeks apart
      for (let i = 1; i < occurrences.length; i++) {
        const diff = occurrences[i].getTime() - occurrences[i - 1].getTime();
        const weeks = diff / (7 * 24 * 60 * 60 * 1000);
        expect(weeks).toBeCloseTo(2, 0);
      }
    });

    it('should handle monthly invoices (end of month)', () => {
      const startDate = new Date('2025-01-31T00:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'monthly',
        interval: 1,
        endAfter: 12,
        endsNever: false,
      };

      const occurrences = getRecurrenceOccurrences(
        startDate,
        pattern,
        startDate,
        new Date('2025-12-31T00:00:00Z')
      );

      expect(occurrences).toHaveLength(12);

      // First occurrence should be Jan 31
      expect(occurrences[0].getUTCDate()).toBe(31);

      // After adjusting to Feb 28, all subsequent months stay at day 28 (sticky behavior)
      for (let i = 1; i < occurrences.length; i++) {
        expect(occurrences[i].getUTCDate()).toBe(28);
      }
    });

    it('should stop recurrence after N occurrences', () => {
      const startDate = new Date('2025-01-12T00:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endAfter: 3,
        endsNever: false,
      };

      const occurrences = getRecurrenceOccurrences(
        startDate,
        pattern,
        startDate,
        new Date('2025-12-31T00:00:00Z')
      );

      expect(occurrences).toHaveLength(3);
    });

    it('should never stop if endsNever is true', () => {
      const startDate = new Date('2025-01-12T00:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endsNever: true,
      };

      const occurrences = getRecurrenceOccurrences(
        startDate,
        pattern,
        startDate,
        new Date('2025-12-31T00:00:00Z')
      );

      expect(occurrences.length).toBeGreaterThan(100);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle task completion with no more recurrences', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endAfter: 1,
        endsNever: false,
      };

      const should = shouldCreateNextInstance(pattern, new Date(), 1);
      expect(should).toBe(false);
    });

    it('should create next instance with occurrences remaining', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endAfter: 5,
        endsNever: false,
      };

      for (let i = 1; i < 5; i++) {
        const should = shouldCreateNextInstance(pattern, new Date(), i);
        expect(should).toBe(true);
      }

      const should = shouldCreateNextInstance(pattern, new Date(), 5);
      expect(should).toBe(false);
    });

    it('should always create next instance when endsNever', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endsNever: true,
      };

      for (let i = 1; i <= 1000; i++) {
        const should = shouldCreateNextInstance(pattern, new Date(), i);
        expect(should).toBe(true);
      }
    });
  });
});
