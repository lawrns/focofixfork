-- ============================================
-- PRODUCTION DATABASE FIXES
-- Run this on the production Supabase database
-- ============================================

-- Step 1: Fix RLS infinite recursion on workspace_members
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

-- Step 2: Drop all existing policies on workspace_members
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON workspace_members;
DROP POLICY IF EXISTS "Workspace admins can manage members" ON workspace_members;
DROP POLICY IF EXISTS "Users can insert workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can update workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can delete workspace members" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON workspace_members;

-- Step 3: Create clean policies for workspace_members
CREATE POLICY "workspace_members_select_policy" ON workspace_members FOR SELECT 
USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "workspace_members_insert_policy" ON workspace_members FOR INSERT 
WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "workspace_members_update_policy" ON workspace_members FOR UPDATE 
USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "workspace_members_delete_policy" ON workspace_members FOR DELETE 
USING ((workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')) AND role != 'owner') 
       OR (user_id = auth.uid() AND role != 'owner'));

-- Step 4: Fix workspaces table policies
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON workspaces;
DROP POLICY IF EXISTS "Users can update workspaces they are admins of" ON workspaces;
DROP POLICY IF EXISTS "workspaces_select_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete_policy" ON workspaces;

CREATE POLICY "workspaces_select_policy" ON workspaces FOR SELECT 
USING (id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "workspaces_insert_policy" ON workspaces FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "workspaces_update_policy" ON workspaces FOR UPDATE 
USING (id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "workspaces_delete_policy" ON workspaces FOR DELETE 
USING (id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'owner'));

-- Step 5: Add missing RLS policies for work_items
CREATE POLICY "work_items_select_policy" ON work_items FOR SELECT 
USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "work_items_insert_policy" ON work_items FOR INSERT 
WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "work_items_update_policy" ON work_items FOR UPDATE 
USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "work_items_delete_policy" ON work_items FOR DELETE 
USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

-- Step 6: Fix activity_log RLS policy
DROP POLICY IF EXISTS "activity_log_access" ON activity_log;

CREATE POLICY "activity_log_access" ON activity_log
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND user_has_workspace_access(workspace_id)
);

-- Step 7: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_work_items_workspace_status_created ON work_items(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_items_assignee_status ON work_items(assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_foco_projects_workspace_id ON foco_projects(workspace_id);

-- Step 8: Add CHECK constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_work_items_status') THEN
        ALTER TABLE work_items ADD CONSTRAINT chk_work_items_status 
        CHECK (status IN ('backlog', 'next', 'in_progress', 'review', 'blocked', 'done'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_work_items_priority') THEN
        ALTER TABLE work_items ADD CONSTRAINT chk_work_items_priority 
        CHECK (priority IN ('urgent', 'high', 'medium', 'low', 'none'));
    END IF;
END
$$;

-- Verification
SELECT 'Production database fixes applied successfully!' as result;
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('workspace_members', 'workspaces', 'work_items', 'activity_log') 
ORDER BY tablename, policyname;
