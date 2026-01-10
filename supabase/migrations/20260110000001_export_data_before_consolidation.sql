/**
 * Phase 3 Migration - Phase 1: Pre-Migration Data Export
 *
 * Purpose: Create safety backups before any destructive operations
 * Risk Level: LOW
 * Duration: ~15 minutes
 *
 * This migration creates an archive schema and backs up all tables
 * that will be consolidated or dropped in subsequent phases.
 */

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
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'custom_fields'
  ) THEN
    EXECUTE 'CREATE TABLE archive.custom_fields_backup_20260110 AS SELECT * FROM custom_fields';
  END IF;
END $$;

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

INSERT INTO archive.migration_050_checksums (table_name, record_count, checksum)
SELECT
  'time_entries',
  COUNT(*),
  md5(string_agg(id::text, '' ORDER BY created_at))
FROM time_entries;

INSERT INTO archive.migration_050_checksums (table_name, record_count, checksum)
SELECT
  'project_members',
  COUNT(*),
  md5(string_agg(id::text || user_id::text || project_id::text, '' ORDER BY created_at))
FROM project_members;

-- Log export completion
INSERT INTO migration_audit (migration_name, status, details)
VALUES (
  '050_export_data_before_consolidation',
  'completed',
  jsonb_build_object(
    'tables_exported', 5,
    'total_records', (SELECT SUM(record_count) FROM archive.migration_050_report),
    'export_timestamp', NOW()
  )
);

-- Display summary
DO $$
DECLARE
  total_records BIGINT;
BEGIN
  SELECT SUM(record_count) INTO total_records FROM archive.migration_050_report;

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'PHASE 1: DATA EXPORT COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Total records backed up: %', total_records;
  RAISE NOTICE 'Archive schema: archive';
  RAISE NOTICE 'Backup tables created with prefix: *_backup_20260110';
  RAISE NOTICE '';
  RAISE NOTICE 'Verification report:';
  RAISE NOTICE '';

  FOR record IN SELECT * FROM archive.migration_050_report ORDER BY table_name LOOP
    RAISE NOTICE '  ✓ % - % records', record.table_name, record.record_count;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Run 051_merge_goals_into_milestones.sql';
  RAISE NOTICE '============================================================================';
END $$;
