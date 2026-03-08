-- Migration: Co-Founder Loops — scheduled autonomy loop persistence
-- Depends on: 20260307010000_cofounder_mode_v1 (set_updated_at_col),
--             20260306020000_cofounder_autonomy (autonomy_sessions),
--             20260306163000_autonomy_session_jobs (autonomy_session_jobs)

-- ============================================================
-- 1. Table: cofounder_loops
-- ============================================================

CREATE TABLE IF NOT EXISTS cofounder_loops (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id             uuid        NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,

  -- Loop identity
  loop_type                text        NOT NULL
                             CHECK (loop_type IN (
                               'morning_briefing',
                               'pr_babysitter',
                               'health_patrol',
                               'codebase_gardening',
                               'custom'
                             )),

  -- Schedule
  schedule_kind            text        NOT NULL DEFAULT 'preset'
                             CHECK (schedule_kind IN ('preset', 'cron')),
  schedule_value           text        NOT NULL,  -- preset name or 5-field cron string
  timezone                 text        NOT NULL DEFAULT 'UTC',

  -- Execution mode
  requested_execution_mode text        NOT NULL DEFAULT 'report_only'
                             CHECK (requested_execution_mode IN ('report_only', 'bounded_execution')),
  effective_execution_mode text        NOT NULL DEFAULT 'report_only'
                             CHECK (effective_execution_mode IN ('report_only', 'bounded_execution')),

  -- Backend routing
  execution_backend        text        NOT NULL DEFAULT 'clawdbot'
                             CHECK (execution_backend IN ('clawdbot', 'openclaw')),
  execution_target         jsonb       NOT NULL DEFAULT '{}'::jsonb,  -- {agentId, model, …}
  planning_agent           jsonb,                                      -- optional planning agent descriptor

  -- Scope
  selected_project_ids     uuid[]      NOT NULL DEFAULT ARRAY[]::uuid[],
  git_strategy             jsonb       NOT NULL DEFAULT '{}'::jsonb,

  -- Configuration & policy
  config                   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  policy_snapshot          jsonb       NOT NULL DEFAULT '{}'::jsonb,

  -- Lifecycle
  status                   text        NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'expired')),
  expires_at               timestamptz,
  last_tick_at             timestamptz,
  next_tick_at             timestamptz,
  active_session_id        uuid        REFERENCES autonomy_sessions(id) ON DELETE SET NULL,
  iteration_count          integer     NOT NULL DEFAULT 0,

  -- Summary / metrics
  summary                  jsonb       NOT NULL DEFAULT '{}'::jsonb,

  -- Soft-delete
  deleted_at               timestamptz,

  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE cofounder_loops IS 'Scheduled co-founder autonomy loops; each row defines a recurring loop with its schedule, execution target, and lifecycle state.';
COMMENT ON COLUMN cofounder_loops.loop_type IS 'Predefined loop archetype or "custom" for user-defined loops.';
COMMENT ON COLUMN cofounder_loops.schedule_kind IS '"preset" uses a named cadence; "cron" uses a 5-field cron expression in schedule_value.';
COMMENT ON COLUMN cofounder_loops.schedule_value IS 'Preset name (e.g. "daily_9am") or a 5-field cron string (e.g. "0 9 * * 1-5").';
COMMENT ON COLUMN cofounder_loops.requested_execution_mode IS 'Mode requested by the user at creation time.';
COMMENT ON COLUMN cofounder_loops.effective_execution_mode IS 'Mode actually applied after policy checks; may be downgraded from requested_execution_mode.';
COMMENT ON COLUMN cofounder_loops.execution_target IS 'Backend routing descriptor: {agentId, model, queue, …}.';
COMMENT ON COLUMN cofounder_loops.planning_agent IS 'Optional descriptor for the planning agent used in bounded_execution mode.';
COMMENT ON COLUMN cofounder_loops.selected_project_ids IS 'Subset of workspace projects included in this loop; empty array means all projects.';
COMMENT ON COLUMN cofounder_loops.git_strategy IS 'Git branch / PR strategy config used during bounded_execution.';
COMMENT ON COLUMN cofounder_loops.policy_snapshot IS 'Snapshot of the governing fleet policy at loop creation time.';
COMMENT ON COLUMN cofounder_loops.active_session_id IS 'Currently running autonomy session for this loop, if any.';
COMMENT ON COLUMN cofounder_loops.iteration_count IS 'Number of ticks completed since loop creation.';
COMMENT ON COLUMN cofounder_loops.next_tick_at IS 'Scheduler hint: when this loop is next due to fire.';
COMMENT ON COLUMN cofounder_loops.deleted_at IS 'Soft-delete timestamp; non-NULL rows are excluded from active queries.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cofounder_loops_scope_status
  ON cofounder_loops (user_id, workspace_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cofounder_loops_next_tick
  ON cofounder_loops (next_tick_at)
  WHERE status = 'active' AND deleted_at IS NULL AND next_tick_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cofounder_loops_active_session
  ON cofounder_loops (active_session_id)
  WHERE active_session_id IS NOT NULL;

-- ============================================================
-- 2. updated_at trigger for cofounder_loops
--    Re-use set_updated_at_col() from 20260307010000; define a
--    named wrapper so DROP TRIGGER references are unambiguous.
-- ============================================================

DROP TRIGGER IF EXISTS trg_cofounder_loops_updated_at ON cofounder_loops;
CREATE TRIGGER trg_cofounder_loops_updated_at
  BEFORE UPDATE ON cofounder_loops
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_col();

-- ============================================================
-- 3. RLS for cofounder_loops
-- ============================================================

ALTER TABLE cofounder_loops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cofounder_loops_select_own ON cofounder_loops;
CREATE POLICY cofounder_loops_select_own ON cofounder_loops
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS cofounder_loops_insert_own ON cofounder_loops;
CREATE POLICY cofounder_loops_insert_own ON cofounder_loops
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cofounder_loops_update_own ON cofounder_loops;
CREATE POLICY cofounder_loops_update_own ON cofounder_loops
  FOR UPDATE USING (user_id = auth.uid());

-- DELETE is restricted to soft-delete only (deleted_at must currently be NULL,
-- meaning this policy prevents hard-deleting already-soft-deleted rows, but
-- callers should prefer UPDATE SET deleted_at = now() over physical DELETE).
DROP POLICY IF EXISTS cofounder_loops_delete_own ON cofounder_loops;
CREATE POLICY cofounder_loops_delete_own ON cofounder_loops
  FOR DELETE USING (user_id = auth.uid() AND deleted_at IS NULL);

-- ============================================================
-- 4. Alter autonomy_sessions — add loop linkage columns
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'autonomy_sessions' AND column_name = 'loop_id'
  ) THEN
    ALTER TABLE autonomy_sessions
      ADD COLUMN loop_id uuid REFERENCES cofounder_loops(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'autonomy_sessions' AND column_name = 'iteration_number'
  ) THEN
    ALTER TABLE autonomy_sessions
      ADD COLUMN iteration_number integer;
  END IF;
END $$;

COMMENT ON COLUMN autonomy_sessions.loop_id IS 'Parent cofounder_loops row that spawned this session; NULL for ad-hoc sessions.';
COMMENT ON COLUMN autonomy_sessions.iteration_number IS 'Which loop iteration (1-based) this session represents.';

CREATE INDEX IF NOT EXISTS idx_autonomy_sessions_loop_id
  ON autonomy_sessions (loop_id)
  WHERE loop_id IS NOT NULL;

-- ============================================================
-- 5. Alter autonomy_session_jobs — add execution tracking columns
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'autonomy_session_jobs' AND column_name = 'execution_backend'
  ) THEN
    ALTER TABLE autonomy_session_jobs
      ADD COLUMN execution_backend text
        CHECK (execution_backend IN ('clawdbot', 'openclaw'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'autonomy_session_jobs' AND column_name = 'external_run_id'
  ) THEN
    ALTER TABLE autonomy_session_jobs
      ADD COLUMN external_run_id text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'autonomy_session_jobs' AND column_name = 'correlation_id'
  ) THEN
    ALTER TABLE autonomy_session_jobs
      ADD COLUMN correlation_id text;
  END IF;
END $$;

COMMENT ON COLUMN autonomy_session_jobs.execution_backend IS 'Which backend actually executed this job (clawdbot or openclaw); may differ from loop default.';
COMMENT ON COLUMN autonomy_session_jobs.external_run_id IS 'Opaque run identifier returned by the execution backend (e.g. ClawdBot task id).';
COMMENT ON COLUMN autonomy_session_jobs.correlation_id IS 'Client-generated idempotency / correlation token for callback matching.';

CREATE INDEX IF NOT EXISTS idx_autonomy_session_jobs_correlation_id
  ON autonomy_session_jobs (correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_autonomy_session_jobs_external_run_id
  ON autonomy_session_jobs (external_run_id)
  WHERE external_run_id IS NOT NULL;
