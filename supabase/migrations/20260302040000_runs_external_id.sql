-- Add external_run_id to runs table for tracking ClawdBot dispatch references
ALTER TABLE runs ADD COLUMN IF NOT EXISTS external_run_id text;
CREATE INDEX IF NOT EXISTS idx_runs_external_run_id ON runs(external_run_id);
