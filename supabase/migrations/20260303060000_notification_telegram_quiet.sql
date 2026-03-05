-- Add Telegram and quiet hours columns to notification settings
ALTER TABLE user_notification_settings
  ADD COLUMN IF NOT EXISTS enable_telegram boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS telegram_chat_id text,
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiet_hours_start time DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end time DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_timezone text DEFAULT 'America/Mexico_City';
