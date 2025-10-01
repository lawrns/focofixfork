-- Complete fix for all projects RLS policies
-- This ensures CREATE, READ, UPDATE, DELETE all work properly

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

-- PROJECTS TABLE POLICIES
-- SELECT: Users can view projects they created
CREATE POLICY "Users can view projects they created" ON projects
  FOR SELECT USING (created_by = auth.uid());

-- INSERT: Users can create projects (created_by must match auth.uid())
CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- UPDATE: Project creators can update their projects
CREATE POLICY "Project creators can update projects" ON projects
  FOR UPDATE USING (created_by = auth.uid());

-- DELETE: Project creators can delete their projects
CREATE POLICY "Project creators can delete projects" ON projects
  FOR DELETE USING (created_by = auth.uid());

-- PROJECT_TEAM_ASSIGNMENTS TABLE POLICIES
-- SELECT: Users can view their own team assignments
CREATE POLICY "Users can view their own team assignments" ON project_team_assignments
  FOR SELECT USING (user_id = auth.uid());

-- INSERT: Users can be added to teams
CREATE POLICY "Users can join teams" ON project_team_assignments
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can update their own assignments
CREATE POLICY "Users can update their assignments" ON project_team_assignments
  FOR UPDATE USING (user_id = auth.uid());

-- DELETE: Users can leave teams
CREATE POLICY "Users can leave teams" ON project_team_assignments
  FOR DELETE USING (user_id = auth.uid());

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON projects TO authenticated;
GRANT ALL ON project_team_assignments TO authenticated;
