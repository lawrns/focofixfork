-- Migration: Proposals Feature
-- Creates tables for AI-powered project change proposals with review workflow
-- Includes proposals, proposal items, discussions, and impact summaries

-- ====================
-- PART 1: Main proposals table
-- ====================

CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES foco_projects(id) ON DELETE CASCADE,

  -- Basic info
  title text NOT NULL,
  description text,

  -- Status tracking
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'pending_review',
    'approved',
    'rejected',
    'partially_approved',
    'archived'
  )),

  -- User tracking
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Source information
  source_type text NOT NULL CHECK (source_type IN ('voice', 'text', 'file', 'api')),
  source_content jsonb DEFAULT '{}'::jsonb,
  base_snapshot_at timestamptz,

  -- AI analysis
  ai_analysis jsonb DEFAULT '{}'::jsonb,

  -- Approval configuration
  approval_config jsonb DEFAULT '{}'::jsonb,

  -- Timeline
  submitted_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for proposals
CREATE INDEX IF NOT EXISTS proposals_workspace_id_idx ON proposals(workspace_id);
CREATE INDEX IF NOT EXISTS proposals_project_id_idx ON proposals(project_id);
CREATE INDEX IF NOT EXISTS proposals_created_by_idx ON proposals(created_by);
CREATE INDEX IF NOT EXISTS proposals_approver_id_idx ON proposals(approver_id);
CREATE INDEX IF NOT EXISTS proposals_status_idx ON proposals(status);
CREATE INDEX IF NOT EXISTS proposals_source_type_idx ON proposals(source_type);
CREATE INDEX IF NOT EXISTS proposals_created_at_idx ON proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS proposals_submitted_at_idx ON proposals(submitted_at DESC) WHERE submitted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS proposals_resolved_at_idx ON proposals(resolved_at DESC) WHERE resolved_at IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS proposals_workspace_status_idx ON proposals(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS proposals_project_status_idx ON proposals(project_id, status, created_at DESC);

-- ====================
-- PART 2: Proposal items table
-- ====================

CREATE TABLE IF NOT EXISTS proposal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,

  -- Action details
  action text NOT NULL CHECK (action IN ('add', 'modify', 'remove')),
  entity_type text NOT NULL CHECK (entity_type IN ('task', 'milestone', 'assignment', 'dependency')),
  entity_id uuid,

  -- State tracking
  original_state jsonb DEFAULT '{}'::jsonb,
  proposed_state jsonb DEFAULT '{}'::jsonb,

  -- AI insights
  ai_estimate jsonb DEFAULT '{}'::jsonb,
  ai_assignment jsonb DEFAULT '{}'::jsonb,

  -- Approval tracking
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN (
    'pending',
    'approved',
    'rejected',
    'needs_discussion'
  )),
  reviewer_notes text,

  -- Ordering
  position integer NOT NULL DEFAULT 0,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for proposal_items
CREATE INDEX IF NOT EXISTS proposal_items_proposal_id_idx ON proposal_items(proposal_id);
CREATE INDEX IF NOT EXISTS proposal_items_entity_type_idx ON proposal_items(entity_type);
CREATE INDEX IF NOT EXISTS proposal_items_entity_id_idx ON proposal_items(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS proposal_items_approval_status_idx ON proposal_items(approval_status);
CREATE INDEX IF NOT EXISTS proposal_items_position_idx ON proposal_items(proposal_id, position);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS proposal_items_proposal_action_idx ON proposal_items(proposal_id, action);
CREATE INDEX IF NOT EXISTS proposal_items_proposal_status_idx ON proposal_items(proposal_id, approval_status);

-- ====================
-- PART 3: Proposal discussions table
-- ====================

CREATE TABLE IF NOT EXISTS proposal_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  item_id uuid REFERENCES proposal_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Discussion content
  content text NOT NULL,
  is_resolution boolean NOT NULL DEFAULT false,

  -- Timestamp
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for proposal_discussions
CREATE INDEX IF NOT EXISTS proposal_discussions_proposal_id_idx ON proposal_discussions(proposal_id, created_at);
CREATE INDEX IF NOT EXISTS proposal_discussions_item_id_idx ON proposal_discussions(item_id, created_at) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS proposal_discussions_user_id_idx ON proposal_discussions(user_id);
CREATE INDEX IF NOT EXISTS proposal_discussions_created_at_idx ON proposal_discussions(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS proposal_discussions_proposal_resolution_idx ON proposal_discussions(proposal_id, is_resolution) WHERE is_resolution = true;

-- ====================
-- PART 4: Proposal impact summary table
-- ====================

CREATE TABLE IF NOT EXISTS proposal_impact_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL UNIQUE REFERENCES proposals(id) ON DELETE CASCADE,

  -- Task impact metrics
  total_tasks_added integer NOT NULL DEFAULT 0,
  total_tasks_modified integer NOT NULL DEFAULT 0,
  total_tasks_removed integer NOT NULL DEFAULT 0,

  -- Time impact metrics
  total_hours_added numeric(10, 2) NOT NULL DEFAULT 0,
  total_hours_removed numeric(10, 2) NOT NULL DEFAULT 0,

  -- Complex impacts
  workload_shifts jsonb DEFAULT '{}'::jsonb,
  deadline_impacts jsonb DEFAULT '{}'::jsonb,
  resource_conflicts jsonb DEFAULT '{}'::jsonb,

  -- Risk assessment
  risk_score numeric(5, 2) NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),

  -- Calculation timestamp
  calculated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for proposal_impact_summary
CREATE INDEX IF NOT EXISTS proposal_impact_summary_proposal_id_idx ON proposal_impact_summary(proposal_id);
CREATE INDEX IF NOT EXISTS proposal_impact_summary_risk_score_idx ON proposal_impact_summary(risk_score DESC);
CREATE INDEX IF NOT EXISTS proposal_impact_summary_calculated_at_idx ON proposal_impact_summary(calculated_at DESC);

-- ====================
-- PART 5: Triggers for updated_at timestamps
-- ====================

-- Function for proposals updated_at
CREATE OR REPLACE FUNCTION update_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS proposals_updated_at ON proposals;
CREATE TRIGGER proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_proposals_updated_at();

-- Function for proposal_items updated_at
CREATE OR REPLACE FUNCTION update_proposal_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS proposal_items_updated_at ON proposal_items;
CREATE TRIGGER proposal_items_updated_at
  BEFORE UPDATE ON proposal_items
  FOR EACH ROW
  EXECUTE FUNCTION update_proposal_items_updated_at();

-- ====================
-- PART 6: Enable RLS
-- ====================

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_impact_summary ENABLE ROW LEVEL SECURITY;

-- ====================
-- PART 7: RLS Policies for proposals
-- ====================

-- Users can view proposals in workspaces they're members of
DROP POLICY IF EXISTS "proposals_select_policy" ON proposals;
CREATE POLICY "proposals_select_policy"
  ON proposals
  FOR SELECT
  USING (
    workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid()))
  );

-- Users can create proposals in workspaces they're members of
DROP POLICY IF EXISTS "proposals_insert_policy" ON proposals;
CREATE POLICY "proposals_insert_policy"
  ON proposals
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid()))
  );

-- Users can update their own proposals or if they're workspace admins
DROP POLICY IF EXISTS "proposals_update_policy" ON proposals;
CREATE POLICY "proposals_update_policy"
  ON proposals
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR approver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = proposals.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- Users can delete their own proposals (only if draft), workspace admins can delete any
DROP POLICY IF EXISTS "proposals_delete_policy" ON proposals;
CREATE POLICY "proposals_delete_policy"
  ON proposals
  FOR DELETE
  USING (
    (created_by = auth.uid() AND status = 'draft')
    OR EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = proposals.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- ====================
-- PART 8: RLS Policies for proposal_items
-- ====================

-- Users can view items from proposals they can view
DROP POLICY IF EXISTS "proposal_items_select_policy" ON proposal_items;
CREATE POLICY "proposal_items_select_policy"
  ON proposal_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_items.proposal_id
        AND p.workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid()))
    )
  );

-- Users can insert items to their own proposals
DROP POLICY IF EXISTS "proposal_items_insert_policy" ON proposal_items;
CREATE POLICY "proposal_items_insert_policy"
  ON proposal_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_items.proposal_id
        AND p.created_by = auth.uid()
    )
  );

-- Users can update items in proposals they can update
DROP POLICY IF EXISTS "proposal_items_update_policy" ON proposal_items;
CREATE POLICY "proposal_items_update_policy"
  ON proposal_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_items.proposal_id
        AND (
          p.created_by = auth.uid()
          OR p.approver_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = p.workspace_id
              AND wm.user_id = auth.uid()
              AND wm.role IN ('owner', 'admin')
          )
        )
    )
  );

-- Users can delete items from proposals they can update
DROP POLICY IF EXISTS "proposal_items_delete_policy" ON proposal_items;
CREATE POLICY "proposal_items_delete_policy"
  ON proposal_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_items.proposal_id
        AND (
          p.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = p.workspace_id
              AND wm.user_id = auth.uid()
              AND wm.role IN ('owner', 'admin')
          )
        )
    )
  );

-- ====================
-- PART 9: RLS Policies for proposal_discussions
-- ====================

-- Users can view discussions from proposals they can view
DROP POLICY IF EXISTS "proposal_discussions_select_policy" ON proposal_discussions;
CREATE POLICY "proposal_discussions_select_policy"
  ON proposal_discussions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_discussions.proposal_id
        AND p.workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid()))
    )
  );

-- Users can add discussions to proposals they can view
DROP POLICY IF EXISTS "proposal_discussions_insert_policy" ON proposal_discussions;
CREATE POLICY "proposal_discussions_insert_policy"
  ON proposal_discussions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_discussions.proposal_id
        AND p.workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid()))
    )
  );

-- Users can update their own discussions
DROP POLICY IF EXISTS "proposal_discussions_update_policy" ON proposal_discussions;
CREATE POLICY "proposal_discussions_update_policy"
  ON proposal_discussions
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own discussions
DROP POLICY IF EXISTS "proposal_discussions_delete_policy" ON proposal_discussions;
CREATE POLICY "proposal_discussions_delete_policy"
  ON proposal_discussions
  FOR DELETE
  USING (user_id = auth.uid());

-- ====================
-- PART 10: RLS Policies for proposal_impact_summary
-- ====================

-- Users can view impact summaries from proposals they can view
DROP POLICY IF EXISTS "proposal_impact_summary_select_policy" ON proposal_impact_summary;
CREATE POLICY "proposal_impact_summary_select_policy"
  ON proposal_impact_summary
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_impact_summary.proposal_id
        AND p.workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid()))
    )
  );

-- Anyone who can create a proposal can create impact summary (typically via system)
DROP POLICY IF EXISTS "proposal_impact_summary_insert_policy" ON proposal_impact_summary;
CREATE POLICY "proposal_impact_summary_insert_policy"
  ON proposal_impact_summary
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_impact_summary.proposal_id
        AND p.workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid()))
    )
  );

-- Impact summaries can be updated by proposal owners or workspace admins
DROP POLICY IF EXISTS "proposal_impact_summary_update_policy" ON proposal_impact_summary;
CREATE POLICY "proposal_impact_summary_update_policy"
  ON proposal_impact_summary
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_impact_summary.proposal_id
        AND (
          p.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = p.workspace_id
              AND wm.user_id = auth.uid()
              AND wm.role IN ('owner', 'admin')
          )
        )
    )
  );

-- ====================
-- PART 11: Helper Functions
-- ====================

-- Function to calculate proposal impact summary
CREATE OR REPLACE FUNCTION calculate_proposal_impact(p_proposal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tasks_added integer;
  v_tasks_modified integer;
  v_tasks_removed integer;
  v_hours_added numeric(10, 2);
  v_hours_removed numeric(10, 2);
BEGIN
  -- Count tasks by action
  SELECT
    COUNT(*) FILTER (WHERE action = 'add' AND entity_type = 'task'),
    COUNT(*) FILTER (WHERE action = 'modify' AND entity_type = 'task'),
    COUNT(*) FILTER (WHERE action = 'remove' AND entity_type = 'task')
  INTO v_tasks_added, v_tasks_modified, v_tasks_removed
  FROM proposal_items
  WHERE proposal_id = p_proposal_id;

  -- Calculate estimated hours (from ai_estimate jsonb)
  SELECT
    COALESCE(SUM((ai_estimate->>'hours')::numeric), 0) FILTER (WHERE action = 'add'),
    COALESCE(SUM((ai_estimate->>'hours')::numeric), 0) FILTER (WHERE action = 'remove')
  INTO v_hours_added, v_hours_removed
  FROM proposal_items
  WHERE proposal_id = p_proposal_id
    AND ai_estimate->>'hours' IS NOT NULL;

  -- Insert or update impact summary
  INSERT INTO proposal_impact_summary (
    proposal_id,
    total_tasks_added,
    total_tasks_modified,
    total_tasks_removed,
    total_hours_added,
    total_hours_removed,
    calculated_at
  )
  VALUES (
    p_proposal_id,
    v_tasks_added,
    v_tasks_modified,
    v_tasks_removed,
    v_hours_added,
    v_hours_removed,
    now()
  )
  ON CONFLICT (proposal_id) DO UPDATE SET
    total_tasks_added = EXCLUDED.total_tasks_added,
    total_tasks_modified = EXCLUDED.total_tasks_modified,
    total_tasks_removed = EXCLUDED.total_tasks_removed,
    total_hours_added = EXCLUDED.total_hours_added,
    total_hours_removed = EXCLUDED.total_hours_removed,
    calculated_at = now();
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION calculate_proposal_impact(uuid) TO authenticated;

-- Function to automatically update proposal status when all items are reviewed
CREATE OR REPLACE FUNCTION update_proposal_status_from_items()
RETURNS TRIGGER AS $$
DECLARE
  v_proposal_id uuid;
  v_total_items integer;
  v_approved_items integer;
  v_rejected_items integer;
  v_pending_items integer;
BEGIN
  -- Get the proposal_id
  IF TG_OP = 'DELETE' THEN
    v_proposal_id := OLD.proposal_id;
  ELSE
    v_proposal_id := NEW.proposal_id;
  END IF;

  -- Count item statuses
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE approval_status = 'approved'),
    COUNT(*) FILTER (WHERE approval_status = 'rejected'),
    COUNT(*) FILTER (WHERE approval_status = 'pending' OR approval_status = 'needs_discussion')
  INTO v_total_items, v_approved_items, v_rejected_items, v_pending_items
  FROM proposal_items
  WHERE proposal_id = v_proposal_id;

  -- Update proposal status based on item statuses
  UPDATE proposals
  SET status = CASE
    WHEN v_pending_items > 0 THEN 'pending_review'
    WHEN v_approved_items = v_total_items THEN 'approved'
    WHEN v_rejected_items = v_total_items THEN 'rejected'
    WHEN v_approved_items > 0 AND v_rejected_items > 0 THEN 'partially_approved'
    ELSE status
  END,
  resolved_at = CASE
    WHEN v_pending_items = 0 AND resolved_at IS NULL THEN now()
    ELSE resolved_at
  END
  WHERE id = v_proposal_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update proposal status when items change
DROP TRIGGER IF EXISTS update_proposal_status_on_item_change ON proposal_items;
CREATE TRIGGER update_proposal_status_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON proposal_items
  FOR EACH ROW
  EXECUTE FUNCTION update_proposal_status_from_items();

-- ====================
-- PART 12: Comments for documentation
-- ====================

COMMENT ON TABLE proposals IS 'Stores AI-powered project change proposals with review workflow. Supports voice, text, file, and API sources.';
COMMENT ON TABLE proposal_items IS 'Individual actionable items within a proposal. Each item represents a change to tasks, milestones, assignments, or dependencies.';
COMMENT ON TABLE proposal_discussions IS 'Discussion threads for proposals and individual items. Supports collaborative review and decision-making.';
COMMENT ON TABLE proposal_impact_summary IS 'Computed impact metrics for proposals including task counts, time estimates, workload shifts, and risk scores.';

COMMENT ON COLUMN proposals.source_type IS 'Origin of the proposal: voice (from voice input), text (from chat), file (from uploaded document), api (from external system)';
COMMENT ON COLUMN proposals.source_content IS 'Raw source data: transcript for voice, message for text, file metadata for file, payload for api';
COMMENT ON COLUMN proposals.ai_analysis IS 'AI-generated analysis including sentiment, complexity, confidence scores, and extracted entities';
COMMENT ON COLUMN proposals.approval_config IS 'Configuration for approval workflow: required approvers, voting rules, deadline, etc.';

COMMENT ON COLUMN proposal_items.action IS 'Type of change: add (create new), modify (update existing), remove (delete existing)';
COMMENT ON COLUMN proposal_items.entity_type IS 'Type of entity being changed: task, milestone, assignment, or dependency';
COMMENT ON COLUMN proposal_items.ai_estimate IS 'AI-generated time estimates, effort, complexity, and confidence scores';
COMMENT ON COLUMN proposal_items.ai_assignment IS 'AI-suggested assignees based on skills, availability, and workload';

COMMENT ON FUNCTION calculate_proposal_impact(uuid) IS 'Calculates and updates impact summary for a proposal based on its items. Counts tasks, estimates hours, and computes metrics.';
COMMENT ON FUNCTION update_proposal_status_from_items() IS 'Automatically updates proposal status based on approval status of all items. Triggers on item changes.';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
