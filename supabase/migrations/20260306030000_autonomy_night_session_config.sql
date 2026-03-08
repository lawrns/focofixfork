ALTER TABLE autonomy_sessions
  ADD COLUMN IF NOT EXISTS selected_agent jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS selected_project_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS repo_preflight jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS git_strategy jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN autonomy_sessions.selected_agent IS 'Selected nightly execution agent snapshot.';
COMMENT ON COLUMN autonomy_sessions.selected_project_ids IS 'Explicit repo-backed projects selected for the night autonomy session.';
COMMENT ON COLUMN autonomy_sessions.repo_preflight IS 'Repo safety and git preflight results captured before session execution.';
COMMENT ON COLUMN autonomy_sessions.git_strategy IS 'Enforced git execution policy for nightly autonomy.';
