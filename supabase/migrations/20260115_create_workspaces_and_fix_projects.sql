-- Migration: Create foco_workspaces and fix projects schema
-- This migration creates the workspace tables from organizations and fixes the projects schema

-- ====================
-- PART 1: Create foco_workspaces table
-- ====================

-- Create foco_workspaces table mirroring organizations
CREATE TABLE IF NOT EXISTS foco_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  logo_url text,
  settings jsonb DEFAULT '{}'::jsonb,
  ai_policy jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (slug)
);

-- Enable RLS
ALTER TABLE foco_workspaces ENABLE ROW LEVEL SECURITY;

-- Insert data from organizations if it exists
INSERT INTO foco_workspaces (id, name, slug, description, created_at, updated_at)
SELECT
  id,
  name,
  LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) as slug,
  description,
  created_at,
  updated_at
FROM organizations
ON CONFLICT (id) DO NOTHING;

-- Create foco_workspace_members table
CREATE TABLE IF NOT EXISTS foco_workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

-- Enable RLS
ALTER TABLE foco_workspace_members ENABLE ROW LEVEL SECURITY;

-- Insert workspace members from organization_members if it exists
INSERT INTO foco_workspace_members (workspace_id, user_id, role, created_at, updated_at)
SELECT
  organization_id as workspace_id,
  user_id,
  role,
  created_at,
  updated_at
FROM organization_members
WHERE EXISTS (SELECT 1 FROM foco_workspaces WHERE id = organization_id)
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- ====================
-- PART 2: Fix projects table schema
-- ====================

-- Rename projects to foco_projects
ALTER TABLE IF EXISTS projects RENAME TO foco_projects;

-- Add missing columns
ALTER TABLE foco_projects
  ADD COLUMN IF NOT EXISTS workspace_id uuid,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS brief text,
  ADD COLUMN IF NOT EXISTS icon text DEFAULT 'folder',
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_id uuid;

-- Map organization_id to workspace_id
UPDATE foco_projects
SET workspace_id = organization_id
WHERE workspace_id IS NULL AND organization_id IS NOT NULL;

-- For projects without organization_id, try to infer from created_by
-- by finding a workspace they're a member of
UPDATE foco_projects p
SET workspace_id = (
  SELECT workspace_id
  FROM foco_workspace_members
  WHERE user_id = p.created_by
  LIMIT 1
)
WHERE workspace_id IS NULL
  AND created_by IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM foco_workspace_members WHERE user_id = p.created_by
  );

-- Generate slugs from names for existing projects
UPDATE foco_projects
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
WHERE slug IS NULL;

-- Make slugs unique within workspace
DO $$
DECLARE
  proj RECORD;
  new_slug text;
  counter int;
BEGIN
  FOR proj IN
    SELECT id, workspace_id, slug, name
    FROM foco_projects
    WHERE slug IS NOT NULL
    ORDER BY created_at
  LOOP
    counter := 1;
    new_slug := proj.slug;

    -- Check if slug is unique within workspace
    WHILE EXISTS (
      SELECT 1 FROM foco_projects
      WHERE slug = new_slug
        AND (workspace_id = proj.workspace_id OR (workspace_id IS NULL AND proj.workspace_id IS NULL))
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

-- Set owner_id from created_by
UPDATE foco_projects
SET owner_id = created_by
WHERE owner_id IS NULL;

-- Map is_active to archived_at (inverse logic)
UPDATE foco_projects
SET archived_at = updated_at
WHERE is_active = false AND archived_at IS NULL;

-- Make slug NOT NULL after generating
ALTER TABLE foco_projects
  ALTER COLUMN slug SET NOT NULL;

-- Create unique index on slug within workspace (allowing NULL workspace_id)
CREATE UNIQUE INDEX IF NOT EXISTS foco_projects_workspace_slug_unique
  ON foco_projects (workspace_id, slug)
  WHERE workspace_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS foco_projects_null_workspace_slug_unique
  ON foco_projects (slug)
  WHERE workspace_id IS NULL;

-- Add foreign key constraints
ALTER TABLE foco_projects
  DROP CONSTRAINT IF EXISTS foco_projects_workspace_id_fkey,
  ADD CONSTRAINT foco_projects_workspace_id_fkey
    FOREIGN KEY (workspace_id)
    REFERENCES foco_workspaces(id)
    ON DELETE CASCADE;

ALTER TABLE foco_projects
  DROP CONSTRAINT IF EXISTS foco_projects_owner_id_fkey,
  ADD CONSTRAINT foco_projects_owner_id_fkey
    FOREIGN KEY (owner_id)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- ====================
-- PART 3: Fix project_members table
-- ====================

-- Rename project_members to foco_project_members if it exists
ALTER TABLE IF EXISTS project_members RENAME TO foco_project_members;

-- ====================
-- PART 4: Add indexes
-- ====================

CREATE INDEX IF NOT EXISTS foco_projects_workspace_id_idx ON foco_projects (workspace_id);
CREATE INDEX IF NOT EXISTS foco_projects_owner_id_idx ON foco_projects (owner_id);
CREATE INDEX IF NOT EXISTS foco_projects_status_idx ON foco_projects (status);
CREATE INDEX IF NOT EXISTS foco_projects_archived_at_idx ON foco_projects (archived_at);
CREATE INDEX IF NOT EXISTS foco_projects_created_at_idx ON foco_projects (created_at);
CREATE INDEX IF NOT EXISTS foco_projects_updated_at_idx ON foco_projects (updated_at);

CREATE INDEX IF NOT EXISTS foco_workspace_members_workspace_id_idx ON foco_workspace_members (workspace_id);
CREATE INDEX IF NOT EXISTS foco_workspace_members_user_id_idx ON foco_workspace_members (user_id);

-- ====================
-- PART 5: RLS Policies
-- ====================

-- Workspaces policies
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON foco_workspaces;
CREATE POLICY "Users can view workspaces they are members of"
  ON foco_workspaces
  FOR SELECT
  USING (
    id IN (
      SELECT workspace_id
      FROM foco_workspace_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update workspaces they are admins of" ON foco_workspaces;
CREATE POLICY "Users can update workspaces they are admins of"
  ON foco_workspaces
  FOR UPDATE
  USING (
    id IN (
      SELECT workspace_id
      FROM foco_workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Workspace members policies
DROP POLICY IF EXISTS "Users can view workspace members" ON foco_workspace_members;
CREATE POLICY "Users can view workspace members"
  ON foco_workspace_members
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM foco_workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Projects policies
DROP POLICY IF EXISTS "Users can view projects" ON foco_projects;
DROP POLICY IF EXISTS "Users can create projects" ON foco_projects;
DROP POLICY IF EXISTS "Users can update projects" ON foco_projects;
DROP POLICY IF EXISTS "Users can delete projects" ON foco_projects;

ALTER TABLE foco_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view projects in their workspaces"
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

-- Project members policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'foco_project_members') THEN
    EXECUTE 'ALTER TABLE foco_project_members ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Users can view project members" ON foco_project_members';
    EXECUTE 'CREATE POLICY "Users can view project members"
      ON foco_project_members
      FOR SELECT
      USING (
        project_id IN (
          SELECT id FROM foco_projects
          WHERE workspace_id IN (
            SELECT workspace_id
            FROM foco_workspace_members
            WHERE user_id = auth.uid()
          )
        )
      )';
  END IF;
END $$;

-- ====================
-- PART 6: Create view for backwards compatibility
-- ====================

-- Create a view for organizations that references workspaces
-- This allows old code to still work
CREATE OR REPLACE VIEW organizations_view AS
SELECT * FROM foco_workspaces;

-- Migration complete!
-- Summary:
-- - Created foco_workspaces from organizations table
-- - Created foco_workspace_members from organization_members table
-- - Renamed projects to foco_projects
-- - Added missing columns: workspace_id, slug, archived_at, brief, icon, is_pinned, owner_id
-- - Mapped organization_id to workspace_id
-- - Generated unique slugs for all projects
-- - Added proper indexes and foreign key constraints
-- - Set up RLS policies for workspace and project access
