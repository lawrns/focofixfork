-- Add updated_at column to runs table for proper change tracking
ALTER TABLE runs ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Backfill with created_at for existing rows
UPDATE runs SET updated_at = created_at WHERE updated_at IS NULL;
