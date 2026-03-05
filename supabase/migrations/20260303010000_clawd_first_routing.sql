-- Clawd-first routing metadata and capability snapshots

ALTER TABLE pipeline_runs
  ADD COLUMN IF NOT EXISTS routing_profile_id text,
  ADD COLUMN IF NOT EXISTS provider_chain jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS plan_model_actual text,
  ADD COLUMN IF NOT EXISTS execute_model_actual text,
  ADD COLUMN IF NOT EXISTS review_model_actual text,
  ADD COLUMN IF NOT EXISTS fallbacks_triggered jsonb DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_routing_profile
  ON pipeline_runs (routing_profile_id);

CREATE TABLE IF NOT EXISTS clawd_capability_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'clawdbot',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clawd_capability_snapshots_created
  ON clawd_capability_snapshots (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clawd_capability_snapshots_source
  ON clawd_capability_snapshots (source);
