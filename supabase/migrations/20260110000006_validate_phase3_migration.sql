/**
 * Phase 3 Migration - Validation Queries
 *
 * Purpose: Verify all data migrated correctly and integrity maintained
 * Risk Level: N/A (read-only validation)
 * Duration: ~5 minutes
 *
 * This script runs comprehensive validation checks to ensure the
 * Phase 3 migration completed successfully with zero data loss.
 */

-- Create temporary table for validation results
CREATE TEMP TABLE migration_validation_results (
  check_name TEXT,
  status TEXT,
  original_count BIGINT,
  migrated_count BIGINT,
  message TEXT,
  severity TEXT
);

-- 1. Verify all goals migrated to milestones
INSERT INTO migration_validation_results
SELECT
  'Goals Migration' as check_name,
  CASE
    WHEN (SELECT COUNT(*) FROM archive.goals_backup_20260110) =
         (SELECT COUNT(*) FROM milestones WHERE type = 'goal')
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  (SELECT COUNT(*) FROM archive.goals_backup_20260110) as original_count,
  (SELECT COUNT(*) FROM milestones WHERE type = 'goal') as migrated_count,
  'All goals should be migrated to milestones with type=goal' as message,
  CASE
    WHEN (SELECT COUNT(*) FROM archive.goals_backup_20260110) =
         (SELECT COUNT(*) FROM milestones WHERE type = 'goal')
    THEN 'INFO'
    ELSE 'CRITICAL'
  END as severity;

-- 2. Verify time entries archived
INSERT INTO migration_validation_results
SELECT
  'Time Entries Archive' as check_name,
  CASE
    WHEN (SELECT COUNT(*) FROM archive.time_entries_backup_20260110) =
         (SELECT COUNT(*) FROM time_entries_archive)
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  (SELECT COUNT(*) FROM archive.time_entries_backup_20260110) as original_count,
  (SELECT COUNT(*) FROM time_entries_archive) as archived_count,
  'All time entries should be archived' as message,
  CASE
    WHEN (SELECT COUNT(*) FROM archive.time_entries_backup_20260110) =
         (SELECT COUNT(*) FROM time_entries_archive)
    THEN 'INFO'
    ELSE 'CRITICAL'
  END as severity;

-- 3. Verify project members migrated
INSERT INTO migration_validation_results
SELECT
  'Project Members Migration' as check_name,
  CASE
    WHEN (SELECT COUNT(*) FROM archive.project_members_backup_20260110) <=
         (SELECT COALESCE(SUM(ARRAY_LENGTH(team_members, 1)), 0) FROM projects)
    THEN '✅ PASS'
    ELSE '⚠️  WARN'
  END as status,
  (SELECT COUNT(*) FROM archive.project_members_backup_20260110) as original_count,
  (SELECT COALESCE(SUM(ARRAY_LENGTH(team_members, 1)), 0) FROM projects) as migrated_count,
  'Project members should be migrated to team_members array' as message,
  CASE
    WHEN (SELECT COUNT(*) FROM archive.project_members_backup_20260110) <=
         (SELECT COALESCE(SUM(ARRAY_LENGTH(team_members, 1)), 0) FROM projects)
    THEN 'INFO'
    ELSE 'WARNING'
  END as severity;

-- 4. Check for orphaned tasks
INSERT INTO migration_validation_results
SELECT
  'Orphaned Tasks Check' as check_name,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status,
  0 as original_count,
  COUNT(*) as migrated_count,
  'No tasks should be orphaned (without valid project)' as message,
  CASE WHEN COUNT(*) = 0 THEN 'INFO' ELSE 'CRITICAL' END as severity
FROM tasks t
WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = t.project_id);

-- 5. Verify foreign key integrity
INSERT INTO migration_validation_results
SELECT
  'Foreign Key Integrity' as check_name,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status,
  0 as original_count,
  COUNT(*) as migrated_count,
  'All foreign keys should be valid' as message,
  CASE WHEN COUNT(*) = 0 THEN 'INFO' ELSE 'CRITICAL' END as severity
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

-- 6. Verify table count is within target
INSERT INTO migration_validation_results
SELECT
  'Table Count' as check_name,
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.tables
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE') <= 15
    THEN '✅ PASS'
    ELSE '⚠️  WARN'
  END as status,
  22 as original_count, -- Original table count
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as migrated_count,
  'Table count should be reduced (target: 8-12 core tables)' as message,
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.tables
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE') <= 15
    THEN 'INFO'
    ELSE 'WARNING'
  END as severity;

-- 7. Verify goal_milestones migrated
INSERT INTO migration_validation_results
SELECT
  'Goal Milestones Migration' as check_name,
  CASE
    WHEN (SELECT COUNT(*) FROM archive.goal_milestones_backup_20260110) =
         (SELECT COUNT(*) FROM milestones WHERE metadata->>'migrated_from_goal_milestones' = 'true')
    THEN '✅ PASS'
    ELSE '⚠️  WARN'
  END as status,
  (SELECT COUNT(*) FROM archive.goal_milestones_backup_20260110) as original_count,
  (SELECT COUNT(*) FROM milestones WHERE metadata->>'migrated_from_goal_milestones' = 'true') as migrated_count,
  'All goal milestones should be migrated' as message,
  CASE
    WHEN (SELECT COUNT(*) FROM archive.goal_milestones_backup_20260110) =
         (SELECT COUNT(*) FROM milestones WHERE metadata->>'migrated_from_goal_milestones' = 'true')
    THEN 'INFO'
    ELSE 'WARNING'
  END as severity;

-- 8. Verify no data in dropped tables
INSERT INTO migration_validation_results
SELECT
  'Dropped Tables Verification' as check_name,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('goals', 'goal_milestones', 'goal_project_links', 'time_entries', 'project_members')
    )
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  5 as original_count,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN ('goals', 'goal_milestones', 'goal_project_links', 'time_entries', 'project_members')) as migrated_count,
  'Consolidated tables should be dropped' as message,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('goals', 'goal_milestones', 'goal_project_links', 'time_entries', 'project_members')
    )
    THEN 'INFO'
    ELSE 'CRITICAL'
  END as severity;

-- 9. Verify indexes exist
INSERT INTO migration_validation_results
SELECT
  'Required Indexes' as check_name,
  CASE
    WHEN COUNT(*) >= 3 THEN '✅ PASS'
    ELSE '⚠️  WARN'
  END as status,
  3 as original_count,
  COUNT(*) as migrated_count,
  'Critical indexes should be created' as message,
  CASE WHEN COUNT(*) >= 3 THEN 'INFO' ELSE 'WARNING' END as severity
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname = 'idx_milestones_type' OR
    indexname = 'idx_projects_team_members' OR
    indexname = 'idx_time_archive_user'
  );

-- 10. Verify helper functions exist
INSERT INTO migration_validation_results
SELECT
  'Helper Functions' as check_name,
  CASE
    WHEN COUNT(*) >= 3 THEN '✅ PASS'
    ELSE '⚠️  WARN'
  END as status,
  3 as original_count,
  COUNT(*) as migrated_count,
  'Helper functions should be created' as message,
  CASE WHEN COUNT(*) >= 3 THEN 'INFO' ELSE 'WARNING' END as severity
FROM pg_proc
WHERE proname IN ('add_project_member', 'remove_project_member', 'is_project_member')
  AND pronamespace = 'public'::regnamespace;

-- Display validation results
DO $$
DECLARE
  result_record RECORD;
  pass_count INTEGER := 0;
  fail_count INTEGER := 0;
  warn_count INTEGER := 0;
  total_count INTEGER := 0;
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'PHASE 3 MIGRATION VALIDATION REPORT';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';

  FOR result_record IN
    SELECT * FROM migration_validation_results ORDER BY severity DESC, check_name
  LOOP
    total_count := total_count + 1;

    IF result_record.status LIKE '%PASS%' THEN
      pass_count := pass_count + 1;
    ELSIF result_record.status LIKE '%FAIL%' THEN
      fail_count := fail_count + 1;
    ELSE
      warn_count := warn_count + 1;
    END IF;

    RAISE NOTICE '% %', result_record.status, result_record.check_name;
    RAISE NOTICE '  Original: %  |  Migrated: %', result_record.original_count, result_record.migrated_count;
    RAISE NOTICE '  Message: %', result_record.message;
    RAISE NOTICE '';
  END LOOP;

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'SUMMARY';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Total Checks: %', total_count;
  RAISE NOTICE 'Passed: %', pass_count;
  RAISE NOTICE 'Warnings: %', warn_count;
  RAISE NOTICE 'Failed: %', fail_count;
  RAISE NOTICE '';

  IF fail_count > 0 THEN
    RAISE NOTICE '⚠️  CRITICAL FAILURES DETECTED!';
    RAISE NOTICE 'Review failed checks above and run rollback if necessary.';
  ELSIF warn_count > 0 THEN
    RAISE NOTICE '⚠️  Warnings detected - review results but migration may be acceptable.';
  ELSE
    RAISE NOTICE '✅ ALL CHECKS PASSED - Migration successful!';
  END IF;
  RAISE NOTICE '============================================================================';
END $$;

-- Store validation results in migration_audit
INSERT INTO migration_audit (migration_name, status, details)
SELECT
  '055_validate_phase3_migration',
  CASE
    WHEN EXISTS (SELECT 1 FROM migration_validation_results WHERE status LIKE '%FAIL%')
    THEN 'failed'
    WHEN EXISTS (SELECT 1 FROM migration_validation_results WHERE status LIKE '%WARN%')
    THEN 'completed_with_warnings'
    ELSE 'completed'
  END,
  jsonb_build_object(
    'validation_timestamp', NOW(),
    'total_checks', (SELECT COUNT(*) FROM migration_validation_results),
    'passed', (SELECT COUNT(*) FROM migration_validation_results WHERE status LIKE '%PASS%'),
    'warnings', (SELECT COUNT(*) FROM migration_validation_results WHERE status LIKE '%WARN%'),
    'failed', (SELECT COUNT(*) FROM migration_validation_results WHERE status LIKE '%FAIL%'),
    'results', (SELECT jsonb_agg(
      jsonb_build_object(
        'check', check_name,
        'status', status,
        'original_count', original_count,
        'migrated_count', migrated_count,
        'message', message,
        'severity', severity
      )
    ) FROM migration_validation_results)
  );

-- Show remaining table list
DO $$
DECLARE
  table_list TEXT;
BEGIN
  SELECT string_agg(table_name, E'\n  - ' ORDER BY table_name)
  INTO table_list
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

  RAISE NOTICE '';
  RAISE NOTICE 'Remaining tables in public schema:';
  RAISE NOTICE '  - %', table_list;
  RAISE NOTICE '';
END $$;
