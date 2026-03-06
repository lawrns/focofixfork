-- Migration: structured project report artifacts

ALTER TABLE artifacts
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES foco_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_id uuid REFERENCES reports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS artifact_kind text NOT NULL DEFAULT 'run_attachment',
  ADD COLUMN IF NOT EXISTS title text;

CREATE INDEX IF NOT EXISTS artifacts_workspace_id_idx ON artifacts (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS artifacts_project_id_idx ON artifacts (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS artifacts_report_id_idx ON artifacts (report_id) WHERE report_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS artifacts_artifact_kind_idx ON artifacts (artifact_kind, created_at DESC);
