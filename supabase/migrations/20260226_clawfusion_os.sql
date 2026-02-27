-- ClawFusion Sovereign OS — Migration
-- 2026-02-26
-- Note: DB uses work_items (not tasks). ledger_events, crons, email_outbox, email_templates
-- were already present. This migration adds runs, run_steps, artifacts, agent_state.

-- ─── Append-only event ledger ────────────────────────────────────────────────
-- Already exists; included for reference only (CREATE IF NOT EXISTS is idempotent)
CREATE TABLE IF NOT EXISTS ledger_events (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type           text        NOT NULL,
  source         text        NOT NULL,
  context_id     text,
  correlation_id uuid,
  causation_id   uuid,
  payload        jsonb       NOT NULL DEFAULT '{}',
  prev_hash      text,
  hash           text,
  timestamp      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ledger_events_timestamp_idx ON ledger_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS ledger_events_type_idx      ON ledger_events (type);
CREATE INDEX IF NOT EXISTS ledger_events_source_idx    ON ledger_events (source);

-- ─── Generalized cron scheduler ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crons (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  schedule    text        NOT NULL,
  enabled     bool        NOT NULL DEFAULT true,
  handler     text        NOT NULL,
  payload     jsonb       DEFAULT '{}',
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Email outbox ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_outbox (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "to"      text[]      NOT NULL,
  subject   text        NOT NULL,
  body_md   text        NOT NULL,
  status    text        NOT NULL DEFAULT 'queued',
  queued_at timestamptz NOT NULL DEFAULT now(),
  sent_at   timestamptz,
  error     text
);

CREATE TABLE IF NOT EXISTS email_templates (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  subject    text        NOT NULL,
  body_md    text        NOT NULL,
  variables  jsonb       DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Execution runs ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS runs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  runner     text        NOT NULL, -- 'bosun' | 'openclaw' | 'system' | 'cron'
  status     text        NOT NULL DEFAULT 'pending', -- pending|running|completed|failed|cancelled
  task_id    uuid        REFERENCES work_items(id) ON DELETE SET NULL,
  started_at timestamptz,
  ended_at   timestamptz,
  summary    text,
  trace      jsonb       DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS runs_status_idx   ON runs (status);
CREATE INDEX IF NOT EXISTS runs_runner_idx   ON runs (runner);
CREATE INDEX IF NOT EXISTS runs_task_id_idx  ON runs (task_id);
CREATE INDEX IF NOT EXISTS runs_created_idx  ON runs (created_at DESC);

ALTER TABLE runs ENABLE ROW LEVEL SECURITY;

-- ─── Run steps ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS run_steps (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id    uuid        NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  idx       int         NOT NULL,
  type      text        NOT NULL,
  input     jsonb       DEFAULT '{}',
  output    jsonb       DEFAULT '{}',
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS run_steps_run_id_idx ON run_steps (run_id, idx);

ALTER TABLE run_steps ENABLE ROW LEVEL SECURITY;

-- ─── Artifacts ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS artifacts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     uuid        REFERENCES runs(id) ON DELETE SET NULL,
  task_id    uuid        REFERENCES work_items(id) ON DELETE SET NULL,
  type       text        NOT NULL, -- screenshot|log|file|pdf
  uri        text        NOT NULL,
  meta       jsonb       DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS artifacts_run_id_idx  ON artifacts (run_id);
CREATE INDEX IF NOT EXISTS artifacts_task_id_idx ON artifacts (task_id);

ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

-- ─── Extend work_items with agent_state ──────────────────────────────────────
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS agent_state jsonb DEFAULT '{}';

-- ─── RLS Policies ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='runs' AND policyname='runs_authenticated') THEN
    CREATE POLICY runs_authenticated ON runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='run_steps' AND policyname='run_steps_authenticated') THEN
    CREATE POLICY run_steps_authenticated ON run_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='artifacts' AND policyname='artifacts_authenticated') THEN
    CREATE POLICY artifacts_authenticated ON artifacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
