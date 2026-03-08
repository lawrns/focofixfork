-- Migration: Agent Trust Score + Proof of Execution system
-- Depends on: 20260226_clawfusion_os (ledger_events), 20260227_ledger_scoping, autonomy_sessions

-- ============================================================
-- 1. agents — canonical agent identity registry
-- ============================================================

CREATE TABLE IF NOT EXISTS agents (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid        NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  backend       text        NOT NULL CHECK (backend IN ('crico','clawdbot','bosun','openclaw','custom')),
  agent_key     text        NOT NULL,
  display_name  text        NOT NULL,
  slug          text        NOT NULL,
  description   text,
  public_profile boolean   NOT NULL DEFAULT false,
  autonomy_tier text        NOT NULL DEFAULT 'advisor' CHECK (autonomy_tier IN ('off','advisor','bounded','near_full')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, backend, agent_key)
);

COMMENT ON TABLE agents IS 'Canonical agent identity registry bridging all backends';
COMMENT ON COLUMN agents.agent_key IS 'Bridges to agent_runtime_profiles.agent_key and agent_activity_events.agent_key';
COMMENT ON COLUMN agents.autonomy_tier IS 'Matches autonomy_sessions.mode enum: off, advisor, bounded, near_full';

CREATE INDEX IF NOT EXISTS idx_agents_workspace ON agents (workspace_id);
CREATE INDEX IF NOT EXISTS idx_agents_backend_key ON agents (backend, agent_key);
CREATE INDEX IF NOT EXISTS idx_agents_public ON agents (public_profile) WHERE public_profile = true;

DROP TRIGGER IF EXISTS trg_agents_updated_at ON agents;
CREATE TRIGGER trg_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_col();

-- ============================================================
-- 2. agent_trust_scores — live score per agent
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_trust_scores (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id              uuid        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  workspace_id          uuid        NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  score                 numeric(5,2) NOT NULL DEFAULT 50.00,
  total_iterations      integer     NOT NULL DEFAULT 0,
  successful_iterations integer     NOT NULL DEFAULT 0,
  failed_iterations     integer     NOT NULL DEFAULT 0,
  cancelled_iterations  integer     NOT NULL DEFAULT 0,
  avg_duration_ms       integer,
  last_iteration_at     timestamptz,
  revenue_correlation   numeric(5,2) NOT NULL DEFAULT 0.00,
  score_history         jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, workspace_id)
);

COMMENT ON TABLE agent_trust_scores IS 'Live trust score per agent — score starts at 50 (neutral)';

CREATE INDEX IF NOT EXISTS idx_agent_trust_scores_workspace ON agent_trust_scores (workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_trust_scores_agent ON agent_trust_scores (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_trust_scores_score ON agent_trust_scores (score DESC);

DROP TRIGGER IF EXISTS trg_agent_trust_scores_updated_at ON agent_trust_scores;
CREATE TRIGGER trg_agent_trust_scores_updated_at
  BEFORE UPDATE ON agent_trust_scores
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_col();

-- ============================================================
-- 3. agent_poe_anchors — Proof of Execution receipts
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_poe_anchors (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          uuid        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  workspace_id      uuid        NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  session_id        uuid        REFERENCES autonomy_sessions(id) ON DELETE SET NULL,
  run_id            uuid,
  ledger_event_id   uuid        REFERENCES ledger_events(id) ON DELETE SET NULL,
  ledger_hash       text,
  outcome           text        NOT NULL CHECK (outcome IN ('success','failure','partial','cancelled')),
  input_hash        text,
  output_hash       text,
  duration_ms       integer,
  score_delta       numeric(5,2),
  score_after       numeric(5,2),
  metadata          jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE agent_poe_anchors IS 'Proof of Execution receipts linked to ledger hash chain';

CREATE INDEX IF NOT EXISTS idx_poe_anchors_agent ON agent_poe_anchors (agent_id);
CREATE INDEX IF NOT EXISTS idx_poe_anchors_workspace ON agent_poe_anchors (workspace_id);
CREATE INDEX IF NOT EXISTS idx_poe_anchors_session ON agent_poe_anchors (session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_poe_anchors_created ON agent_poe_anchors (created_at DESC);

-- ============================================================
-- 4. revenue_attributions — scaffolded, Stripe wiring deferred
-- ============================================================

CREATE TABLE IF NOT EXISTS revenue_attributions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        uuid        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  workspace_id    uuid        NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  poe_anchor_id   uuid        REFERENCES agent_poe_anchors(id) ON DELETE SET NULL,
  amount_cents    integer     NOT NULL DEFAULT 0,
  currency        text        NOT NULL DEFAULT 'usd',
  stripe_event_id text,
  description     text,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE revenue_attributions IS 'Revenue attributed to agent actions — Stripe wiring deferred';

CREATE INDEX IF NOT EXISTS idx_revenue_attr_agent ON revenue_attributions (agent_id);
CREATE INDEX IF NOT EXISTS idx_revenue_attr_workspace ON revenue_attributions (workspace_id);

-- ============================================================
-- 5. autonomy_graduation_log — immutable tier change record
-- ============================================================

CREATE TABLE IF NOT EXISTS autonomy_graduation_log (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id            uuid        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  workspace_id        uuid        NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  previous_tier       text        NOT NULL CHECK (previous_tier IN ('off','advisor','bounded','near_full')),
  new_tier            text        NOT NULL CHECK (new_tier IN ('off','advisor','bounded','near_full')),
  trigger_reason      text        NOT NULL,
  trust_score_at_change numeric(5,2) NOT NULL,
  triggered_by        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE autonomy_graduation_log IS 'Immutable record of autonomy tier changes — INSERT only';

CREATE INDEX IF NOT EXISTS idx_graduation_log_agent ON autonomy_graduation_log (agent_id);
CREATE INDEX IF NOT EXISTS idx_graduation_log_workspace ON autonomy_graduation_log (workspace_id);
CREATE INDEX IF NOT EXISTS idx_graduation_log_created ON autonomy_graduation_log (created_at DESC);

-- ============================================================
-- 6. RLS policies
-- ============================================================

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_poe_anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomy_graduation_log ENABLE ROW LEVEL SECURITY;

-- agents: workspace members can read; public_profile agents readable by anyone
DROP POLICY IF EXISTS agents_select_workspace ON agents;
CREATE POLICY agents_select_workspace ON agents
  FOR SELECT USING (
    public_profile = true
    OR workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS agents_insert_workspace ON agents;
CREATE POLICY agents_insert_workspace ON agents
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS agents_update_workspace ON agents;
CREATE POLICY agents_update_workspace ON agents
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );

-- agent_trust_scores: workspace members can read
DROP POLICY IF EXISTS trust_scores_select ON agent_trust_scores;
CREATE POLICY trust_scores_select ON agent_trust_scores
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS trust_scores_insert ON agent_trust_scores;
CREATE POLICY trust_scores_insert ON agent_trust_scores
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS trust_scores_update ON agent_trust_scores;
CREATE POLICY trust_scores_update ON agent_trust_scores
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );

-- agent_poe_anchors: workspace members can read
DROP POLICY IF EXISTS poe_anchors_select ON agent_poe_anchors;
CREATE POLICY poe_anchors_select ON agent_poe_anchors
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS poe_anchors_insert ON agent_poe_anchors;
CREATE POLICY poe_anchors_insert ON agent_poe_anchors
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );

-- revenue_attributions: workspace members can read
DROP POLICY IF EXISTS revenue_attr_select ON revenue_attributions;
CREATE POLICY revenue_attr_select ON revenue_attributions
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS revenue_attr_insert ON revenue_attributions;
CREATE POLICY revenue_attr_insert ON revenue_attributions
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );

-- autonomy_graduation_log: INSERT only (no update/delete)
DROP POLICY IF EXISTS graduation_log_select ON autonomy_graduation_log;
CREATE POLICY graduation_log_select ON autonomy_graduation_log
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS graduation_log_insert ON autonomy_graduation_log;
CREATE POLICY graduation_log_insert ON autonomy_graduation_log
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );
