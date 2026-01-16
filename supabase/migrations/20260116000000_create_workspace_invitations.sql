-- Migration: Create workspace_invitations table
-- Enables invitation workflow for adding members to workspaces

-- Create invitation status enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
    CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'cancelled', 'expired');
  END IF;
END $$;

-- Create workspace_invitations table
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'guest')),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  message text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (workspace_id, email, status) -- Prevent duplicate pending invitations
);

-- Create unique index on token for lookup
CREATE UNIQUE INDEX IF NOT EXISTS workspace_invitations_token_idx ON workspace_invitations (token);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS workspace_invitations_workspace_id_idx ON workspace_invitations (workspace_id);
CREATE INDEX IF NOT EXISTS workspace_invitations_email_idx ON workspace_invitations (email);
CREATE INDEX IF NOT EXISTS workspace_invitations_status_idx ON workspace_invitations (status);
CREATE INDEX IF NOT EXISTS workspace_invitations_expires_at_idx ON workspace_invitations (expires_at);

-- Enable RLS
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view invitations for workspaces they are admins of
DROP POLICY IF EXISTS "Workspace admins can view invitations" ON workspace_invitations;
CREATE POLICY "Workspace admins can view invitations"
  ON workspace_invitations
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
    OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Workspace admins can create invitations
DROP POLICY IF EXISTS "Workspace admins can create invitations" ON workspace_invitations;
CREATE POLICY "Workspace admins can create invitations"
  ON workspace_invitations
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Workspace admins can update invitations (cancel, etc)
DROP POLICY IF EXISTS "Workspace admins can update invitations" ON workspace_invitations;
CREATE POLICY "Workspace admins can update invitations"
  ON workspace_invitations
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Workspace admins can delete invitations
DROP POLICY IF EXISTS "Workspace admins can delete invitations" ON workspace_invitations;
CREATE POLICY "Workspace admins can delete invitations"
  ON workspace_invitations
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Function to accept invitation and add member
CREATE OR REPLACE FUNCTION accept_workspace_invitation(invitation_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inv workspace_invitations%ROWTYPE;
  current_user_email text;
  result json;
BEGIN
  -- Get current user's email
  SELECT email INTO current_user_email FROM auth.users WHERE id = auth.uid();
  
  IF current_user_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Find the invitation
  SELECT * INTO inv FROM workspace_invitations
  WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > now();

  IF inv.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Verify email matches
  IF inv.email != current_user_email THEN
    RETURN json_build_object('success', false, 'error', 'Invitation is for a different email address');
  END IF;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = inv.workspace_id AND user_id = auth.uid()
  ) THEN
    -- Update invitation status and return success
    UPDATE workspace_invitations
    SET status = 'accepted', accepted_at = now(), updated_at = now()
    WHERE id = inv.id;
    
    RETURN json_build_object('success', true, 'message', 'Already a member of this workspace');
  END IF;

  -- Add user as workspace member
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (inv.workspace_id, auth.uid(), inv.role);

  -- Update invitation status
  UPDATE workspace_invitations
  SET status = 'accepted', accepted_at = now(), updated_at = now()
  WHERE id = inv.id;

  RETURN json_build_object('success', true, 'workspace_id', inv.workspace_id);
END;
$$;

-- Function to automatically expire old invitations (can be called via cron)
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE workspace_invitations
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workspace_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workspace_invitations_updated_at ON workspace_invitations;
CREATE TRIGGER workspace_invitations_updated_at
  BEFORE UPDATE ON workspace_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_invitations_updated_at();

-- Migration complete!
-- Summary:
-- - Created workspace_invitations table with proper constraints
-- - Added unique token for secure invitation links
-- - Set up RLS policies for workspace admin access
-- - Created accept_workspace_invitation function for secure invitation acceptance
-- - Created expire_old_invitations function for cleanup
