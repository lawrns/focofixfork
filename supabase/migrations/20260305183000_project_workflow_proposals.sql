CREATE TABLE IF NOT EXISTS project_workflow_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES foco_projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  source_template_id text NOT NULL,
  owner_agent text NOT NULL,
  risk_tier text NOT NULL DEFAULT 'low',
  summary text NOT NULL,
  trigger_label text NOT NULL,
  step_labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  external_effects jsonb NOT NULL DEFAULT '[]'::jsonb,
  workflow_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  suggested_add_ons jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_add_ons jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  approver_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  n8n_workflow_id text,
  automation_job_id uuid REFERENCES automation_jobs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_workflow_proposals_project_id_idx
  ON project_workflow_proposals(project_id);

CREATE INDEX IF NOT EXISTS project_workflow_proposals_workspace_id_idx
  ON project_workflow_proposals(workspace_id);

CREATE INDEX IF NOT EXISTS project_workflow_proposals_status_idx
  ON project_workflow_proposals(status);

ALTER TABLE project_workflow_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_workflow_proposals_select ON project_workflow_proposals
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY project_workflow_proposals_insert ON project_workflow_proposals
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY project_workflow_proposals_update ON project_workflow_proposals
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM foco_workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION update_project_workflow_proposals_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_project_workflow_proposals_updated_at ON project_workflow_proposals;
CREATE TRIGGER update_project_workflow_proposals_updated_at
  BEFORE UPDATE ON project_workflow_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_project_workflow_proposals_updated_at();
