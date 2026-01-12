-- ============================================================================
-- TAGS SYSTEM MIGRATION
-- Migration: 103_create_tags_system.sql
-- Date: 2026-01-12
-- Purpose: Add comprehensive task tagging system with workspace tags
-- ============================================================================

BEGIN;

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#0000FF', -- Hex color format
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT tag_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT valid_hex_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  UNIQUE(workspace_id, LOWER(name)) -- Case-insensitive unique tag names per workspace
);

-- Create task_tags junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS task_tags (
  task_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  PRIMARY KEY (task_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tags_workspace_id ON tags(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tags_name_lower ON tags(workspace_id, LOWER(name));
CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);

-- Create view for tag usage counts
CREATE OR REPLACE VIEW tag_usage_counts AS
SELECT
  t.id,
  t.workspace_id,
  t.name,
  t.color,
  t.created_at,
  t.updated_at,
  COUNT(tt.task_id) AS usage_count
FROM tags t
LEFT JOIN task_tags tt ON t.id = tt.tag_id
GROUP BY t.id, t.workspace_id, t.name, t.color, t.created_at, t.updated_at;

-- Enable RLS on tags table
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Enable RLS on task_tags table
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view tags in their workspace
CREATE POLICY tags_view_policy ON tags
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

-- RLS Policy: Workspace admins and owners can create tags
CREATE POLICY tags_create_policy ON tags
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policy: Workspace admins and owners can update tags
CREATE POLICY tags_update_policy ON tags
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policy: Workspace admins and owners can delete tags
CREATE POLICY tags_delete_policy ON tags
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policy: Users can view task_tags if they can view the task
CREATE POLICY task_tags_view_policy ON task_tags
  FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM work_items
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policy: Users with access to project can assign/remove tags
CREATE POLICY task_tags_manage_policy ON task_tags
  FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT id FROM work_items
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
      )
    )
    AND tag_id IN (
      SELECT id FROM tags
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policy: Users with access can remove tags from tasks
CREATE POLICY task_tags_delete_policy ON task_tags
  FOR DELETE
  USING (
    task_id IN (
      SELECT id FROM work_items
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
      )
    )
  );

-- Create function to update tags updated_at timestamp
CREATE OR REPLACE FUNCTION update_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tags updated_at
CREATE TRIGGER tags_updated_at_trigger
BEFORE UPDATE ON tags
FOR EACH ROW
EXECUTE FUNCTION update_tags_updated_at();

COMMIT;
