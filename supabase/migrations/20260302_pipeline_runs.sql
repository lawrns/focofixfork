-- Pipeline runs table for Tri-Model AI Engineering Pipeline
-- Phase: plan (Claude) → execute (Kimi) → review (Codex) + handbook sync

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES auth.users ON DELETE SET NULL,
  workspace_id        uuid,
  task_description    text NOT NULL,
  planner_model       text NOT NULL DEFAULT 'claude-opus-4-6',
  executor_model      text NOT NULL DEFAULT 'kimi-k2-standard',
  reviewer_model      text,
  status              text NOT NULL DEFAULT 'planning'
                      CHECK (status IN ('planning','executing','reviewing','complete','failed')),
  plan_result         jsonb,
  execution_result    jsonb,
  review_result       jsonb,
  files_changed       text[],
  db_changes          boolean DEFAULT false,
  handbook_ref        text,
  auto_reviewed       boolean DEFAULT false,
  -- ClawdBot run IDs for callback routing
  planner_run_id      text,
  executor_run_id     text,
  reviewer_run_id     text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_user    ON pipeline_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status  ON pipeline_runs(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_created ON pipeline_runs(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_pipeline_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pipeline_runs_updated_at
  BEFORE UPDATE ON pipeline_runs
  FOR EACH ROW EXECUTE FUNCTION update_pipeline_runs_updated_at();

ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own pipeline runs"
  ON pipeline_runs FOR ALL
  USING (auth.uid() = user_id);
