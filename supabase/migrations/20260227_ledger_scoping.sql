-- Add workspace_id and user_id to ledger_events for multi-tenant scoping
ALTER TABLE ledger_events ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE SET NULL;
ALTER TABLE ledger_events ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ledger_workspace ON ledger_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger_events(user_id);
