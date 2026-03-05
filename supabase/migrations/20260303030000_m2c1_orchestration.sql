-- m2c1 Orchestration Module - 12-Phase Workflow Engine
-- Migration created: 2026-03-03

-- ============================================
-- orchestration_workflows table
-- ============================================
CREATE TABLE orchestration_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES foco_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'running', 'paused', 'complete', 'failed')),
  current_phase_idx integer NOT NULL DEFAULT 0,
  context_accumulator jsonb DEFAULT '{}',
  total_cost_usd decimal(10,6) DEFAULT 0,
  total_tokens_in integer DEFAULT 0,
  total_tokens_out integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- workflow_phases table
-- ============================================
CREATE TABLE workflow_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES orchestration_workflows(id) ON DELETE CASCADE,
  phase_type text NOT NULL CHECK (phase_type IN ('brain_dump', 'prd', 'research', 'discovery', 'architecture', 'implementation', 'testing', 'review', 'documentation', 'deployment', 'monitoring', 'retrospective')),
  phase_idx integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'complete', 'skipped', 'failed')),
  result jsonb,
  artifact jsonb,
  tokens_in integer DEFAULT 0,
  tokens_out integer DEFAULT 0,
  cost_usd decimal(10,6) DEFAULT 0,
  model text,
  started_at timestamptz,
  completed_at timestamptz,
  UNIQUE(workflow_id, phase_idx)
);

-- ============================================
-- phase_tasks table (for sharded phases)
-- ============================================
CREATE TABLE phase_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid NOT NULL REFERENCES workflow_phases(id) ON DELETE CASCADE,
  shard_idx integer DEFAULT 0,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'complete', 'failed')),
  result jsonb,
  external_run_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_orchestration_workflows_project ON orchestration_workflows(project_id);
CREATE INDEX idx_orchestration_workflows_status ON orchestration_workflows(status);
CREATE INDEX idx_workflow_phases_workflow ON workflow_phases(workflow_id);
CREATE INDEX idx_phase_tasks_phase ON phase_tasks(phase_id);

-- ============================================
-- RLS policies
-- ============================================
ALTER TABLE orchestration_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_tasks ENABLE ROW LEVEL SECURITY;

-- orchestration_workflows: owner can do all
CREATE POLICY orchestration_workflows_owner ON orchestration_workflows FOR ALL USING (
  EXISTS (SELECT 1 FROM foco_projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
);

-- workflow_phases: owner through workflow can do all
CREATE POLICY workflow_phases_owner ON workflow_phases FOR ALL USING (
  EXISTS (
    SELECT 1 FROM orchestration_workflows w 
    JOIN foco_projects p ON w.project_id = p.id 
    WHERE w.id = workflow_id AND p.owner_id = auth.uid()
  )
);

-- phase_tasks: owner through phase->workflow can do all
CREATE POLICY phase_tasks_owner ON phase_tasks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workflow_phases ph
    JOIN orchestration_workflows w ON ph.workflow_id = w.id
    JOIN foco_projects p ON w.project_id = p.id
    WHERE ph.id = phase_id AND p.owner_id = auth.uid()
  )
);

-- ============================================
-- Updated at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_orchestration_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orchestration_workflows_updated_at
  BEFORE UPDATE ON orchestration_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_orchestration_workflows_updated_at();

-- ============================================
-- Phase tasks updated at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_phase_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_phase_tasks_updated_at
  BEFORE UPDATE ON phase_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_phase_tasks_updated_at();

-- ============================================
-- Comment documenting the 12 phases
-- ============================================
COMMENT ON TABLE orchestration_workflows IS 'm2c1 12-Phase Workflow Engine - manages multi-phase AI orchestration workflows';
COMMENT ON TABLE workflow_phases IS 'Individual phases within a workflow (brain_dump, prd, research, discovery, architecture, implementation, testing, review, documentation, deployment, monitoring, retrospective)';
COMMENT ON TABLE phase_tasks IS 'Parallel tasks for sharded phases within a workflow phase';
