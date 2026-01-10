/**
 * Phase 3 Migration - Phase 2: Merge Goals → Milestones
 *
 * Purpose: Consolidate goals functionality into milestones table
 * Risk Level: MEDIUM
 * Duration: ~30 minutes
 *
 * This migration adds type distinction to milestones (milestone/goal/objective)
 * and migrates all goals data into the enhanced milestones table.
 */

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

-- Step 2: Check if columns need renaming (handle existing schema variations)
DO $$
BEGIN
  -- Rename 'name' to 'title' if 'title' doesn't exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'milestones' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'milestones' AND column_name = 'title'
  ) THEN
    ALTER TABLE milestones RENAME COLUMN name TO title;
    RAISE NOTICE 'Renamed milestones.name to milestones.title';
  END IF;

  -- Rename 'deadline' to 'due_date' if 'due_date' doesn't exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'milestones' AND column_name = 'deadline'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'milestones' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE milestones RENAME COLUMN deadline TO due_date;
    RAISE NOTICE 'Renamed milestones.deadline to milestones.due_date';
  END IF;
END $$;

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
  project_id,
  due_date as end_date,
  completed_at,
  tags,
  created_at,
  updated_at
FROM milestones
WHERE type = 'goal';

COMMENT ON VIEW goals_compatibility_view IS
  'Temporary compatibility view for goals API. Remove after API migration to milestones endpoint.';

-- Step 6: Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_milestones_type ON milestones(type);
CREATE INDEX IF NOT EXISTS idx_milestones_owner_id ON milestones(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_milestones_tags ON milestones USING gin(tags) WHERE tags IS NOT NULL;

-- Step 7: Record migration stats
INSERT INTO migration_audit (migration_name, status, details)
VALUES (
  '051_merge_goals_into_milestones',
  'completed',
  jsonb_build_object(
    'goals_migrated', (SELECT COUNT(*) FROM goals),
    'goal_milestones_migrated', (SELECT COUNT(*) FROM goal_milestones),
    'total_new_milestones', (SELECT COUNT(*) FROM milestones WHERE metadata->'migrated_from_goals' = 'true'::jsonb),
    'migration_timestamp', NOW()
  )
);

-- Display summary
DO $$
DECLARE
  goals_count INTEGER;
  goal_milestones_count INTEGER;
  total_migrated INTEGER;
BEGIN
  SELECT COUNT(*) INTO goals_count FROM goals;
  SELECT COUNT(*) INTO goal_milestones_count FROM goal_milestones;
  SELECT COUNT(*) INTO total_migrated FROM milestones WHERE metadata->'migrated_from_goals' = 'true'::jsonb;

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'PHASE 2: GOALS → MILESTONES MERGE COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Goals migrated: %', goals_count;
  RAISE NOTICE 'Goal milestones migrated: %', goal_milestones_count;
  RAISE NOTICE 'Total new milestone records: %', total_migrated;
  RAISE NOTICE '';
  RAISE NOTICE 'Schema changes:';
  RAISE NOTICE '  ✓ Added milestones.type column (milestone/goal/objective)';
  RAISE NOTICE '  ✓ Added milestones.target_value, current_value, unit';
  RAISE NOTICE '  ✓ Added milestones.owner_id, tags, metadata';
  RAISE NOTICE '  ✓ Created goals_compatibility_view for backward compatibility';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Run 052_archive_time_entries.sql';
  RAISE NOTICE '============================================================================';
END $$;

COMMIT;
