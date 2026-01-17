-- AI Action Previews Table
-- Store AI task action previews in database instead of in-memory Map
-- This survives serverless function restarts

CREATE TABLE IF NOT EXISTS ai_action_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL UNIQUE,
  task_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  preview_data JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  applied_at TIMESTAMPTZ,

  CONSTRAINT valid_action_type CHECK (action_type IN (
    'suggest_subtasks', 'draft_acceptance', 'summarize_thread',
    'propose_next_step', 'detect_blockers', 'break_into_subtasks',
    'draft_update', 'estimate_time', 'find_similar'
  ))
);

-- Index for fast lookups by execution_id
CREATE INDEX IF NOT EXISTS idx_ai_action_previews_execution_id ON ai_action_previews(execution_id);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_ai_action_previews_expires_at ON ai_action_previews(expires_at) WHERE applied_at IS NULL;

-- Index for user's pending previews
CREATE INDEX IF NOT EXISTS idx_ai_action_previews_user_pending ON ai_action_previews(user_id, created_at DESC) WHERE applied_at IS NULL;

-- RLS policies
ALTER TABLE ai_action_previews ENABLE ROW LEVEL SECURITY;

-- Users can only see their own previews
CREATE POLICY "Users can view own previews" ON ai_action_previews
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own previews
CREATE POLICY "Users can create own previews" ON ai_action_previews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update (apply) their own previews
CREATE POLICY "Users can update own previews" ON ai_action_previews
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own previews
CREATE POLICY "Users can delete own previews" ON ai_action_previews
  FOR DELETE USING (auth.uid() = user_id);

-- Function to clean up expired previews (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_ai_previews()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_action_previews
  WHERE expires_at < NOW() AND applied_at IS NULL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment for documentation
COMMENT ON TABLE ai_action_previews IS 'Stores AI task action previews for Plan→Apply pattern. Previews expire after 30 minutes if not applied.';
