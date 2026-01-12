-- ============================================================================
-- PROJECT TEMPLATES TABLE MIGRATION
-- Migration: 106_create_project_templates_table.sql
-- Date: 2026-01-12
-- Purpose: Create table for project templates to enable template-based project creation
-- ============================================================================

BEGIN;

-- Create project_templates table
CREATE TABLE IF NOT EXISTS project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Template structure stored as JSONB for flexibility
  -- Contains: { defaultTasks: [...], customFields: [...] }
  structure JSONB NOT NULL DEFAULT '{
    "defaultTasks": [],
    "customFields": []
  }'::jsonb,

  -- Templates can be personal or shared with team
  is_public BOOLEAN DEFAULT FALSE,

  -- Metadata for template management
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Track usage and rating
  usage_count INTEGER DEFAULT 0,
  rating FLOAT DEFAULT 0,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- Add table comment
COMMENT ON TABLE project_templates IS 'Stores reusable project templates for quick project creation';
COMMENT ON COLUMN project_templates.structure IS 'JSON structure containing defaultTasks array and customFields array';
COMMENT ON COLUMN project_templates.is_public IS 'Whether template is shared with team (false = personal only)';

-- Create indexes for better query performance
CREATE INDEX idx_project_templates_user_id ON project_templates(user_id);
CREATE INDEX idx_project_templates_workspace_id ON project_templates(workspace_id);
CREATE INDEX idx_project_templates_created_at ON project_templates(created_at DESC);
CREATE INDEX idx_project_templates_is_public ON project_templates(is_public);

-- Enable RLS (Row Level Security)
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own templates
CREATE POLICY project_templates_select_own ON project_templates
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can view public templates from their workspace
CREATE POLICY project_templates_select_public ON project_templates
  FOR SELECT
  USING (
    is_public = TRUE
    AND workspace_id IN (
      SELECT workspace_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- RLS Policy: Users can create templates in their workspace
CREATE POLICY project_templates_insert ON project_templates
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() = created_by
    AND workspace_id IN (
      SELECT workspace_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- RLS Policy: Users can update their own templates
CREATE POLICY project_templates_update ON project_templates
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own templates
CREATE POLICY project_templates_delete ON project_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_templates_updated_at_trigger
  BEFORE UPDATE ON project_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_project_templates_updated_at();

COMMIT;
