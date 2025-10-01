-- Setup Row Level Security (RLS) policies for projects table
-- This ensures users can only access projects they own or are team members of

-- First, ensure RLS is enabled on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for safety)
DROP POLICY IF EXISTS "Users can view their projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Project creators and owners can update projects" ON projects;
DROP POLICY IF EXISTS "Project creators and owners can delete projects" ON projects;

-- SELECT policy: Users can view projects they created or are active team members of
CREATE POLICY "Users can view their projects" ON projects
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_team_assignments
      WHERE project_team_assignments.project_id = projects.id
      AND project_team_assignments.user_id = auth.uid()
      AND project_team_assignments.is_active = true
    )
  );

-- INSERT policy: Authenticated users can create projects
CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE policy: Project creators and team members with owner/admin roles can update
CREATE POLICY "Project creators and owners can update projects" ON projects
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_team_assignments
      WHERE project_team_assignments.project_id = projects.id
      AND project_team_assignments.user_id = auth.uid()
      AND project_team_assignments.is_active = true
      AND project_team_assignments.role IN ('owner', 'admin')
    )
  );

-- DELETE policy: Project creators and team members with owner/admin roles can delete
CREATE POLICY "Project creators and owners can delete projects" ON projects
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_team_assignments
      WHERE project_team_assignments.project_id = projects.id
      AND project_team_assignments.user_id = auth.uid()
      AND project_team_assignments.is_active = true
      AND project_team_assignments.role IN ('owner', 'admin')
    )
  );

-- Also ensure RLS is enabled on project_team_assignments table
ALTER TABLE project_team_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view project team assignments" ON project_team_assignments;
DROP POLICY IF EXISTS "Users can join project teams" ON project_team_assignments;
DROP POLICY IF EXISTS "Project owners can manage team assignments" ON project_team_assignments;

-- SELECT policy for project_team_assignments
CREATE POLICY "Users can view project team assignments" ON project_team_assignments
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_team_assignments.project_id
      AND (
        projects.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_team_assignments pta
          WHERE pta.project_id = projects.id
          AND pta.user_id = auth.uid()
          AND pta.is_active = true
          AND pta.role IN ('owner', 'admin')
        )
      )
    )
  );

-- INSERT policy for project_team_assignments (users can be added to teams)
CREATE POLICY "Users can join project teams" ON project_team_assignments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_team_assignments.project_id
      AND (
        projects.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_team_assignments pta
          WHERE pta.project_id = projects.id
          AND pta.user_id = auth.uid()
          AND pta.is_active = true
          AND pta.role IN ('owner', 'admin')
        )
      )
    )
  );

-- UPDATE policy for project_team_assignments (project owners/admins can manage roles)
CREATE POLICY "Project owners can manage team assignments" ON project_team_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_team_assignments.project_id
      AND (
        projects.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_team_assignments pta
          WHERE pta.project_id = projects.id
          AND pta.user_id = auth.uid()
          AND pta.is_active = true
          AND pta.role IN ('owner', 'admin')
        )
      )
    )
  );

-- DELETE policy for project_team_assignments
CREATE POLICY "Project owners can remove team members" ON project_team_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_team_assignments.project_id
      AND (
        projects.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_team_assignments pta
          WHERE pta.project_id = projects.id
          AND pta.user_id = auth.uid()
          AND pta.is_active = true
          AND pta.role IN ('owner', 'admin')
        )
      )
    )
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON projects TO authenticated;
GRANT ALL ON project_team_assignments TO authenticated;
