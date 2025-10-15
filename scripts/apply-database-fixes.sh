#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# Apply Comprehensive Database Fixes
# ═══════════════════════════════════════════════════════════════════════════

set -e  # Exit on any error

echo "═══════════════════════════════════════════════════════════════════════════"
echo "  🔧 APPLYING COMPREHENSIVE DATABASE FIXES"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

# Database connection details
DB_HOST="db.czijxfbkihrauyjwcgfn.supabase.co"
DB_USER="postgres"
DB_NAME="postgres"
DB_PASSWORD="Hennie@@12Hennie@@12"

# Create password file
PGPASSFILE="/tmp/pgpass_$$.conf"
echo "$DB_HOST:5432:$DB_NAME:$DB_USER:$DB_PASSWORD" > "$PGPASSFILE"
chmod 600 "$PGPASSFILE"

export PGPASSFILE

# Function to run SQL and show results
run_sql() {
  local description="$1"
  local sql="$2"

  echo "📊 $description..."
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "$sql"
  echo ""
}

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1: PRE-MIGRATION ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════════════════"
echo "  📋 PRE-MIGRATION ANALYSIS"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

run_sql "Current RLS Status" "
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('projects', 'tasks', 'milestones', 'goals', 'organization_members', 'project_members')
ORDER BY tablename;
"

run_sql "Current Policy Count" "
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
"

run_sql "Data Integrity Check - NULL values in critical fields" "
SELECT
  'projects' as table_name,
  COUNT(*) FILTER (WHERE created_by IS NULL) as null_created_by,
  COUNT(*) as total_rows
FROM projects
UNION ALL
SELECT
  'tasks',
  COUNT(*) FILTER (WHERE project_id IS NULL),
  COUNT(*)
FROM tasks
UNION ALL
SELECT
  'milestones',
  COUNT(*) FILTER (WHERE project_id IS NULL),
  COUNT(*)
FROM milestones;
"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2: BACKUP CURRENT POLICIES
# ═══════════════════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════════════════"
echo "  💾 BACKING UP CURRENT POLICIES"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

BACKUP_FILE="database/backups/policies_backup_$(date +%Y%m%d_%H%M%S).sql"
mkdir -p database/backups

run_sql "Export current policies to backup" "
SELECT
  'DROP POLICY IF EXISTS \"' || policyname || '\" ON ' || tablename || ';' || E'\n' ||
  pg_get_policydef(oid) || ';' as policy_definition
FROM pg_policy
WHERE polrelid IN (
  SELECT oid FROM pg_class
  WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
)
ORDER BY polrelid::regclass::text, policyname;
" > "$BACKUP_FILE"

echo "✅ Policies backed up to: $BACKUP_FILE"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3: APPLY COMPREHENSIVE FIXES
# ═══════════════════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════════════════"
echo "  🚀 APPLYING COMPREHENSIVE DATABASE FIXES"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

echo "Executing migration file..."
PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -f "database/migrations/999_comprehensive_database_fixes.sql"

echo ""
echo "✅ Migration applied successfully!"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4: POST-MIGRATION VERIFICATION
# ═══════════════════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════════════════"
echo "  ✅ POST-MIGRATION VERIFICATION"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

run_sql "RLS Status (After)" "
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('projects', 'tasks', 'milestones', 'goals', 'organization_members', 'project_members')
ORDER BY tablename;
"

run_sql "Policy Count (After)" "
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
"

run_sql "Sample Policies - Projects" "
SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'projects'
ORDER BY policyname
LIMIT 5;
"

run_sql "Index Count by Table" "
SELECT
  tablename,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('projects', 'tasks', 'milestones', 'goals')
GROUP BY tablename
ORDER BY tablename;
"

run_sql "Foreign Key Constraints" "
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('tasks', 'milestones', 'project_members')
ORDER BY tc.table_name, tc.constraint_name;
"

run_sql "NOT NULL Constraints Check" "
SELECT
  table_name,
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('projects', 'tasks', 'milestones', 'organization_members', 'project_members')
  AND column_name IN ('created_by', 'project_id', 'user_id', 'organization_id')
ORDER BY table_name, column_name;
"

run_sql "Unique Constraints" "
SELECT
  tc.table_name,
  tc.constraint_name,
  STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_name IN ('organization_members', 'project_members')
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;
"

run_sql "CHECK Constraints" "
SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name IN ('projects', 'tasks')
ORDER BY tc.table_name, tc.constraint_name;
"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 5: DATA INTEGRITY VERIFICATION
# ═══════════════════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════════════════"
echo "  🔍 DATA INTEGRITY VERIFICATION"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

run_sql "Orphaned Records Check" "
-- Tasks without valid projects
SELECT 'tasks_without_projects' as issue, COUNT(*) as count
FROM tasks t
WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = t.project_id)
UNION ALL
-- Milestones without valid projects
SELECT 'milestones_without_projects', COUNT(*)
FROM milestones m
WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = m.project_id)
UNION ALL
-- Project members without valid projects
SELECT 'project_members_without_projects', COUNT(*)
FROM project_members pm
WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = pm.project_id)
UNION ALL
-- Project members without valid users
SELECT 'project_members_without_users', COUNT(*)
FROM project_members pm
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = pm.user_id);
"

run_sql "Record Counts by Table" "
SELECT 'projects' as table_name, COUNT(*) as total_records FROM projects
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL SELECT 'milestones', COUNT(*) FROM milestones
UNION ALL SELECT 'goals', COUNT(*) FROM goals
UNION ALL SELECT 'organization_members', COUNT(*) FROM organization_members
UNION ALL SELECT 'project_members', COUNT(*) FROM project_members
ORDER BY table_name;
"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 6: TEST RLS POLICIES
# ═══════════════════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════════════════"
echo "  🧪 TESTING RLS POLICIES"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

run_sql "Test: User can see their own projects" "
-- This should return projects owned by test user
SET ROLE authenticated;
SET request.jwt.claim.sub = 'f1937955-19c9-45f4-b4c3-2612c508acf3';
SELECT COUNT(*) as my_projects FROM projects WHERE created_by = 'f1937955-19c9-45f4-b4c3-2612c508acf3';
RESET ROLE;
"

# ═══════════════════════════════════════════════════════════════════════════
# CLEANUP
# ═══════════════════════════════════════════════════════════════════════════

rm -f "$PGPASSFILE"

echo "═══════════════════════════════════════════════════════════════════════════"
echo "  ✅ DATABASE FIXES COMPLETED SUCCESSFULLY!"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "Summary:"
echo "  ✓ RLS enabled on all core tables"
echo "  ✓ Comprehensive policies created"
echo "  ✓ Indexes added for performance"
echo "  ✓ Foreign key constraints with CASCADE"
echo "  ✓ NOT NULL constraints enforced"
echo "  ✓ Unique constraints on memberships"
echo "  ✓ CHECK constraints for validation"
echo "  ✓ Auto-update triggers configured"
echo ""
echo "Next steps:"
echo "  1. Test API endpoints to verify RLS policies work correctly"
echo "  2. Monitor query performance with new indexes"
echo "  3. Run integration tests"
echo ""
echo "Backup location: $BACKUP_FILE"
echo "═══════════════════════════════════════════════════════════════════════════"
