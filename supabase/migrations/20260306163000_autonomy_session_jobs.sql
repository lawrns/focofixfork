CREATE TABLE IF NOT EXISTS autonomy_session_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES autonomy_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  project_id uuid NOT NULL REFERENCES foco_projects(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  project_slug text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  command_job_id text,
  pipeline_run_id uuid REFERENCES pipeline_runs(id) ON DELETE SET NULL,
  report_id uuid REFERENCES reports(id) ON DELETE SET NULL,
  artifact_id uuid REFERENCES artifacts(id) ON DELETE SET NULL,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_autonomy_session_jobs_session_created ON autonomy_session_jobs(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_autonomy_session_jobs_user_created ON autonomy_session_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_autonomy_session_jobs_status ON autonomy_session_jobs(status);
CREATE INDEX IF NOT EXISTS idx_autonomy_session_jobs_pipeline_run ON autonomy_session_jobs(pipeline_run_id) WHERE pipeline_run_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_autonomy_session_jobs_report ON autonomy_session_jobs(report_id) WHERE report_id IS NOT NULL;

CREATE OR REPLACE FUNCTION update_autonomy_session_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_autonomy_session_jobs_updated_at ON autonomy_session_jobs;
CREATE TRIGGER trg_autonomy_session_jobs_updated_at
  BEFORE UPDATE ON autonomy_session_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_autonomy_session_jobs_updated_at();

ALTER TABLE autonomy_session_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS autonomy_session_jobs_select_own ON autonomy_session_jobs;
CREATE POLICY autonomy_session_jobs_select_own ON autonomy_session_jobs
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS autonomy_session_jobs_insert_own ON autonomy_session_jobs;
CREATE POLICY autonomy_session_jobs_insert_own ON autonomy_session_jobs
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS autonomy_session_jobs_update_own ON autonomy_session_jobs;
CREATE POLICY autonomy_session_jobs_update_own ON autonomy_session_jobs
  FOR UPDATE USING (user_id = auth.uid());

COMMENT ON TABLE autonomy_session_jobs IS 'Per-project durable output tracking for night autonomy sessions.';
COMMENT ON COLUMN autonomy_session_jobs.command_job_id IS 'Optional command-surface stream job id for replaying pipeline progress.';
COMMENT ON COLUMN autonomy_session_jobs.pipeline_run_id IS 'Linked pipeline run generated for this project report.';
