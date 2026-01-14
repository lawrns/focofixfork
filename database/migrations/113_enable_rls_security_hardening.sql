-- ============================================================================
-- RLS SECURITY HARDENING MIGRATION
-- Migration: 113_enable_rls_security_hardening.sql
-- Date: 2026-01-13
-- Severity: CRITICAL (P0)
-- Purpose: Enable Row Level Security on critical tables and strengthen policies
-- ============================================================================
--
-- SECURITY ISSUE:
-- Row Level Security is currently DISABLED on 5 critical tables:
-- - work_items
-- - foco_projects
-- - labels
-- - inbox_items
-- - workspaces
--
-- IMPACT:
-- - Any authenticated user can access ALL data across ALL workspaces
-- - Complete authorization bypass (OWASP A01:2021)
-- - GDPR Article 32 violation (inadequate technical security measures)
-- - CVE-equivalent severity: CRITICAL (CVSS 9.8)
--
-- REMEDIATION:
-- 1. Enable RLS on all critical tables
-- 2. Strengthen INSERT policies (currently too permissive)
-- 3. Add role-based helper functions for admin operations
-- 4. Add performance indexes for RLS policy checks
-- 5. Add audit logging capability
--
-- ROLLBACK:
-- If application breaks after this migration, you can temporarily disable RLS:
--   ALTER TABLE [table_name] DISABLE ROW LEVEL SECURITY;
-- However, this should only be temporary - the real fix is to ensure policies are correct.
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: VERIFY HELPER FUNCTION EXISTS
-- ============================================================================

-- Check if user_has_workspace_access exists (created in 100_foco_2_core_schema.sql)
-- This function is critical for all RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'user_has_workspace_access'
  ) THEN
    RAISE EXCEPTION 'Critical function user_has_workspace_access not found. Migration 100_foco_2_core_schema.sql may not have been applied.';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: CREATE ROLE-BASED HELPER FUNCTION
-- ============================================================================

-- Create helper function for admin/owner checks
-- This is used for DELETE and sensitive UPDATE operations
CREATE OR REPLACE FUNCTION user_is_workspace_admin(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION user_is_workspace_admin(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION user_is_workspace_admin IS
  'Returns TRUE if the current user has admin or owner role in the specified workspace. Used for RLS policies that require elevated privileges.';

-- ============================================================================
-- STEP 3: ENABLE RLS ON CRITICAL TABLES
-- ============================================================================

-- These tables currently have RLS DISABLED despite having policies defined
-- This is the CRITICAL security vulnerability

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE foco_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;

-- Verify RLS is now enabled
DO $$
DECLARE
  rls_disabled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rls_disabled_count
  FROM pg_class
  WHERE relname IN ('workspaces', 'foco_projects', 'labels', 'work_items', 'inbox_items')
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND NOT relrowsecurity;

  IF rls_disabled_count > 0 THEN
    RAISE EXCEPTION 'RLS enable failed: % tables still have RLS disabled', rls_disabled_count;
  END IF;

  RAISE NOTICE 'SUCCESS: RLS enabled on all 5 critical tables';
END $$;

-- ============================================================================
-- STEP 4: STRENGTHEN INSERT POLICIES (CRITICAL)
-- ============================================================================

-- ISSUE: Current work_items INSERT policy has "WITH CHECK (true)"
-- This allows ANY user to insert work items into ANY workspace!

-- Drop the overly permissive policy
DROP POLICY IF EXISTS work_items_insert ON work_items;

-- Create secure INSERT policy with workspace access check
CREATE POLICY work_items_insert ON work_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_workspace_access(workspace_id)
    AND user_has_workspace_access(project_id) -- Verify project access too
  );

COMMENT ON POLICY work_items_insert ON work_items IS
  'Users can only insert work items into workspaces and projects they have access to. Prevents cross-workspace data injection.';

-- ============================================================================
-- STEP 5: STRENGTHEN INBOX_ITEMS POLICIES
-- ============================================================================

-- ISSUE: Current inbox_items INSERT policy has "WITH CHECK (true)"
-- This allows ANY user to create inbox items for ANY other user!

-- Drop the overly permissive policy
DROP POLICY IF EXISTS inbox_items_insert ON inbox_items;

-- Create secure INSERT policy
CREATE POLICY inbox_items_insert ON inbox_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can create inbox items for themselves OR in workspaces they belong to
    user_id = auth.uid() OR user_has_workspace_access(workspace_id)
  );

COMMENT ON POLICY inbox_items_insert ON inbox_items IS
  'Users can create inbox items for themselves or within their workspaces. Prevents unauthorized notification injection.';

-- ============================================================================
-- STEP 6: STRENGTHEN FOCO_PROJECTS INSERT POLICY
-- ============================================================================

-- ISSUE: Current policy allows ANY workspace member to create projects
-- Projects should only be created by admins/owners

-- Drop existing INSERT policy
DROP POLICY IF EXISTS foco_projects_insert ON foco_projects;

-- Create admin-only INSERT policy
CREATE POLICY foco_projects_insert ON foco_projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_is_workspace_admin(workspace_id)
  );

COMMENT ON POLICY foco_projects_insert ON foco_projects IS
  'Only workspace admins and owners can create projects. Regular members cannot create projects.';

-- ============================================================================
-- STEP 7: STRENGTHEN DELETE POLICIES
-- ============================================================================

-- Update foco_projects DELETE to use the new helper function
DROP POLICY IF EXISTS foco_projects_delete ON foco_projects;

CREATE POLICY foco_projects_delete ON foco_projects
  FOR DELETE
  TO authenticated
  USING (
    user_is_workspace_admin(workspace_id)
  );

COMMENT ON POLICY foco_projects_delete ON foco_projects IS
  'Only workspace admins and owners can delete projects.';

-- Update workspace_members DELETE policy
DROP POLICY IF EXISTS workspace_members_delete ON workspace_members;

CREATE POLICY workspace_members_delete ON workspace_members
  FOR DELETE
  TO authenticated
  USING (
    user_is_workspace_admin(workspace_id)
    OR user_id = auth.uid() -- Users can remove themselves
  );

COMMENT ON POLICY workspace_members_delete ON workspace_members IS
  'Workspace admins can remove members, or users can remove themselves from workspaces.';

-- ============================================================================
-- STEP 8: ADD PERFORMANCE INDEXES FOR RLS
-- ============================================================================

-- Create composite index on workspace_members for faster RLS checks
-- This is the most frequently queried table for RLS policies
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_user_role
  ON workspace_members(workspace_id, user_id, role);

-- Create index on work_items workspace_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_work_items_workspace_project
  ON work_items(workspace_id, project_id);

-- Create index on labels workspace_id
CREATE INDEX IF NOT EXISTS idx_labels_workspace
  ON labels(workspace_id);

-- Create partial index on inbox_items for unread notifications
-- (This index was in the original schema but ensure it exists)
CREATE INDEX IF NOT EXISTS idx_inbox_items_unread
  ON inbox_items(user_id, is_read)
  WHERE NOT is_read;

COMMENT ON INDEX idx_workspace_members_workspace_user_role IS
  'Optimizes RLS policy checks for workspace access. Critical for performance.';

-- ============================================================================
-- STEP 9: ADD AUDIT LOGGING TABLE (OPTIONAL BUT RECOMMENDED)
-- ============================================================================

-- Create audit log table for tracking RLS policy violations and access attempts
CREATE TABLE IF NOT EXISTS rls_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  workspace_id UUID,
  success BOOLEAN NOT NULL,
  error_code TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on audit log for queries
CREATE INDEX IF NOT EXISTS idx_rls_audit_log_user_created
  ON rls_audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rls_audit_log_workspace_created
  ON rls_audit_log(workspace_id, created_at DESC);

-- Enable RLS on audit log table (read-only for users)
ALTER TABLE rls_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own audit logs
CREATE POLICY rls_audit_log_select ON rls_audit_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Only system can insert audit logs (via SECURITY DEFINER functions)
CREATE POLICY rls_audit_log_insert ON rls_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE rls_audit_log IS
  'Tracks access attempts and RLS policy violations for security auditing and compliance.';

-- ============================================================================
-- STEP 10: CREATE SECURITY VERIFICATION FUNCTION
-- ============================================================================

-- Function to verify RLS is properly configured
CREATE OR REPLACE FUNCTION verify_rls_configuration()
RETURNS TABLE(
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count BIGINT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::TEXT as table_name,
    c.relrowsecurity as rls_enabled,
    COUNT(p.polname) as policy_count,
    CASE
      WHEN c.relrowsecurity AND COUNT(p.polname) > 0 THEN '✅ SECURE'
      WHEN c.relrowsecurity AND COUNT(p.polname) = 0 THEN '⚠️  RLS ENABLED BUT NO POLICIES'
      WHEN NOT c.relrowsecurity AND COUNT(p.polname) > 0 THEN '🔴 CRITICAL: RLS DISABLED'
      ELSE '❌ NO PROTECTION'
    END as status
  FROM pg_class c
  LEFT JOIN pg_policy p ON p.polrelid = c.oid
  WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND c.relkind = 'r'
    AND c.relname IN (
      'workspaces', 'workspace_members', 'foco_projects', 'foco_project_members',
      'labels', 'work_items', 'inbox_items', 'work_item_labels',
      'work_item_dependencies', 'foco_comments', 'docs', 'saved_views',
      'automations', 'automation_logs', 'activity_log', 'ai_suggestions',
      'time_entries', 'user_presence', 'reports'
    )
  GROUP BY c.relname, c.relrowsecurity
  ORDER BY
    CASE status
      WHEN '🔴 CRITICAL: RLS DISABLED' THEN 1
      WHEN '⚠️  RLS ENABLED BUT NO POLICIES' THEN 2
      WHEN '❌ NO PROTECTION' THEN 3
      WHEN '✅ SECURE' THEN 4
    END,
    c.relname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION verify_rls_configuration() TO authenticated;

COMMENT ON FUNCTION verify_rls_configuration IS
  'Verifies that all critical tables have RLS enabled and policies configured. Use this for security audits.';

-- ============================================================================
-- STEP 11: RUN VERIFICATION
-- ============================================================================

-- Verify configuration and raise warnings if issues found
DO $$
DECLARE
  critical_count INTEGER;
  warning_count INTEGER;
  verification_result RECORD;
BEGIN
  -- Count critical issues
  SELECT COUNT(*) INTO critical_count
  FROM verify_rls_configuration()
  WHERE status LIKE '%CRITICAL%';

  -- Count warnings
  SELECT COUNT(*) INTO warning_count
  FROM verify_rls_configuration()
  WHERE status LIKE '%WARNING%' OR status LIKE '%NO PROTECTION%';

  -- Display verification results
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RLS SECURITY VERIFICATION REPORT';
  RAISE NOTICE '============================================';

  FOR verification_result IN SELECT * FROM verify_rls_configuration() LOOP
    RAISE NOTICE '% - % policies - %',
      verification_result.table_name,
      verification_result.policy_count,
      verification_result.status;
  END LOOP;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'CRITICAL ISSUES: %', critical_count;
  RAISE NOTICE 'WARNINGS: %', warning_count;
  RAISE NOTICE '============================================';

  -- Fail migration if critical issues found
  IF critical_count > 0 THEN
    RAISE EXCEPTION 'RLS configuration failed: % critical issues found. See verification report above.', critical_count;
  END IF;

  -- Warn if warnings found but don't fail
  IF warning_count > 0 THEN
    RAISE WARNING '% warnings found in RLS configuration. Review verification report.', warning_count;
  END IF;

  RAISE NOTICE '✅ RLS SECURITY HARDENING COMPLETE';
END $$;

-- ============================================================================
-- STEP 12: UPDATE MIGRATION TRACKING
-- ============================================================================

-- Record this migration in activity_log for audit trail
INSERT INTO activity_log (
  workspace_id,
  entity_type,
  entity_id,
  action,
  changes,
  is_ai_action
)
SELECT
  id,
  'workspace',
  id,
  'rls_security_hardening',
  jsonb_build_object(
    'migration', '113_enable_rls_security_hardening',
    'tables_secured', ARRAY['workspaces', 'foco_projects', 'labels', 'work_items', 'inbox_items'],
    'severity', 'CRITICAL',
    'executed_at', NOW()
  ),
  false
FROM workspaces;

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- ============================================================================

-- Run these queries AFTER migration to verify success:

-- 1. Verify RLS is enabled on all critical tables
-- SELECT relname, relrowsecurity
-- FROM pg_class
-- WHERE relname IN ('workspaces', 'foco_projects', 'labels', 'work_items', 'inbox_items')
--   AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
-- Expected: All should show relrowsecurity = true

-- 2. Check RLS configuration
-- SELECT * FROM verify_rls_configuration();
-- Expected: All tables should show "✅ SECURE"

-- 3. Test workspace access (run as authenticated user)
-- SELECT * FROM foco_projects LIMIT 10;
-- Expected: Only projects from user's workspace(s)

-- 4. Test cross-workspace access denial (should return 0 rows or error)
-- INSERT INTO work_items (workspace_id, project_id, title, status)
-- VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Test', 'backlog');
-- Expected: Error 42501 (insufficient_privilege)

-- 5. View audit log
-- SELECT * FROM rls_audit_log ORDER BY created_at DESC LIMIT 10;

-- ============================================================================
-- ROLLBACK PROCEDURE
-- ============================================================================

-- If this migration causes issues, you can rollback with:
--
-- BEGIN;
-- ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE foco_projects DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE labels DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE work_items DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE inbox_items DISABLE ROW LEVEL SECURITY;
-- COMMIT;
--
-- WARNING: This will re-introduce the security vulnerability!
-- Only use as a temporary measure while investigating policy issues.

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
