-- Agent Ops governance + custom agents

CREATE TABLE IF NOT EXISTS agent_ops_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE SET NULL,
  project_id uuid REFERENCES foco_projects(id) ON DELETE SET NULL,
  lane text NOT NULL CHECK (lane IN ('product_ui', 'platform_api', 'requirements')),
  title text NOT NULL,
  objective text NOT NULL,
  acceptance_criteria text[] NOT NULL DEFAULT '{}',
  size text NOT NULL DEFAULT 'micro' CHECK (size IN ('micro', 'small', 'medium')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'in_progress', 'blocked', 'done', 'archived')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_ops_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE SET NULL,
  task_id uuid REFERENCES agent_ops_tasks(id) ON DELETE SET NULL,
  from_lane text NOT NULL CHECK (from_lane IN ('product_ui', 'platform_api', 'requirements')),
  to_lane text NOT NULL CHECK (to_lane IN ('product_ui', 'platform_api', 'requirements')),
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'archived')),
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_ops_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE SET NULL,
  task_id uuid REFERENCES agent_ops_tasks(id) ON DELETE SET NULL,
  title text NOT NULL,
  decision text NOT NULL,
  rationale text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS custom_agent_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  lane text NOT NULL CHECK (lane IN ('product_ui', 'platform_api', 'requirements')),
  description text,
  system_prompt text NOT NULL,
  tool_access jsonb NOT NULL DEFAULT '{}'::jsonb,
  write_scope text[] NOT NULL DEFAULT '{}',
  read_scope text[] NOT NULL DEFAULT '{}',
  approval_sensitivity text NOT NULL DEFAULT 'high' CHECK (approval_sensitivity IN ('low', 'medium', 'high')),
  avatar_url text,
  persona_tags text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_agent_profiles_unique_slug
  ON custom_agent_profiles (user_id, COALESCE(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

CREATE INDEX IF NOT EXISTS idx_agent_ops_tasks_scope_created
  ON agent_ops_tasks (user_id, workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_ops_tasks_status
  ON agent_ops_tasks (user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_ops_messages_scope_created
  ON agent_ops_messages (user_id, workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_ops_messages_status
  ON agent_ops_messages (user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_ops_decisions_scope_created
  ON agent_ops_decisions (user_id, workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_agent_profiles_scope
  ON custom_agent_profiles (user_id, workspace_id, active, updated_at DESC);

CREATE OR REPLACE FUNCTION agent_ops_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_ops_tasks_updated_at ON agent_ops_tasks;
CREATE TRIGGER trg_agent_ops_tasks_updated_at
  BEFORE UPDATE ON agent_ops_tasks
  FOR EACH ROW
  EXECUTE FUNCTION agent_ops_set_updated_at();

DROP TRIGGER IF EXISTS trg_agent_ops_messages_updated_at ON agent_ops_messages;
CREATE TRIGGER trg_agent_ops_messages_updated_at
  BEFORE UPDATE ON agent_ops_messages
  FOR EACH ROW
  EXECUTE FUNCTION agent_ops_set_updated_at();

DROP TRIGGER IF EXISTS trg_custom_agent_profiles_updated_at ON custom_agent_profiles;
CREATE TRIGGER trg_custom_agent_profiles_updated_at
  BEFORE UPDATE ON custom_agent_profiles
  FOR EACH ROW
  EXECUTE FUNCTION agent_ops_set_updated_at();

ALTER TABLE agent_ops_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_ops_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_ops_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_agent_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_ops_tasks_rw_own ON agent_ops_tasks;
CREATE POLICY agent_ops_tasks_rw_own
  ON agent_ops_tasks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS agent_ops_messages_rw_own ON agent_ops_messages;
CREATE POLICY agent_ops_messages_rw_own
  ON agent_ops_messages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS agent_ops_decisions_rw_own ON agent_ops_decisions;
CREATE POLICY agent_ops_decisions_rw_own
  ON agent_ops_decisions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS custom_agent_profiles_rw_own ON custom_agent_profiles;
CREATE POLICY custom_agent_profiles_rw_own
  ON custom_agent_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE agent_ops_tasks IS 'Human-gated micro-tasks for role-constrained agent execution.';
COMMENT ON TABLE agent_ops_messages IS 'Inter-lane markdown-style correspondence events.';
COMMENT ON TABLE agent_ops_decisions IS 'Decision log tied to tasks for anti-bureaucracy governance.';
COMMENT ON TABLE custom_agent_profiles IS 'User-defined agent personas with lane restrictions and system prompts.';
