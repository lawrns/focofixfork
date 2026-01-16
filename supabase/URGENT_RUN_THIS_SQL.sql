-- ============================================
-- URGENT: RLS FIX FOR INFINITE RECURSION
-- ============================================
-- Run this SQL in Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/ouvqnyfqipgnrjnuqsqq/sql/new
-- ============================================

-- Step 1: Create security definer function to avoid recursion
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
GRANT EXECUTE ON FUNCTION public.get_user_workspace_ids(uuid) TO anon;

-- Step 2: Drop existing problematic policies on workspace_members
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON workspace_members;
DROP POLICY IF EXISTS "Workspace admins can manage members" ON workspace_members;
DROP POLICY IF EXISTS "Users can insert workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can update workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can delete workspace members" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON workspace_members;

-- Step 3: Create non-recursive SELECT policy
CREATE POLICY "workspace_members_select_policy"
  ON workspace_members
  FOR SELECT
  USING (
    workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid()))
  );

-- Step 4: Create INSERT policy for admins
CREATE POLICY "workspace_members_insert_policy"
  ON workspace_members
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Step 5: Create UPDATE policy for admins
CREATE POLICY "workspace_members_update_policy"
  ON workspace_members
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Step 6: Create DELETE policy
CREATE POLICY "workspace_members_delete_policy"
  ON workspace_members
  FOR DELETE
  USING (
    (workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ) AND role != 'owner')
    OR (user_id = auth.uid() AND role != 'owner')
  );

-- Step 7: Fix workspaces table policies
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON workspaces;
DROP POLICY IF EXISTS "Users can update workspaces they are admins of" ON workspaces;
DROP POLICY IF EXISTS "workspaces_select_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete_policy" ON workspaces;

CREATE POLICY "workspaces_select_policy"
  ON workspaces FOR SELECT
  USING (id IN (SELECT public.get_user_workspace_ids(auth.uid())));

CREATE POLICY "workspaces_insert_policy"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "workspaces_update_policy"
  ON workspaces FOR UPDATE
  USING (id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "workspaces_delete_policy"
  ON workspaces FOR DELETE
  USING (id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role = 'owner'
  ));

-- Verify the fix
SELECT 'RLS policies fixed successfully!' as result;
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('workspace_members', 'workspaces') 
ORDER BY tablename, policyname;
