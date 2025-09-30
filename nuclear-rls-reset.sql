-- NUCLEAR RESET - Complete RLS wipe and rebuild
-- This will completely reset all RLS policies

-- STEP 1: Disable RLS completely
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_assignments DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop EVERY SINGLE policy on these tables
DO $$
DECLARE
    pol record;
BEGIN
    RAISE NOTICE 'Dropping all policies on projects and project_team_assignments...';

    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE tablename IN ('projects', 'project_team_assignments')
    LOOP
        RAISE NOTICE 'Dropping policy: % on %.%', pol.policyname, pol.schemaname, pol.tablename;
        EXECUTE format('DROP POLICY %I ON %I.%I',
                      pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;

    RAISE NOTICE 'All policies dropped successfully';
END $$;

-- STEP 3: Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_assignments ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create working policies with unique names
CREATE POLICY "projects_select_policy" ON projects
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "projects_insert_policy" ON projects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "projects_update_policy" ON projects
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "projects_delete_policy" ON projects
  FOR DELETE USING (created_by = auth.uid());

-- Team assignments policies
CREATE POLICY "assignments_select_policy" ON project_team_assignments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "assignments_insert_policy" ON project_team_assignments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "assignments_update_policy" ON project_team_assignments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "assignments_delete_policy" ON project_team_assignments
  FOR DELETE USING (user_id = auth.uid());

-- STEP 5: Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON projects TO authenticated;
GRANT ALL ON project_team_assignments TO authenticated;

-- STEP 6: Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('projects', 'project_team_assignments')
ORDER BY tablename, policyname;
