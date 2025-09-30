-- FINAL WORKING RLS POLICIES
-- Separate policies for each operation to avoid conflicts

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_assignments ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "Users manage their own projects" ON projects;
DROP POLICY IF EXISTS "Users manage their own team assignments" ON project_team_assignments;

-- PROJECTS POLICIES (separate for each operation)
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (created_by = auth.uid());

-- TEAM ASSIGNMENTS POLICIES
CREATE POLICY "Users can view their own team assignments" ON project_team_assignments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can join teams" ON project_team_assignments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own assignments" ON project_team_assignments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can leave teams" ON project_team_assignments
  FOR DELETE USING (user_id = auth.uid());

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON projects TO authenticated;
GRANT ALL ON project_team_assignments TO authenticated;
