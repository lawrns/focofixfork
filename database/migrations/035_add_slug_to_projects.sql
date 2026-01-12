-- Add slug column to projects table for human-readable URLs
-- Migration: 035_add_slug_to_projects.sql
-- Date: 2026-01-11

BEGIN;

-- Add slug column
ALTER TABLE projects ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Generate slugs for existing projects based on their names
-- This creates a URL-safe slug from the project name
UPDATE projects
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL;

-- Make slug NOT NULL after populating existing records
ALTER TABLE projects ALTER COLUMN slug SET NOT NULL;

-- Add unique constraint on slug
CREATE UNIQUE INDEX IF NOT EXISTS projects_slug_unique ON projects(slug);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);

-- Create a function to auto-generate slug from name on insert/update
CREATE OR REPLACE FUNCTION generate_project_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate slug
DROP TRIGGER IF EXISTS projects_generate_slug ON projects;
CREATE TRIGGER projects_generate_slug
  BEFORE INSERT OR UPDATE OF name ON projects
  FOR EACH ROW
  EXECUTE FUNCTION generate_project_slug();

COMMIT;
