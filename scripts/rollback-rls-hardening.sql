-- ============================================================================
-- RLS SECURITY HARDENING ROLLBACK SCRIPT
-- ============================================================================
--
-- WARNING: This script will DISABLE Row Level Security on critical tables
-- This should ONLY be used as a temporary measure if the migration causes
-- application errors that need immediate resolution.
--
-- SECURITY RISK: Disabling RLS reintroduces the authorization bypass vulnerability
-- Any authenticated user will be able to access ALL data across ALL workspaces
--
-- Usage:
--   psql "$SUPABASE_DB_URL" -f scripts/rollback-rls-hardening.sql
--
-- After rollback:
--   1. Investigate why the migration failed
--   2. Fix the underlying issue
--   3. Re-apply the migration as soon as possible
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: RECORD ROLLBACK IN AUDIT LOG
-- ============================================================================

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
  'rls_security_rollback',
  jsonb_build_object(
    'migration', '113_enable_rls_security_hardening',
    'action', 'ROLLBACK',
    'reason', 'Emergency rollback due to application issues',
    'security_risk', 'CRITICAL - Authorization bypass vulnerability reintroduced',
    'rolled_back_at', NOW()
  ),
  false
FROM workspaces;

-- ============================================================================
-- STEP 2: DISABLE RLS ON CRITICAL TABLES
-- ============================================================================

-- WARNING: This reintroduces the security vulnerability
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE foco_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE labels DISABLE ROW LEVEL SECURITY;
ALTER TABLE work_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_items DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: VERIFY RLS IS DISABLED
-- ============================================================================

DO $$
DECLARE
  rls_enabled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_class
  WHERE relname IN ('workspaces', 'foco_projects', 'labels', 'work_items', 'inbox_items')
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND relrowsecurity = true;

  IF rls_enabled_count > 0 THEN
    RAISE EXCEPTION 'RLS disable failed: % tables still have RLS enabled', rls_enabled_count;
  END IF;

  RAISE WARNING '🔴 SECURITY ALERT: RLS has been DISABLED on 5 critical tables';
  RAISE WARNING '🔴 All authenticated users can now access ALL data across ALL workspaces';
  RAISE WARNING '🔴 This is a CRITICAL security vulnerability';
  RAISE WARNING '🔴 Re-enable RLS as soon as possible after fixing the underlying issue';
END $$;

-- ============================================================================
-- STEP 4: KEEP HELPER FUNCTIONS AND POLICIES
-- ============================================================================

-- NOTE: We do NOT drop the helper functions or policies
-- This allows for quick re-enabling of RLS once issues are resolved
-- The policies will not be enforced while RLS is disabled, but they remain defined

-- Verify helper functions still exist
DO $$
DECLARE
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN ('user_has_workspace_access', 'user_is_workspace_admin', 'verify_rls_configuration');

  RAISE NOTICE 'Helper functions still exist: % functions found', function_count;
END $$;

-- ============================================================================
-- STEP 5: VERIFICATION
-- ============================================================================

-- Display current RLS status
SELECT
  relname as table_name,
  CASE
    WHEN relrowsecurity THEN '❌ ENABLED (unexpected)'
    ELSE '🔴 DISABLED (rollback successful)'
  END as rls_status
FROM pg_class
WHERE relname IN ('workspaces', 'foco_projects', 'labels', 'work_items', 'inbox_items')
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY relname;

COMMIT;

-- ============================================================================
-- POST-ROLLBACK INSTRUCTIONS
-- ============================================================================

-- After running this rollback:
--
-- 1. URGENT: Investigate why the migration failed
--    - Check application logs for specific errors
--    - Check database logs for policy violations
--    - Review /tmp/rls_migration_output.log
--
-- 2. Fix the underlying issue:
--    - If policies are too restrictive, adjust them
--    - If application code assumes different permissions, update code
--    - If there are orphaned records, clean them up
--
-- 3. Re-enable RLS as soon as possible:
--    ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
--    ALTER TABLE foco_projects ENABLE ROW LEVEL SECURITY;
--    ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
--    ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;
--    ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;
--
-- 4. Test thoroughly before considering the issue resolved
--
-- 5. Document what went wrong and how it was fixed
--
-- ============================================================================

-- Display warning message
DO $$
BEGIN
  RAISE WARNING '';
  RAISE WARNING '============================================';
  RAISE WARNING 'RLS SECURITY ROLLBACK COMPLETED';
  RAISE WARNING '============================================';
  RAISE WARNING '';
  RAISE WARNING '🔴 CRITICAL SECURITY VULNERABILITY ACTIVE';
  RAISE WARNING '';
  RAISE WARNING 'Row Level Security has been DISABLED on:';
  RAISE WARNING '  - workspaces';
  RAISE WARNING '  - foco_projects';
  RAISE WARNING '  - labels';
  RAISE WARNING '  - work_items';
  RAISE WARNING '  - inbox_items';
  RAISE WARNING '';
  RAISE WARNING 'Impact: All authenticated users can access ALL data';
  RAISE WARNING '';
  RAISE WARNING 'Next steps:';
  RAISE WARNING '  1. Investigate why migration failed';
  RAISE WARNING '  2. Fix underlying issue';
  RAISE WARNING '  3. Re-enable RLS immediately';
  RAISE WARNING '';
  RAISE WARNING '============================================';
  RAISE WARNING '';
END $$;
