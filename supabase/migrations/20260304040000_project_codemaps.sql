-- Project Codemaps Table
-- Module 5: Codemap Integration - Stores parsed project file structure and dependency graphs

-- Project codemaps table
CREATE TABLE IF NOT EXISTS project_codemaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES foco_projects(id) ON DELETE CASCADE,
  structure_json jsonb NOT NULL DEFAULT '{}',
  entry_points text[] DEFAULT '{}',
  dependency_graph_mermaid text,
  stats jsonb DEFAULT '{}',
  generated_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_codemaps_project ON project_codemaps(project_id);

-- RLS policies
ALTER TABLE project_codemaps ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS project_codemaps_owner ON project_codemaps;

-- Create policy for project owners
CREATE POLICY project_codemaps_owner ON project_codemaps FOR ALL USING (
  EXISTS (SELECT 1 FROM foco_projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
);

-- Create policy for project team members
DROP POLICY IF EXISTS project_codemaps_team ON project_codemaps;

CREATE POLICY project_codemaps_team ON project_codemaps FOR ALL USING (
  EXISTS (
    SELECT 1 FROM project_team_assignments ta 
    WHERE ta.project_id = project_id 
    AND ta.user_id = auth.uid()
  )
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_codemaps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_project_codemaps_updated_at ON project_codemaps;

CREATE TRIGGER trigger_project_codemaps_updated_at
  BEFORE UPDATE ON project_codemaps
  FOR EACH ROW
  EXECUTE FUNCTION update_project_codemaps_updated_at();
