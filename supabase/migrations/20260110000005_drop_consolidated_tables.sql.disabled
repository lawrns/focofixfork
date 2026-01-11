/**
 * Phase 3 Migration - Phase 5: Drop Consolidated Tables
 *
 * Purpose: Remove tables that have been consolidated
 * Risk Level: MEDIUM
 * Duration: ~10 minutes
 *
 * CRITICAL: This migration is destructive. Ensure all previous phases
 * completed successfully before running this migration.
 */

BEGIN;

-- Safety check: Verify all data has been migrated
DO $$
DECLARE
  goals_count INTEGER;
  time_entries_count INTEGER;
  project_members_count INTEGER;
  error_messages TEXT[] := ARRAY[]::TEXT[];
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
  WHERE team_members IS NOT NULL
    AND ARRAY_LENGTH(team_members, 1) > 0;

  -- Collect any errors
  IF goals_count = 0 THEN
    error_messages := array_append(error_messages,
      'Migration incomplete: No goals found in milestones table');
  END IF;

  IF time_entries_count = 0 THEN
    error_messages := array_append(error_messages,
      'Migration incomplete: No time entries in archive');
  END IF;

  IF project_members_count = 0 THEN
    error_messages := array_append(error_messages,
      'Warning: No team members found in projects (this may be expected if no projects have members)');
  END IF;

  -- Report results
  IF array_length(error_messages, 1) > 0 THEN
    RAISE WARNING 'Safety check warnings:';
    FOR i IN 1..array_length(error_messages, 1) LOOP
      RAISE WARNING '  - %', error_messages[i];
    END LOOP;

    -- Only fail on critical errors (goals and time_entries)
    IF goals_count = 0 OR time_entries_count = 0 THEN
      RAISE EXCEPTION 'Critical migration safety check failed. Aborting table drops.';
    END IF;
  ELSE
    RAISE NOTICE 'Safety checks passed. Proceeding with table drops.';
  END IF;
END $$;

-- Drop tables in order (respecting foreign keys)
-- Goals-related tables
DROP TABLE IF EXISTS goal_project_links CASCADE;
DROP TABLE IF EXISTS goal_milestones CASCADE;
DROP TABLE IF EXISTS goals CASCADE;

RAISE NOTICE 'Dropped goals-related tables (3 tables)';

-- Time tracking table
DROP TABLE IF EXISTS time_entries CASCADE;

RAISE NOTICE 'Dropped time_entries table';

-- Project members table
DROP TABLE IF EXISTS project_members CASCADE;

RAISE NOTICE 'Dropped project_members table';

-- Drop unused tables mentioned in requirements
DO $$
BEGIN
  -- Drop custom_fields if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'custom_fields'
  ) THEN
    DROP TABLE custom_fields CASCADE;
    RAISE NOTICE 'Dropped custom_fields table';
  END IF;

  -- Drop file_storage_quotas if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'file_storage_quotas'
  ) THEN
    DROP TABLE file_storage_quotas CASCADE;
    RAISE NOTICE 'Dropped file_storage_quotas table';
  END IF;

  -- Drop conflicts if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'conflicts'
  ) THEN
    DROP TABLE conflicts CASCADE;
    RAISE NOTICE 'Dropped conflicts table';
  END IF;
END $$;

-- Drop Mermaid tables (separate feature, not core to Phase 3 simplification)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'mermaid_diagram_shares'
  ) THEN
    DROP TABLE mermaid_diagram_shares CASCADE;
    DROP TABLE mermaid_diagram_versions CASCADE;
    DROP TABLE mermaid_diagrams CASCADE;
    RAISE NOTICE 'Dropped mermaid-related tables (3 tables)';
  END IF;
END $$;

-- Optional: Drop voice_transcripts (keep conversations, drop raw transcripts)
-- Uncomment if you want to remove this table:
-- DROP TABLE IF EXISTS voice_transcripts CASCADE;

-- Update RLS policies (remove references to dropped tables)
DO $$
DECLARE
  policy_record RECORD;
  dropped_count INTEGER := 0;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        policyname ILIKE '%goal%' OR
        policyname ILIKE '%time_entries%' OR
        policyname ILIKE '%project_members%' OR
        policyname ILIKE '%custom_field%'
      )
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                     policy_record.policyname,
                     policy_record.schemaname,
                     policy_record.tablename);
      dropped_count := dropped_count + 1;
      RAISE NOTICE 'Dropped policy: %.%', policy_record.tablename, policy_record.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to drop policy %.%: %', policy_record.tablename, policy_record.policyname, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Total policies dropped: %', dropped_count;
END $$;

-- Record final migration stats
INSERT INTO migration_audit (migration_name, status, details)
VALUES (
  '054_drop_consolidated_tables',
  'completed',
  jsonb_build_object(
    'tables_dropped', ARRAY[
      'goals', 'goal_milestones', 'goal_project_links',
      'time_entries', 'project_members'
    ],
    'optional_tables_dropped', ARRAY[
      'custom_fields', 'file_storage_quotas', 'conflicts',
      'mermaid_diagrams', 'mermaid_diagram_versions', 'mermaid_diagram_shares'
    ],
    'remaining_tables', (
      SELECT COUNT(*)
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    ),
    'migration_timestamp', NOW()
  )
);

-- Generate final report
DO $$
DECLARE
  table_count INTEGER;
  table_list TEXT;
BEGIN
  SELECT COUNT(*)
  INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

  SELECT string_agg(table_name, ', ' ORDER BY table_name)
  INTO table_list
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'PHASE 5: CONSOLIDATED TABLES DROPPED';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  Tables removed:';
  RAISE NOTICE '  ✓ goals';
  RAISE NOTICE '  ✓ goal_milestones';
  RAISE NOTICE '  ✓ goal_project_links';
  RAISE NOTICE '  ✓ time_entries';
  RAISE NOTICE '  ✓ project_members';
  RAISE NOTICE '  ✓ custom_fields (if existed)';
  RAISE NOTICE '  ✓ file_storage_quotas (if existed)';
  RAISE NOTICE '  ✓ conflicts (if existed)';
  RAISE NOTICE '  ✓ mermaid_* tables (if existed)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Remaining tables: % (target: 8-12 core tables)', table_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Tables: %', table_list;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Phase 3 Database Migration Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Run 055_validate_phase3_migration.sql';
  RAISE NOTICE '  2. Update API routes to use new schema';
  RAISE NOTICE '  3. Regenerate TypeScript types';
  RAISE NOTICE '  4. Run tests';
  RAISE NOTICE '============================================================================';
END $$;

COMMIT;
