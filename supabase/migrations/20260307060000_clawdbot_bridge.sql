-- Migration: Clawdbot bridge activity + runtime profiles

CREATE TABLE IF NOT EXISTS agent_runtime_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES foco_projects(id) ON DELETE CASCADE,
  agent_backend text NOT NULL CHECK (agent_backend IN ('crico', 'clawdbot', 'bosun', 'openclaw')),
  agent_key text NOT NULL,
  display_name text NOT NULL DEFAULT 'ClawdBot',
  scope_key text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  model_preference text,
  tool_mode text NOT NULL DEFAULT 'gateway' CHECK (tool_mode IN ('sandbox', 'gateway', 'full')),
  bootstrap_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  memory_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  session_scope jsonb NOT NULL DEFAULT '{"dm_scope":"per-channel-peer","memory_flush_before_compaction":true}'::jsonb,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  channel_routing jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_activity_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_runtime_profiles_scope_uidx
  ON agent_runtime_profiles (user_id, scope_key, agent_backend, agent_key);

CREATE INDEX IF NOT EXISTS agent_runtime_profiles_workspace_idx
  ON agent_runtime_profiles (workspace_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS agent_runtime_profiles_project_idx
  ON agent_runtime_profiles (project_id, updated_at DESC)
  WHERE project_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS agent_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES foco_projects(id) ON DELETE SET NULL,
  task_id uuid REFERENCES work_items(id) ON DELETE SET NULL,
  run_id uuid REFERENCES runs(id) ON DELETE SET NULL,
  agent_backend text NOT NULL CHECK (agent_backend IN ('crico', 'clawdbot', 'bosun', 'openclaw')),
  agent_key text NOT NULL,
  session_key text,
  correlation_id text,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error')),
  direction text NOT NULL DEFAULT 'internal' CHECK (direction IN ('inbound', 'outbound', 'tool', 'internal', 'system')),
  title text NOT NULL,
  detail text,
  source text NOT NULL DEFAULT 'clawdbot_bridge',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_activity_events_idempotency_uidx
  ON agent_activity_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS agent_activity_events_scope_idx
  ON agent_activity_events (user_id, workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS agent_activity_events_backend_idx
  ON agent_activity_events (agent_backend, agent_key, created_at DESC);

CREATE INDEX IF NOT EXISTS agent_activity_events_project_idx
  ON agent_activity_events (project_id, created_at DESC)
  WHERE project_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_agent_runtime_profiles_updated_at ON agent_runtime_profiles;
CREATE TRIGGER trg_agent_runtime_profiles_updated_at
  BEFORE UPDATE ON agent_runtime_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_col();

ALTER TABLE agent_runtime_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_runtime_profiles_rw_own ON agent_runtime_profiles;
CREATE POLICY agent_runtime_profiles_rw_own ON agent_runtime_profiles
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS agent_activity_events_rw_own ON agent_activity_events;
CREATE POLICY agent_activity_events_rw_own ON agent_activity_events
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
