-- Migration: Agent Multi-Surface Execution
-- Module 8: Agent Multi-Surface Execution

-- Agent surfaces table
CREATE TABLE agent_surfaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  agent_backend text NOT NULL CHECK (agent_backend IN ('crico', 'clawdbot', 'bosun', 'openclaw')),
  surface_type text NOT NULL CHECK (surface_type IN ('browser', 'file_system', 'api', 'communication', 'calendar')),
  capabilities text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'busy', 'disabled')),
  config jsonb DEFAULT '{}',
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, surface_type)
);

-- Surface executions table
CREATE TABLE surface_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surface_id uuid NOT NULL REFERENCES agent_surfaces(id) ON DELETE CASCADE,
  agent_id text NOT NULL,
  task_id text,
  action text NOT NULL,
  input jsonb NOT NULL DEFAULT '{}',
  output jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'complete', 'failed', 'cancelled')),
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_agent_surfaces_agent ON agent_surfaces(agent_id);
CREATE INDEX idx_agent_surfaces_type ON agent_surfaces(surface_type);
CREATE INDEX idx_agent_surfaces_status ON agent_surfaces(status);
CREATE INDEX idx_surface_executions_surface ON surface_executions(surface_id);
CREATE INDEX idx_surface_executions_agent ON surface_executions(agent_id);
CREATE INDEX idx_surface_executions_task ON surface_executions(task_id);
CREATE INDEX idx_surface_executions_status ON surface_executions(status);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_agent_surfaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_surfaces_updated_at ON agent_surfaces;
CREATE TRIGGER trg_agent_surfaces_updated_at
  BEFORE UPDATE ON agent_surfaces
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_surfaces_updated_at();

-- RLS policies
ALTER TABLE agent_surfaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE surface_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_surfaces_select ON agent_surfaces FOR SELECT USING (true);
CREATE POLICY agent_surfaces_modify ON agent_surfaces FOR ALL USING (
  EXISTS (
    SELECT 1 FROM agent_surfaces s
    WHERE s.id = id AND s.agent_id LIKE '%::%' 
    AND (s.config->>'owner_id')::uuid = auth.uid()
  )
);

CREATE POLICY surface_executions_select ON surface_executions FOR SELECT USING (true);
CREATE POLICY surface_executions_insert ON surface_executions FOR INSERT WITH CHECK (true);
CREATE POLICY surface_executions_update ON surface_executions FOR UPDATE USING (true);

-- Add comment for documentation
COMMENT ON TABLE agent_surfaces IS 'Stores agent execution surfaces (browser, API, file system, etc.)';
COMMENT ON TABLE surface_executions IS 'Logs of surface action executions';
