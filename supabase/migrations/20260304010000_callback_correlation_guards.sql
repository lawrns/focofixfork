-- Strengthen callback correlation lookup paths

-- Orchestration callback correlation by external run ID
CREATE INDEX IF NOT EXISTS idx_phase_tasks_phase_external_run
  ON phase_tasks(phase_id, external_run_id)
  WHERE external_run_id IS NOT NULL;

-- Pipeline: faster callback correlation by external run IDs
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_planner_run_id
  ON pipeline_runs(planner_run_id)
  WHERE planner_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_executor_run_id
  ON pipeline_runs(executor_run_id)
  WHERE executor_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_reviewer_run_id
  ON pipeline_runs(reviewer_run_id)
  WHERE reviewer_run_id IS NOT NULL;
