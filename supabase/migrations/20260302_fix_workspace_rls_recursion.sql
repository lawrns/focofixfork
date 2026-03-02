-- Fix infinite recursion in foco_workspace_members RLS policy
-- The original policy on foco_workspace_members did a subquery on itself,
-- causing PostgreSQL error 42P17: infinite recursion detected.
--
-- Fix: Create a SECURITY DEFINER function that bypasses RLS to check
-- workspace membership, then use it in the policy.

-- Helper function: check if a user belongs to a workspace (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_is_workspace_member(ws_id uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM foco_workspace_members
    WHERE workspace_id = ws_id AND user_id = uid
  );
$$;

-- Fix the workspace members SELECT policy
DROP POLICY IF EXISTS "Users can view workspace members" ON foco_workspace_members;
CREATE POLICY "Users can view workspace members"
  ON foco_workspace_members
  FOR SELECT
  USING (
    public.user_is_workspace_member(workspace_id, auth.uid())
  );

-- Fix the workspaces SELECT policy (also uses the same subquery pattern)
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON foco_workspaces;
CREATE POLICY "Users can view workspaces they are members of"
  ON foco_workspaces
  FOR SELECT
  USING (
    public.user_is_workspace_member(id, auth.uid())
  );

-- Fix the workspaces UPDATE policy
DROP POLICY IF EXISTS "Users can update workspaces they are admins of" ON foco_workspaces;

CREATE OR REPLACE FUNCTION public.user_is_workspace_admin(ws_id uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM foco_workspace_members
    WHERE workspace_id = ws_id AND user_id = uid AND role IN ('owner', 'admin')
  );
$$;

CREATE POLICY "Users can update workspaces they are admins of"
  ON foco_workspaces
  FOR UPDATE
  USING (
    public.user_is_workspace_admin(id, auth.uid())
  );

-- Add INSERT policy for workspace members
DROP POLICY IF EXISTS "Admins can add workspace members" ON foco_workspace_members;
CREATE POLICY "Admins can add workspace members"
  ON foco_workspace_members
  FOR INSERT
  WITH CHECK (
    public.user_is_workspace_admin(workspace_id, auth.uid())
  );

-- Add DELETE policy for workspace members
DROP POLICY IF EXISTS "Admins can remove workspace members" ON foco_workspace_members;
CREATE POLICY "Admins can remove workspace members"
  ON foco_workspace_members
  FOR DELETE
  USING (
    public.user_is_workspace_admin(workspace_id, auth.uid())
    OR user_id = auth.uid()  -- Users can remove themselves
  );
