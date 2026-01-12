-- Migration: Fix position field for fractional indexing
-- Change position from integer to text to support fractional indexing

BEGIN;

-- Step 1: Check if position column exists and is integer type
DO $$
BEGIN
  -- Add temporary TEXT column if position exists as integer
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_items' AND column_name = 'position'
      AND data_type IN ('integer', 'bigint', 'smallint')
  ) THEN
    ALTER TABLE work_items ADD COLUMN position_new TEXT;

    -- Step 2: Generate fractional positions for existing records
    -- Group by project_id and status, then assign fractional positions within each group
    WITH ranked_items AS (
      SELECT
        id,
        ROW_NUMBER() OVER (PARTITION BY project_id, status ORDER BY position, created_at) as rn
      FROM work_items
    ),
    position_calc AS (
      SELECT
        id,
        'a' || LPAD(rn::TEXT, 10, '0') as new_position
      FROM ranked_items
    )
    UPDATE work_items
    SET position_new = position_calc.new_position
    FROM position_calc
    WHERE work_items.id = position_calc.id;

    -- Step 3: Set default for any NULL values
    UPDATE work_items
    SET position_new = 'a0000000001'
    WHERE position_new IS NULL;

    -- Step 4: Drop the old position column
    ALTER TABLE work_items DROP COLUMN position;

    -- Step 5: Rename the new column to position
    ALTER TABLE work_items RENAME COLUMN position_new TO position;
  END IF;

  -- Ensure position column exists and has proper constraints
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_items' AND column_name = 'position'
  ) THEN
    ALTER TABLE work_items ADD COLUMN position TEXT DEFAULT 'a0000000001' NOT NULL;
  ELSE
    -- Set default value for new records
    ALTER TABLE work_items ALTER COLUMN position SET DEFAULT 'a0000000001';

    -- Add NOT NULL constraint if not exists
    ALTER TABLE work_items ALTER COLUMN position SET NOT NULL;
  END IF;
END $$;

-- Step 6: Create an index on position for better query performance
CREATE INDEX IF NOT EXISTS idx_work_items_position ON work_items(project_id, status, position);

COMMIT;
