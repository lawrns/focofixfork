-- Add token tracking, cost, and timing columns to pipeline_runs
-- Enables real telemetry instead of string-length estimates

ALTER TABLE pipeline_runs
  ADD COLUMN IF NOT EXISTS started_at         timestamptz,
  ADD COLUMN IF NOT EXISTS planner_tokens_in  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS planner_tokens_out integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS executor_tokens_in  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS executor_tokens_out integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviewer_tokens_in  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviewer_tokens_out integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cost_usd      numeric(10, 6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS planner_ttft_ms     integer,
  ADD COLUMN IF NOT EXISTS planner_elapsed_ms  integer,
  ADD COLUMN IF NOT EXISTS executor_elapsed_ms integer,
  ADD COLUMN IF NOT EXISTS reviewer_elapsed_ms integer;
