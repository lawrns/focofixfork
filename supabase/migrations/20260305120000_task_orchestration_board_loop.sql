-- Unified board orchestration support:
-- - project brief drafts for review-first task decomposition
-- - execution events on work items
-- - verification records before tasks can move to done

CREATE TABLE IF NOT EXISTS task_brief_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES foco_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  source_text text NOT NULL,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  draft_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score double precision NOT NULL DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'discarded')),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_execution_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id uuid NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES foco_projects(id) ON DELETE CASCADE,
  actor_type text NOT NULL DEFAULT 'system' CHECK (actor_type IN ('user', 'agent', 'system')),
  actor_id text,
  event_type text NOT NULL,
  summary text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id uuid NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES foco_projects(id) ON DELETE CASCADE,
  verification_type text NOT NULL CHECK (verification_type IN ('unit', 'integration', 'e2e', 'manual', 'smoke')),
  status text NOT NULL CHECK (status IN ('passed', 'failed', 'needs_follow_up')),
  command text,
  summary text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_brief_drafts_project_created
  ON task_brief_drafts(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_execution_events_work_item_created
  ON task_execution_events(work_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_verifications_work_item_created
  ON task_verifications(work_item_id, created_at DESC);

CREATE OR REPLACE FUNCTION update_task_brief_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_task_brief_drafts_updated_at ON task_brief_drafts;
CREATE TRIGGER trg_task_brief_drafts_updated_at
  BEFORE UPDATE ON task_brief_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_task_brief_drafts_updated_at();

ALTER TABLE task_brief_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_execution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_brief_drafts_select_own ON task_brief_drafts;
CREATE POLICY task_brief_drafts_select_own
  ON task_brief_drafts FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS task_brief_drafts_insert_own ON task_brief_drafts;
CREATE POLICY task_brief_drafts_insert_own
  ON task_brief_drafts FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS task_brief_drafts_update_own ON task_brief_drafts;
CREATE POLICY task_brief_drafts_update_own
  ON task_brief_drafts FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS task_execution_events_workspace_members ON task_execution_events;
CREATE POLICY task_execution_events_workspace_members
  ON task_execution_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM foco_workspace_members m
      WHERE m.workspace_id = task_execution_events.workspace_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS task_verifications_workspace_members ON task_verifications;
CREATE POLICY task_verifications_workspace_members
  ON task_verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM foco_workspace_members m
      WHERE m.workspace_id = task_verifications.workspace_id
        AND m.user_id = auth.uid()
    )
  );

COMMENT ON TABLE task_brief_drafts IS 'Review-first decomposition drafts for turning pasted briefs into project board tasks.';
COMMENT ON TABLE task_execution_events IS 'Timeline events for human and agent activity on work items.';
COMMENT ON TABLE task_verifications IS 'Structured verification evidence attached to work items before completion.';
