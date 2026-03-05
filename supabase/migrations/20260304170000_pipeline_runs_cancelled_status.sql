-- Allow explicit user cancellation for pipeline runs.
-- Existing status check omitted "cancelled", forcing stop actions to masquerade as "failed".

ALTER TABLE pipeline_runs
  DROP CONSTRAINT IF EXISTS pipeline_runs_status_check;

ALTER TABLE pipeline_runs
  ADD CONSTRAINT pipeline_runs_status_check
  CHECK (status IN ('planning', 'executing', 'reviewing', 'complete', 'failed', 'cancelled'));
