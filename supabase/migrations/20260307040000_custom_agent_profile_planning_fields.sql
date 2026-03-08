ALTER TABLE custom_agent_profiles
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'custom'
    CHECK (kind IN ('custom', 'persona', 'lane')),
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'Specialist advisor',
  ADD COLUMN IF NOT EXISTS expertise text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS incentives text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS risk_model text NOT NULL DEFAULT 'Balance speed, quality, and risk according to role.';

COMMENT ON COLUMN custom_agent_profiles.kind IS 'Custom agent subtype for planning and orchestration.';
COMMENT ON COLUMN custom_agent_profiles.role IS 'Primary operating role exposed to planners and users.';
COMMENT ON COLUMN custom_agent_profiles.expertise IS 'First-class expertise areas used in planning selection and orchestration.';
COMMENT ON COLUMN custom_agent_profiles.incentives IS 'Behavioral incentives or priorities used during multi-agent debate.';
COMMENT ON COLUMN custom_agent_profiles.risk_model IS 'Explicit risk posture for this agent profile.';
