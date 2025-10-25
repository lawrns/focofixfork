-- Migration: Fix Task Schema Consistency
-- Purpose: Fix database schema drift with frontend and API
-- Date: 2025-10-25

-- 1. Add 'blocked' status to tasks table CHECK constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked'));

-- 2. Remove reporter_id column (consolidate to created_by)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_reporter_id_fkey;
ALTER TABLE tasks DROP COLUMN IF EXISTS reporter_id;

-- 3. Add NOT NULL constraint if missing on created_by (it should already be NOT NULL)
-- Verify created_by is NOT NULL
ALTER TABLE tasks ALTER COLUMN created_by SET NOT NULL;

-- 4. Verify project_id is NOT NULL
ALTER TABLE tasks ALTER COLUMN project_id SET NOT NULL;

-- 5. Fix RLS policy for INSERT - add project_team_assignments check
DROP POLICY IF EXISTS "Users can create tasks in accessible projects" ON tasks;
CREATE POLICY "Users can create tasks in accessible projects"
  ON tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM project_team_assignments
      WHERE project_team_assignments.project_id = tasks.project_id
      AND project_team_assignments.member_id = auth.uid()
    )
  );

-- 6. Verify created_by should be set by application, not explicitly allowed in RLS
-- RLS will enforce that created_by must be current user (done in app logic)

-- Confirm changes
SELECT
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_name = 'tasks' AND column_name IN ('created_by', 'project_id', 'status')
ORDER BY ordinal_position;
