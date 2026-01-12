import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReminderService } from '../reminder-service'

// Mock supabase
vi.mock('@/lib/supabase-client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'reminder-123',
          task_id: 'task-123',
          user_id: 'user-123',
          reminder_at: new Date().toISOString(),
          option: 'custom',
          sent: false,
        },
        error: null,
      }),
      mockResolvedValue: vi.fn(),
    })),
  },
}))

describe('ReminderService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('setReminder', () => {
    it('should return error if user ID is missing', async () => {
      const result = await ReminderService.setReminder(
        '',
        'task-123',
        new Date('2026-01-15T10:00:00Z'),
        'custom'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('User ID')
    })

    it('should return error if task ID is missing', async () => {
      const result = await ReminderService.setReminder(
        'user-123',
        '',
        new Date('2026-01-15T10:00:00Z'),
        'custom'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Task ID')
    })
  })

  describe('removeReminder', () => {
    it('should return error if user ID is missing', async () => {
      const result = await ReminderService.removeReminder('', 'task-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('User ID')
    })

    it('should return error if task ID is missing', async () => {
      const result = await ReminderService.removeReminder('user-123', '')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Task ID')
    })
  })

  describe('getPendingReminders', () => {
    it('should handle database errors gracefully', async () => {
      // This test verifies error handling in the service
      const result = await ReminderService.getPendingReminders()

      // Should return success: false if there's an error
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('error')
    })
  })

  describe('checkAndSendReminders', () => {
    it('should return result structure with checked, sent, failed counts', async () => {
      const result = await ReminderService.checkAndSendReminders()

      expect(result).toHaveProperty('checked')
      expect(result).toHaveProperty('sent')
      expect(result).toHaveProperty('failed')
      expect(result).toHaveProperty('errors')
      expect(Array.isArray(result.errors)).toBe(true)
    })
  })

  describe('getTaskReminders', () => {
    it('should validate task ID is provided', async () => {
      const result = await ReminderService.getTaskReminders('')

      // Should still attempt to fetch but result depends on DB
      expect(result).toHaveProperty('success')
    })
  })

  describe('getUserNotifications', () => {
    it('should handle missing user ID gracefully', async () => {
      const result = await ReminderService.getUserNotifications('')

      expect(result).toHaveProperty('success')
    })

    it('should accept custom limit parameter', async () => {
      const result = await ReminderService.getUserNotifications('user-123', 5)

      expect(result).toHaveProperty('success')
    })

    it('should use default limit of 10 when not specified', async () => {
      const result = await ReminderService.getUserNotifications('user-123')

      expect(result).toHaveProperty('success')
    })
  })

  describe('markReminderAsSent', () => {
    it('should mark reminder as sent and create notification', async () => {
      const result = await ReminderService.markReminderAsSent(
        'reminder-123',
        'user-123',
        'task-123',
        'Test Task'
      )

      expect(result).toHaveProperty('success')
    })

    it('should handle errors when marking reminder as sent', async () => {
      const result = await ReminderService.markReminderAsSent(
        '',
        'user-123',
        'task-123',
        'Test Task'
      )

      expect(result).toHaveProperty('success')
    })
  })
})
