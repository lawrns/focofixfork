#!/bin/bash

# ============================================================================
# RLS SECURITY HARDENING DEPLOYMENT SCRIPT
# ============================================================================
#
# Purpose: Apply migration 113_enable_rls_security_hardening.sql to database
# Severity: CRITICAL - This fixes a major security vulnerability
#
# Usage:
#   ./scripts/apply-rls-hardening.sh
#
# Prerequisites:
#   - SUPABASE_DB_URL or DATABASE_URL environment variable set
#   - psql installed
#   - Database backup completed
#
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# FUNCTIONS
# ============================================================================

print_header() {
  echo -e "\n${BLUE}============================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}============================================${NC}\n"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}🔴 ERROR: $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# ============================================================================
# ENVIRONMENT SETUP
# ============================================================================

print_header "RLS Security Hardening Migration"

# Check for database URL
if [ -z "$SUPABASE_DB_URL" ] && [ -z "$DATABASE_URL" ]; then
  print_error "Database URL not found"
  echo "Please set one of the following environment variables:"
  echo "  - SUPABASE_DB_URL"
  echo "  - DATABASE_URL"
  echo ""
  echo "Example:"
  echo "  export SUPABASE_DB_URL='postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres'"
  exit 1
fi

DB_URL="${SUPABASE_DB_URL:-$DATABASE_URL}"

# Check if psql is installed
if ! command -v psql &> /dev/null; then
  print_error "psql not found"
  echo "Please install PostgreSQL client tools:"
  echo "  macOS: brew install postgresql"
  echo "  Ubuntu: sudo apt-get install postgresql-client"
  exit 1
fi

# ============================================================================
# PRE-MIGRATION CHECKS
# ============================================================================

print_header "Pre-Migration Verification"

# Check if migration file exists
MIGRATION_FILE="database/migrations/113_enable_rls_security_hardening.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  print_error "Migration file not found: $MIGRATION_FILE"
  exit 1
fi

print_success "Migration file found"

# Test database connection
print_info "Testing database connection..."
if psql "$DB_URL" -c "SELECT 1" > /dev/null 2>&1; then
  print_success "Database connection successful"
else
  print_error "Cannot connect to database"
  exit 1
fi

# Check current RLS status
print_info "Checking current RLS status..."
RLS_STATUS=$(psql "$DB_URL" -t -c "
  SELECT COUNT(*) FROM pg_class
  WHERE relname IN ('workspaces', 'foco_projects', 'labels', 'work_items', 'inbox_items')
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND NOT relrowsecurity;
")

RLS_DISABLED=$(echo "$RLS_STATUS" | tr -d ' ')

if [ "$RLS_DISABLED" -gt "0" ]; then
  print_warning "RLS is currently DISABLED on $RLS_DISABLED critical table(s)"
  echo "This migration will enable RLS and strengthen policies"
else
  print_info "RLS appears to be enabled, but policies will be verified and strengthened"
fi

# ============================================================================
# BACKUP REMINDER
# ============================================================================

print_header "Backup Verification"

print_warning "Have you created a database backup?"
echo ""
echo "To create a backup with Supabase:"
echo "  1. Go to Supabase Dashboard > Database > Backups"
echo "  2. Click 'Create Backup'"
echo "  3. Wait for backup to complete"
echo ""
echo "Or use pg_dump:"
echo "  pg_dump \"\$SUPABASE_DB_URL\" > backup_\$(date +%Y%m%d_%H%M%S).sql"
echo ""

read -p "Do you have a recent backup? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
  print_error "Please create a backup before proceeding"
  exit 1
fi

print_success "Backup confirmed"

# ============================================================================
# MIGRATION EXECUTION
# ============================================================================

print_header "Applying Migration"

print_info "Executing: $MIGRATION_FILE"
echo ""

# Apply migration and capture output
if psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$MIGRATION_FILE" 2>&1 | tee /tmp/rls_migration_output.log; then
  print_success "Migration completed successfully"
else
  print_error "Migration failed"
  echo ""
  echo "Check the output above for errors."
  echo "Full log saved to: /tmp/rls_migration_output.log"
  echo ""
  print_warning "If you need to rollback, run:"
  echo "  psql \"\$SUPABASE_DB_URL\" -f scripts/rollback-rls-hardening.sql"
  exit 1
fi

# ============================================================================
# POST-MIGRATION VERIFICATION
# ============================================================================

print_header "Post-Migration Verification"

# Check RLS is now enabled
print_info "Verifying RLS is enabled..."
RLS_ENABLED=$(psql "$DB_URL" -t -c "
  SELECT COUNT(*) FROM pg_class
  WHERE relname IN ('workspaces', 'foco_projects', 'labels', 'work_items', 'inbox_items')
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND relrowsecurity = true;
")

RLS_ENABLED=$(echo "$RLS_ENABLED" | tr -d ' ')

if [ "$RLS_ENABLED" -eq "5" ]; then
  print_success "RLS enabled on all 5 critical tables"
else
  print_error "RLS verification failed: only $RLS_ENABLED/5 tables have RLS enabled"
  exit 1
fi

# Check policies exist
print_info "Verifying policies are configured..."
POLICY_COUNT=$(psql "$DB_URL" -t -c "
  SELECT COUNT(*)
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('workspaces', 'foco_projects', 'labels', 'work_items', 'inbox_items');
")

POLICY_COUNT=$(echo "$POLICY_COUNT" | tr -d ' ')

if [ "$POLICY_COUNT" -gt "0" ]; then
  print_success "Found $POLICY_COUNT RLS policies"
else
  print_warning "No policies found - this may be a query issue"
fi

# Check helper functions exist
print_info "Verifying helper functions..."
FUNCTION_COUNT=$(psql "$DB_URL" -t -c "
  SELECT COUNT(*)
  FROM pg_proc
  WHERE proname IN ('user_has_workspace_access', 'user_is_workspace_admin', 'verify_rls_configuration');
")

FUNCTION_COUNT=$(echo "$FUNCTION_COUNT" | tr -d ' ')

if [ "$FUNCTION_COUNT" -eq "3" ]; then
  print_success "All helper functions present"
else
  print_warning "Expected 3 helper functions, found $FUNCTION_COUNT"
fi

# Run verification function
print_info "Running comprehensive RLS verification..."
psql "$DB_URL" -c "SELECT * FROM verify_rls_configuration();" 2>&1 | tee /tmp/rls_verification.log

# ============================================================================
# PERFORMANCE TEST
# ============================================================================

print_header "Performance Testing"

print_info "Testing query performance with RLS..."
START_TIME=$(date +%s%N)
psql "$DB_URL" -c "SELECT COUNT(*) FROM work_items LIMIT 100;" > /dev/null 2>&1
END_TIME=$(date +%s%N)
QUERY_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

if [ "$QUERY_TIME" -lt "200" ]; then
  print_success "Query performance: ${QUERY_TIME}ms (within 200ms target)"
else
  print_warning "Query performance: ${QUERY_TIME}ms (exceeds 200ms target)"
  echo "Consider running ANALYZE on tables to update statistics"
fi

# ============================================================================
# RECOMMENDATIONS
# ============================================================================

print_header "Next Steps"

echo "1. Test Application Functionality"
echo "   - Login to your application"
echo "   - Verify you can access your workspace"
echo "   - Verify you can view projects and work items"
echo "   - Test creating/updating/deleting items"
echo ""
echo "2. Monitor for Errors"
echo "   - Check application logs for 401/403 errors"
echo "   - Monitor database logs for RLS policy violations"
echo "   - Watch for performance issues"
echo ""
echo "3. Run Test Suite"
echo "   npm test tests/security/rls-policy-verification.test.ts"
echo ""
echo "4. If Issues Occur"
echo "   - Check logs: /tmp/rls_migration_output.log"
echo "   - Check verification: /tmp/rls_verification.log"
echo "   - Rollback if needed (see ROLLBACK section in migration file)"
echo ""
echo "5. Security Monitoring"
echo "   - Review audit logs: SELECT * FROM rls_audit_log ORDER BY created_at DESC LIMIT 100;"
echo "   - Monitor failed access attempts"
echo "   - Set up alerts for RLS policy violations"
echo ""

print_success "RLS Security Hardening Complete!"

echo ""
print_info "Migration completed at $(date)"
echo ""
