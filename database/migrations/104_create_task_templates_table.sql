-- Migration: Create task_templates table
-- Date: 2025-01-12
-- Description: Creates task_templates table for storing task templates that users can reuse

-- Create task_templates table
CREATE TABLE IF NOT EXISTS task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    title_template VARCHAR(500) NOT NULL,
    description_template TEXT,
    tags TEXT[] DEFAULT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for task_templates
CREATE INDEX IF NOT EXISTS idx_task_templates_user_id ON task_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_created_at ON task_templates(created_at);
CREATE INDEX IF NOT EXISTS idx_task_templates_name ON task_templates(name);

-- Create updated_at trigger
CREATE TRIGGER update_task_templates_updated_at
    BEFORE UPDATE ON task_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Disable RLS for consistency
ALTER TABLE task_templates DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON task_templates TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add comments
COMMENT ON TABLE task_templates IS 'Reusable task templates for users';
COMMENT ON COLUMN task_templates.id IS 'Unique identifier for the template';
COMMENT ON COLUMN task_templates.user_id IS 'User who owns the template';
COMMENT ON COLUMN task_templates.name IS 'Human-readable name for the template';
COMMENT ON COLUMN task_templates.title_template IS 'Template for task title';
COMMENT ON COLUMN task_templates.description_template IS 'Template for task description';
COMMENT ON COLUMN task_templates.tags IS 'Array of tags to apply to tasks created from this template';
COMMENT ON COLUMN task_templates.priority IS 'Default priority for tasks created from this template';
