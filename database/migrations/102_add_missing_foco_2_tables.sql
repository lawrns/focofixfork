-- Migration: Add missing Foco 2.0 tables
-- Description: Adds tables that were missing from the initial Foco 2.0 schema
-- Date: 2026-01-11

-- ============================================================================
-- COMMENTS (was missing - named foco_comments in schema)
-- ============================================================================

-- The foco_comments table already exists, just creating a view for compatibility
CREATE OR REPLACE VIEW comments AS
SELECT * FROM foco_comments;

-- ============================================================================
-- ACTIVITY LOGS (Foco 2.0 version)
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  entity_type VARCHAR(50) NOT NULL, -- 'project', 'work_item', 'milestone', 'goal'
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'completed', 'assigned'
  description TEXT NOT NULL,
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX(activity_logs_workspace_id) INCLUDE (entity_type, entity_id),
  INDEX(activity_logs_user_id) INCLUDE (created_at),
  INDEX(activity_logs_entity) INCLUDE (action, created_at)
);

-- ============================================================================
-- MILESTONES (Foco 2.0 version)
-- ============================================================================

CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES foco_projects(id) ON DELETE CASCADE,
  
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  start_date DATE,
  end_date DATE,
  due_date DATE,
  
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX(milestones_workspace_id) INCLUDE (status, due_date),
  INDEX(milestones_project_id) INCLUDE (status),
  INDEX(milestones_created_by) INCLUDE (created_at)
);

-- ============================================================================
-- GOALS (Foco 2.0 version)
-- ============================================================================

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES foco_projects(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'workspace' CHECK (type IN ('workspace', 'project', 'personal')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Progress tracking
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT, -- %, hours, count, etc.
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  
  -- Ownership
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dates
  start_date DATE,
  end_date DATE,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  
  INDEX(goals_workspace_id) INCLUDE (status, priority),
  INDEX(goals_project_id) INCLUDE (status),
  INDEX(goals_owner_id) INCLUDE (created_at)
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Activity Logs RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity logs in their workspace" ON activity_logs
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert activity logs" ON activity_logs
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Milestones RLS
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view milestones in their workspace" ON milestones
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage milestones in their workspace" ON milestones
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'member')
    )
  );

-- Goals RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view goals in their workspace" ON goals
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage goals in their workspace" ON goals
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'member')
    )
  );

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_milestones_timestamp
  BEFORE UPDATE ON milestones
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_goals_timestamp
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

-- Add comments for documentation
COMMENT ON TABLE activity_logs IS 'Tracks all activities within workspaces for audit logs and feeds';
COMMENT ON TABLE milestones IS 'Project milestones within Foco 2.0 workspaces';
COMMENT ON TABLE goals IS 'Goals and objectives within workspaces or projects';
