-- Migration: Create task_subtasks table for subtask functionality
-- Date: 2026-01-12
-- Description: Creates the task_subtasks table to support breaking tasks into smaller subtasks

-- Create task_subtasks table
CREATE TABLE IF NOT EXISTS task_subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    completed BOOLEAN DEFAULT false,
    position VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_task_subtasks_task_id ON task_subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_task_subtasks_position ON task_subtasks(task_id, position);
CREATE INDEX IF NOT EXISTS idx_task_subtasks_completed ON task_subtasks(completed);

-- Create updated_at trigger
CREATE TRIGGER update_task_subtasks_updated_at
    BEFORE UPDATE ON task_subtasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Disable RLS for consistency with tasks table
ALTER TABLE task_subtasks DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON task_subtasks TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add comments
COMMENT ON TABLE task_subtasks IS 'Subtasks for breaking down individual tasks into smaller work items';
COMMENT ON COLUMN task_subtasks.task_id IS 'Reference to parent task';
COMMENT ON COLUMN task_subtasks.title IS 'Subtask title/description';
COMMENT ON COLUMN task_subtasks.completed IS 'Whether this subtask is completed';
COMMENT ON COLUMN task_subtasks.position IS 'Fractional indexing string for ordering and drag-to-reorder';
