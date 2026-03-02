-- CRICO Project Intelligence Tables
-- Provides AI-powered health monitoring, suggestions, and insights for projects.

-- Project health scores (calculated periodically, stored for history)
CREATE TABLE IF NOT EXISTS crico_project_health (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES foco_projects(id) ON DELETE CASCADE,
  overall_score integer NOT NULL DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
  velocity_score integer NOT NULL DEFAULT 0 CHECK (velocity_score BETWEEN 0 AND 100),
  quality_score integer NOT NULL DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 100),
  team_score integer NOT NULL DEFAULT 0 CHECK (team_score BETWEEN 0 AND 100),
  time_score integer NOT NULL DEFAULT 0 CHECK (time_score BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('healthy', 'at_risk', 'critical', 'unknown')),
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crico_project_health_project_id_idx ON crico_project_health (project_id);
CREATE INDEX IF NOT EXISTS crico_project_health_calculated_at_idx ON crico_project_health (project_id, calculated_at DESC);

-- AI-generated and rule-based suggestions for projects
CREATE TABLE IF NOT EXISTS crico_project_suggestions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES foco_projects(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN (
    'velocity', 'deadline_risk', 'workload', 'milestone',
    'task_quality', 'team_engagement', 'scope_creep', 'general'
  )),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  title text NOT NULL,
  description text NOT NULL,
  action_label text,
  action_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  dismissed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crico_project_suggestions_project_id_idx ON crico_project_suggestions (project_id);
CREATE INDEX IF NOT EXISTS crico_project_suggestions_active_idx ON crico_project_suggestions (project_id, dismissed_at)
  WHERE dismissed_at IS NULL;

-- Enable RLS
ALTER TABLE crico_project_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE crico_project_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS: workspace members can read health data for their projects
CREATE POLICY "Workspace members can read project health"
  ON crico_project_health FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM foco_projects p
      JOIN foco_workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = crico_project_health.project_id
        AND wm.user_id = auth.uid()
    )
  );

-- RLS: workspace members can read suggestions for their projects
CREATE POLICY "Workspace members can read project suggestions"
  ON crico_project_suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM foco_projects p
      JOIN foco_workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = crico_project_suggestions.project_id
        AND wm.user_id = auth.uid()
    )
  );

-- RLS: workspace admins can update (dismiss) suggestions
CREATE POLICY "Workspace members can update project suggestions"
  ON crico_project_suggestions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM foco_projects p
      JOIN foco_workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = crico_project_suggestions.project_id
        AND wm.user_id = auth.uid()
    )
  );

-- RLS: Allow service role to insert health records
CREATE POLICY "Service can insert project health"
  ON crico_project_health FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can insert project suggestions"
  ON crico_project_suggestions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can delete project suggestions"
  ON crico_project_suggestions FOR DELETE
  USING (true);
