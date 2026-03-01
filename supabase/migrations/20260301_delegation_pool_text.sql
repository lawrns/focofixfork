-- Fix assigned_agent_pool column type and add handbook_ref to work_items
-- Part of the audit remediation plan

ALTER TABLE foco_projects
  ALTER COLUMN assigned_agent_pool TYPE text[] USING assigned_agent_pool::text[];

ALTER TABLE work_items
  ADD COLUMN IF NOT EXISTS handbook_ref text;
