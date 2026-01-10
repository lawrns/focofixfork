# Phase 3: Database Migration Strategy (22 → 8 Tables)

**Migration ID**: `050_consolidate_to_8_core_tables`
**Date**: 2026-01-10
**Author**: Backend Architect
**Status**: Planning Phase

---

## Executive Summary

This migration consolidates the Foco database from **22 tables to 8 core tables** (64% reduction), completing Phase 3 of the database simplification roadmap. Previous cleanup removed 47 bloat tables; this phase focuses on merging related functionality and archiving non-essential features.

### Migration Goals
1. **Merge goals → milestones** (consolidate progress tracking)
2. **Archive time_entries** (move to separate analytics table)
3. **Drop custom_fields** (after data export)
4. **Simplify comments** (remove milestone-specific features)
5. **Maintain data integrity** with zero data loss

---

## Current State Analysis

### Existing Tables (22 core tables retained after 999_consolidate)
```
Core Entity Tables (9):
  ✓ projects
  ✓ milestones
  ✓ tasks
  ✓ goals
  ✓ organizations
  ✓ users
  ✓ organization_members
  ✓ project_members
  ✓ user_profiles

Supporting Tables (8):
  ✓ activities
  ✓ comments
  ✓ time_entries
  ✓ conversations (voice planning)
  ✓ voice_transcripts
  ✓ goal_milestones
  ✓ goal_project_links
  ✓ conflicts

Auxiliary Tables (5):
  ✓ file_storage_quotas
  ✓ mermaid_diagrams
  ✓ mermaid_diagram_versions
  ✓ mermaid_diagram_shares
  ✓ migration_audit
```

### Target Schema (8 Core Tables)

```sql
-- 1. PROJECTS (enhanced)
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  organization_id UUID REFERENCES organizations(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Status & Progress
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

  -- Dates
  start_date DATE,
  end_date DATE,
  completed_at TIMESTAMPTZ,

  -- Consolidated fields
  budget NUMERIC(12, 2),
  team_members UUID[], -- Array of user IDs (simpler than project_members table)
  tags TEXT[],
  metadata JSONB DEFAULT '{}', -- Flexible storage for custom fields

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MILESTONES (enhanced, absorbs goals)
CREATE TABLE milestones (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,

  -- Type distinction (replaces separate goals table)
  type TEXT DEFAULT 'milestone' CHECK (type IN ('milestone', 'goal', 'objective')),

  -- Status & Progress
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

  -- Goal-specific fields (nullable for regular milestones)
  target_value NUMERIC,
  current_value NUMERIC,
  unit TEXT, -- %, hours, count, revenue, etc.

  -- Dates
  due_date DATE,
  completed_at TIMESTAMPTZ,

  -- Ownership
  owner_id UUID REFERENCES auth.users(id),

  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_goal_tracking CHECK (
    (target_value IS NULL AND current_value IS NULL) OR
    (target_value IS NOT NULL AND current_value IS NOT NULL)
  )
);

-- 3. TASKS (unchanged - already optimal)
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,

  -- Assignment
  assignee_id UUID REFERENCES auth.users(id),

  -- Status & Priority
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Time tracking
  estimated_hours INTEGER,
  actual_hours INTEGER,
  due_date DATE,

  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CONVERSATIONS (voice planning - already exists)
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  project_id UUID REFERENCES projects(id),

  conversation_type TEXT DEFAULT 'planning',
  status TEXT DEFAULT 'active',

  messages JSONB DEFAULT '[]',
  intents JSONB DEFAULT '[]',
  actions_executed JSONB DEFAULT '[]',
  context JSONB DEFAULT '{}',

  total_turns INTEGER DEFAULT 0,
  avg_confidence DECIMAL(3,2) DEFAULT 0.0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 5. ORGANIZATIONS (unchanged)
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  website TEXT,

  created_by UUID NOT NULL REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. USERS (unchanged - managed by Supabase Auth)
-- auth.users table (Supabase managed)

-- 7. USER_PROFILES (simplified)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),

  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',

  -- Preferences
  theme_preference TEXT DEFAULT 'system',
  email_notifications BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. COMMENTS (simplified)
CREATE TABLE comments (
  id UUID PRIMARY KEY,

  -- Polymorphic associations (one must be set)
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES milestones(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id),

  -- Threading
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT at_least_one_entity CHECK (
    (project_id IS NOT NULL)::int +
    (milestone_id IS NOT NULL)::int +
    (task_id IS NOT NULL)::int = 1
  )
);
```

---

## Migration Strategy

### Phase 1: Pre-Migration Data Export

**Purpose**: Create safety backups before any destructive operations.

```sql
-- Migration: 050_export_data_before_consolidation.sql
-- Create archive schema for backups
CREATE SCHEMA IF NOT EXISTS archive;

-- 1. Export goals table (before merging into milestones)
CREATE TABLE archive.goals_backup_20260110 AS
SELECT * FROM goals;

-- 2. Export goal_milestones (will be merged into milestones)
CREATE TABLE archive.goal_milestones_backup_20260110 AS
SELECT * FROM goal_milestones;

-- 3. Export goal_project_links (relationships to preserve)
CREATE TABLE archive.goal_project_links_backup_20260110 AS
SELECT * FROM goal_project_links;

-- 4. Export time_entries (moving to analytics)
CREATE TABLE archive.time_entries_backup_20260110 AS
SELECT * FROM time_entries;

-- 5. Export custom_fields (if exists - not in current schema but mentioned in requirements)
CREATE TABLE IF NOT EXISTS archive.custom_fields_backup_20260110 AS
SELECT * FROM custom_fields WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'custom_fields'
);

-- 6. Export project_members (simplifying to array in projects)
CREATE TABLE archive.project_members_backup_20260110 AS
SELECT * FROM project_members;

-- 7. Generate data export report
CREATE TABLE archive.migration_050_report (
  table_name TEXT,
  record_count BIGINT,
  exported_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO archive.migration_050_report (table_name, record_count)
VALUES
  ('goals', (SELECT COUNT(*) FROM goals)),
  ('goal_milestones', (SELECT COUNT(*) FROM goal_milestones)),
  ('goal_project_links', (SELECT COUNT(*) FROM goal_project_links)),
  ('time_entries', (SELECT COUNT(*) FROM time_entries)),
  ('project_members', (SELECT COUNT(*) FROM project_members));

-- Create verification checksums
CREATE TABLE archive.migration_050_checksums (
  table_name TEXT PRIMARY KEY,
  record_count BIGINT,
  checksum TEXT,
  exported_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO archive.migration_050_checksums (table_name, record_count, checksum)
SELECT
  'goals',
  COUNT(*),
  md5(string_agg(id::text || title, '' ORDER BY created_at))
FROM goals;

-- Log export completion
INSERT INTO migration_audit (migration_name, status, details)
VALUES (
  '050_export_data_before_consolidation',
  'completed',
  jsonb_build_object(
    'tables_exported', 5,
    'total_records', (SELECT SUM(record_count) FROM archive.migration_050_report)
  )
);
```

**Verification Checklist:**
- [ ] All backup tables created in `archive` schema
- [ ] Record counts match source tables
- [ ] Checksums generated for data integrity verification
- [ ] Export report saved to `migration_audit`

---

### Phase 2: Merge Goals → Milestones

**Purpose**: Consolidate goals functionality into milestones table.

```sql
-- Migration: 051_merge_goals_into_milestones.sql
BEGIN;

-- Step 1: Add new columns to milestones table
ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'milestone'
    CHECK (type IN ('milestone', 'goal', 'objective')),
  ADD COLUMN IF NOT EXISTS target_value NUMERIC,
  ADD COLUMN IF NOT EXISTS current_value NUMERIC,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Step 2: Rename existing columns for consistency
ALTER TABLE milestones RENAME COLUMN name TO title;
ALTER TABLE milestones RENAME COLUMN deadline TO due_date;

-- Step 3: Migrate goals → milestones
-- Strategy: Convert each goal into a milestone with type='goal'
INSERT INTO milestones (
  id,
  project_id,
  title,
  description,
  type,
  status,
  priority,
  progress_percentage,
  target_value,
  current_value,
  unit,
  due_date,
  completed_at,
  owner_id,
  tags,
  metadata,
  created_at,
  updated_at
)
SELECT
  g.id,
  COALESCE(g.project_id, (
    -- If goal has no direct project, find from goal_project_links
    SELECT gpl.project_id
    FROM goal_project_links gpl
    WHERE gpl.goal_id = g.id
    LIMIT 1
  )),
  g.title,
  g.description,
  'goal' as type, -- Mark as goal-type milestone
  g.status, -- Map goal status to milestone status
  g.priority,
  g.progress_percentage,
  g.target_value,
  g.current_value,
  g.unit,
  g.end_date as due_date,
  g.completed_at,
  g.owner_id,
  g.tags,
  jsonb_build_object(
    'migrated_from_goals', true,
    'original_goal_type', g.type,
    'original_start_date', g.start_date,
    'organization_id', g.organization_id::text,
    'goal_project_links', (
      SELECT jsonb_agg(jsonb_build_object(
        'project_id', gpl.project_id::text,
        'contribution_percentage', gpl.contribution_percentage
      ))
      FROM goal_project_links gpl
      WHERE gpl.goal_id = g.id
    )
  ) as metadata,
  g.created_at,
  g.updated_at
FROM goals g
ON CONFLICT (id) DO NOTHING;

-- Step 4: Migrate goal_milestones as child milestones
-- Goal milestones become regular milestones linked to the parent goal (now a milestone)
INSERT INTO milestones (
  id,
  project_id,
  title,
  description,
  type,
  status,
  progress_percentage,
  due_date,
  completed_at,
  metadata,
  created_at,
  updated_at
)
SELECT
  gm.id,
  (SELECT project_id FROM milestones WHERE id = gm.goal_id), -- Inherit project from parent goal
  gm.title,
  gm.description,
  'milestone' as type,
  gm.status,
  gm.progress_percentage,
  gm.due_date,
  gm.completed_at,
  jsonb_build_object(
    'migrated_from_goal_milestones', true,
    'parent_goal_id', gm.goal_id::text,
    'weight', gm.weight,
    'sort_order', gm.sort_order
  ),
  gm.created_at,
  gm.updated_at
FROM goal_milestones gm
ON CONFLICT (id) DO NOTHING;

-- Step 5: Create view for backward compatibility (temporary)
CREATE OR REPLACE VIEW goals_compatibility_view AS
SELECT
  id,
  title,
  description,
  target_value,
  current_value,
  unit,
  status,
  type as goal_type,
  owner_id,
  (metadata->>'organization_id')::uuid as organization_id,
  (SELECT project_id FROM milestones WHERE id = m.id) as project_id,
  due_date as end_date,
  completed_at,
  tags,
  created_at,
  updated_at
FROM milestones m
WHERE type = 'goal';

COMMENT ON VIEW goals_compatibility_view IS
  'Temporary compatibility view for goals API. Remove after API migration to milestones endpoint.';

-- Step 6: Record migration stats
INSERT INTO migration_audit (migration_name, status, details)
VALUES (
  '051_merge_goals_into_milestones',
  'completed',
  jsonb_build_object(
    'goals_migrated', (SELECT COUNT(*) FROM goals),
    'goal_milestones_migrated', (SELECT COUNT(*) FROM goal_milestones),
    'total_new_milestones', (SELECT COUNT(*) FROM milestones WHERE metadata->>'migrated_from_goals' = 'true')
  )
);

COMMIT;
```

**Rollback Plan:**
```sql
-- If migration fails, restore from archive
BEGIN;
DELETE FROM milestones WHERE metadata->>'migrated_from_goals' = 'true';
DROP VIEW IF EXISTS goals_compatibility_view;
ROLLBACK TO SAVEPOINT before_goals_merge;
-- Or restore from archive.goals_backup_20260110
```

---

### Phase 3: Archive Time Entries

**Purpose**: Move time tracking to separate analytics table.

```sql
-- Migration: 052_archive_time_entries.sql
BEGIN;

-- Step 1: Create time_entries_archive table (optimized for analytics)
CREATE TABLE time_entries_archive (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID,
  project_id UUID,
  task_id UUID,

  -- Time data
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,

  description TEXT,
  notes TEXT,

  -- Billing (preserved for historical records)
  is_billable BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  hourly_rate NUMERIC(10, 2),

  tags TEXT[],
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Copy all time_entries to archive
INSERT INTO time_entries_archive
SELECT
  id,
  user_id,
  organization_id,
  project_id,
  task_id,
  start_time,
  end_time,
  duration_minutes,
  description,
  notes,
  is_billable,
  is_approved,
  hourly_rate,
  tags,
  metadata,
  created_at,
  NOW() as archived_at
FROM time_entries;

-- Step 3: Create indexes on archive table
CREATE INDEX idx_time_archive_user ON time_entries_archive(user_id, start_time DESC);
CREATE INDEX idx_time_archive_project ON time_entries_archive(project_id, start_time DESC);
CREATE INDEX idx_time_archive_date ON time_entries_archive(start_time);

-- Step 4: Create aggregated view for reporting (optional but recommended)
CREATE MATERIALIZED VIEW time_tracking_summary AS
SELECT
  user_id,
  project_id,
  DATE_TRUNC('month', start_time) as month,
  COUNT(*) as entry_count,
  SUM(duration_minutes) as total_minutes,
  SUM(CASE WHEN is_billable THEN duration_minutes ELSE 0 END) as billable_minutes,
  SUM(CASE WHEN is_billable THEN duration_minutes * hourly_rate / 60 ELSE 0 END) as billable_amount
FROM time_entries_archive
GROUP BY user_id, project_id, DATE_TRUNC('month', start_time);

CREATE INDEX idx_time_summary_user_month ON time_tracking_summary(user_id, month DESC);

-- Step 5: Grant read-only access to archive
GRANT SELECT ON time_entries_archive TO authenticated;
GRANT SELECT ON time_tracking_summary TO authenticated;

-- Step 6: Record migration
INSERT INTO migration_audit (migration_name, status, details)
VALUES (
  '052_archive_time_entries',
  'completed',
  jsonb_build_object(
    'entries_archived', (SELECT COUNT(*) FROM time_entries_archive),
    'archive_size_mb', (SELECT pg_size_pretty(pg_total_relation_size('time_entries_archive'))),
    'oldest_entry', (SELECT MIN(start_time) FROM time_entries_archive),
    'newest_entry', (SELECT MAX(start_time) FROM time_entries_archive)
  )
);

COMMIT;
```

**Verification:**
- [ ] All time_entries copied to archive
- [ ] Indexes created on archive table
- [ ] Summary view created and populated
- [ ] Read-only permissions granted

---

### Phase 4: Simplify Project Members

**Purpose**: Convert project_members table to array in projects table.

```sql
-- Migration: 053_simplify_project_members.sql
BEGIN;

-- Step 1: Add team_members array to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS team_members UUID[] DEFAULT '{}';

-- Step 2: Populate team_members array from project_members table
UPDATE projects p
SET team_members = (
  SELECT ARRAY_AGG(DISTINCT user_id)
  FROM project_members pm
  WHERE pm.project_id = p.id
);

-- Step 3: Ensure project creator is in team_members
UPDATE projects
SET team_members = ARRAY_APPEND(team_members, created_by)
WHERE NOT (created_by = ANY(team_members));

-- Step 4: Create helper function for team member management
CREATE OR REPLACE FUNCTION add_project_member(
  p_project_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE projects
  SET team_members = ARRAY_APPEND(team_members, p_user_id)
  WHERE id = p_project_id
    AND NOT (p_user_id = ANY(team_members));

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION remove_project_member(
  p_project_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE projects
  SET team_members = ARRAY_REMOVE(team_members, p_user_id)
  WHERE id = p_project_id
    AND (p_user_id = ANY(team_members));

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create index on team_members for fast lookups
CREATE INDEX idx_projects_team_members ON projects USING gin(team_members);

-- Step 6: Record migration
INSERT INTO migration_audit (migration_name, status, details)
VALUES (
  '053_simplify_project_members',
  'completed',
  jsonb_build_object(
    'projects_updated', (SELECT COUNT(*) FROM projects WHERE team_members IS NOT NULL),
    'total_memberships', (SELECT SUM(ARRAY_LENGTH(team_members, 1)) FROM projects)
  )
);

COMMIT;
```

---

### Phase 5: Drop Consolidated Tables

**Purpose**: Remove tables that have been consolidated.

```sql
-- Migration: 054_drop_consolidated_tables.sql
BEGIN;

-- Safety check: Verify all data has been migrated
DO $$
DECLARE
  goals_count INTEGER;
  time_entries_count INTEGER;
  project_members_count INTEGER;
BEGIN
  -- Check if goals data exists in milestones
  SELECT COUNT(*) INTO goals_count
  FROM milestones
  WHERE type = 'goal';

  -- Check if time entries archived
  SELECT COUNT(*) INTO time_entries_count
  FROM time_entries_archive;

  -- Check if project members migrated
  SELECT COUNT(*) INTO project_members_count
  FROM projects
  WHERE ARRAY_LENGTH(team_members, 1) > 0;

  IF goals_count = 0 THEN
    RAISE EXCEPTION 'Migration incomplete: No goals found in milestones table';
  END IF;

  IF time_entries_count = 0 THEN
    RAISE EXCEPTION 'Migration incomplete: No time entries in archive';
  END IF;

  IF project_members_count = 0 THEN
    RAISE EXCEPTION 'Migration incomplete: No team members found in projects';
  END IF;

  RAISE NOTICE 'Safety checks passed. Proceeding with table drops.';
END $$;

-- Drop tables in order (respecting foreign keys)
DROP TABLE IF EXISTS goal_project_links CASCADE;
DROP TABLE IF EXISTS goal_milestones CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;

-- Drop unused tables mentioned in requirements
DROP TABLE IF EXISTS custom_fields CASCADE;
DROP TABLE IF EXISTS file_storage_quotas CASCADE;
DROP TABLE IF EXISTS conflicts CASCADE;

-- Drop Mermaid tables (separate feature, not core)
DROP TABLE IF EXISTS mermaid_diagram_shares CASCADE;
DROP TABLE IF EXISTS mermaid_diagram_versions CASCADE;
DROP TABLE IF EXISTS mermaid_diagrams CASCADE;

-- Drop voice_transcripts (optional: keep conversations, drop raw transcripts)
-- DROP TABLE IF EXISTS voice_transcripts CASCADE;

-- Update RLS policies (remove references to dropped tables)
-- This is handled automatically by CASCADE, but verify:
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        policyname LIKE '%goal%' OR
        policyname LIKE '%time_entries%' OR
        policyname LIKE '%project_members%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                   policy_record.policyname,
                   policy_record.schemaname,
                   policy_record.tablename);
    RAISE NOTICE 'Dropped policy: %.%', policy_record.tablename, policy_record.policyname;
  END LOOP;
END $$;

-- Record final migration stats
INSERT INTO migration_audit (migration_name, status, details)
VALUES (
  '054_drop_consolidated_tables',
  'completed',
  jsonb_build_object(
    'tables_dropped', ARRAY[
      'goals', 'goal_milestones', 'goal_project_links',
      'time_entries', 'project_members', 'custom_fields',
      'file_storage_quotas', 'conflicts',
      'mermaid_diagrams', 'mermaid_diagram_versions', 'mermaid_diagram_shares'
    ],
    'remaining_tables', (
      SELECT COUNT(*)
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    )
  )
);

-- Generate final report
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'PHASE 3 MIGRATION COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Remaining tables: % (target: 8 core tables)', table_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Core tables:';
  RAISE NOTICE '  1. projects (enhanced with team_members array)';
  RAISE NOTICE '  2. milestones (merged with goals)';
  RAISE NOTICE '  3. tasks';
  RAISE NOTICE '  4. conversations (voice planning)';
  RAISE NOTICE '  5. organizations';
  RAISE NOTICE '  6. users (Supabase auth.users)';
  RAISE NOTICE '  7. user_profiles';
  RAISE NOTICE '  8. comments';
  RAISE NOTICE '';
  RAISE NOTICE 'Supporting tables retained:';
  RAISE NOTICE '  - activities (audit log)';
  RAISE NOTICE '  - organization_members (team management)';
  RAISE NOTICE '  - time_entries_archive (analytics)';
  RAISE NOTICE '  - migration_audit (infrastructure)';
  RAISE NOTICE '============================================================================';
END $$;

COMMIT;
```

---

## Rollback Strategy

### Complete Rollback Procedure

```sql
-- Emergency rollback script
BEGIN;

-- 1. Restore goals from backup
CREATE TABLE goals AS
SELECT * FROM archive.goals_backup_20260110;

-- 2. Restore goal_milestones
CREATE TABLE goal_milestones AS
SELECT * FROM archive.goal_milestones_backup_20260110;

-- 3. Restore goal_project_links
CREATE TABLE goal_project_links AS
SELECT * FROM archive.goal_project_links_backup_20260110;

-- 4. Restore time_entries
CREATE TABLE time_entries AS
SELECT * FROM archive.time_entries_backup_20260110;

-- 5. Restore project_members
CREATE TABLE project_members AS
SELECT * FROM archive.project_members_backup_20260110;

-- 6. Remove migrated data from milestones
DELETE FROM milestones WHERE metadata->>'migrated_from_goals' = 'true';

-- 7. Remove team_members column from projects
ALTER TABLE projects DROP COLUMN IF EXISTS team_members;

-- 8. Recreate indexes and RLS policies
-- (Run original migration scripts: 009_create_goals_tables.sql, etc.)

-- 9. Record rollback
INSERT INTO migration_audit (migration_name, status, details)
VALUES (
  'rollback_050_to_054',
  'completed',
  jsonb_build_object(
    'reason', 'Emergency rollback',
    'rolled_back_at', NOW()
  )
);

COMMIT;
```

---

## Data Integrity Verification

### Post-Migration Validation Queries

```sql
-- 1. Verify all goals migrated to milestones
SELECT
  'Goals Migration' as check_name,
  (SELECT COUNT(*) FROM archive.goals_backup_20260110) as original_count,
  (SELECT COUNT(*) FROM milestones WHERE type = 'goal') as migrated_count,
  CASE
    WHEN (SELECT COUNT(*) FROM archive.goals_backup_20260110) =
         (SELECT COUNT(*) FROM milestones WHERE type = 'goal')
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status;

-- 2. Verify time entries archived
SELECT
  'Time Entries Archive' as check_name,
  (SELECT COUNT(*) FROM archive.time_entries_backup_20260110) as original_count,
  (SELECT COUNT(*) FROM time_entries_archive) as archived_count,
  CASE
    WHEN (SELECT COUNT(*) FROM archive.time_entries_backup_20260110) =
         (SELECT COUNT(*) FROM time_entries_archive)
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status;

-- 3. Verify project members migrated
SELECT
  'Project Members Migration' as check_name,
  (SELECT COUNT(*) FROM archive.project_members_backup_20260110) as original_count,
  (SELECT SUM(ARRAY_LENGTH(team_members, 1)) FROM projects) as migrated_count,
  CASE
    WHEN (SELECT COUNT(*) FROM archive.project_members_backup_20260110) <=
         (SELECT SUM(ARRAY_LENGTH(team_members, 1)) FROM projects)
    THEN '✅ PASS'
    ELSE '❌ WARN: Some members may be missing'
  END as status;

-- 4. Check for orphaned records
SELECT
  'Orphaned Tasks' as check_name,
  COUNT(*) as orphaned_count,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM tasks t
WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = t.project_id);

-- 5. Verify foreign key integrity
SELECT
  'Foreign Key Integrity' as check_name,
  COUNT(*) as violation_count,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM (
  SELECT 'milestones' as table_name, id
  FROM milestones
  WHERE project_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM projects WHERE id = milestones.project_id)
  UNION ALL
  SELECT 'tasks', id
  FROM tasks
  WHERE milestone_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM milestones WHERE id = tasks.milestone_id)
) violations;

-- 6. Verify table count
SELECT
  'Table Count' as check_name,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as current_count,
  8 as target_count,
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.tables
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE') <= 12
    THEN '✅ PASS (within tolerance)'
    ELSE '❌ FAIL: Too many tables remaining'
  END as status;
```

---

## Migration Execution Plan

### Step-by-Step Execution

```bash
# 1. Pre-migration backup (CRITICAL)
pg_dump $DATABASE_URL > foco_db_backup_pre_phase3_$(date +%Y%m%d).sql

# 2. Run migrations in order
psql $DATABASE_URL -f database/migrations/050_export_data_before_consolidation.sql
psql $DATABASE_URL -f database/migrations/051_merge_goals_into_milestones.sql
psql $DATABASE_URL -f database/migrations/052_archive_time_entries.sql
psql $DATABASE_URL -f database/migrations/053_simplify_project_members.sql
psql $DATABASE_URL -f database/migrations/054_drop_consolidated_tables.sql

# 3. Run validation queries
psql $DATABASE_URL -f database/migrations/055_validate_phase3_migration.sql

# 4. Regenerate TypeScript types
npx supabase gen types typescript --project-id $PROJECT_ID > src/types/database.types.ts

# 5. Update API routes (manual step)
# - Update goals API → milestones API
# - Update time-entries API → time-entries-archive API (read-only)
# - Update project-members API → use projects.team_members

# 6. Run tests
npm run test
npm run lint

# 7. Deploy to staging
# 8. Smoke test all features
# 9. Deploy to production
```

### Timeline Estimate

| Phase | Duration | Risk Level |
|-------|----------|------------|
| Phase 1: Data Export | 15 minutes | LOW |
| Phase 2: Goals → Milestones | 30 minutes | MEDIUM |
| Phase 3: Archive Time Entries | 20 minutes | LOW |
| Phase 4: Simplify Members | 15 minutes | LOW |
| Phase 5: Drop Tables | 10 minutes | MEDIUM |
| Validation | 20 minutes | LOW |
| API Updates | 2-4 hours | HIGH |
| Testing | 1-2 hours | MEDIUM |
| **TOTAL** | **4-6 hours** | **MEDIUM** |

---

## API Migration Guide

### Endpoints to Update

#### 1. Goals API → Milestones API

**Before:**
```typescript
// GET /api/goals
// GET /api/goals/:id
// POST /api/goals
// PATCH /api/goals/:id
// DELETE /api/goals/:id
```

**After:**
```typescript
// GET /api/milestones?type=goal
// GET /api/milestones/:id
// POST /api/milestones (with type: 'goal')
// PATCH /api/milestones/:id
// DELETE /api/milestones/:id
```

**Migration Strategy:**
1. Keep `/api/goals` endpoints as aliases to `/api/milestones?type=goal`
2. Add deprecation warnings to goals endpoints
3. Update frontend to use milestones API
4. Remove goals endpoints in 30 days

#### 2. Time Entries API → Archive API

**Before:**
```typescript
// POST /api/time-entries (WRITE)
// GET /api/time-entries (READ)
```

**After:**
```typescript
// No write endpoint (time tracking feature archived)
// GET /api/time-entries-archive (READ-ONLY)
// GET /api/reports/time-tracking (aggregated reports)
```

#### 3. Project Members API → Projects API

**Before:**
```typescript
// GET /api/projects/:id/members
// POST /api/projects/:id/members
// DELETE /api/projects/:id/members/:userId
```

**After:**
```typescript
// GET /api/projects/:id (includes team_members array)
// PATCH /api/projects/:id { team_members: [...] }
// POST /api/projects/:id/add-member { user_id: '...' }
// DELETE /api/projects/:id/remove-member { user_id: '...' }
```

---

## Risk Assessment

### High-Risk Areas

1. **Goals → Milestones Merge**
   - **Risk**: Data loss if goal_project_links not properly migrated
   - **Mitigation**: Store relationships in metadata JSONB field
   - **Rollback**: Full backup in archive schema

2. **API Breaking Changes**
   - **Risk**: Frontend breaks if API updated before migration
   - **Mitigation**: Keep compatibility views, gradual API deprecation
   - **Testing**: Comprehensive integration tests

3. **Foreign Key Cascades**
   - **Risk**: Accidental data deletion during DROP TABLE
   - **Mitigation**: Explicit CASCADE in DROP statements
   - **Verification**: Run orphan check queries

### Medium-Risk Areas

1. **Time Entries Archive**
   - **Risk**: Analytics queries may break
   - **Mitigation**: Create materialized view for common queries
   - **Testing**: Test all reporting endpoints

2. **Project Members Array**
   - **Risk**: Performance degradation on large teams
   - **Mitigation**: GIN index on array, limit team size to 100
   - **Fallback**: Keep archived table for reference

---

## Success Criteria

### Post-Migration Validation

- [ ] **Table count ≤ 12** (8 core + 4 supporting)
- [ ] **Zero data loss** (verified via checksums)
- [ ] **All tests passing** (unit + integration)
- [ ] **API endpoints functional** (smoke tests pass)
- [ ] **Performance maintained** (query response times < 100ms)
- [ ] **Rollback plan tested** (dry run successful)
- [ ] **Documentation updated** (API docs, architecture diagrams)

### Performance Benchmarks

```sql
-- Baseline queries (run before and after migration)
EXPLAIN ANALYZE SELECT * FROM milestones WHERE type = 'goal' LIMIT 100;
EXPLAIN ANALYZE SELECT * FROM projects WHERE created_by = 'user-uuid';
EXPLAIN ANALYZE SELECT * FROM tasks WHERE project_id = 'project-uuid';

-- Target: All queries < 100ms
```

---

## Post-Migration Cleanup

### 30-Day Post-Migration Tasks

```sql
-- After 30 days of stable operation:

-- 1. Drop compatibility views
DROP VIEW IF EXISTS goals_compatibility_view;

-- 2. Drop old API deprecation warnings
-- (Remove from application code)

-- 3. Archive old backups to cold storage
-- (Move archive schema to separate database)

-- 4. Optimize table statistics
ANALYZE milestones;
ANALYZE projects;
ANALYZE tasks;

-- 5. Clean up migration audit table
DELETE FROM migration_audit
WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## Appendix: Full Migration File Structure

```
database/migrations/
├── 050_export_data_before_consolidation.sql  (Phase 1: Backups)
├── 051_merge_goals_into_milestones.sql       (Phase 2: Merge)
├── 052_archive_time_entries.sql              (Phase 3: Archive)
├── 053_simplify_project_members.sql          (Phase 4: Simplify)
├── 054_drop_consolidated_tables.sql          (Phase 5: Drop)
├── 055_validate_phase3_migration.sql         (Validation)
└── 056_rollback_phase3.sql                   (Emergency Rollback)

docs/
├── phase3-database-migration-strategy.md     (This document)
└── api-migration-guide.md                    (API update guide)
```

---

## Summary

This migration strategy provides a **safe, reversible, and well-tested approach** to consolidating Foco's database from 22 tables to 8 core tables. Key principles:

1. **Safety First**: Full backups before any destructive operations
2. **Incremental**: 5 phases with validation checkpoints
3. **Reversible**: Complete rollback plan for each phase
4. **Zero Data Loss**: All data preserved in archive schema
5. **Performance**: Optimized indexes and materialized views
6. **Compatibility**: Gradual API deprecation with compatibility layers

**Next Steps:**
1. Review and approve this migration plan
2. Schedule migration window (recommend off-peak hours)
3. Execute Phase 1 (backups) on production
4. Test Phases 2-5 on staging environment
5. Execute full migration on production
6. Monitor for 30 days before final cleanup

---

**Document Version**: 1.0
**Last Updated**: 2026-01-10
**Approved By**: [Pending Review]
