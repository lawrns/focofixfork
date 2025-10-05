-- Migration: Create activities table for activity feed
-- Description: Adds activities tracking for projects and organizations
-- Date: 2025-10-04

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL, -- 'project', 'task', 'milestone', 'organization', 'team'
  entity_id UUID NOT NULL, -- ID of the entity (project_id, task_id, etc.)
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'completed', 'assigned', etc.
  description TEXT NOT NULL, -- Human-readable description of the activity
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- Optional: for project-scoped activities
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- Optional: for org-scoped activities
  metadata JSONB, -- Additional data (old_value, new_value, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Indexes for performance
  CONSTRAINT activities_entity_type_check CHECK (entity_type IN ('project', 'task', 'milestone', 'organization', 'team', 'user'))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_organization_id ON activities(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);

-- Add RLS policies
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view activities for projects they have access to
CREATE POLICY activities_select_policy ON activities
  FOR SELECT
  USING (
    -- User can see their own activities
    user_id = auth.uid()
    OR
    -- User can see activities for projects they're members of
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = activities.project_id
      AND project_members.user_id = auth.uid()
    ))
    OR
    -- User can see activities for their organization
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = activities.organization_id
      AND organization_members.user_id = auth.uid()
    ))
  );

-- Policy: Authenticated users can create activities
CREATE POLICY activities_insert_policy ON activities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own activities
CREATE POLICY activities_delete_policy ON activities
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add helpful comment
COMMENT ON TABLE activities IS 'Tracks all activities across the platform for activity feeds and audit logs';
COMMENT ON COLUMN activities.entity_type IS 'Type of entity: project, task, milestone, organization, team, user';
COMMENT ON COLUMN activities.action IS 'Action performed: created, updated, deleted, completed, assigned, etc.';
COMMENT ON COLUMN activities.metadata IS 'Additional context data in JSON format';
