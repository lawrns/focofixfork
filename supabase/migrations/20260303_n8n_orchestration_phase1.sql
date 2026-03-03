-- n8n orchestration phase 1 persistence alignment
-- Adds optional workflow-level metadata on automation_runs

ALTER TABLE automation_runs
  ADD COLUMN IF NOT EXISTS workflow_id text,
  ADD COLUMN IF NOT EXISTS workflow_name text,
  ADD COLUMN IF NOT EXISTS agent text,
  ADD COLUMN IF NOT EXISTS error_node text,
  ADD COLUMN IF NOT EXISTS cost_estimate_usd numeric(10,4);

CREATE INDEX IF NOT EXISTS automation_runs_workflow_id_idx
  ON automation_runs(workflow_id);

CREATE INDEX IF NOT EXISTS automation_runs_agent_idx
  ON automation_runs(agent);

CREATE INDEX IF NOT EXISTS automation_runs_status_created_idx
  ON automation_runs(status, created_at DESC);

