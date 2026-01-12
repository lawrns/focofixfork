-- ============================================================================
-- CUSTOM FIELDS FEATURE
-- Migration: 110_create_custom_fields_tables.sql
-- Date: 2026-01-12
-- Purpose: Add support for project-scoped custom fields on tasks
-- ============================================================================

BEGIN;

-- ============================================================================
-- CUSTOM FIELDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES foco_projects(id) ON DELETE CASCADE,
  field_name VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL CHECK (
    field_type IN ('text', 'number', 'date', 'dropdown')
  ),
  options JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, field_name)
);

-- Create indexes for custom_fields
CREATE INDEX IF NOT EXISTS idx_custom_fields_project_id ON custom_fields(project_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_field_type ON custom_fields(field_type);

-- Create updated_at trigger for custom_fields
CREATE OR REPLACE FUNCTION update_custom_fields_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_fields_updated_at
  BEFORE UPDATE ON custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_fields_updated_at();

-- Add comments
COMMENT ON TABLE custom_fields IS 'Project-scoped custom field definitions for tasks';
COMMENT ON COLUMN custom_fields.id IS 'Unique identifier for the custom field';
COMMENT ON COLUMN custom_fields.project_id IS 'Reference to the project this field belongs to';
COMMENT ON COLUMN custom_fields.field_name IS 'Display name of the custom field';
COMMENT ON COLUMN custom_fields.field_type IS 'Type of field: text, number, date, or dropdown';
COMMENT ON COLUMN custom_fields.options IS 'JSON array of options for dropdown fields';

-- Grant permissions
ALTER TABLE custom_fields DISABLE ROW LEVEL SECURITY;
GRANT ALL ON custom_fields TO authenticated;

-- ============================================================================
-- TASK CUSTOM VALUES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_custom_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value_text TEXT DEFAULT NULL,
  value_number NUMERIC DEFAULT NULL,
  value_date DATE DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, field_id)
);

-- Create indexes for task_custom_values
CREATE INDEX IF NOT EXISTS idx_task_custom_values_task_id ON task_custom_values(task_id);
CREATE INDEX IF NOT EXISTS idx_task_custom_values_field_id ON task_custom_values(field_id);
CREATE INDEX IF NOT EXISTS idx_task_custom_values_task_field ON task_custom_values(task_id, field_id);

-- Create updated_at trigger for task_custom_values
CREATE OR REPLACE FUNCTION update_task_custom_values_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_custom_values_updated_at
  BEFORE UPDATE ON task_custom_values
  FOR EACH ROW
  EXECUTE FUNCTION update_task_custom_values_updated_at();

-- Add comments
COMMENT ON TABLE task_custom_values IS 'Values for custom fields on tasks';
COMMENT ON COLUMN task_custom_values.id IS 'Unique identifier for the custom field value';
COMMENT ON COLUMN task_custom_values.task_id IS 'Reference to the task';
COMMENT ON COLUMN task_custom_values.field_id IS 'Reference to the custom field definition';
COMMENT ON COLUMN task_custom_values.value_text IS 'Text value for text and dropdown fields';
COMMENT ON COLUMN task_custom_values.value_number IS 'Numeric value for number fields';
COMMENT ON COLUMN task_custom_values.value_date IS 'Date value for date fields';

-- Grant permissions
ALTER TABLE task_custom_values DISABLE ROW LEVEL SECURITY;
GRANT ALL ON task_custom_values TO authenticated;

COMMIT;
