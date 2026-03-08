-- Add project_id column to pipeline_runs
-- Referenced in /api/pipeline/stream and /api/pipeline/callback but missing from table.
-- This caused HTTP 500 "Failed to create pipeline run" when dispatching agents with a project context.

ALTER TABLE pipeline_runs
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES foco_projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS pipeline_runs_project_id_idx ON pipeline_runs (project_id) WHERE project_id IS NOT NULL;
