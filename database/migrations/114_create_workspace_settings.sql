-- Migration: Create workspace_settings table
-- Description: Stores workspace-level settings and preferences
-- Date: 2025-01-21

-- Create workspace_settings table
CREATE TABLE IF NOT EXISTS workspace_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- General Settings
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  default_project_id UUID REFERENCES foco_projects(id) ON DELETE SET NULL,

  -- Task Settings
  default_task_status TEXT DEFAULT 'backlog' CHECK (default_task_status IN ('backlog', 'next', 'in_progress', 'review', 'blocked', 'done')),
  default_task_priority TEXT DEFAULT 'medium' CHECK (default_task_priority IN ('none', 'low', 'medium', 'high', 'urgent')),
  auto_archive_completed_tasks BOOLEAN DEFAULT false,
  auto_archive_days INTEGER DEFAULT 30,

  -- Notification Settings
  enable_notifications BOOLEAN DEFAULT true,
  notify_on_task_assignment BOOLEAN DEFAULT true,
  notify_on_task_completion BOOLEAN DEFAULT true,
  notify_on_mentions BOOLEAN DEFAULT true,
  notify_on_comments BOOLEAN DEFAULT true,
  notify_on_deadline_reminders BOOLEAN DEFAULT true,
  deadline_reminder_hours INTEGER DEFAULT 24,

  -- Collaboration Settings
  allow_guest_access BOOLEAN DEFAULT false,
  require_approval_for_guest_access BOOLEAN DEFAULT true,
  allow_member_invite BOOLEAN DEFAULT true,
  require_approval_for_member_invite BOOLEAN DEFAULT false,

  -- Time Tracking Settings
  enable_time_tracking BOOLEAN DEFAULT true,
  require_time_tracking_notes BOOLEAN DEFAULT false,
  allow_manual_time_entry BOOLEAN DEFAULT true,

  -- Display Settings
  default_view TEXT DEFAULT 'board' CHECK (default_view IN ('board', 'list', 'timeline', 'calendar')),
  items_per_page INTEGER DEFAULT 25,
  show_completed_tasks BOOLEAN DEFAULT true,
  show_archived_projects BOOLEAN DEFAULT false,

  -- Security Settings
  two_factor_required BOOLEAN DEFAULT false,
  session_timeout_minutes INTEGER DEFAULT 480,
  ip_whitelist TEXT[],

  -- Additional Settings (JSONB for flexibility)
  settings JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT workspace_settings_workspace_id_unique UNIQUE (workspace_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_workspace_settings_workspace_id ON workspace_settings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_settings_default_project ON workspace_settings(default_project_id) WHERE default_project_id IS NOT NULL;

-- Enable RLS
ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspace_settings
-- Users can read workspace settings if they are workspace members
CREATE POLICY workspace_settings_select_policy ON workspace_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_settings.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Only workspace admins and owners can update workspace settings
CREATE POLICY workspace_settings_update_policy ON workspace_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_settings.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('admin', 'owner')
    )
  );

-- Only workspace admins and owners can insert workspace settings
CREATE POLICY workspace_settings_insert_policy ON workspace_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_settings.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('admin', 'owner')
    )
  );

-- Only workspace admins and owners can delete workspace settings
CREATE POLICY workspace_settings_delete_policy ON workspace_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_settings.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('admin', 'owner')
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workspace_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workspace_settings_updated_at ON workspace_settings;
CREATE TRIGGER workspace_settings_updated_at
  BEFORE UPDATE ON workspace_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_settings_updated_at();

-- Function to get or create workspace settings
CREATE OR REPLACE FUNCTION get_or_create_workspace_settings(target_workspace_id uuid)
RETURNS workspace_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings workspace_settings%ROWTYPE;
BEGIN
  -- Try to get existing settings
  SELECT * INTO settings FROM workspace_settings WHERE workspace_id = target_workspace_id;

  -- If not found, create default settings
  IF settings.id IS NULL THEN
    INSERT INTO workspace_settings (workspace_id, name)
    VALUES (
      target_workspace_id,
      (SELECT name FROM workspaces WHERE id = target_workspace_id)
    )
    RETURNING * INTO settings;
  END IF;

  RETURN settings;
END;
$$;

-- Add helpful comments
COMMENT ON TABLE workspace_settings IS 'Stores workspace-level settings and preferences for tasks, notifications, collaboration, and display';
COMMENT ON COLUMN workspace_settings.default_task_status IS 'Default status for new tasks created in this workspace';
COMMENT ON COLUMN workspace_settings.auto_archive_completed_tasks IS 'Automatically archive completed tasks after auto_archive_days';
COMMENT ON COLUMN workspace_settings.deadline_reminder_hours IS 'Hours before deadline to send reminder notifications';
COMMENT ON COLUMN workspace_settings.allow_guest_access IS 'Whether to allow guest users in this workspace';
COMMENT ON COLUMN workspace_settings.require_time_tracking_notes IS 'Require users to add notes when logging time';
COMMENT ON COLUMN workspace_settings.settings IS 'Additional settings stored as JSONB for flexibility';
