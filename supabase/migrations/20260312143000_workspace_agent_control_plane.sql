-- Migration: Workspace agent control plane
-- Adds durable agent threads, thread messages, and workspace connectors

-- ---------------------------------------------------------------------------
-- 1. Agent threads
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agent_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('workspace', 'page', 'database')),
  entity_id uuid,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paused', 'closed')),
  agent_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE agent_threads IS 'Page-, database-, or workspace-scoped conversations for OpenClaw-powered workspace agents.';

CREATE INDEX IF NOT EXISTS idx_agent_threads_workspace
  ON agent_threads (workspace_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_threads_scope
  ON agent_threads (workspace_id, entity_type, entity_id);

DROP TRIGGER IF EXISTS trg_agent_threads_updated_at ON agent_threads;
CREATE TRIGGER trg_agent_threads_updated_at
  BEFORE UPDATE ON agent_threads
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_col();

ALTER TABLE agent_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_threads_select ON agent_threads;
CREATE POLICY agent_threads_select ON agent_threads
  FOR SELECT USING (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS agent_threads_insert ON agent_threads;
CREATE POLICY agent_threads_insert ON agent_threads
  FOR INSERT WITH CHECK (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS agent_threads_update ON agent_threads;
CREATE POLICY agent_threads_update ON agent_threads
  FOR UPDATE USING (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS agent_threads_delete ON agent_threads;
CREATE POLICY agent_threads_delete ON agent_threads
  FOR DELETE USING (foco_user_has_workspace_access(workspace_id));

-- ---------------------------------------------------------------------------
-- 2. Agent thread messages
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agent_thread_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES agent_threads(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'event')),
  content text NOT NULL,
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'pending', 'running', 'completed', 'failed')),
  run_id uuid REFERENCES runs(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE agent_thread_messages IS 'Durable messages and run-linked assistant placeholders for workspace agent threads.';

CREATE INDEX IF NOT EXISTS idx_agent_thread_messages_thread
  ON agent_thread_messages (thread_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_agent_thread_messages_run
  ON agent_thread_messages (run_id)
  WHERE run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_thread_messages_workspace
  ON agent_thread_messages (workspace_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_agent_thread_messages_updated_at ON agent_thread_messages;
CREATE TRIGGER trg_agent_thread_messages_updated_at
  BEFORE UPDATE ON agent_thread_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_col();

ALTER TABLE agent_thread_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_thread_messages_select ON agent_thread_messages;
CREATE POLICY agent_thread_messages_select ON agent_thread_messages
  FOR SELECT USING (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS agent_thread_messages_insert ON agent_thread_messages;
CREATE POLICY agent_thread_messages_insert ON agent_thread_messages
  FOR INSERT WITH CHECK (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS agent_thread_messages_update ON agent_thread_messages;
CREATE POLICY agent_thread_messages_update ON agent_thread_messages
  FOR UPDATE USING (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS agent_thread_messages_delete ON agent_thread_messages;
CREATE POLICY agent_thread_messages_delete ON agent_thread_messages
  FOR DELETE USING (foco_user_has_workspace_access(workspace_id));

-- ---------------------------------------------------------------------------
-- 3. Workspace connectors
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workspace_agent_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('slack', 'mail', 'gmail')),
  label text NOT NULL,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'paused', 'error', 'disconnected')),
  capabilities text[] NOT NULL DEFAULT '{}'::text[],
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE workspace_agent_connectors IS 'Workspace-level external connectors that agents may use through governed tools.';

CREATE INDEX IF NOT EXISTS idx_workspace_agent_connectors_workspace
  ON workspace_agent_connectors (workspace_id, provider, created_at DESC);

DROP TRIGGER IF EXISTS trg_workspace_agent_connectors_updated_at ON workspace_agent_connectors;
CREATE TRIGGER trg_workspace_agent_connectors_updated_at
  BEFORE UPDATE ON workspace_agent_connectors
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_col();

ALTER TABLE workspace_agent_connectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_agent_connectors_select ON workspace_agent_connectors;
CREATE POLICY workspace_agent_connectors_select ON workspace_agent_connectors
  FOR SELECT USING (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS workspace_agent_connectors_insert ON workspace_agent_connectors;
CREATE POLICY workspace_agent_connectors_insert ON workspace_agent_connectors
  FOR INSERT WITH CHECK (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS workspace_agent_connectors_update ON workspace_agent_connectors;
CREATE POLICY workspace_agent_connectors_update ON workspace_agent_connectors
  FOR UPDATE USING (foco_user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS workspace_agent_connectors_delete ON workspace_agent_connectors;
CREATE POLICY workspace_agent_connectors_delete ON workspace_agent_connectors
  FOR DELETE USING (foco_user_has_workspace_access(workspace_id));
