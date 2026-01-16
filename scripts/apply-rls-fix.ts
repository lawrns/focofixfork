/**
 * Script to apply RLS fix migration via Supabase client
 * Run with: npx tsx scripts/apply-rls-fix.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ouvqnyfqipgnrjnuqsqq.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91dnFueWZxaXBnbnJqbnVxc3FxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzkwMTQxOCwiZXhwIjoyMDgzNDc3NDE4fQ.Gt0n6_y3j6b955ZmiYlKSlFlDJCyyPW7NyPKIink53o'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
})

async function applyMigration() {
  console.log('🔧 Applying RLS fix migration...\n')

  // Step 1: Create security definer function
  console.log('Step 1: Creating security definer function...')
  const { error: funcError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE OR REPLACE FUNCTION public.get_user_workspace_ids(p_user_id uuid)
      RETURNS SETOF uuid
      LANGUAGE sql
      SECURITY DEFINER
      STABLE
      AS $$
        SELECT workspace_id FROM workspace_members WHERE user_id = p_user_id;
      $$;
    `
  })
  
  if (funcError) {
    console.log('Note: exec_sql RPC not available, will use alternative method')
  }

  // Test if the function exists
  const { data: testData, error: testError } = await supabase
    .from('workspace_members')
    .select('id')
    .limit(1)

  if (testError) {
    console.log('Current error on workspace_members:', testError.message)
    console.log('\n⚠️  The RLS policy has infinite recursion.')
    console.log('📋 Please apply the following SQL via Supabase Dashboard SQL Editor:\n')
    console.log('---')
    console.log(getMigrationSQL())
    console.log('---')
    console.log('\n📍 Go to: https://supabase.com/dashboard/project/ouvqnyfqipgnrjnuqsqq/sql/new')
    return
  }

  console.log('✅ workspace_members query succeeded - RLS may already be fixed')
}

function getMigrationSQL() {
  return `
-- Fix RLS infinite recursion on workspace_members
-- Run this in Supabase Dashboard SQL Editor

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

-- Done!
SELECT 'RLS policies fixed successfully!' as result;
`
}

applyMigration().catch(console.error)
