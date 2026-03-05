-- Migration: Co-Founder Autonomy Session Persistence

CREATE TABLE IF NOT EXISTS autonomy_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id uuid REFERENCES runs(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  objective text,
  mode text NOT NULL CHECK (mode IN ('off', 'advisor', 'bounded', 'near_full')),
  profile text NOT NULL CHECK (profile IN ('advisor_first', 'bounded_operator', 'revenue_only', 'near_full')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed', 'failed', 'cancelled')),
  timezone text NOT NULL DEFAULT 'UTC',
  window_start timestamptz NOT NULL DEFAULT now(),
  window_end timestamptz,
  config_snapshot jsonb NOT NULL DEFAULT '{}',
  summary jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS autonomy_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES autonomy_sessions(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  domain text NOT NULL,
  input jsonb NOT NULL DEFAULT '{}',
  decision jsonb NOT NULL DEFAULT '{}',
  allowed boolean NOT NULL DEFAULT false,
  requires_approval boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_autonomy_sessions_user_status ON autonomy_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_autonomy_sessions_window_start ON autonomy_sessions(window_start DESC);
CREATE INDEX IF NOT EXISTS idx_autonomy_action_logs_session ON autonomy_action_logs(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_autonomy_action_logs_user ON autonomy_action_logs(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION update_autonomy_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_autonomy_sessions_updated_at ON autonomy_sessions;
CREATE TRIGGER trg_autonomy_sessions_updated_at
  BEFORE UPDATE ON autonomy_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_autonomy_sessions_updated_at();

ALTER TABLE autonomy_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomy_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS autonomy_sessions_select_own ON autonomy_sessions;
CREATE POLICY autonomy_sessions_select_own ON autonomy_sessions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS autonomy_sessions_insert_own ON autonomy_sessions;
CREATE POLICY autonomy_sessions_insert_own ON autonomy_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS autonomy_sessions_update_own ON autonomy_sessions;
CREATE POLICY autonomy_sessions_update_own ON autonomy_sessions
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS autonomy_action_logs_select_own ON autonomy_action_logs;
CREATE POLICY autonomy_action_logs_select_own ON autonomy_action_logs
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS autonomy_action_logs_insert_own ON autonomy_action_logs;
CREATE POLICY autonomy_action_logs_insert_own ON autonomy_action_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE autonomy_sessions IS 'Durable co-founder autonomy sessions, linked to optional run records';
COMMENT ON TABLE autonomy_action_logs IS 'Policy validation and approval decisions executed during autonomy sessions';
