import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useTaskReminder } from '../use-task-reminder'
import type { ReminderOption, ReminderSettings } from '../../types/reminder.types'

describe('useTaskReminder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('setReminder', () => {
    it('should set reminder with custom date and time', () => {
      const taskId = 'task-123'
      const reminderDate = new Date('2026-01-15T10:00:00Z')

      const result = useTaskReminder.setReminder(taskId, reminderDate)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        taskId,
        reminderAt: reminderDate.toISOString(),
        option: 'custom',
      })
    })

    it('should set reminder with "1 hour before due date" option', () => {
      const taskId = 'task-123'
      const dueDate = new Date('2026-01-15T14:00:00Z')
      const option: ReminderOption = '1hour'

      const result = useTaskReminder.setReminder(taskId, dueDate, option)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.option).toBe('1hour')

      // Verify reminder is 1 hour before due date
      const reminderTime = new Date(result.data!.reminderAt)
      const expectedTime = new Date(dueDate.getTime() - 60 * 60 * 1000)
      expect(reminderTime.getTime()).toBe(expectedTime.getTime())
    })

    it('should set reminder with "1 day before due date" option', () => {
      const taskId = 'task-123'
      const dueDate = new Date('2026-01-15T14:00:00Z')
      const option: ReminderOption = '1day'

      const result = useTaskReminder.setReminder(taskId, dueDate, option)

      expect(result.success).toBe(true)
      expect(result.data?.option).toBe('1day')

      // Verify reminder is 1 day before due date
      const reminderTime = new Date(result.data!.reminderAt)
      const expectedTime = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000)
      expect(reminderTime.getTime()).toBe(expectedTime.getTime())
    })

    it('should set reminder with custom option', () => {
      const taskId = 'task-123'
      const reminderDate = new Date('2026-01-14T10:00:00Z')
      const option: ReminderOption = 'custom'

      const result = useTaskReminder.setReminder(taskId, reminderDate, option)

      expect(result.success).toBe(true)
      expect(result.data?.option).toBe('custom')
      expect(result.data?.reminderAt).toBe(reminderDate.toISOString())
    })

    it('should reject reminder in the past', () => {
      const taskId = 'task-123'
      const pastDate = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago

      const result = useTaskReminder.setReminder(taskId, pastDate)

      expect(result.success).toBe(false)
      expect(result.error).toContain('future')
    })

    it('should reject if task ID is empty', () => {
      const reminderDate = new Date('2026-01-15T10:00:00Z')

      const result = useTaskReminder.setReminder('', reminderDate)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Task ID')
    })
  })

  describe('removeReminder', () => {
    it('should remove reminder successfully', () => {
      const taskId = 'task-123'

      const result = useTaskReminder.removeReminder(taskId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        taskId,
        reminderAt: null,
        option: null,
      })
    })

    it('should reject if task ID is empty', () => {
      const result = useTaskReminder.removeReminder('')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Task ID')
    })
  })

  describe('getReminderTime', () => {
    it('should calculate reminder time for 1 hour before option', () => {
      const dueDate = new Date('2026-01-15T14:00:00Z')
      const option: ReminderOption = '1hour'

      const result = useTaskReminder.getReminderTime(dueDate, option)

      const expectedTime = new Date(dueDate.getTime() - 60 * 60 * 1000)
      expect(result.getTime()).toBe(expectedTime.getTime())
    })

    it('should calculate reminder time for 1 day before option', () => {
      const dueDate = new Date('2026-01-15T14:00:00Z')
      const option: ReminderOption = '1day'

      const result = useTaskReminder.getReminderTime(dueDate, option)

      const expectedTime = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000)
      expect(result.getTime()).toBe(expectedTime.getTime())
    })

    it('should return custom time for custom option', () => {
      const dueDate = new Date('2026-01-15T14:00:00Z')
      const option: ReminderOption = 'custom'

      const result = useTaskReminder.getReminderTime(dueDate, option)

      // Custom should return the provided time as-is
      expect(result.getTime()).toBe(dueDate.getTime())
    })
  })

  describe('validateReminder', () => {
    it('should validate correct reminder settings', () => {
      const reminderSettings: ReminderSettings = {
        taskId: 'task-123',
        reminderAt: new Date('2026-01-15T10:00:00Z').toISOString(),
        option: '1hour',
      }

      const result = useTaskReminder.validateReminder(reminderSettings)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject reminder with invalid task ID', () => {
      const reminderSettings: ReminderSettings = {
        taskId: '',
        reminderAt: new Date('2026-01-15T10:00:00Z').toISOString(),
        option: '1hour',
      }

      const result = useTaskReminder.validateReminder(reminderSettings)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Task ID is required')
    })

    it('should reject reminder with invalid date', () => {
      const reminderSettings: ReminderSettings = {
        taskId: 'task-123',
        reminderAt: 'invalid-date',
        option: '1hour',
      }

      const result = useTaskReminder.validateReminder(reminderSettings)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('date'))).toBe(true)
    })

    it('should reject reminder with invalid option', () => {
      const reminderSettings: any = {
        taskId: 'task-123',
        reminderAt: new Date('2026-01-15T10:00:00Z').toISOString(),
        option: 'invalid-option',
      }

      const result = useTaskReminder.validateReminder(reminderSettings)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('option'))).toBe(true)
    })
  })

  describe('notification sending', () => {
    it('should trigger notification when reminder reaches time', async () => {
      const taskId = 'task-123'
      const taskName = 'Complete project report'
      const reminderTime = new Date(Date.now() + 100) // 100ms from now

      const sendNotification = vi.fn().mockResolvedValue({ success: true })

      const result = await useTaskReminder.sendReminderNotification(
        taskId,
        taskName,
        reminderTime,
        sendNotification
      )

      expect(result.success).toBe(true)
    })

    it('should send in-app notification with correct message', async () => {
      const taskId = 'task-123'
      const taskName = 'Complete project report'
      const reminderTime = new Date('2026-01-15T10:00:00Z')

      const mockNotificationFn = vi.fn().mockResolvedValue({ success: true })

      const result = await useTaskReminder.sendReminderNotification(
        taskId,
        taskName,
        reminderTime,
        mockNotificationFn
      )

      expect(result.success).toBe(true)
      expect(mockNotificationFn).toHaveBeenCalled()
    })

    it('should handle notification sending error gracefully', async () => {
      const taskId = 'task-123'
      const taskName = 'Complete project report'
      const reminderTime = new Date('2026-01-15T10:00:00Z')

      const mockNotificationFn = vi.fn().mockRejectedValue(new Error('Failed to send'))

      const result = await useTaskReminder.sendReminderNotification(
        taskId,
        taskName,
        reminderTime,
        mockNotificationFn
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to send')
    })
  })

  describe('reminder options', () => {
    it('should support all valid reminder options', () => {
      const options: ReminderOption[] = ['1hour', '1day', 'custom']
      const dueDate = new Date('2026-01-15T14:00:00Z')

      options.forEach(option => {
        const result = useTaskReminder.setReminder('task-123', dueDate, option)
        expect(result.success).toBe(true)
        expect(result.data?.option).toBe(option)
      })
    })

    it('should preserve reminder settings across operations', () => {
      const taskId = 'task-123'
      const reminderDate = new Date('2026-01-15T10:00:00Z')

      const setResult = useTaskReminder.setReminder(taskId, reminderDate, '1hour')
      expect(setResult.success).toBe(true)

      const settings = setResult.data!
      const validateResult = useTaskReminder.validateReminder(settings)
      expect(validateResult.valid).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle reminder time exactly at current time', () => {
      const taskId = 'task-123'
      const nowDate = new Date()

      const result = useTaskReminder.setReminder(taskId, nowDate)

      // Should reject if current time or past
      expect(result.success).toBe(false)
    })

    it('should handle very far future reminder', () => {
      const taskId = 'task-123'
      const futureDate = new Date('2030-12-31T23:59:59Z')

      const result = useTaskReminder.setReminder(taskId, futureDate)

      expect(result.success).toBe(true)
      expect(result.data?.reminderAt).toBeDefined()
    })

    it('should handle reminder removal when no reminder was set', () => {
      const taskId = 'task-123'

      const result = useTaskReminder.removeReminder(taskId)

      expect(result.success).toBe(true)
    })
  })
})
