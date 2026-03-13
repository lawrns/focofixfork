CREATE TABLE IF NOT EXISTS workspace_action_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preview_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preview_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  input_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  apply_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  applied_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,

  CONSTRAINT workspace_action_previews_preview_type_check CHECK (
    preview_type IN ('starter_plan', 'assistant_action')
  ),
  CONSTRAINT workspace_action_previews_entity_type_check CHECK (
    entity_type IN ('workspace', 'page', 'database')
  ),
  CONSTRAINT workspace_action_previews_status_check CHECK (
    status IN ('pending', 'applied', 'expired', 'failed')
  )
);

CREATE INDEX IF NOT EXISTS idx_workspace_action_previews_workspace_pending
  ON workspace_action_previews(workspace_id, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_workspace_action_previews_user_pending
  ON workspace_action_previews(user_id, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_workspace_action_previews_expires_at
  ON workspace_action_previews(expires_at)
  WHERE status = 'pending';

ALTER TABLE workspace_action_previews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own workspace previews" ON workspace_action_previews;
CREATE POLICY "Users can view own workspace previews" ON workspace_action_previews
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own workspace previews" ON workspace_action_previews;
CREATE POLICY "Users can create own workspace previews" ON workspace_action_previews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own workspace previews" ON workspace_action_previews;
CREATE POLICY "Users can update own workspace previews" ON workspace_action_previews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION cleanup_expired_workspace_action_previews()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE workspace_action_previews
  SET status = 'expired'
  WHERE expires_at < NOW()
    AND status = 'pending';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE workspace_action_previews IS
  'Stores workspace starter-plan and assistant action previews for reviewable apply flows.';
