-- Migration: Add task recurrence support
-- Date: 2025-01-12
-- Description: Adds recurrence fields to tasks table to support recurring task creation

-- Add recurrence fields to tasks table
ALTER TABLE IF EXISTS tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS tasks ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB;
ALTER TABLE IF EXISTS tasks ADD COLUMN IF NOT EXISTS parent_recurring_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS tasks ADD COLUMN IF NOT EXISTS occurrence_number INTEGER;
ALTER TABLE IF EXISTS tasks ADD COLUMN IF NOT EXISTS next_occurrence_date TIMESTAMP WITH TIME ZONE;

-- Create index for recurring tasks lookup
CREATE INDEX IF NOT EXISTS idx_tasks_is_recurring ON tasks(is_recurring);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_recurring_task_id ON tasks(parent_recurring_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_next_occurrence_date ON tasks(next_occurrence_date);

-- Add comments
COMMENT ON COLUMN tasks.is_recurring IS 'Whether this task recurs based on a pattern';
COMMENT ON COLUMN tasks.recurrence_pattern IS 'JSON object containing recurrence pattern: {type, interval, daysOfWeek, endAfter, endsNever}';
COMMENT ON COLUMN tasks.parent_recurring_task_id IS 'References the parent recurring task if this is an instance of a recurring task';
COMMENT ON COLUMN tasks.occurrence_number IS 'Which occurrence this is (1st, 2nd, etc.) for a recurring task';
COMMENT ON COLUMN tasks.next_occurrence_date IS 'Cached next occurrence date for efficient querying and cron job processing';

-- Grant permissions
GRANT ALL ON tasks TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
