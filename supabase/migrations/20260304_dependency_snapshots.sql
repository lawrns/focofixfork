-- Dependency Snapshots and Health Monitoring
-- Tracks package dependency health for projects with package.json

-- Dependency scans table
CREATE TABLE dependency_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES foco_projects(id) ON DELETE CASCADE,
  scan_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'complete', 'failed')),
  total_deps integer DEFAULT 0,
  outdated_count integer DEFAULT 0,
  deprecated_count integer DEFAULT 0,
  unused_count integer DEFAULT 0,
  security_issues integer DEFAULT 0,
  scanned_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text
);

-- Dependency snapshots table
CREATE TABLE dependency_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES dependency_scans(id) ON DELETE CASCADE,
  package_name text NOT NULL,
  current_version text NOT NULL,
  latest_version text,
  wanted_version text,
  staleness_days integer,
  is_deprecated boolean DEFAULT false,
  is_unused boolean DEFAULT false,
  security_advisories jsonb DEFAULT '[]',
  severity text CHECK (severity IN ('critical', 'high', 'moderate', 'low', 'info')),
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_dependency_scans_project ON dependency_scans(project_id);
CREATE INDEX idx_dependency_scans_status ON dependency_scans(status);
CREATE INDEX idx_dependency_snapshots_scan ON dependency_snapshots(scan_id);
CREATE INDEX idx_dependency_snapshots_severity ON dependency_snapshots(severity);

-- RLS policies
ALTER TABLE dependency_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependency_snapshots ENABLE ROW LEVEL SECURITY;

-- Workspace-based RLS policy for dependency_scans
CREATE POLICY dependency_scans_workspace_member ON dependency_scans FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM foco_projects p
    JOIN foco_workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = project_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY dependency_scans_owner ON dependency_scans FOR ALL USING (
  EXISTS (SELECT 1 FROM foco_projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
);

-- Workspace-based RLS policy for dependency_snapshots
CREATE POLICY dependency_snapshots_workspace_member ON dependency_snapshots FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM dependency_scans s
    JOIN foco_projects p ON s.project_id = p.id
    JOIN foco_workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE s.id = scan_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY dependency_snapshots_owner ON dependency_snapshots FOR ALL USING (
  EXISTS (
    SELECT 1 FROM dependency_scans s
    JOIN foco_projects p ON s.project_id = p.id
    WHERE s.id = scan_id AND p.owner_id = auth.uid()
  )
);

-- Service role policies for automated scans
CREATE POLICY dependency_scans_service_insert ON dependency_scans FOR INSERT WITH CHECK (true);
CREATE POLICY dependency_scans_service_update ON dependency_scans FOR UPDATE USING (true);
CREATE POLICY dependency_snapshots_service_insert ON dependency_snapshots FOR INSERT WITH CHECK (true);
