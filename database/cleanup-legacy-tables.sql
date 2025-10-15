-- Cleanup legacy tables from previous systems
-- This script removes crico_* tables and other non-foco tables

-- Drop crico-related tables (legacy system)
DROP TABLE IF EXISTS crico_milestone_user_links CASCADE;
DROP TABLE IF EXISTS crico_list_history CASCADE;
DROP TABLE IF EXISTS crico_user_invites CASCADE;
DROP TABLE IF EXISTS crico_user_sessions CASCADE;
DROP TABLE IF EXISTS crico_lists CASCADE;
DROP TABLE IF EXISTS crico_users CASCADE;

-- Drop legacy profiles table (gamification system)
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop customers table (unused)
DROP TABLE IF EXISTS customers CASCADE;

-- Verify cleanup
SELECT 'Legacy tables removed successfully' as status;

-- Show remaining tables to confirm foco-only database
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'supabase_%'
ORDER BY tablename;
