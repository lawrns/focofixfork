-- FINAL SOLUTION: Disable RLS completely for projects
-- Rely on application-level validation for security

ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_assignments DISABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT ALL ON projects TO authenticated;
GRANT ALL ON project_team_assignments TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Verify RLS is disabled (using correct column name)
SELECT schemaname, tablename,
       rowsecurity as rls_enabled,
       CASE WHEN rowsecurity THEN 'RLS ENABLED' ELSE 'RLS DISABLED - App controls security' END as security_status
FROM pg_tables
WHERE tablename IN ('projects', 'project_team_assignments')
AND schemaname = 'public';
