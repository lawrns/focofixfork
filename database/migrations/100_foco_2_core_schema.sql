-- ============================================================================
-- FOCO 2.0 CORE SCHEMA
-- Migration: 100_foco_2_core_schema.sql
-- Date: 2026-01-10
-- Purpose: Complete schema for Foco 2.0 - Project Management System
-- ============================================================================

BEGIN;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Work item types
CREATE TYPE work_item_type AS ENUM ('task', 'bug', 'feature', 'milestone');

-- Work item status (core states)
CREATE TYPE work_item_status AS ENUM ('backlog', 'next', 'in_progress', 'review', 'blocked', 'done');

-- Priority levels
CREATE TYPE priority_level AS ENUM ('urgent', 'high', 'medium', 'low', 'none');

-- Member roles
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member', 'guest');

-- Notification types
CREATE TYPE notification_type AS ENUM (
  'mention', 'assigned', 'status_change', 'comment', 'approval', 'ai_flag', 'due_soon', 'blocked'
);

-- Automation trigger types
CREATE TYPE automation_trigger AS ENUM (
  'work_item_created', 'status_changed', 'due_date_approaching', 'blocked', 
  'comment_contains', 'schedule', 'assigned', 'priority_changed'
);

-- Automation action types
CREATE TYPE automation_action AS ENUM (
  'assign', 'set_priority', 'set_due_date', 'create_follow_up', 'notify',
  'move_status', 'request_approval', 'generate_report', 'add_label'
);

-- ============================================================================
-- WORKSPACES
-- ============================================================================
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  ai_policy JSONB DEFAULT '{
    "allowed_actions": ["suggest"],
    "auto_apply": false,
    "confidence_threshold": 0.8,
    "data_sources": ["tasks", "comments", "docs"],
    "audit_visible": true
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- WORKSPACE MEMBERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role member_role DEFAULT 'member',
  capacity_hours_per_week INTEGER DEFAULT 40,
  focus_hours_per_day INTEGER DEFAULT 4,
  timezone VARCHAR(50) DEFAULT 'UTC',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- ============================================================================
-- PROJECTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS foco_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  brief TEXT,
  color VARCHAR(7) DEFAULT '#6366F1',
  icon VARCHAR(50) DEFAULT 'folder',
  status VARCHAR(50) DEFAULT 'active',
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  default_status work_item_status DEFAULT 'next',
  settings JSONB DEFAULT '{
    "statuses": ["backlog", "next", "in_progress", "review", "done"],
    "labels": [],
    "wip_limits": {},
    "require_closure_note": false
  }',
  is_pinned BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, slug)
);

-- ============================================================================
-- PROJECT MEMBERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS foco_project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES foco_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role member_role DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- ============================================================================
-- LABELS
-- ============================================================================
CREATE TABLE IF NOT EXISTS labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES foco_projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#94A3B8',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- WORK ITEMS (Tasks, Bugs, Features, Milestones)
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES foco_projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES work_items(id) ON DELETE SET NULL,
  
  -- Core fields
  type work_item_type DEFAULT 'task',
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status work_item_status DEFAULT 'backlog',
  priority priority_level DEFAULT 'none',
  
  -- Assignment
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Dates
  due_date DATE,
  start_date DATE,
  completed_at TIMESTAMPTZ,
  
  -- Estimation
  estimate_hours DECIMAL(6,2),
  actual_hours DECIMAL(6,2),
  
  -- Organization
  position INTEGER DEFAULT 0,
  section VARCHAR(100),
  
  -- Blocked state
  blocked_reason TEXT,
  blocked_by_id UUID REFERENCES work_items(id) ON DELETE SET NULL,
  
  -- Closure
  closure_note TEXT,
  
  -- AI Context
  ai_context_sources JSONB DEFAULT '[]',
  embedding vector(1536),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- WORK ITEM LABELS (Many-to-Many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_item_labels (
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (work_item_id, label_id)
);

-- ============================================================================
-- WORK ITEM DEPENDENCIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_item_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) DEFAULT 'blocks',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(work_item_id, depends_on_id)
);

-- ============================================================================
-- COMMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS foco_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  is_ai_generated BOOLEAN DEFAULT FALSE,
  ai_sources JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DOCS
-- ============================================================================
CREATE TABLE IF NOT EXISTS docs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES foco_projects(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES docs(id) ON DELETE SET NULL,
  
  title VARCHAR(500) NOT NULL,
  content TEXT,
  content_type VARCHAR(50) DEFAULT 'markdown',
  template VARCHAR(100),
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  is_locked BOOLEAN DEFAULT FALSE,
  locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- VIEWS (Saved Filters)
-- ============================================================================
CREATE TABLE IF NOT EXISTS saved_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES foco_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  view_type VARCHAR(50) DEFAULT 'list',
  filters JSONB DEFAULT '{}',
  sort_by VARCHAR(100) DEFAULT 'position',
  sort_order VARCHAR(10) DEFAULT 'asc',
  columns JSONB DEFAULT '[]',
  group_by VARCHAR(100),
  
  is_default BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUTOMATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES foco_projects(id) ON DELETE SET NULL,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  
  trigger_type automation_trigger NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  
  conditions JSONB DEFAULT '[]',
  
  action_type automation_action NOT NULL,
  action_config JSONB DEFAULT '{}',
  
  run_count INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUTOMATION LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  work_item_id UUID REFERENCES work_items(id) ON DELETE SET NULL,
  
  status VARCHAR(50) NOT NULL,
  trigger_data JSONB,
  action_result JSONB,
  error_message TEXT,
  
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INBOX (Notifications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inbox_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  type notification_type NOT NULL,
  title VARCHAR(500) NOT NULL,
  body TEXT,
  
  work_item_id UUID REFERENCES work_items(id) ON DELETE CASCADE,
  project_id UUID REFERENCES foco_projects(id) ON DELETE CASCADE,
  doc_id UUID REFERENCES docs(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES foco_comments(id) ON DELETE CASCADE,
  
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  is_read BOOLEAN DEFAULT FALSE,
  is_resolved BOOLEAN DEFAULT FALSE,
  snoozed_until TIMESTAMPTZ,
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ACTIVITY LOG (Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  
  action VARCHAR(100) NOT NULL,
  changes JSONB,
  
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_ai_action BOOLEAN DEFAULT FALSE,
  ai_confidence DECIMAL(3,2),
  ai_sources JSONB,
  
  can_undo BOOLEAN DEFAULT FALSE,
  undo_data JSONB,
  undone_at TIMESTAMPTZ,
  undone_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AI SUGGESTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  suggestion_type VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  
  entity_type VARCHAR(50),
  entity_id UUID,
  
  proposed_changes JSONB NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  sources JSONB DEFAULT '[]',
  reasoning TEXT,
  
  status VARCHAR(50) DEFAULT 'pending',
  applied_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  feedback VARCHAR(50),
  
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TIME ENTRIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  
  description TEXT,
  is_billable BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PRESENCE (Real-time collaboration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_presence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  status VARCHAR(50) DEFAULT 'online',
  current_page VARCHAR(500),
  current_entity_type VARCHAR(50),
  current_entity_id UUID,
  
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(workspace_id, user_id)
);

-- ============================================================================
-- REPORTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES foco_projects(id) ON DELETE SET NULL,
  
  report_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  
  config JSONB DEFAULT '{}',
  data JSONB,
  
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  
  period_start DATE,
  period_end DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Workspaces
CREATE INDEX idx_workspaces_slug ON workspaces(slug);

-- Workspace members
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- Projects
CREATE INDEX idx_foco_projects_workspace ON foco_projects(workspace_id);
CREATE INDEX idx_foco_projects_owner ON foco_projects(owner_id);
CREATE INDEX idx_foco_projects_slug ON foco_projects(workspace_id, slug);

-- Work items
CREATE INDEX idx_work_items_workspace ON work_items(workspace_id);
CREATE INDEX idx_work_items_project ON work_items(project_id);
CREATE INDEX idx_work_items_assignee ON work_items(assignee_id);
CREATE INDEX idx_work_items_status ON work_items(status);
CREATE INDEX idx_work_items_due_date ON work_items(due_date);
CREATE INDEX idx_work_items_type ON work_items(type);
CREATE INDEX idx_work_items_priority ON work_items(priority);
CREATE INDEX idx_work_items_parent ON work_items(parent_id);

-- Comments
CREATE INDEX idx_foco_comments_work_item ON foco_comments(work_item_id);
CREATE INDEX idx_foco_comments_user ON foco_comments(user_id);

-- Docs
CREATE INDEX idx_docs_workspace ON docs(workspace_id);
CREATE INDEX idx_docs_project ON docs(project_id);

-- Inbox
CREATE INDEX idx_inbox_items_user ON inbox_items(user_id);
CREATE INDEX idx_inbox_items_workspace ON inbox_items(workspace_id);
CREATE INDEX idx_inbox_items_unread ON inbox_items(user_id, is_read) WHERE NOT is_read;

-- Activity log
CREATE INDEX idx_activity_log_workspace ON activity_log(workspace_id);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_user ON activity_log(user_id);

-- AI Suggestions
CREATE INDEX idx_ai_suggestions_user ON ai_suggestions(user_id);
CREATE INDEX idx_ai_suggestions_pending ON ai_suggestions(user_id, status) WHERE status = 'pending';

-- Presence
CREATE INDEX idx_user_presence_workspace ON user_presence(workspace_id);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspace_members_updated_at BEFORE UPDATE ON workspace_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_foco_projects_updated_at BEFORE UPDATE ON foco_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_items_updated_at BEFORE UPDATE ON work_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_foco_comments_updated_at BEFORE UPDATE ON foco_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_docs_updated_at BEFORE UPDATE ON docs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_views_updated_at BEFORE UPDATE ON saved_views
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automations_updated_at BEFORE UPDATE ON automations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inbox_items_updated_at BEFORE UPDATE ON inbox_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE foco_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE foco_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_item_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_item_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE foco_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Workspace access helper function
CREATE OR REPLACE FUNCTION user_has_workspace_access(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for workspaces
CREATE POLICY workspace_select ON workspaces FOR SELECT
  USING (user_has_workspace_access(id));

CREATE POLICY workspace_insert ON workspaces FOR INSERT
  WITH CHECK (true);

CREATE POLICY workspace_update ON workspaces FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = id AND user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- RLS Policies for workspace_members
CREATE POLICY workspace_members_select ON workspace_members FOR SELECT
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY workspace_members_insert ON workspace_members FOR INSERT
  WITH CHECK (user_has_workspace_access(workspace_id) OR user_id = auth.uid());

CREATE POLICY workspace_members_update ON workspace_members FOR UPDATE
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY workspace_members_delete ON workspace_members FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id 
    AND wm.user_id = auth.uid() 
    AND wm.role IN ('owner', 'admin')
  ));

-- RLS Policies for foco_projects
CREATE POLICY foco_projects_select ON foco_projects FOR SELECT
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY foco_projects_insert ON foco_projects FOR INSERT
  WITH CHECK (user_has_workspace_access(workspace_id));

CREATE POLICY foco_projects_update ON foco_projects FOR UPDATE
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY foco_projects_delete ON foco_projects FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = foco_projects.workspace_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  ));

-- RLS Policies for work_items
CREATE POLICY work_items_select ON work_items FOR SELECT
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY work_items_insert ON work_items FOR INSERT
  WITH CHECK (user_has_workspace_access(workspace_id));

CREATE POLICY work_items_update ON work_items FOR UPDATE
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY work_items_delete ON work_items FOR DELETE
  USING (user_has_workspace_access(workspace_id));

-- RLS Policies for inbox_items
CREATE POLICY inbox_items_select ON inbox_items FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY inbox_items_insert ON inbox_items FOR INSERT
  WITH CHECK (user_has_workspace_access(workspace_id));

CREATE POLICY inbox_items_update ON inbox_items FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY inbox_items_delete ON inbox_items FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for ai_suggestions
CREATE POLICY ai_suggestions_select ON ai_suggestions FOR SELECT
  USING (user_id = auth.uid() OR user_has_workspace_access(workspace_id));

CREATE POLICY ai_suggestions_insert ON ai_suggestions FOR INSERT
  WITH CHECK (user_has_workspace_access(workspace_id));

CREATE POLICY ai_suggestions_update ON ai_suggestions FOR UPDATE
  USING (user_id = auth.uid() OR user_has_workspace_access(workspace_id));

-- Generic policies for other tables
CREATE POLICY labels_access ON labels FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY work_item_labels_access ON work_item_labels FOR ALL
  USING (EXISTS (
    SELECT 1 FROM work_items wi WHERE wi.id = work_item_id AND user_has_workspace_access(wi.workspace_id)
  ));

CREATE POLICY work_item_deps_access ON work_item_dependencies FOR ALL
  USING (EXISTS (
    SELECT 1 FROM work_items wi WHERE wi.id = work_item_id AND user_has_workspace_access(wi.workspace_id)
  ));

CREATE POLICY foco_comments_access ON foco_comments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM work_items wi WHERE wi.id = work_item_id AND user_has_workspace_access(wi.workspace_id)
  ));

CREATE POLICY docs_access ON docs FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY saved_views_access ON saved_views FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY automations_access ON automations FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY automation_logs_access ON automation_logs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM automations a WHERE a.id = automation_id AND user_has_workspace_access(a.workspace_id)
  ));

CREATE POLICY activity_log_access ON activity_log FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY time_entries_access ON time_entries FOR ALL
  USING (EXISTS (
    SELECT 1 FROM work_items wi WHERE wi.id = work_item_id AND user_has_workspace_access(wi.workspace_id)
  ));

CREATE POLICY user_presence_access ON user_presence FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY reports_access ON reports FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY foco_project_members_access ON foco_project_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM foco_projects p WHERE p.id = project_id AND user_has_workspace_access(p.workspace_id)
  ));

COMMIT;

-- ============================================================================
-- END OF FOCO 2.0 CORE SCHEMA
-- ============================================================================
