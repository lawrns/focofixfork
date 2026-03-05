-- Migration: Co-Founder Mode v1 canonical persistence and audits

CREATE TABLE IF NOT EXISTS cofounder_mode_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  version text NOT NULL DEFAULT 'v1',
  config jsonb NOT NULL DEFAULT '{}',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cofounder_runtime_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  autonomy_mode text NOT NULL,
  trust_score numeric(6,5) NOT NULL DEFAULT 0,
  active_initiatives jsonb NOT NULL DEFAULT '[]'::jsonb,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cofounder_decision_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  domain text NOT NULL,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  votes jsonb NOT NULL DEFAULT '[]'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric(6,5),
  divergence numeric(6,5),
  resolution text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cofounder_decisions_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  detail text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cofounder_pivotal_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  question text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_hash text NOT NULL,
  trigger_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'queued',
  delivery_state text NOT NULL DEFAULT 'queued',
  resolution text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  next_eligible_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cofounder_initiatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  lane text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  score numeric(6,5),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cofounder_initiative_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES cofounder_initiatives(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  checkpoint_at timestamptz NOT NULL DEFAULT now(),
  health text NOT NULL,
  notes text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cofounder_risk_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  technical numeric(6,5) NOT NULL,
  market numeric(6,5) NOT NULL,
  financial numeric(6,5) NOT NULL,
  legal numeric(6,5) NOT NULL,
  unified_score numeric(6,5) NOT NULL,
  risk_level text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cofounder_learning_metrics_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  month_start date NOT NULL,
  acceptance_rate numeric(6,5) NOT NULL,
  prediction_accuracy numeric(6,5) NOT NULL,
  average_minutes_saved numeric(10,2) NOT NULL,
  decision_velocity_hours numeric(10,2) NOT NULL,
  total_decisions integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, workspace_id, month_start)
);

CREATE TABLE IF NOT EXISTS cofounder_error_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  error_code text NOT NULL,
  message text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cofounder_artifact_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  artifact_type text NOT NULL,
  artifact_ref text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cofounder_mode_configs_scope_created
  ON cofounder_mode_configs (user_id, workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cofounder_runtime_state_scope
  ON cofounder_runtime_state (user_id, workspace_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_cofounder_decision_audit_scope
  ON cofounder_decision_audit (user_id, workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cofounder_decisions_history_scope
  ON cofounder_decisions_history (user_id, workspace_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cofounder_pivotal_queue_dedupe
  ON cofounder_pivotal_queue (user_id, workspace_id, dedupe_hash)
  WHERE status IN ('queued', 'notified');

CREATE INDEX IF NOT EXISTS idx_cofounder_pivotal_queue_eligible
  ON cofounder_pivotal_queue (user_id, workspace_id, next_eligible_at);

CREATE INDEX IF NOT EXISTS idx_cofounder_initiatives_scope
  ON cofounder_initiatives (user_id, workspace_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_cofounder_risk_snapshots_scope
  ON cofounder_risk_snapshots (user_id, workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cofounder_error_audit_scope
  ON cofounder_error_audit (user_id, workspace_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at_col()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cofounder_runtime_state_updated_at ON cofounder_runtime_state;
CREATE TRIGGER trg_cofounder_runtime_state_updated_at
  BEFORE UPDATE ON cofounder_runtime_state
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_col();

DROP TRIGGER IF EXISTS trg_cofounder_pivotal_queue_updated_at ON cofounder_pivotal_queue;
CREATE TRIGGER trg_cofounder_pivotal_queue_updated_at
  BEFORE UPDATE ON cofounder_pivotal_queue
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_col();

DROP TRIGGER IF EXISTS trg_cofounder_initiatives_updated_at ON cofounder_initiatives;
CREATE TRIGGER trg_cofounder_initiatives_updated_at
  BEFORE UPDATE ON cofounder_initiatives
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_col();

ALTER TABLE cofounder_mode_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cofounder_runtime_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE cofounder_decision_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE cofounder_decisions_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE cofounder_pivotal_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE cofounder_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE cofounder_initiative_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE cofounder_risk_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE cofounder_learning_metrics_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE cofounder_error_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE cofounder_artifact_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cofounder_mode_configs_select_own ON cofounder_mode_configs;
CREATE POLICY cofounder_mode_configs_select_own ON cofounder_mode_configs
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS cofounder_mode_configs_insert_own ON cofounder_mode_configs;
CREATE POLICY cofounder_mode_configs_insert_own ON cofounder_mode_configs
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cofounder_mode_configs_update_own ON cofounder_mode_configs;
CREATE POLICY cofounder_mode_configs_update_own ON cofounder_mode_configs
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS cofounder_runtime_state_rw_own ON cofounder_runtime_state;
CREATE POLICY cofounder_runtime_state_rw_own ON cofounder_runtime_state
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cofounder_decision_audit_rw_own ON cofounder_decision_audit;
CREATE POLICY cofounder_decision_audit_rw_own ON cofounder_decision_audit
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cofounder_decisions_history_rw_own ON cofounder_decisions_history;
CREATE POLICY cofounder_decisions_history_rw_own ON cofounder_decisions_history
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cofounder_pivotal_queue_rw_own ON cofounder_pivotal_queue;
CREATE POLICY cofounder_pivotal_queue_rw_own ON cofounder_pivotal_queue
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cofounder_initiatives_rw_own ON cofounder_initiatives;
CREATE POLICY cofounder_initiatives_rw_own ON cofounder_initiatives
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cofounder_initiative_checkpoints_rw_own ON cofounder_initiative_checkpoints;
CREATE POLICY cofounder_initiative_checkpoints_rw_own ON cofounder_initiative_checkpoints
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cofounder_risk_snapshots_rw_own ON cofounder_risk_snapshots;
CREATE POLICY cofounder_risk_snapshots_rw_own ON cofounder_risk_snapshots
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cofounder_learning_metrics_rw_own ON cofounder_learning_metrics_monthly;
CREATE POLICY cofounder_learning_metrics_rw_own ON cofounder_learning_metrics_monthly
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cofounder_error_audit_rw_own ON cofounder_error_audit;
CREATE POLICY cofounder_error_audit_rw_own ON cofounder_error_audit
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cofounder_artifact_state_rw_own ON cofounder_artifact_state;
CREATE POLICY cofounder_artifact_state_rw_own ON cofounder_artifact_state
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
