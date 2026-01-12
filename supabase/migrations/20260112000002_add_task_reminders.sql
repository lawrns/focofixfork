-- Task Reminders Feature
-- Adds reminder support to tasks

-- Add reminder_at column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ;

-- Create reminders table for tracking sent reminders
CREATE TABLE IF NOT EXISTS task_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_at TIMESTAMPTZ NOT NULL,
  option TEXT DEFAULT 'custom' CHECK (option IN ('1hour', '1day', 'custom')),
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient reminder lookups
CREATE INDEX IF NOT EXISTS idx_task_reminders_task ON task_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_user ON task_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_sent ON task_reminders(sent);
CREATE INDEX IF NOT EXISTS idx_task_reminders_at ON task_reminders(reminder_at);

-- Create table for reminder notifications
CREATE TABLE IF NOT EXISTS reminder_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES task_reminders(id) ON DELETE CASCADE,
  notification_type TEXT DEFAULT 'in-app' CHECK (notification_type IN ('in-app', 'email', 'both')),
  message TEXT NOT NULL,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient notification lookups
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_task ON reminder_notifications(task_id);
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_user ON reminder_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_sent ON reminder_notifications(sent);

-- Enable RLS on reminder tables
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_reminders
CREATE POLICY "Users can read own task reminders" ON task_reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own task reminders" ON task_reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own task reminders" ON task_reminders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own task reminders" ON task_reminders
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for reminder_notifications
CREATE POLICY "Users can read own reminder notifications" ON reminder_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reminder notifications" ON reminder_notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminder notifications" ON reminder_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Add index on tasks for reminder_at column
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_at ON tasks(reminder_at) WHERE reminder_at IS NOT NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
