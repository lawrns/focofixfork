/**
 * Phase 3 Migration - Phase 4: Simplify Project Members
 *
 * Purpose: Convert project_members table to array in projects table
 * Risk Level: LOW
 * Duration: ~15 minutes
 *
 * Simplifies team member management by using a UUID[] array instead of
 * a separate junction table. Reduces table count and simplifies queries.
 */

BEGIN;

-- Step 1: Add team_members array to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS team_members UUID[] DEFAULT '{}';

-- Step 2: Populate team_members array from project_members table
UPDATE projects p
SET team_members = (
  SELECT ARRAY_AGG(DISTINCT user_id)
  FROM project_members pm
  WHERE pm.project_id = p.id
);

-- Step 3: Ensure project creator is in team_members
UPDATE projects
SET team_members = ARRAY_APPEND(team_members, created_by)
WHERE created_by IS NOT NULL
  AND NOT (created_by = ANY(team_members));

-- Step 4: Handle NULL arrays (projects with no members)
UPDATE projects
SET team_members = ARRAY[created_by]
WHERE team_members IS NULL
  AND created_by IS NOT NULL;

-- Step 5: Create helper function for team member management
CREATE OR REPLACE FUNCTION add_project_member(
  p_project_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE projects
  SET team_members = ARRAY_APPEND(team_members, p_user_id),
      updated_at = NOW()
  WHERE id = p_project_id
    AND NOT (p_user_id = ANY(team_members));

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION add_project_member IS
  'Add a user to project team members array. Returns true if user was added, false if already a member.';

CREATE OR REPLACE FUNCTION remove_project_member(
  p_project_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE projects
  SET team_members = ARRAY_REMOVE(team_members, p_user_id),
      updated_at = NOW()
  WHERE id = p_project_id
    AND (p_user_id = ANY(team_members));

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION remove_project_member IS
  'Remove a user from project team members array. Returns true if user was removed.';

CREATE OR REPLACE FUNCTION is_project_member(
  p_project_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id
      AND p_user_id = ANY(team_members)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_project_member IS
  'Check if a user is a member of a project.';

-- Step 6: Create index on team_members for fast lookups
CREATE INDEX IF NOT EXISTS idx_projects_team_members ON projects USING gin(team_members);

-- Step 7: Update RLS policies to use new team_members array
-- Drop old policies that reference project_members table
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('projects', 'tasks', 'milestones')
      AND (
        pg_get_expr(qual, (schemaname || '.' || tablename)::regclass)
        LIKE '%project_members%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I',
                   policy_record.policyname,
                   policy_record.tablename);
    RAISE NOTICE 'Dropped policy: %.%', policy_record.tablename, policy_record.policyname;
  END LOOP;
END $$;

-- Create new RLS policies using team_members array
CREATE POLICY "Users can view projects they are members of"
  ON projects FOR SELECT
  USING (auth.uid() = ANY(team_members) OR auth.uid() = created_by);

CREATE POLICY "Users can update projects they are members of"
  ON projects FOR UPDATE
  USING (auth.uid() = ANY(team_members) OR auth.uid() = created_by);

-- Step 8: Record migration
INSERT INTO migration_audit (migration_name, status, details)
VALUES (
  '053_simplify_project_members',
  'completed',
  jsonb_build_object(
    'projects_updated', (SELECT COUNT(*) FROM projects WHERE team_members IS NOT NULL),
    'total_memberships', (SELECT SUM(ARRAY_LENGTH(team_members, 1)) FROM projects),
    'helper_functions_created', ARRAY['add_project_member', 'remove_project_member', 'is_project_member'],
    'migration_timestamp', NOW()
  )
);

-- Display summary
DO $$
DECLARE
  projects_count INTEGER;
  total_memberships BIGINT;
  avg_members NUMERIC;
BEGIN
  SELECT COUNT(*) INTO projects_count FROM projects WHERE team_members IS NOT NULL;
  SELECT SUM(ARRAY_LENGTH(team_members, 1)) INTO total_memberships FROM projects;
  SELECT AVG(ARRAY_LENGTH(team_members, 1)) INTO avg_members FROM projects WHERE team_members IS NOT NULL;

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'PHASE 4: PROJECT MEMBERS SIMPLIFIED';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Projects migrated: %', projects_count;
  RAISE NOTICE 'Total memberships: %', total_memberships;
  RAISE NOTICE 'Average members per project: %', ROUND(avg_members, 1);
  RAISE NOTICE '';
  RAISE NOTICE 'Schema changes:';
  RAISE NOTICE '  ✓ Added projects.team_members UUID[] column';
  RAISE NOTICE '  ✓ Migrated all project_members data to array';
  RAISE NOTICE '  ✓ Created GIN index for fast lookups';
  RAISE NOTICE '';
  RAISE NOTICE 'Helper functions created:';
  RAISE NOTICE '  ✓ add_project_member(project_id, user_id)';
  RAISE NOTICE '  ✓ remove_project_member(project_id, user_id)';
  RAISE NOTICE '  ✓ is_project_member(project_id, user_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Run 054_drop_consolidated_tables.sql';
  RAISE NOTICE '============================================================================';
END $$;

COMMIT;
