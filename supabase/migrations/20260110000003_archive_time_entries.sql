/**
 * Phase 3 Migration - Phase 3: Archive Time Entries
 *
 * Purpose: Move time tracking to separate analytics table
 * Risk Level: LOW
 * Duration: ~20 minutes
 *
 * Time tracking is being deprecated in Phase 3. This migration archives
 * all existing time entries to a read-only analytics table.
 */

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
CREATE INDEX idx_time_archive_task ON time_entries_archive(task_id) WHERE task_id IS NOT NULL;

-- Step 4: Create aggregated view for reporting (optional but recommended)
CREATE MATERIALIZED VIEW time_tracking_summary AS
SELECT
  user_id,
  project_id,
  DATE_TRUNC('month', start_time) as month,
  COUNT(*) as entry_count,
  SUM(duration_minutes) as total_minutes,
  SUM(CASE WHEN is_billable THEN duration_minutes ELSE 0 END) as billable_minutes,
  SUM(CASE WHEN is_billable AND hourly_rate IS NOT NULL
      THEN duration_minutes * hourly_rate / 60 ELSE 0 END) as billable_amount
FROM time_entries_archive
GROUP BY user_id, project_id, DATE_TRUNC('month', start_time);

CREATE INDEX idx_time_summary_user_month ON time_tracking_summary(user_id, month DESC);
CREATE INDEX idx_time_summary_project_month ON time_tracking_summary(project_id, month DESC);

-- Step 5: Grant read-only access to archive
GRANT SELECT ON time_entries_archive TO authenticated;
GRANT SELECT ON time_tracking_summary TO authenticated;

-- Step 6: Add RLS policies for archive (read-only)
ALTER TABLE time_entries_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own time entries"
  ON time_entries_archive FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Organization admins can view all time entries"
  ON time_entries_archive FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id = time_entries_archive.organization_id
        AND om.role IN ('owner', 'admin')
    )
  );

-- Step 7: Record migration
INSERT INTO migration_audit (migration_name, status, details)
VALUES (
  '052_archive_time_entries',
  'completed',
  jsonb_build_object(
    'entries_archived', (SELECT COUNT(*) FROM time_entries_archive),
    'archive_size_mb', (SELECT pg_size_pretty(pg_total_relation_size('time_entries_archive'))),
    'oldest_entry', (SELECT MIN(start_time) FROM time_entries_archive),
    'newest_entry', (SELECT MAX(start_time) FROM time_entries_archive),
    'migration_timestamp', NOW()
  )
);

-- Display summary
DO $$
DECLARE
  total_entries BIGINT;
  total_hours NUMERIC;
  oldest_entry TIMESTAMPTZ;
  newest_entry TIMESTAMPTZ;
BEGIN
  SELECT COUNT(*) INTO total_entries FROM time_entries_archive;
  SELECT SUM(duration_minutes) / 60.0 INTO total_hours FROM time_entries_archive;
  SELECT MIN(start_time) INTO oldest_entry FROM time_entries_archive;
  SELECT MAX(start_time) INTO newest_entry FROM time_entries_archive;

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'PHASE 3: TIME ENTRIES ARCHIVED';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Total entries archived: %', total_entries;
  RAISE NOTICE 'Total hours tracked: % hours', ROUND(total_hours, 2);
  RAISE NOTICE 'Date range: % to %', oldest_entry::date, newest_entry::date;
  RAISE NOTICE '';
  RAISE NOTICE 'Archive table: time_entries_archive (read-only)';
  RAISE NOTICE 'Summary view: time_tracking_summary (materialized)';
  RAISE NOTICE '';
  RAISE NOTICE 'Access:';
  RAISE NOTICE '  ✓ Users can view their own entries';
  RAISE NOTICE '  ✓ Org admins can view all entries';
  RAISE NOTICE '  ✓ Data preserved for historical reporting';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Run 053_simplify_project_members.sql';
  RAISE NOTICE '============================================================================';
END $$;

COMMIT;
