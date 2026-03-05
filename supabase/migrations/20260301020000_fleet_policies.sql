-- Fleet policies table for AI governance rules
CREATE TABLE IF NOT EXISTS fleet_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  scope text NOT NULL DEFAULT 'global', -- 'global' | 'project'
  trigger_condition text NOT NULL,      -- 'before_delete' | 'before_deploy' | 'high_cost_run' | etc.
  action text NOT NULL,                 -- 'require_approval' | 'block' | 'notify'
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE fleet_policies ENABLE ROW LEVEL SECURITY;

-- Allow workspace members to read policies
CREATE POLICY "workspace_members_read_policies" ON fleet_policies
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    OR workspace_id IS NULL
  );

-- Allow workspace admins/owners to create/update policies
CREATE POLICY "workspace_admins_manage_policies" ON fleet_policies
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR workspace_id IS NULL
  );
