-- ============================================================================
-- EMAIL DIGEST PREFERENCES MIGRATION
-- Migration: 111_create_email_digest_preferences.sql
-- Date: 2026-01-12
-- Purpose: Add email digest preference storage to workspace_members settings
-- ============================================================================

BEGIN;

-- Add email digest preferences to workspace_members settings
-- The digest preferences are stored as JSONB with structure:
-- {
--   "frequency": "none|daily|weekly",
--   "digest_time": { "hour": 9, "minute": 0 },
--   "digest_day": "monday|tuesday|...|sunday" (for weekly only),
--   "content_selection": {
--     "overdue": boolean,
--     "due_today": boolean,
--     "completed": boolean,
--     "comments": boolean
--   }
-- }

-- Create index for settings column if it doesn't exist
CREATE INDEX IF NOT EXISTS workspace_members_settings_idx
ON workspace_members USING GIN (settings);

-- Create a function to validate digest preferences
CREATE OR REPLACE FUNCTION validate_digest_preferences(preferences JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  frequency VARCHAR;
BEGIN
  IF preferences IS NULL THEN
    RETURN TRUE;
  END IF;

  frequency := preferences->>'frequency';

  -- Validate frequency values
  IF frequency IS NOT NULL AND frequency NOT IN ('none', 'daily', 'weekly') THEN
    RAISE EXCEPTION 'Invalid digest frequency: %', frequency;
  END IF;

  -- Validate time format if present
  IF (preferences->'digest_time') IS NOT NULL THEN
    IF NOT (
      (preferences->'digest_time'->>'hour')::INTEGER BETWEEN 0 AND 23 AND
      (preferences->'digest_time'->>'minute')::INTEGER BETWEEN 0 AND 59
    ) THEN
      RAISE EXCEPTION 'Invalid digest time';
    END IF;
  END IF;

  -- Validate day of week if present
  IF (preferences->>'digest_day') IS NOT NULL THEN
    IF preferences->>'digest_day' NOT IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') THEN
      RAISE EXCEPTION 'Invalid digest day: %', preferences->>'digest_day';
    END IF;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add comment to workspace_members table
COMMENT ON COLUMN workspace_members.settings IS 'User settings including email digest preferences (frequency, time, content selection)';

COMMIT;
