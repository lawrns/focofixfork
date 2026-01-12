import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationModel, Notification, NotificationPreferences } from '@/lib/models/notifications';

describe('Notification Quiet Hours Logic', () => {
  describe('isQuietHours', () => {
    it('should return false when quiet hours are not set', () => {
      const preferences: NotificationPreferences = {
        user_id: 'user-123',
        email_enabled: true,
        push_enabled: false,
        sms_enabled: false,
        in_app_enabled: true,
        mention_notifications: true,
        comment_notifications: true,
        assignment_notifications: true,
        due_date_reminders: true,
        status_change_notifications: true,
        invitation_notifications: true,
        approval_notifications: true,
        system_notifications: true,
        collaboration_notifications: false,
        email_frequency: 'immediate',
        push_frequency: 'immediate',
        mention_channels: ['in_app'],
        comment_channels: ['in_app'],
        assignment_channels: ['in_app', 'email'],
        due_date_channels: ['in_app', 'email'],
        status_change_channels: ['in_app'],
        invitation_channels: ['in_app', 'email'],
        approval_channels: ['in_app', 'email'],
        system_channels: ['in_app'],
        collaboration_channels: ['in_app'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const isQuiet = NotificationModel.isQuietHours(preferences);
      expect(isQuiet).toBe(false);
    });

    it('should return true when current time is within same-day quiet hours', () => {
      const preferences: NotificationPreferences = {
        user_id: 'user-123',
        email_enabled: true,
        push_enabled: false,
        sms_enabled: false,
        in_app_enabled: true,
        mention_notifications: true,
        comment_notifications: true,
        assignment_notifications: true,
        due_date_reminders: true,
        status_change_notifications: true,
        invitation_notifications: true,
        approval_notifications: true,
        system_notifications: true,
        collaboration_notifications: false,
        email_frequency: 'immediate',
        push_frequency: 'immediate',
        mention_channels: ['in_app'],
        comment_channels: ['in_app'],
        assignment_channels: ['in_app', 'email'],
        due_date_channels: ['in_app', 'email'],
        status_change_channels: ['in_app'],
        invitation_channels: ['in_app', 'email'],
        approval_channels: ['in_app', 'email'],
        system_channels: ['in_app'],
        collaboration_channels: ['in_app'],
        quiet_hours_start: '10:00',
        quiet_hours_end: '18:00',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock current time to be within quiet hours (12:00)
      const mockDate = new Date();
      mockDate.setHours(12, 0, 0, 0);
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const isQuiet = NotificationModel.isQuietHours(preferences);
      expect(isQuiet).toBe(true);

      vi.useRealTimers();
    });

    it('should return true when current time is within overnight quiet hours', () => {
      const preferences: NotificationPreferences = {
        user_id: 'user-123',
        email_enabled: true,
        push_enabled: false,
        sms_enabled: false,
        in_app_enabled: true,
        mention_notifications: true,
        comment_notifications: true,
        assignment_notifications: true,
        due_date_reminders: true,
        status_change_notifications: true,
        invitation_notifications: true,
        approval_notifications: true,
        system_notifications: true,
        collaboration_notifications: false,
        email_frequency: 'immediate',
        push_frequency: 'immediate',
        mention_channels: ['in_app'],
        comment_channels: ['in_app'],
        assignment_channels: ['in_app', 'email'],
        due_date_channels: ['in_app', 'email'],
        status_change_channels: ['in_app'],
        invitation_channels: ['in_app', 'email'],
        approval_channels: ['in_app', 'email'],
        system_channels: ['in_app'],
        collaboration_channels: ['in_app'],
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock current time to be within quiet hours (23:00)
      const mockDate = new Date();
      mockDate.setHours(23, 0, 0, 0);
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const isQuiet = NotificationModel.isQuietHours(preferences);
      expect(isQuiet).toBe(true);

      vi.useRealTimers();
    });

    it('should return false when current time is outside quiet hours', () => {
      const preferences: NotificationPreferences = {
        user_id: 'user-123',
        email_enabled: true,
        push_enabled: false,
        sms_enabled: false,
        in_app_enabled: true,
        mention_notifications: true,
        comment_notifications: true,
        assignment_notifications: true,
        due_date_reminders: true,
        status_change_notifications: true,
        invitation_notifications: true,
        approval_notifications: true,
        system_notifications: true,
        collaboration_notifications: false,
        email_frequency: 'immediate',
        push_frequency: 'immediate',
        mention_channels: ['in_app'],
        comment_channels: ['in_app'],
        assignment_channels: ['in_app', 'email'],
        due_date_channels: ['in_app', 'email'],
        status_change_channels: ['in_app'],
        invitation_channels: ['in_app', 'email'],
        approval_channels: ['in_app', 'email'],
        system_channels: ['in_app'],
        collaboration_channels: ['in_app'],
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock current time to be outside quiet hours (12:00)
      const mockDate = new Date();
      mockDate.setHours(12, 0, 0, 0);
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const isQuiet = NotificationModel.isQuietHours(preferences);
      expect(isQuiet).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('shouldSendNotification', () => {
    it('should not send notification if type is disabled', () => {
      const notification: Notification = {
        id: 'notif-123',
        user_id: 'user-123',
        type: 'mention',
        title: 'Test mention',
        message: 'You were mentioned',
        data: {},
        is_read: false,
        created_at: new Date().toISOString(),
      };

      const preferences: NotificationPreferences = {
        user_id: 'user-123',
        email_enabled: true,
        push_enabled: false,
        sms_enabled: false,
        in_app_enabled: true,
        mention_notifications: false, // Disabled
        comment_notifications: true,
        assignment_notifications: true,
        due_date_reminders: true,
        status_change_notifications: true,
        invitation_notifications: true,
        approval_notifications: true,
        system_notifications: true,
        collaboration_notifications: false,
        email_frequency: 'immediate',
        push_frequency: 'immediate',
        mention_channels: ['in_app'],
        comment_channels: ['in_app'],
        assignment_channels: ['in_app', 'email'],
        due_date_channels: ['in_app', 'email'],
        status_change_channels: ['in_app'],
        invitation_channels: ['in_app', 'email'],
        approval_channels: ['in_app', 'email'],
        system_channels: ['in_app'],
        collaboration_channels: ['in_app'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const shouldSend = NotificationModel.shouldSendNotification(notification, preferences);
      expect(shouldSend).toBe(false);
    });

    it('should send notification if type is enabled and channel is available', () => {
      const notification: Notification = {
        id: 'notif-123',
        user_id: 'user-123',
        type: 'mention',
        title: 'Test mention',
        message: 'You were mentioned',
        data: {},
        is_read: false,
        created_at: new Date().toISOString(),
      };

      const preferences: NotificationPreferences = {
        user_id: 'user-123',
        email_enabled: true,
        push_enabled: false,
        sms_enabled: false,
        in_app_enabled: true,
        mention_notifications: true,
        comment_notifications: true,
        assignment_notifications: true,
        due_date_reminders: true,
        status_change_notifications: true,
        invitation_notifications: true,
        approval_notifications: true,
        system_notifications: true,
        collaboration_notifications: false,
        email_frequency: 'immediate',
        push_frequency: 'immediate',
        mention_channels: ['in_app'],
        comment_channels: ['in_app'],
        assignment_channels: ['in_app', 'email'],
        due_date_channels: ['in_app', 'email'],
        status_change_channels: ['in_app'],
        invitation_channels: ['in_app', 'email'],
        approval_channels: ['in_app', 'email'],
        system_channels: ['in_app'],
        collaboration_channels: ['in_app'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const shouldSend = NotificationModel.shouldSendNotification(notification, preferences);
      expect(shouldSend).toBe(true);
    });
  });
});
