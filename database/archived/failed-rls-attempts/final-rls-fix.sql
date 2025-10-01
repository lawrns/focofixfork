-- FINAL RLS FIX - Drop and recreate INSERT policies correctly

-- Drop the broken INSERT policies
DROP POLICY "projects_insert_policy" ON projects;
DROP POLICY "assignments_insert_policy" ON project_team_assignments;

-- Recreate INSERT policies with proper WITH CHECK syntax
CREATE POLICY "projects_insert_policy" ON projects
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "assignments_insert_policy" ON project_team_assignments
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd,
       CASE WHEN qual IS NOT NULL THEN qual ELSE 'NO CONDITION - BROKEN!' END as qual_status
FROM pg_policies
WHERE tablename IN ('projects', 'project_team_assignments')
AND cmd = 'INSERT'
ORDER BY tablename, policyname;
