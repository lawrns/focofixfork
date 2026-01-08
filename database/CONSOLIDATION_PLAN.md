# Foco Database Schema Consolidation Plan

**Date:** 2026-01-08
**Status:** Analysis Complete - Ready for Review
**Objective:** Aggressive consolidation - Remove all unused tables not directly related to core project management

---

## Executive Summary

**Current State:** 69 tables identified in Supabase types
**Recommended Action:** DELETE 47 tables (68% reduction)
**Keep:** 22 core tables (32%)

---

## Table Classification

### ✅ CORE TABLES (KEEP - 22 tables)

These tables are essential for the core product: projects, tasks, milestones, goals, user profiles, organization management, real-time collaboration, and voice planning execution.

#### 1. Core Entities (7 tables)
- `projects` - Core entity
- `tasks` - Core entity
- `milestones` - Core entity
- `goals` - Strategic planning feature
- `goal_milestones` - Goal tracking
- `goal_project_links` - Goal-project relationships
- `comments` - Collaboration

#### 2. Organization & User Management (6 tables)
- `organizations` - Multi-tenancy
- `organization_members` - Org membership
- `organization_invites` - Org invitations (active feature)
- `user_profiles` - User data
- `profiles` - Auth profiles (may be auth.users alias)
- `users` - Core auth (may be auth.users)

#### 3. Project Collaboration (3 tables)
- `project_members` - Project team membership
- `project_team_assignments` - Team assignments
- `activities` - Activity feed

#### 4. Voice Planning (4 tables)
- `voice_sessions` - Voice capture sessions
- `voice_audio_chunks` - Audio storage
- `voice_plan_dependencies` - Task dependencies
- `voice_plan_audit` - Audit trail

#### 5. Infrastructure (2 tables)
- `schema_migrations` - Migration tracking
- `migration_audit` - Migration audit
- `down_migrations` - Rollback support

---

## 🗑️ TABLES TO DELETE (47 tables)

### Category 1: Gamification (UNUSED - 8 tables)
**Rationale:** No gamification features in current roadmap, no API routes, experimental

- `achievements` - User achievements/badges
- `user_activity_tracking` - Activity tracking for gamification
- `user_progress` - Progress tracking
- `user_skills` - Skills tracking
- `module_progress` - Module completion
- `team_sentiment_analysis` - Sentiment analysis
- `automated_workflow_rules` - Automation rules
- `webhook_events` - Webhook logging

**Migration Impact:**
- Created in: Unknown (not in migrations folder, likely early prototype)
- Foreign Keys: References `users`
- Data Risk: LOW (experimental feature, likely empty)

**API Usage:** ❌ No API routes found

---

### Category 2: Trading/Market Data (UNUSED - 0 tables but 2 API routes)
**Rationale:** No trading tables found, but trading API routes exist

**API Routes to Remove:**
- `/api/orderbook/stream/route.ts`
- `/api/market-data/route.ts`

**Note:** These routes may use external APIs or in-memory data

---

### Category 3: Subscription/Billing (EXPERIMENTAL - 7 tables)
**Rationale:** Not part of core MVP, can use external billing (Stripe, etc.)

- `subscriptions` - Subscription records (not in types but referenced)
- `subscription_plans` - Plan definitions
- `subscription_history` - Billing history
- `user_subscriptions` - User subscription links
- `customers` - Customer records (Stripe?)
- `session_analytics` - Analytics
- `subscription_analytics` - Subscription metrics

**Migration Impact:**
- Created in: Unknown (not in migrations folder)
- Foreign Keys: References `users`, `organizations`
- Data Risk: MEDIUM (may have real billing data)

**Recommendation:** Migrate to Stripe Customer Portal before deletion

**API Usage:** ❌ No direct API routes found

---

### Category 4: Legacy Crico System (LEGACY - 10 tables)
**Rationale:** Old system being replaced, prefixed with "crico\_"

- `crico_lists` - Legacy list management
- `crico_list_history` - List history
- `crico_milestone_user_links` - Legacy milestone links
- `crico_user_invites` - Legacy invites
- `crico_user_sessions` - Legacy sessions
- `crico_users` - Legacy user table
- `crico_projects` (referenced in DB functions but not in types)
- `crico_milestones` (referenced in DB functions but not in types)
- `crico_settings` (referenced in DB functions but not in types)
- `crico_templates` (referenced in DB functions but not in types)

**Migration Impact:**
- Created in: Unknown (legacy system)
- Foreign Keys: Self-contained crico\_ namespace
- Data Risk: HIGH (may have production data)

**Recommendation:** Export data, then delete

**API Usage:** ❌ No API routes found (legacy)

---

### Category 5: Over-Engineered Milestone Features (EXPERIMENTAL - 8 tables)
**Rationale:** Overly complex features not in core product

- `milestone_checklists` - Checklist items (use tasks instead)
- `milestone_comments` - Duplicate of comments table
- `milestone_history` - Version history (audit log covers this)
- `milestone_labels` - Tags/labels (use JSONB metadata)
- `milestone_time_tracking` - Time tracking (use time_entries)
- `milestone_users` - User assignments (use project_members)
- `milestone_watchers` - Watchers (use notifications)
- `ai_suggestions` - AI suggestions (ephemeral, can be in-memory)

**Migration Impact:**
- Created in: Unknown (feature creep)
- Foreign Keys: References `milestones`, `users`
- Data Risk: MEDIUM (may have user data)

**Recommendation:** Migrate checklist items to tasks, labels to JSONB metadata

**API Usage:** ❌ No API routes found

---

### Category 6: Redundant Time Tracking (DUPLICATE - 2 tables)
**Rationale:** Duplicate time tracking implementations

- `timer_sessions` - Timer sessions (from migration 003)
- `milestone_time_tracking` - Milestone-specific time tracking

**Keep:** `time_entries` (from migration 010, more complete)

**Migration Impact:**
- Created in: 003_create_missing_feature_tables.sql
- Foreign Keys: References `users`, `projects`, `tasks`, `milestones`
- Data Risk: LOW (likely unused)

**API Usage:** ❌ No API routes found

---

### Category 7: Redundant Conflict/File Storage (EXPERIMENTAL - 3 tables)
**Rationale:** Over-engineered for MVP

- `conflict_logs` - Conflict resolution log (from migration 003)
- `conflicts` - Conflict tracking (from migration 010)
- `file_storage_quotas` - Storage quota tracking

**Keep:** `conflicts` (more complete from migration 010)

**Recommendation:** Remove file storage (use Supabase Storage API directly)

**Migration Impact:**
- Created in: 003_create_missing_feature_tables.sql, 010_create_time_tracking_tables.sql
- Foreign Keys: References `users`, `organizations`
- Data Risk: LOW (likely unused)

**API Usage:** ❌ No API routes found

---

### Category 8: Comment Reactions (EXPERIMENTAL - 1 table)
**Rationale:** Nice-to-have feature, not core

- `comment_reactions` - Emoji reactions to comments

**Migration Impact:**
- Created in: 003_create_missing_feature_tables.sql
- Foreign Keys: References `comments`, `users`
- Data Risk: LOW (cosmetic feature)

**API Usage:** ❌ No API routes found

---

### Category 9: Files/Attachments (EXPERIMENTAL - 1 table)
**Rationale:** Use Supabase Storage bucket instead

- `files` - File metadata

**Migration Impact:**
- Created in: Unknown
- Foreign Keys: References `users`, `projects`, `tasks`, `milestones`
- Data Risk: MEDIUM (may have file references)

**Recommendation:** Migrate to Supabase Storage bucket

**API Usage:** ❌ No API routes found

---

### Category 10: Project Metadata Overload (EXPERIMENTAL - 6 tables)
**Rationale:** Over-engineered analytics, store in JSONB

- `project_intelligence_metrics` - AI metrics
- `project_metadata` - Custom metadata
- `project_risk_predictions` - Risk predictions
- `project_settings` - Project-specific settings
- `component_performance_logs` - Performance logging
- `system_settings` - System config

**Recommendation:** Store in JSONB columns on projects table

**Migration Impact:**
- Created in: Unknown
- Foreign Keys: References `projects`
- Data Risk: LOW (analytics data)

**API Usage:** ❌ No API routes found

---

### Category 11: Real-time/Notifications Overload (EXPERIMENTAL - 4 tables)
**Rationale:** Use Supabase Realtime + simple notifications table

- `real_time_events` - Real-time event log
- `real_time_subscriptions` - Subscription tracking
- `user_notification_preferences` - Notification settings (JSONB)
- `notifications` - Keep but simplify

**Keep:** `notifications` (core feature)

**Migration Impact:**
- Created in: Unknown
- Foreign Keys: References `users`
- Data Risk: LOW (can regenerate)

**API Usage:** ✅ `/api/notifications/` routes exist (keep notifications table)

---

### Category 12: Activity Logging Duplication (DUPLICATE - 4 tables)
**Rationale:** Too many activity tracking tables

- `activity_log` - Generic activity log
- `session_activity_log` - Session activity
- `user_activity_log` - User-specific activity
- `user_activity_tracking` - Activity tracking

**Keep:** `activities` (most complete, from migration 013)

**Migration Impact:**
- Created in: Unknown
- Foreign Keys: References `users`, `projects`, `organizations`
- Data Risk: MEDIUM (audit data)

**API Usage:** ✅ `/api/activities/route.ts` uses `activities` table

---

### Category 13: Session/Auth Overload (DUPLICATE - 3 tables)
**Rationale:** Use auth.sessions from Supabase Auth

- `user_sessions` - User sessions
- `user_login_history` - Login tracking
- `user_login_attempts` - Security tracking

**Recommendation:** Use Supabase Auth built-in session management

**Migration Impact:**
- Created in: Unknown
- Foreign Keys: References `users`
- Data Risk: LOW (can regenerate)

**API Usage:** ❌ No API routes found (Supabase Auth handles this)

---

### Category 14: Permissions/Teams Overload (EXPERIMENTAL - 2 tables)
**Rationale:** RBAC handled by organization_members.role

- `user_permissions` - Fine-grained permissions
- `teams` - Separate team entity
- `team_members` - Team membership

**Keep:** Use `organization_members` and `project_members` instead

**Migration Impact:**
- Created in: Unknown
- Foreign Keys: References `users`, `organizations`, `projects`
- Data Risk: MEDIUM (access control data)

**Recommendation:** Migrate to role-based access in organization_members

**API Usage:** ❌ No API routes found

---

## 📊 Summary Statistics

| Category | Tables to Delete | Data Risk | Migration Complexity |
|----------|-----------------|-----------|---------------------|
| Gamification | 8 | LOW | LOW |
| Trading/Market | 0 (2 API routes) | NONE | LOW |
| Subscription/Billing | 7 | MEDIUM | MEDIUM |
| Legacy Crico | 10 | HIGH | HIGH |
| Milestone Features | 8 | MEDIUM | MEDIUM |
| Time Tracking Dupes | 2 | LOW | LOW |
| Conflict/Storage | 3 | LOW | LOW |
| Comment Reactions | 1 | LOW | LOW |
| Files/Attachments | 1 | MEDIUM | MEDIUM |
| Project Metadata | 6 | LOW | LOW |
| Real-time/Notifications | 4 (keep notifications) | LOW | LOW |
| Activity Logging | 4 | MEDIUM | MEDIUM |
| Session/Auth | 3 | LOW | LOW |
| Permissions/Teams | 3 | MEDIUM | MEDIUM |
| **TOTAL** | **47 tables** | - | - |

---

## 🔧 Migration Dependencies to Remove/Update

### Migrations to Delete Entirely
- `003_create_missing_feature_tables.sql` - Creates timer_sessions, comment_reactions, conflict_logs
  - **Keep:** None (all tables being deleted)
  - **Action:** Delete migration file

### Migrations to Keep (with modifications)
- `009_create_goals_tables.sql` - ✅ Keep (core feature)
- `010_create_time_tracking_tables.sql` - ⚠️ Keep time_entries, remove conflicts and file_storage_quotas
- `013_create_activities_table.sql` - ✅ Keep (core feature)
- `014_create_tasks_milestones_tables.sql` - ✅ Keep (core feature)
- `015_add_voice_planning_tables.sql` - ✅ Keep (core feature)
- `030_create_mermaid_tables.sql` - ⚠️ OPTIONAL (keep if mermaid feature is core)
- `040_create_migration_audit_tables.sql` - ✅ Keep (infrastructure)
- `999_comprehensive_database_fixes.sql` - ✅ Keep (RLS policies)

### Database Functions to Remove (from types.ts)
All functions with prefix:
- `*_crico_*` (50+ functions) - Legacy system
- `analyze_team_sentiment` - Unused
- `check_suspicious_activity` - Unused
- `cleanup_expired_sessions` - Unused
- `cleanup_old_performance_logs` - Unused
- `log_component_performance` - Unused
- `track_user_activity` - Unused

---

## 🚨 RLS Policies to Clean Up

After deleting tables, clean up these RLS policies:

1. All policies on deleted tables (auto-removed with DROP TABLE CASCADE)
2. Functions that reference deleted tables
3. Triggers on deleted tables (auto-removed with DROP TABLE CASCADE)

---

## 📝 Safe Deletion Script

### Step 1: Backup Data (if needed)
```sql
-- Export crico tables (if production data exists)
COPY (SELECT * FROM crico_lists) TO '/tmp/crico_lists_backup.csv' CSV HEADER;
COPY (SELECT * FROM crico_users) TO '/tmp/crico_users_backup.csv' CSV HEADER;
-- ... export other high-risk tables

-- Export subscription data (if using)
COPY (SELECT * FROM user_subscriptions) TO '/tmp/subscriptions_backup.csv' CSV HEADER;
```

### Step 2: Drop Tables (in order of dependencies)

```sql
-- ============================================================================
-- FOCO DATABASE CONSOLIDATION SCRIPT
-- Date: 2026-01-08
-- Purpose: Remove 47 unused tables (68% reduction)
-- ============================================================================

BEGIN;

-- Disable FK checks temporarily (PostgreSQL doesn't have this, so we'll use CASCADE)
-- DROP TABLE CASCADE will handle foreign key dependencies automatically

-- ============================================================================
-- CATEGORY 1: GAMIFICATION (8 tables)
-- ============================================================================
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS user_activity_tracking CASCADE;
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS user_skills CASCADE;
DROP TABLE IF EXISTS module_progress CASCADE;
DROP TABLE IF EXISTS team_sentiment_analysis CASCADE;
DROP TABLE IF EXISTS automated_workflow_rules CASCADE;
DROP TABLE IF EXISTS webhook_events CASCADE;

-- ============================================================================
-- CATEGORY 2: SUBSCRIPTION/BILLING (7 tables)
-- ============================================================================
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS subscription_history CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS session_analytics CASCADE;
DROP TABLE IF EXISTS subscription_analytics CASCADE;

-- ============================================================================
-- CATEGORY 3: LEGACY CRICO SYSTEM (10 tables)
-- ============================================================================
DROP TABLE IF EXISTS crico_list_history CASCADE;
DROP TABLE IF EXISTS crico_milestone_user_links CASCADE;
DROP TABLE IF EXISTS crico_user_invites CASCADE;
DROP TABLE IF EXISTS crico_user_sessions CASCADE;
DROP TABLE IF EXISTS crico_lists CASCADE;
DROP TABLE IF EXISTS crico_users CASCADE;
DROP TABLE IF EXISTS crico_milestones CASCADE;
DROP TABLE IF EXISTS crico_projects CASCADE;
DROP TABLE IF EXISTS crico_settings CASCADE;
DROP TABLE IF EXISTS crico_templates CASCADE;

-- ============================================================================
-- CATEGORY 4: OVER-ENGINEERED MILESTONE FEATURES (8 tables)
-- ============================================================================
DROP TABLE IF EXISTS milestone_checklists CASCADE;
DROP TABLE IF EXISTS milestone_comments CASCADE;
DROP TABLE IF EXISTS milestone_history CASCADE;
DROP TABLE IF EXISTS milestone_labels CASCADE;
DROP TABLE IF EXISTS milestone_time_tracking CASCADE;
DROP TABLE IF EXISTS milestone_users CASCADE;
DROP TABLE IF EXISTS milestone_watchers CASCADE;
DROP TABLE IF EXISTS ai_suggestions CASCADE;

-- ============================================================================
-- CATEGORY 5: REDUNDANT TIME TRACKING (2 tables)
-- ============================================================================
DROP TABLE IF EXISTS timer_sessions CASCADE;
DROP TABLE IF EXISTS milestone_time_tracking CASCADE; -- Already dropped above, but explicit

-- ============================================================================
-- CATEGORY 6: REDUNDANT CONFLICT/FILE STORAGE (3 tables)
-- ============================================================================
DROP TABLE IF EXISTS conflict_logs CASCADE;
DROP TABLE IF EXISTS file_storage_quotas CASCADE;
-- KEEP: conflicts (from migration 010)

-- ============================================================================
-- CATEGORY 7: COMMENT REACTIONS (1 table)
-- ============================================================================
DROP TABLE IF EXISTS comment_reactions CASCADE;

-- ============================================================================
-- CATEGORY 8: FILES/ATTACHMENTS (1 table)
-- ============================================================================
DROP TABLE IF EXISTS files CASCADE;

-- ============================================================================
-- CATEGORY 9: PROJECT METADATA OVERLOAD (6 tables)
-- ============================================================================
DROP TABLE IF EXISTS project_intelligence_metrics CASCADE;
DROP TABLE IF EXISTS project_metadata CASCADE;
DROP TABLE IF EXISTS project_risk_predictions CASCADE;
DROP TABLE IF EXISTS project_settings CASCADE;
DROP TABLE IF EXISTS component_performance_logs CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;

-- ============================================================================
-- CATEGORY 10: REAL-TIME/NOTIFICATIONS OVERLOAD (3 tables, keep notifications)
-- ============================================================================
DROP TABLE IF EXISTS real_time_events CASCADE;
DROP TABLE IF EXISTS real_time_subscriptions CASCADE;
DROP TABLE IF EXISTS user_notification_preferences CASCADE;
-- KEEP: notifications

-- ============================================================================
-- CATEGORY 11: ACTIVITY LOGGING DUPLICATION (4 tables, keep activities)
-- ============================================================================
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS session_activity_log CASCADE;
DROP TABLE IF EXISTS user_activity_log CASCADE;
-- KEEP: activities (from migration 013)
-- Note: user_activity_tracking already dropped in gamification section

-- ============================================================================
-- CATEGORY 12: SESSION/AUTH OVERLOAD (3 tables)
-- ============================================================================
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS user_login_history CASCADE;
DROP TABLE IF EXISTS user_login_attempts CASCADE;

-- ============================================================================
-- CATEGORY 13: PERMISSIONS/TEAMS OVERLOAD (3 tables)
-- ============================================================================
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- ============================================================================
-- CATEGORY 14: DROP LEGACY FUNCTIONS
-- ============================================================================

-- Drop all crico-related functions
DO $$
DECLARE
  func_name text;
BEGIN
  FOR func_name IN
    SELECT routine_name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_type = 'FUNCTION'
      AND (
        routine_name LIKE '%crico%'
        OR routine_name IN (
          'analyze_team_sentiment',
          'check_suspicious_activity',
          'cleanup_expired_sessions',
          'cleanup_old_performance_logs',
          'log_component_performance',
          'track_user_activity'
        )
      )
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I CASCADE', func_name);
  END LOOP;
END $$;

-- ============================================================================
-- VERIFICATION: Show remaining tables
-- ============================================================================

SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Expected count: ~22 tables remaining

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'DATABASE CONSOLIDATION COMPLETE ✅';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Deleted: 47 tables (68%% reduction)';
  RAISE NOTICE 'Remaining: ~22 core tables';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Regenerate Supabase types: npx supabase gen types typescript';
  RAISE NOTICE '  2. Update DatabaseService to remove deleted table methods';
  RAISE NOTICE '  3. Remove unused API routes (market-data, orderbook)';
  RAISE NOTICE '  4. Test application thoroughly';
  RAISE NOTICE '============================================================================';
END $$;

COMMIT;
```

---

## 🎯 Post-Deletion Cleanup

### 1. Regenerate Supabase Types
```bash
npx supabase gen types typescript --project-id <project-id> > src/lib/supabase/types.ts
```

### 2. Update DatabaseService
Remove methods for deleted tables from `/Users/lukatenbosch/focofixfork/src/lib/database/service.ts`

### 3. Remove Unused API Routes
```bash
rm -rf src/app/api/orderbook
rm -rf src/app/api/market-data
rm -rf src/app/api/doctors  # If exists
rm -rf src/app/api/gamification  # If exists
rm -rf src/app/api/free-questions  # If exists
```

### 4. Delete Migration Files
```bash
rm database/migrations/003_create_missing_feature_tables.sql
```

### 5. Update Migration Scripts
Ensure `scripts/apply-migrations.js` and `scripts/run-database-migration.js` skip deleted migrations.

---

## ✅ Validation Checklist

After running the consolidation script:

- [ ] Verify 22 core tables remain
- [ ] Check no broken foreign keys
- [ ] Regenerate Supabase types
- [ ] Run linter: `npm run lint`
- [ ] Run tests: `npm test`
- [ ] Test core user flows:
  - [ ] User can create project
  - [ ] User can create tasks
  - [ ] User can create milestones
  - [ ] User can use voice planning
  - [ ] User can view activities
  - [ ] Organization invites work
- [ ] Verify RLS policies work correctly
- [ ] Check Supabase dashboard for errors

---

## 🚀 Expected Results

### Before Consolidation
- **Tables:** 69
- **Database Complexity:** HIGH
- **Type File Size:** ~4000 lines
- **Maintenance Burden:** HIGH

### After Consolidation
- **Tables:** 22 (68% reduction)
- **Database Complexity:** LOW
- **Type File Size:** ~1200 lines (estimated)
- **Maintenance Burden:** LOW

### Performance Improvements
- Faster type checking
- Smaller bundle size
- Simpler RLS policy management
- Reduced migration complexity
- Clearer data model

---

## ⚠️ Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Production data loss | LOW | HIGH | Backup all tables before deletion |
| Broken app features | MEDIUM | HIGH | Test thoroughly after deletion |
| Type errors | HIGH | MEDIUM | Regenerate types, run TypeScript check |
| Missing API routes | LOW | MEDIUM | Grep codebase for table references |
| RLS policy errors | MEDIUM | HIGH | Test with real users in staging |

---

## 📅 Recommended Rollout

### Phase 1: Low Risk (1 day)
Delete tables with NO data risk and NO foreign keys:
- Gamification tables
- Session tracking tables
- Performance logs

### Phase 2: Medium Risk (2 days)
Delete tables with MEDIUM data risk:
- Milestone feature tables
- Project metadata tables
- File storage tables

### Phase 3: High Risk (3 days)
Delete tables with HIGH data risk (after data migration):
- Legacy Crico tables
- Subscription tables
- User permissions tables

### Phase 4: Verification (2 days)
- Run full test suite
- User acceptance testing
- Monitor production for errors

**Total Timeline:** 8 days

---

## 🎓 Lessons Learned

This consolidation reveals common anti-patterns:

1. **Feature Creep:** Too many "nice-to-have" features (gamification, sentiment analysis)
2. **Duplication:** Multiple tables for same purpose (activity logs, time tracking, conflicts)
3. **Over-Engineering:** Complex features before MVP (milestone checklists, labels, watchers)
4. **Legacy Debt:** Old system not cleaned up (crico\_\* tables)
5. **Poor Planning:** Tables without API routes or UI (zombie tables)

### Best Practices for Future
- ✅ Start with minimal schema
- ✅ Add tables only when feature is coded
- ✅ Delete old tables when refactoring
- ✅ Use JSONB for flexible metadata instead of new tables
- ✅ Review schema quarterly for unused tables

---

## 📞 Support

If issues arise during consolidation:
1. Rollback transaction immediately: `ROLLBACK;`
2. Review error messages in Supabase logs
3. Check foreign key constraints: `SELECT * FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY';`
4. Restore from backup if needed

---

**End of Consolidation Plan**
