ALTER TABLE foco_workspaces
  ADD COLUMN IF NOT EXISTS agent_planning_defaults jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN foco_workspaces.agent_planning_defaults IS 'Workspace-level default planning agent roster and orchestration defaults.';
