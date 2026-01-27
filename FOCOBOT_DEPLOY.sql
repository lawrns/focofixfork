-- =====================================================
-- FOCOBOT COMPLETE DEPLOYMENT SCRIPT
-- Run this in Supabase Dashboard SQL Editor
-- =====================================================

-- =====================================================
-- PART 1: CHECK EXISTING TABLES
-- =====================================================

-- Check if whatsapp_user_links exists (should already exist from previous migration)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_user_links') THEN
    RAISE EXCEPTION 'whatsapp_user_links table does not exist. Please run the base WhatsApp integration migration first.';
  END IF;
END $$;

-- =====================================================
-- PART 2: FOCOBOT SECURITY TABLES
-- =====================================================

-- 1. Device Fingerprints
CREATE TABLE IF NOT EXISTS whatsapp_device_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  fingerprint_hash TEXT NOT NULL,
  fingerprint_salt TEXT NOT NULL,
  device_info_encrypted TEXT,
  is_trusted BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  blocked_at TIMESTAMPTZ,
  blocked_reason TEXT,
  CONSTRAINT unique_device_per_user UNIQUE (user_id, fingerprint_hash)
);

CREATE INDEX IF NOT EXISTS idx_device_fingerprints_user ON whatsapp_device_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_phone ON whatsapp_device_fingerprints(phone);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_trusted ON whatsapp_device_fingerprints(user_id, is_trusted) WHERE is_trusted = true;

-- 2. Bot Sessions
CREATE TABLE IF NOT EXISTS whatsapp_bot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  device_fingerprint_id UUID REFERENCES whatsapp_device_fingerprints(id),
  session_token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_sessions_user ON whatsapp_bot_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_sessions_phone ON whatsapp_bot_sessions(phone);
CREATE INDEX IF NOT EXISTS idx_bot_sessions_active ON whatsapp_bot_sessions(user_id, is_active) WHERE is_active = true;

-- 3. Processed Messages (Replay Prevention)
CREATE TABLE IF NOT EXISTS whatsapp_processed_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_sid TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  message_timestamp TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_processed_messages_sid ON whatsapp_processed_messages(message_sid);
CREATE INDEX IF NOT EXISTS idx_processed_messages_expires ON whatsapp_processed_messages(expires_at) WHERE expires_at < NOW() + INTERVAL '1 hour';

-- 4. Rate Limit Tracking
CREATE TABLE IF NOT EXISTS whatsapp_rate_limit_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  violation_type TEXT NOT NULL,
  violation_count INTEGER DEFAULT 1,
  first_violation_at TIMESTAMPTZ DEFAULT NOW(),
  last_violation_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_rate_violations_phone ON whatsapp_rate_limit_violations(phone);
CREATE INDEX IF NOT EXISTS idx_rate_violations_user ON whatsapp_rate_limit_violations(user_id);

-- 5. Security Audit Log
CREATE TABLE IF NOT EXISTS whatsapp_security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  phone TEXT,
  action_type TEXT NOT NULL,
  action_details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  device_fingerprint_id UUID,
  success BOOLEAN NOT NULL,
  error_code TEXT,
  error_message TEXT,
  message_sid TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON whatsapp_security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_phone ON whatsapp_security_audit_log(phone);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON whatsapp_security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON whatsapp_security_audit_log(action_type, created_at);

-- 6. Account Lockouts
CREATE TABLE IF NOT EXISTS whatsapp_account_lockouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  locked_until TIMESTAMPTZ NOT NULL,
  locked_reason TEXT NOT NULL,
  triggered_by TEXT,
  triggered_by_user_id UUID REFERENCES auth.users(id),
  unlocked_at TIMESTAMPTZ,
  unlocked_by UUID REFERENCES auth.users(id),
  unlock_reason TEXT,
  related_audit_log_ids UUID[]
);

CREATE INDEX IF NOT EXISTS idx_account_lockouts_user ON whatsapp_account_lockouts(user_id);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_active ON whatsapp_account_lockouts(user_id, unlocked_at) WHERE unlocked_at IS NULL;

-- 7. FocoBot Command History
CREATE TABLE IF NOT EXISTS focobot_command_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  command TEXT NOT NULL,
  command_input TEXT,
  command_params JSONB DEFAULT '{}',
  success BOOLEAN NOT NULL,
  result_summary TEXT,
  error_message TEXT,
  llm_model TEXT,
  tokens_used INTEGER,
  processing_time_ms INTEGER,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_focobot_commands_user ON focobot_command_history(user_id);
CREATE INDEX IF NOT EXISTS idx_focobot_commands_created ON focobot_command_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_focobot_commands_task ON focobot_command_history(task_id) WHERE task_id IS NOT NULL;

-- 8. FocoBot Scheduled Notifications
CREATE TABLE IF NOT EXISTS focobot_scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_focobot_notifications_pending ON focobot_scheduled_notifications(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_focobot_notifications_user ON focobot_scheduled_notifications(user_id);

-- =====================================================
-- PART 3: ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE whatsapp_device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_processed_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_rate_limit_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE focobot_command_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE focobot_scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 4: RLS POLICIES
-- =====================================================

-- Device Fingerprints
CREATE POLICY "Users can view own device fingerprints"
  ON whatsapp_device_fingerprints FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage device fingerprints"
  ON whatsapp_device_fingerprints FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Bot Sessions
CREATE POLICY "Users can view own bot sessions"
  ON whatsapp_bot_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can revoke own bot sessions"
  ON whatsapp_bot_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage bot sessions"
  ON whatsapp_bot_sessions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Processed Messages
CREATE POLICY "Service role can manage processed messages"
  ON whatsapp_processed_messages FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Rate Limit Violations
CREATE POLICY "Service role can manage rate limit violations"
  ON whatsapp_rate_limit_violations FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Audit Log
CREATE POLICY "Users can view own security audit log"
  ON whatsapp_security_audit_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage audit log"
  ON whatsapp_security_audit_log FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Account Lockouts
CREATE POLICY "Users can view own account lockouts"
  ON whatsapp_account_lockouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage account lockouts"
  ON whatsapp_account_lockouts FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- FocoBot Command History
CREATE POLICY "Users can view own focobot commands"
  ON focobot_command_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage focobot commands"
  ON focobot_command_history FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- FocoBot Notifications
CREATE POLICY "Users can view own focobot notifications"
  ON focobot_scheduled_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage focobot notifications"
  ON focobot_scheduled_notifications FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- PART 5: HELPER FUNCTIONS
-- =====================================================

-- Check if user account is locked
CREATE OR REPLACE FUNCTION is_account_locked(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM whatsapp_account_lockouts
    WHERE user_id = p_user_id
      AND unlocked_at IS NULL
      AND locked_until > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get active session for user
CREATE OR REPLACE FUNCTION get_active_bot_session(p_user_id UUID, p_phone TEXT)
RETURNS TABLE (
  session_id UUID,
  expires_at TIMESTAMPTZ,
  device_fingerprint_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ws.id,
    ws.expires_at,
    ws.device_fingerprint_id
  FROM whatsapp_bot_sessions ws
  WHERE ws.user_id = p_user_id
    AND ws.phone = p_phone
    AND ws.is_active = true
    AND ws.expires_at > NOW()
  ORDER BY ws.last_activity_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check rate limit status
CREATE OR REPLACE FUNCTION check_rate_limit_status(p_phone TEXT, p_user_id UUID)
RETURNS TABLE (
  violations_last_hour INTEGER,
  violations_last_day INTEGER,
  is_violator BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE last_violation_at > NOW() - INTERVAL '1 hour')::INTEGER AS violations_last_hour,
    COUNT(*) FILTER (WHERE last_violation_at > NOW() - INTERVAL '1 day')::INTEGER AS violations_last_day,
    EXISTS (
      SELECT 1 FROM whatsapp_rate_limit_violations
      WHERE (phone = p_phone OR user_id = p_user_id)
        AND last_violation_at > NOW() - INTERVAL '1 hour'
        AND violation_count >= 5
    ) AS is_violator
  FROM whatsapp_rate_limit_violations
  WHERE phone = p_phone OR user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log security event
CREATE OR REPLACE FUNCTION log_whatsapp_security_event(
  p_user_id UUID,
  p_phone TEXT,
  p_action_type TEXT,
  p_action_details JSONB DEFAULT '{}',
  p_success BOOLEAN DEFAULT true,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_message_sid TEXT DEFAULT NULL,
  p_processing_time_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO whatsapp_security_audit_log (
    user_id, phone, action_type, action_details,
    success, error_code, error_message, message_sid, processing_time_ms
  ) VALUES (
    p_user_id, p_phone, p_action_type, p_action_details,
    p_success, p_error_code, p_error_message, p_message_sid, p_processing_time_ms
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old processed messages
CREATE OR REPLACE FUNCTION cleanup_processed_messages()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM whatsapp_processed_messages
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Emergency lockout function
CREATE OR REPLACE FUNCTION emergency_lock_phone(p_phone TEXT, p_reason TEXT)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id
  FROM whatsapp_user_links
  WHERE phone = p_phone;
  
  UPDATE whatsapp_bot_sessions
  SET is_active = false,
      revoked_at = NOW(),
      revoked_reason = 'emergency_lockout: ' || p_reason
  WHERE phone = p_phone AND is_active = true;
  
  UPDATE whatsapp_device_fingerprints
  SET is_blocked = true,
      blocked_at = NOW(),
      blocked_reason = 'emergency_lockout: ' || p_reason
  WHERE phone = p_phone;
  
  IF v_user_id IS NOT NULL THEN
    INSERT INTO whatsapp_account_lockouts (
      user_id, phone, locked_until, locked_reason,
      triggered_by, triggered_by_user_id
    ) VALUES (
      v_user_id, p_phone, NOW() + INTERVAL '999 years', p_reason,
      'emergency_procedure', auth.uid()
    );
  END IF;
  
  PERFORM log_whatsapp_security_event(
    v_user_id, p_phone, 'account_locked',
    jsonb_build_object('reason', p_reason, 'type', 'emergency'),
    true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record FocoBot command
CREATE OR REPLACE FUNCTION record_focobot_command(
  p_user_id UUID,
  p_phone TEXT,
  p_command TEXT,
  p_command_input TEXT,
  p_command_params JSONB,
  p_success BOOLEAN,
  p_result_summary TEXT,
  p_error_message TEXT,
  p_llm_model TEXT,
  p_tokens_used INTEGER,
  p_processing_time_ms INTEGER,
  p_task_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_command_id UUID;
BEGIN
  INSERT INTO focobot_command_history (
    user_id, phone, command, command_input, command_params,
    success, result_summary, error_message,
    llm_model, tokens_used, processing_time_ms,
    task_id, project_id
  ) VALUES (
    p_user_id, p_phone, p_command, p_command_input, p_command_params,
    p_success, p_result_summary, p_error_message,
    p_llm_model, p_tokens_used, p_processing_time_ms,
    p_task_id, p_project_id
  )
  RETURNING id INTO v_command_id;
  
  RETURN v_command_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule notification
CREATE OR REPLACE FUNCTION schedule_focobot_notification(
  p_user_id UUID,
  p_phone TEXT,
  p_notification_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_scheduled_for TIMESTAMPTZ,
  p_task_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO focobot_scheduled_notifications (
    user_id, phone, notification_type, title, message,
    scheduled_for, task_id
  ) VALUES (
    p_user_id, p_phone, p_notification_type, p_title, p_message,
    p_scheduled_for, p_task_id
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get pending notifications
CREATE OR REPLACE FUNCTION get_pending_focobot_notifications(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  phone TEXT,
  notification_type TEXT,
  title TEXT,
  message TEXT,
  scheduled_for TIMESTAMPTZ,
  task_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.user_id,
    n.phone,
    n.notification_type,
    n.title,
    n.message,
    n.scheduled_for,
    n.task_id
  FROM focobot_scheduled_notifications n
  WHERE n.status = 'pending'
    AND n.scheduled_for <= NOW()
  ORDER BY n.scheduled_for ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark notification as sent
CREATE OR REPLACE FUNCTION mark_notification_sent(
  p_notification_id UUID,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF p_success THEN
    UPDATE focobot_scheduled_notifications
    SET status = 'sent',
        sent_at = NOW()
    WHERE id = p_notification_id;
  ELSE
    UPDATE focobot_scheduled_notifications
    SET status = 'failed',
        failed_at = NOW(),
        error_message = p_error_message
    WHERE id = p_notification_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 6: ENABLE FOCOBOT FOR ALL EXISTING USERS
-- =====================================================

-- Add focobot_enabled flag to user_notification_preferences if not exists
ALTER TABLE user_notification_preferences 
  ADD COLUMN IF NOT EXISTS focobot_enabled BOOLEAN DEFAULT true;

-- Create default notification preferences for users who don't have them
INSERT INTO user_notification_preferences (user_id, whatsapp_enabled, focobot_enabled)
SELECT 
  u.id,
  true,
  true
FROM auth.users u
LEFT JOIN user_notification_preferences unp ON u.id = unp.user_id
WHERE unp.user_id IS NULL;

-- =====================================================
-- DEPLOYMENT COMPLETE
-- =====================================================

SELECT 'FocoBot deployment complete!' as status;
SELECT 'Tables created:' as info;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'whatsapp_%' OR tablename LIKE 'focobot_%';
