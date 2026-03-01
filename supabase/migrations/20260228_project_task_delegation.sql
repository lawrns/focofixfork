-- Project/Task Delegation Pipeline Migration
-- Adds delegation fields to foco_projects and work_items tables

-- Extend foco_projects with delegation fields
ALTER TABLE foco_projects 
ADD COLUMN IF NOT EXISTS assigned_agent_pool uuid[] DEFAULT '{}'::uuid[];

ALTER TABLE foco_projects 
ADD COLUMN IF NOT EXISTS policies jsonb DEFAULT '{"auto_delegate":false,"max_concurrent_runs":3}'::jsonb;

ALTER TABLE foco_projects 
ADD COLUMN IF NOT EXISTS delegation_settings jsonb DEFAULT '{"enabled":false}'::jsonb;

-- Extend work_items (tasks) with delegation fields
ALTER TABLE work_items 
ADD COLUMN IF NOT EXISTS delegation_status text DEFAULT 'none' 
CHECK (delegation_status IN ('none', 'pending', 'delegated', 'running', 'completed', 'failed', 'cancelled'));

ALTER TABLE work_items 
ADD COLUMN IF NOT EXISTS assigned_agent text;

ALTER TABLE work_items 
ADD COLUMN IF NOT EXISTS run_id uuid REFERENCES runs(id) ON DELETE SET NULL;

ALTER TABLE work_items 
ADD COLUMN IF NOT EXISTS outputs jsonb DEFAULT '[]'::jsonb;

ALTER TABLE work_items 
ADD COLUMN IF NOT EXISTS approval_required boolean DEFAULT false;

ALTER TABLE work_items 
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE work_items 
ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_work_items_delegation_status ON work_items(delegation_status) WHERE delegation_status != 'none';
CREATE INDEX IF NOT EXISTS idx_work_items_run_id ON work_items(run_id) WHERE run_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_foco_projects_agent_pool ON foco_projects USING GIN (assigned_agent_pool);

-- Update runs table
ALTER TABLE runs ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES foco_projects(id) ON DELETE SET NULL;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_runs_project_id ON runs(project_id) WHERE project_id IS NOT NULL;

-- Create function to get project timeline
CREATE OR REPLACE FUNCTION get_project_timeline(
  p_project_id uuid,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  type text,
  timestamp timestamptz,
  entity_type text,
  entity_id text,
  title text,
  description text,
  actor_id uuid,
  actor_name text,
  metadata jsonb,
  run_id uuid,
  run_status text,
  artifact_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    le.id,
    'ledger'::text as type,
    le.timestamp,
    le.source as entity_type,
    le.context_id as entity_id,
    COALESCE(le.payload->>'title', le.type) as title,
    le.payload->>'description' as description,
    le.user_id as actor_id,
    NULL::text as actor_name,
    le.payload as metadata,
    NULL::uuid as run_id,
    NULL::text as run_status,
    0::bigint as artifact_count
  FROM ledger_events le
  WHERE le.payload->>'project_id' = p_project_id::text
  
  UNION ALL
  
  SELECT 
    r.id,
    'run'::text as type,
    COALESCE(r.started_at, r.created_at) as timestamp,
    'run'::text as entity_type,
    r.id::text as entity_id,
    COALESCE(r.summary, 'Run ' || r.runner) as title,
    r.trace->>'description' as description,
    NULL::uuid as actor_id,
    r.runner as actor_name,
    jsonb_build_object('runner', r.runner, 'status', r.status) as metadata,
    r.id as run_id,
    r.status as run_status,
    (SELECT COUNT(*) FROM artifacts a WHERE a.run_id = r.id) as artifact_count
  FROM runs r
  WHERE r.project_id = p_project_id
  
  ORDER BY timestamp DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
