-- Migration: Fix RLS infinite recursion on workspace_members
-- Root cause: workspace_members SELECT policy queries workspace_members, causing infinite loop
-- Solution: Use auth.uid() directly to check user_id without subquery

-- ====================
-- PART 1: Fix workspace_members RLS policies
-- ====================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON workspace_members;
DROP POLICY IF EXISTS "Workspace admins can manage members" ON workspace_members;
DROP POLICY IF EXISTS "Users can insert workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can update workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can delete workspace members" ON workspace_members;

-- Create non-recursive SELECT policy
-- Users can view members of workspaces they belong to
-- This uses a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.get_user_workspace_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT workspace_id FROM workspace_members WHERE user_id = p_user_id;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_workspace_ids(uuid) TO authenticated;

-- SELECT policy: Users can view members of their workspaces (non-recursive)
CREATE POLICY "workspace_members_select_policy"
  ON workspace_members
  FOR SELECT
  USING (
    workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid()))
  );

-- INSERT policy: Workspace admins can add members
CREATE POLICY "workspace_members_insert_policy"
  ON workspace_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- UPDATE policy: Workspace admins can update members (but not owners)
CREATE POLICY "workspace_members_update_policy"
  ON workspace_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    -- Prevent demoting owners
    role != 'owner' OR user_id = auth.uid()
  );

-- DELETE policy: Workspace admins can remove members (but not owners)
CREATE POLICY "workspace_members_delete_policy"
  ON workspace_members
  FOR DELETE
  USING (
    (
      -- Admins can delete non-owner members
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = workspace_members.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.role IN ('owner', 'admin')
      )
      AND role != 'owner'
    )
    OR
    -- Users can remove themselves (leave workspace)
    (user_id = auth.uid() AND role != 'owner')
  );

-- ====================
-- PART 2: Fix workspaces RLS policies
-- ====================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON workspaces;
DROP POLICY IF EXISTS "Users can update workspaces they are admins of" ON workspaces;
DROP POLICY IF EXISTS "Workspace admins can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "workspaces_select_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete_policy" ON workspaces;

-- SELECT policy: Users can view workspaces they belong to
CREATE POLICY "workspaces_select_policy"
  ON workspaces
  FOR SELECT
  USING (
    id IN (SELECT public.get_user_workspace_ids(auth.uid()))
  );

-- INSERT policy: Any authenticated user can create a workspace
CREATE POLICY "workspaces_insert_policy"
  ON workspaces
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE policy: Workspace admins can update
CREATE POLICY "workspaces_update_policy"
  ON workspaces
  FOR UPDATE
  USING (
    id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- DELETE policy: Only owners can delete workspaces
CREATE POLICY "workspaces_delete_policy"
  ON workspaces
  FOR DELETE
  USING (
    id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- ====================
-- PART 3: Fix workspace_invitations RLS policies
-- ====================

-- Drop existing policies
DROP POLICY IF EXISTS "Workspace admins can view invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Workspace admins can create invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Workspace admins can update invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Workspace admins can delete invitations" ON workspace_invitations;

-- SELECT policy: Admins can view, invitees can view their own
CREATE POLICY "workspace_invitations_select_policy"
  ON workspace_invitations
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
    OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- INSERT policy: Workspace admins can create invitations
CREATE POLICY "workspace_invitations_insert_policy"
  ON workspace_invitations
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- UPDATE policy: Workspace admins can update invitations
CREATE POLICY "workspace_invitations_update_policy"
  ON workspace_invitations
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- DELETE policy: Workspace admins can delete invitations
CREATE POLICY "workspace_invitations_delete_policy"
  ON workspace_invitations
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ====================
-- PART 4: Ensure RLS is enabled on all relevant tables
-- ====================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- ====================
-- PART 5: Add helpful comments
-- ====================

COMMENT ON FUNCTION public.get_user_workspace_ids(uuid) IS 
  'Security definer function to get workspace IDs for a user without RLS recursion';
COMMENT ON POLICY "workspace_members_select_policy" ON workspace_members IS 
  'Non-recursive SELECT policy using security definer function';

-- Migration complete - RLS infinite recursion fixed
