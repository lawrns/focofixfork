-- Add cost and token tracking columns to runs and run_steps
-- Part of the audit remediation plan

ALTER TABLE runs
  ADD COLUMN IF NOT EXISTS tokens_in int,
  ADD COLUMN IF NOT EXISTS tokens_out int,
  ADD COLUMN IF NOT EXISTS cost_usd numeric(10,6);

ALTER TABLE run_steps
  ADD COLUMN IF NOT EXISTS tokens_in int,
  ADD COLUMN IF NOT EXISTS tokens_out int;
