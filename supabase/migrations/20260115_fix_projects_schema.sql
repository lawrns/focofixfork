-- Migration: Fix projects table schema mismatch
-- This migration renames the projects table to foco_projects and adds missing columns
-- to match the application code expectations

-- Step 1: Rename the table
ALTER TABLE IF EXISTS projects RENAME TO foco_projects;

-- Step 2: Add missing columns with proper types and defaults
ALTER TABLE foco_projects
  ADD COLUMN IF NOT EXISTS workspace_id uuid,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS brief text,
  ADD COLUMN IF NOT EXISTS icon text DEFAULT 'folder',
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_id uuid;

-- Step 3: Rename organization_id to match expected column (if needed)
-- We'll keep organization_id but map it to workspace_id temporarily
-- This assumes workspaces and organizations are the same for now

-- Step 4: Generate slugs from names for existing projects
UPDATE foco_projects
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
WHERE slug IS NULL;

-- Step 5: Set owner_id from created_by
UPDATE foco_projects
SET owner_id = created_by
WHERE owner_id IS NULL;

-- Step 6: Map is_active to archived_at (inverse logic)
-- If is_active = false, set archived_at to updated_at
UPDATE foco_projects
SET archived_at = updated_at
WHERE is_active = false AND archived_at IS NULL;

-- Step 7: Create workspace for organization-less projects
-- First check if we need a default workspace
DO $$
DECLARE
  default_workspace_id uuid;
  has_null_org boolean;
BEGIN
  -- Check if there are projects without organization_id
  SELECT EXISTS (
    SELECT 1 FROM foco_projects WHERE organization_id IS NULL
  ) INTO has_null_org;

  IF has_null_org THEN
    -- Try to find or create a default workspace
    -- Note: This assumes foco_workspaces table exists, adjust if needed
    SELECT id INTO default_workspace_id
    FROM foco_workspaces
    WHERE name = 'Default Workspace'
    LIMIT 1;

    -- If no default workspace exists, we'll leave workspace_id as NULL
    -- and let the application handle it
    IF default_workspace_id IS NOT NULL THEN
      UPDATE foco_projects
      SET workspace_id = default_workspace_id
      WHERE organization_id IS NULL AND workspace_id IS NULL;
    END IF;
  END IF;
END $$;

-- Step 8: For projects with organization_id, map to workspace_id
-- Assuming a 1:1 relationship between organization and workspace for now
UPDATE foco_projects
SET workspace_id = organization_id
WHERE workspace_id IS NULL AND organization_id IS NOT NULL;

-- Step 9: Make slug unique within workspace (add suffix if needed)
DO $$
DECLARE
  proj RECORD;
  new_slug text;
  counter int;
BEGIN
  FOR proj IN
    SELECT id, workspace_id, slug
    FROM foco_projects
    WHERE slug IS NOT NULL
  LOOP
    counter := 1;
    new_slug := proj.slug;

    -- Check if slug is unique within workspace
    WHILE EXISTS (
      SELECT 1 FROM foco_projects
      WHERE slug = new_slug
        AND workspace_id = proj.workspace_id
        AND id != proj.id
    ) LOOP
      new_slug := proj.slug || '-' || counter;
      counter := counter + 1;
    END LOOP;

    -- Update if we had to modify the slug
    IF new_slug != proj.slug THEN
      UPDATE foco_projects
      SET slug = new_slug
      WHERE id = proj.id;
    END IF;
  END LOOP;
END $$;

-- Step 10: Add constraints (after data is cleaned up)
-- Make slug NOT NULL
ALTER TABLE foco_projects
  ALTER COLUMN slug SET NOT NULL;

-- Create unique index on slug within workspace
CREATE UNIQUE INDEX IF NOT EXISTS foco_projects_workspace_slug_unique
  ON foco_projects (workspace_id, slug);

-- Add foreign key constraints if the tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'foco_workspaces') THEN
    ALTER TABLE foco_projects
      ADD CONSTRAINT foco_projects_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES foco_workspaces(id)
      ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auth' AND table_schema = 'auth') THEN
    ALTER TABLE foco_projects
      ADD CONSTRAINT foco_projects_owner_id_fkey
      FOREIGN KEY (owner_id)
      REFERENCES auth.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Step 11: Rename project_members to foco_project_members if it exists
ALTER TABLE IF EXISTS project_members RENAME TO foco_project_members;

-- Step 12: Update RLS policies (if they exist)
-- Drop old policies on projects table
DROP POLICY IF EXISTS "Users can view projects in their workspace" ON foco_projects;
DROP POLICY IF EXISTS "Users can create projects in their workspace" ON foco_projects;
DROP POLICY IF EXISTS "Users can update projects in their workspace" ON foco_projects;
DROP POLICY IF EXISTS "Users can delete projects in their workspace" ON foco_projects;

-- Create new RLS policies
ALTER TABLE foco_projects ENABLE ROW LEVEL SECURITY;

-- Allow users to view projects they're members of
CREATE POLICY "Users can view their projects"
  ON foco_projects
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM foco_workspace_members
      WHERE user_id = auth.uid()
    )
    OR
    id IN (
      SELECT project_id
      FROM foco_project_members
      WHERE user_id = auth.uid()
    )
  );

-- Allow users to create projects in workspaces they're members of
CREATE POLICY "Users can create projects in their workspaces"
  ON foco_projects
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM foco_workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Allow project owners and workspace admins to update projects
CREATE POLICY "Project owners and workspace admins can update projects"
  ON foco_projects
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR
    workspace_id IN (
      SELECT workspace_id
      FROM foco_workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- Allow project owners and workspace admins to delete projects
CREATE POLICY "Project owners and workspace admins can delete projects"
  ON foco_projects
  FOR DELETE
  USING (
    owner_id = auth.uid()
    OR
    workspace_id IN (
      SELECT workspace_id
      FROM foco_workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- Step 13: Add helpful indexes
CREATE INDEX IF NOT EXISTS foco_projects_workspace_id_idx ON foco_projects (workspace_id);
CREATE INDEX IF NOT EXISTS foco_projects_owner_id_idx ON foco_projects (owner_id);
CREATE INDEX IF NOT EXISTS foco_projects_status_idx ON foco_projects (status);
CREATE INDEX IF NOT EXISTS foco_projects_archived_at_idx ON foco_projects (archived_at);

-- Migration complete!
