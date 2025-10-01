-- TEMPORARY: Disable RLS completely for projects to test
-- This will allow any authenticated user to do anything with projects
-- We'll re-enable proper policies after confirming basic functionality

ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_assignments DISABLE ROW LEVEL SECURITY;

-- Grant full permissions to authenticated users
GRANT ALL ON projects TO authenticated;
GRANT ALL ON project_team_assignments TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
