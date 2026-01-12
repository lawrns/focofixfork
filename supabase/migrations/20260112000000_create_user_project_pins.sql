-- User Project Pins Table
-- Tracks which projects are pinned by each user (per-user pinning, not global)

CREATE TABLE IF NOT EXISTS user_project_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pinned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_project_pins_user ON user_project_pins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_project_pins_project ON user_project_pins(project_id);
CREATE INDEX IF NOT EXISTS idx_user_project_pins_user_project ON user_project_pins(user_id, project_id);

-- Enable RLS
ALTER TABLE user_project_pins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for User Project Pins
-- Users can only see their own pins
CREATE POLICY "Users can view their own pins" ON user_project_pins
  FOR SELECT USING (user_id = auth.uid());

-- Users can create pins for projects they have access to
CREATE POLICY "Users can create pins for accessible projects" ON user_project_pins
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = user_project_pins.project_id
      AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = projects.organization_id
        AND organization_members.user_id = auth.uid()
      )
    )
  );

-- Users can delete their own pins
CREATE POLICY "Users can delete their own pins" ON user_project_pins
  FOR DELETE USING (user_id = auth.uid());
