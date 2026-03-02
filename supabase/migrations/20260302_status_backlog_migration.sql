-- Fix tasks.status CHECK constraint and default to match application logic.
-- The base schema used 'todo' but the app now uses 'backlog', 'next', 'blocked'.

-- Drop old constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add updated constraint that matches validation.ts
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('backlog', 'next', 'in_progress', 'review', 'blocked', 'done', 'cancelled'));

-- Update default
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'backlog';

-- Migrate any existing 'todo' rows to 'backlog'
UPDATE tasks SET status = 'backlog' WHERE status = 'todo';
