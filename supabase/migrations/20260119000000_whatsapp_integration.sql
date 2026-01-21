-- WhatsApp Integration for Foco
-- Enables inbound (message → proposal) and outbound (notifications → WhatsApp) messaging

-- Table: whatsapp_user_links
-- Links Foco users to WhatsApp phone numbers with verification
CREATE TABLE whatsapp_user_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL UNIQUE,
  verified boolean DEFAULT false,
  verification_code text,
  verification_code_expires_at timestamptz,
  linked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ensure phone is in E.164 format (+1234567890)
  CONSTRAINT valid_phone CHECK (phone ~ '^\+[1-9]\d{1,14}$'),

  -- One WhatsApp number per user
  CONSTRAINT one_link_per_user UNIQUE (user_id)
);

-- Table: whatsapp_sessions
-- Maintains conversation context for multi-turn interactions (30-min TTL in Redis)
-- Also persisted to DB for history and recovery
CREATE TABLE whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  workspace_id uuid REFERENCES foco_workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES foco_projects(id) ON DELETE CASCADE,
  conversation_state text DEFAULT 'idle', -- idle, awaiting_project, creating_proposal
  metadata jsonb DEFAULT '{}',
  last_message_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_whatsapp_user_links_phone ON whatsapp_user_links(phone);
CREATE INDEX idx_whatsapp_user_links_user ON whatsapp_user_links(user_id);
CREATE INDEX idx_whatsapp_user_links_verified ON whatsapp_user_links(verified) WHERE verified = true;
CREATE INDEX idx_whatsapp_sessions_phone ON whatsapp_sessions(phone);
CREATE INDEX idx_whatsapp_sessions_user ON whatsapp_sessions(user_id);
CREATE INDEX idx_whatsapp_sessions_active ON whatsapp_sessions(ended_at) WHERE ended_at IS NULL;

-- Enable Row Level Security
ALTER TABLE whatsapp_user_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own WhatsApp links
CREATE POLICY "Users can view own WhatsApp links"
  ON whatsapp_user_links FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can manage their own WhatsApp links
CREATE POLICY "Users can manage own WhatsApp links"
  ON whatsapp_user_links FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policy: Users can view their own sessions
CREATE POLICY "Users can view own WhatsApp sessions"
  ON whatsapp_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Service role can manage all sessions (for webhook processing)
CREATE POLICY "Service role can manage all WhatsApp sessions"
  ON whatsapp_sessions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_user_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at on whatsapp_user_links
CREATE TRIGGER trigger_update_whatsapp_user_links_updated_at
  BEFORE UPDATE ON whatsapp_user_links
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_user_links_updated_at();

-- Add WhatsApp to notification preferences (extend existing user_notification_preferences)
-- This assumes user_notification_preferences table exists
ALTER TABLE user_notification_preferences
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false;

COMMENT ON TABLE whatsapp_user_links IS 'Links Foco users to verified WhatsApp phone numbers';
COMMENT ON TABLE whatsapp_sessions IS 'Maintains conversation context for WhatsApp interactions';
COMMENT ON COLUMN whatsapp_user_links.phone IS 'Phone number in E.164 format (+1234567890)';
COMMENT ON COLUMN whatsapp_user_links.verification_code IS '6-digit code sent to WhatsApp for verification';
COMMENT ON COLUMN whatsapp_sessions.conversation_state IS 'Current state: idle, awaiting_project, creating_proposal';
COMMENT ON COLUMN whatsapp_sessions.metadata IS 'JSON metadata including pending_proposal_id, etc.';
