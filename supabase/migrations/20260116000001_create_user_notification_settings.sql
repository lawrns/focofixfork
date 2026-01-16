-- Migration: Create user_notification_settings table
-- Stores user preferences for notifications

CREATE TABLE IF NOT EXISTS user_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Push notification preferences
  enable_push boolean NOT NULL DEFAULT true,
  
  -- Notification type preferences
  notify_task_assignments boolean NOT NULL DEFAULT true,
  notify_mentions boolean NOT NULL DEFAULT true,
  notify_project_updates boolean NOT NULL DEFAULT true,
  notify_deadlines boolean NOT NULL DEFAULT true,
  notify_team_members boolean NOT NULL DEFAULT false,
  notify_comments boolean NOT NULL DEFAULT true,
  notify_status_changes boolean NOT NULL DEFAULT true,
  
  -- Email preferences
  enable_email boolean NOT NULL DEFAULT true,
  email_digest_frequency text NOT NULL DEFAULT 'daily' CHECK (email_digest_frequency IN ('instant', 'daily', 'weekly', 'never')),
  
  -- In-app preferences
  enable_sound boolean NOT NULL DEFAULT true,
  show_badges boolean NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE (user_id)
);

-- Create index for user lookup
CREATE INDEX IF NOT EXISTS user_notification_settings_user_id_idx ON user_notification_settings (user_id);

-- Enable RLS
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

-- Users can only read their own settings
DROP POLICY IF EXISTS "Users can view own notification settings" ON user_notification_settings;
CREATE POLICY "Users can view own notification settings"
  ON user_notification_settings
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own settings
DROP POLICY IF EXISTS "Users can insert own notification settings" ON user_notification_settings;
CREATE POLICY "Users can insert own notification settings"
  ON user_notification_settings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own settings
DROP POLICY IF EXISTS "Users can update own notification settings" ON user_notification_settings;
CREATE POLICY "Users can update own notification settings"
  ON user_notification_settings
  FOR UPDATE
  USING (user_id = auth.uid());

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_notification_settings_updated_at ON user_notification_settings;
CREATE TRIGGER user_notification_settings_updated_at
  BEFORE UPDATE ON user_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_notification_settings_updated_at();

-- Function to get or create user notification settings
CREATE OR REPLACE FUNCTION get_or_create_notification_settings(target_user_id uuid)
RETURNS user_notification_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings user_notification_settings%ROWTYPE;
BEGIN
  -- Try to get existing settings
  SELECT * INTO settings FROM user_notification_settings WHERE user_id = target_user_id;
  
  -- If not found, create default settings
  IF settings.id IS NULL THEN
    INSERT INTO user_notification_settings (user_id)
    VALUES (target_user_id)
    RETURNING * INTO settings;
  END IF;
  
  RETURN settings;
END;
$$;
