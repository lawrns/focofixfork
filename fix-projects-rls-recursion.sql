-- Fix RLS policies for projects tables - avoiding infinite recursion
-- This script fixes the recursive policy issue by simplifying the logic

-- First, disable RLS to clear everything
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_assignments DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (brute force approach)
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE tablename IN ('projects', 'project_team_assignments')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                      pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Now re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_assignments ENABLE ROW LEVEL SECURITY;

-- Recreate all policies for projects table
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

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

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

-- Simplified policies for project_team_assignments to avoid recursion
-- Users can see their own assignments OR assignments for projects they created
CREATE POLICY "Users can view project team assignments" ON project_team_assignments
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_team_assignments.project_id
      AND projects.created_by = auth.uid()
    )
  );

-- Users can be added to teams if they are the project creator
CREATE POLICY "Users can join project teams" ON project_team_assignments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_team_assignments.project_id
      AND projects.created_by = auth.uid()
    )
  );

-- Project creators can manage team assignments
CREATE POLICY "Project owners can manage team assignments" ON project_team_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_team_assignments.project_id
      AND projects.created_by = auth.uid()
    )
  );

-- Project creators can remove team members
CREATE POLICY "Project owners can remove team members" ON project_team_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_team_assignments.project_id
      AND projects.created_by = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON projects TO authenticated;
GRANT ALL ON project_team_assignments TO authenticated;
