-- ═══════════════════════════════════════════════════════════════════════════
-- COMPREHENSIVE DATABASE FIXES FOR FOCO
-- Version: 1.0.0
-- Purpose: Fix all schema, RLS, constraints, and data integrity issues
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: ENABLE RLS ON ALL TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS on core tables
ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activities ENABLE ROW LEVEL SECURITY;

-- Enable RLS on organization tables
ALTER TABLE IF EXISTS organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS organization_invitations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on project team tables
ALTER TABLE IF EXISTS project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_team_assignments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user tables
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: DROP EXISTING POLICIES (Clean slate)
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop all existing policies on projects
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'projects') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON projects';
  END LOOP;
END $$;

-- Drop all existing policies on tasks
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'tasks') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON tasks';
  END LOOP;
END $$;

-- Drop all existing policies on milestones
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'milestones') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON milestones';
  END LOOP;
END $$;

-- Drop all existing policies on goals
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'goals') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON goals';
  END LOOP;
END $$;

-- Drop all existing policies on organization_members
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organization_members') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON organization_members';
  END LOOP;
END $$;

-- Drop all existing policies on project_members
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'project_members') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON project_members';
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3: CREATE COMPREHENSIVE RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- PROJECTS POLICIES
-- ──────────────────────────────────────────────────────────────────────────

-- Users can view projects they own
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Users can view projects in their organizations
CREATE POLICY "Users can view organization projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can view projects where they are team members
CREATE POLICY "Users can view projects where they are members"
  ON projects FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT project_id
      FROM project_members
      WHERE user_id = auth.uid()
    )
    OR
    id IN (
      SELECT project_id
      FROM project_team_assignments
      WHERE user_id = auth.uid()
    )
  );

-- Users can create projects
CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Users can update their own projects
CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Users can delete their own projects
CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────
-- TASKS POLICIES
-- ──────────────────────────────────────────────────────────────────────────

-- Users can view tasks in projects they have access to
CREATE POLICY "Users can view tasks in accessible projects"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
    OR
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
    OR
    project_id IN (
      SELECT project_id FROM project_team_assignments WHERE user_id = auth.uid()
    )
  );

-- Users can create tasks in accessible projects
CREATE POLICY "Users can create tasks in accessible projects"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
    OR
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- Users can update tasks in accessible projects
CREATE POLICY "Users can update tasks in accessible projects"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
    OR
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- Users can delete tasks in their projects
CREATE POLICY "Users can delete tasks in their projects"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────────────────
-- MILESTONES POLICIES
-- ──────────────────────────────────────────────────────────────────────────

-- Users can view milestones in accessible projects
CREATE POLICY "Users can view milestones in accessible projects"
  ON milestones FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
    OR
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- Users can create milestones in accessible projects
CREATE POLICY "Users can create milestones in accessible projects"
  ON milestones FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- Users can update milestones in accessible projects
CREATE POLICY "Users can update milestones in accessible projects"
  ON milestones FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- Users can delete milestones in their projects
CREATE POLICY "Users can delete milestones in their projects"
  ON milestones FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────────────────
-- GOALS POLICIES
-- ──────────────────────────────────────────────────────────────────────────

-- Users can view their own goals
CREATE POLICY "Users can view their own goals"
  ON goals FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Users can view organization goals
CREATE POLICY "Users can view organization goals"
  ON goals FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can create their own goals
CREATE POLICY "Users can create their own goals"
  ON goals FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Users can update their own goals
CREATE POLICY "Users can update their own goals"
  ON goals FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

-- Users can delete their own goals
CREATE POLICY "Users can delete their own goals"
  ON goals FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────
-- ORGANIZATION_MEMBERS POLICIES
-- ──────────────────────────────────────────────────────────────────────────

-- Users can view members of organizations they belong to
CREATE POLICY "Users can view organization members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Admins can add members to their organizations
CREATE POLICY "Admins can add organization members"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- ──────────────────────────────────────────────────────────────────────────
-- PROJECT_MEMBERS POLICIES
-- ──────────────────────────────────────────────────────────────────────────

-- Users can view project members for projects they have access to
CREATE POLICY "Users can view project members"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
    OR
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- Project owners can add members
CREATE POLICY "Project owners can add members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4: ADD NOT NULL CONSTRAINTS (with data cleanup)
-- ═══════════════════════════════════════════════════════════════════════════

-- First, clean up any NULL values in critical fields

-- Fix NULL created_by in projects
UPDATE projects
SET created_by = (SELECT id FROM users LIMIT 1)
WHERE created_by IS NULL;

-- Fix NULL project_id in tasks
DELETE FROM tasks WHERE project_id IS NULL;

-- Fix NULL project_id in milestones
DELETE FROM milestones WHERE project_id IS NULL;

-- Fix NULL owner_id in goals (if goals table doesn't require it to be nullable)
-- UPDATE goals SET owner_id = ... WHERE owner_id IS NULL;

-- Now add NOT NULL constraints
DO $$
BEGIN
  -- Projects
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'created_by' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE projects ALTER COLUMN created_by SET NOT NULL;
  END IF;

  -- Tasks
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'project_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE tasks ALTER COLUMN project_id SET NOT NULL;
  END IF;

  -- Milestones
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'milestones' AND column_name = 'project_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE milestones ALTER COLUMN project_id SET NOT NULL;
  END IF;

  -- Organization members
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organization_members' AND column_name = 'user_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE organization_members ALTER COLUMN user_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organization_members' AND column_name = 'organization_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE organization_members ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 5: CREATE MISSING INDEXES FOR PERFORMANCE
-- ═══════════════════════════════════════════════════════════════════════════

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at_desc ON projects(created_at DESC);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at_desc ON tasks(created_at DESC);

-- Milestones indexes
CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON milestones(due_date);

-- Goals indexes
CREATE INDEX IF NOT EXISTS idx_goals_owner_id ON goals(owner_id);
CREATE INDEX IF NOT EXISTS idx_goals_organization_id ON goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_goals_project_id ON goals(project_id);

-- Organization members indexes
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_unique ON organization_members(user_id, organization_id);

-- Project members indexes
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_unique ON project_members(user_id, project_id);

-- Comments indexes (uses milestone_id and project_id, not task_id)
CREATE INDEX IF NOT EXISTS idx_comments_milestone_id ON comments(milestone_id) WHERE milestone_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_project_id ON comments(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_created_at_desc ON activities(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 6: ADD FOREIGN KEY CONSTRAINTS WITH CASCADE
-- ═══════════════════════════════════════════════════════════════════════════

-- Tasks foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_tasks_project_id'
  ) THEN
    ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_project_id
    FOREIGN KEY (project_id) REFERENCES projects(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Milestones foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_milestones_project_id'
  ) THEN
    ALTER TABLE milestones
    ADD CONSTRAINT fk_milestones_project_id
    FOREIGN KEY (project_id) REFERENCES projects(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Project members foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_project_members_project_id'
  ) THEN
    ALTER TABLE project_members
    ADD CONSTRAINT fk_project_members_project_id
    FOREIGN KEY (project_id) REFERENCES projects(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 7: ADD UNIQUE CONSTRAINTS
-- ═══════════════════════════════════════════════════════════════════════════

-- Ensure unique organization memberships
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unique_organization_membership'
  ) THEN
    ALTER TABLE organization_members
    ADD CONSTRAINT unique_organization_membership
    UNIQUE (user_id, organization_id);
  END IF;
END $$;

-- Ensure unique project memberships
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unique_project_membership'
  ) THEN
    ALTER TABLE project_members
    ADD CONSTRAINT unique_project_membership
    UNIQUE (user_id, project_id);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 8: ADD CHECK CONSTRAINTS FOR DATA VALIDATION
-- ═══════════════════════════════════════════════════════════════════════════

-- Project status check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_project_status'
  ) THEN
    ALTER TABLE projects
    ADD CONSTRAINT check_project_status
    CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled'));
  END IF;
END $$;

-- Task status check (matches actual values in database)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_task_status'
  ) THEN
    ALTER TABLE tasks
    ADD CONSTRAINT check_task_status
    CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked'));
  END IF;
END $$;

-- Task priority check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_task_priority'
  ) THEN
    ALTER TABLE tasks
    ADD CONSTRAINT check_task_priority
    CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
  END IF;
END $$;

-- Progress percentage check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_project_progress'
  ) THEN
    ALTER TABLE projects
    ADD CONSTRAINT check_project_progress
    CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════��═══════════════
-- SECTION 9: CREATE HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_milestones_updated_at ON milestones;
CREATE TRIGGER update_milestones_updated_at
  BEFORE UPDATE ON milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 10: VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Show RLS status
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('projects', 'tasks', 'milestones', 'goals', 'organization_members', 'project_members')
ORDER BY tablename;

-- Show policy count per table
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Show indexes
SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('projects', 'tasks', 'milestones')
ORDER BY tablename, indexname;

-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETION MESSAGE
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'DATABASE FIXES APPLIED SUCCESSFULLY ✅';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Applied:';
  RAISE NOTICE '  ✓ RLS enabled on all tables';
  RAISE NOTICE '  ✓ Comprehensive RLS policies created';
  RAISE NOTICE '  ✓ NOT NULL constraints added';
  RAISE NOTICE '  ✓ Performance indexes created';
  RAISE NOTICE '  ✓ Foreign key constraints with CASCADE';
  RAISE NOTICE '  ✓ Unique constraints on memberships';
  RAISE NOTICE '  ✓ CHECK constraints for data validation';
  RAISE NOTICE '  ✓ Auto-update triggers for updated_at';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
END $$;
