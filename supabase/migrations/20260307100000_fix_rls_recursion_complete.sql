-- ============================================================
-- Complete fix for foco_projects <-> foco_project_members RLS infinite recursion
-- ============================================================
-- Root cause:
--   foco_projects SELECT policy queries foco_project_members
--   foco_project_members SELECT policy calls user_can_view_project_member()
--   user_can_view_project_member() queries foco_projects
--   foco_projects has FORCE ROW LEVEL SECURITY which applies even to
--   SECURITY DEFINER functions owned by postgres, causing infinite recursion.
--
-- Fix strategy:
--   1. Remove foco_project_members subquery from foco_projects SELECT policy
--      (workspace membership alone is sufficient — all workspace members see
--       all projects in their workspace)
--   2. Update user_can_view_project_member() with SET row_security = off
--      so its foco_projects query bypasses FORCE RLS cleanly

-- Step 1: Drop ALL existing SELECT policies on foco_projects
DROP POLICY IF EXISTS "Users can view projects in their workspaces" ON foco_projects;
DROP POLICY IF EXISTS "Users can view their projects" ON foco_projects;

-- Step 2: Create a single clean SELECT policy that only checks workspace membership
-- user_is_workspace_member() is already a safe SECURITY DEFINER fn that only
-- queries foco_workspace_members — no cycle possible.
CREATE POLICY "Users can view projects in their workspaces"
  ON foco_projects
  FOR SELECT
  USING (
    public.user_is_workspace_member(workspace_id, auth.uid())
  );

-- Step 3: Replace user_can_view_project_member with a version that has
-- row_security = off so it can safely query foco_projects without triggering
-- FORCE ROW LEVEL SECURITY recursion.
CREATE OR REPLACE FUNCTION public.user_can_view_project_member(proj_id uuid, uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
BEGIN
  -- Check direct project membership
  IF EXISTS (
    SELECT 1 FROM foco_project_members
    WHERE project_id = proj_id AND user_id = uid
  ) THEN
    RETURN true;
  END IF;

  -- Check workspace membership (join via foco_projects, row_security=off bypasses FORCE RLS)
  RETURN EXISTS (
    SELECT 1
    FROM foco_projects fp
    INNER JOIN foco_workspace_members fwm ON fwm.workspace_id = fp.workspace_id
    WHERE fp.id = proj_id AND fwm.user_id = uid
  );
END;
$$;

-- Step 4: Ensure foco_project_members SELECT policy uses this function
-- (may already be set by 20260307090000, but recreate to be safe)
DROP POLICY IF EXISTS "Users can view project members" ON foco_project_members;

CREATE POLICY "Users can view project members"
  ON foco_project_members
  FOR SELECT
  USING (
    public.user_can_view_project_member(project_id, auth.uid())
  );
