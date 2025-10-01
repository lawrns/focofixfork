-- CLEAN AND FIX RLS POLICIES
-- First drop ALL existing policies, then create clean separate policies

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_assignments ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (brute force cleanup)
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE tablename IN ('projects', 'project_team_assignments')
        AND policyname LIKE '%projects%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                      pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Drop specific policies that might exist
DROP POLICY IF EXISTS "Users manage their own projects" ON projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

DROP POLICY IF EXISTS "Users manage their own team assignments" ON project_team_assignments;
DROP POLICY IF EXISTS "Users can view their own team assignments" ON project_team_assignments;
DROP POLICY IF EXISTS "Users can join teams" ON project_team_assignments;
DROP POLICY IF EXISTS "Users can update their own assignments" ON project_team_assignments;
DROP POLICY IF EXISTS "Users can leave teams" ON project_team_assignments;

-- Now create FRESH policies
CREATE POLICY "view_own_projects" ON projects
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "create_own_projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "update_own_projects" ON projects
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "delete_own_projects" ON projects
  FOR DELETE USING (created_by = auth.uid());

-- Team assignments
CREATE POLICY "view_own_assignments" ON project_team_assignments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "create_own_assignments" ON project_team_assignments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own_assignments" ON project_team_assignments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "delete_own_assignments" ON project_team_assignments
  FOR DELETE USING (user_id = auth.uid());

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON projects TO authenticated;
GRANT ALL ON project_team_assignments TO authenticated;
