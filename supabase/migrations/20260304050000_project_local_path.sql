-- Add local_path and git_remote columns to foco_projects
-- local_path: absolute path on disk where the codebase lives
-- git_remote: parsed origin URL from .git/config

ALTER TABLE foco_projects
  ADD COLUMN IF NOT EXISTS local_path text,
  ADD COLUMN IF NOT EXISTS git_remote text;

CREATE INDEX IF NOT EXISTS foco_projects_local_path_idx
  ON foco_projects (local_path)
  WHERE local_path IS NOT NULL;
