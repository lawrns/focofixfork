# Focobot Comprehensive Security Model

## Executive Summary

This document defines a defense-in-depth security architecture for **focobot** - a WhatsApp-based personal task assistant. The model ensures that **only the authorized user** can access their tasks and data through WhatsApp.

**Security Grade Target: A+**

---

## Table of Contents

1. [Security Requirements](#1-security-requirements)
2. [Threat Model](#2-threat-model)
3. [Security Architecture Overview](#3-security-architecture-overview)
4. [Authentication Flow](#4-authentication-flow)
5. [Authorization Framework](#5-authorization-framework)
6. [Database Security](#6-database-security)
7. [Rate Limiting](#7-rate-limiting)
8. [Audit Logging](#8-audit-logging)
9. [Emergency Procedures](#9-emergency-procedures)
10. [Implementation Guide](#10-implementation-guide)

---

## 1. Security Requirements

### 1.1 Core Requirements

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **Single User Access** | Bot is personal to exactly one user per phone number | P0 |
| **WhatsApp Verification** | Phone number must be verified before access | P0 |
| **Device Fingerprinting** | Track and validate device characteristics | P1 |
| **Rate Limiting** | Per-user and per-device request throttling | P0 |
| **Message Signature** | Verify all messages originate from Twilio | P0 |
| **Session Timeout** | Automatic session expiration and re-auth | P1 |
| **Data Isolation** | Strict user-data boundaries | P0 |
| **Secure Storage** | Encrypted API keys and tokens | P0 |

### 1.2 Security Threats Addressed

| Threat | Description | Mitigation |
|--------|-------------|------------|
| **Impersonation** | Someone else messaging the bot | Phone verification + device binding |
| **Phone Spoofing** | Fake caller ID | Twilio signature + verification codes |
| **Replay Attacks** | Reusing old messages | Nonce tracking + timestamp validation |
| **Session Hijacking** | Stealing active session | Short-lived sessions + device fingerprinting |
| **API Abuse** | Excessive requests | Multi-layer rate limiting |

---

## 2. Threat Model

### 2.1 Attack Scenarios

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     ATTACK SURFACE ANALYSIS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  LAYER 1: WHATSAPP/TWILIO INTERFACE                                       │
│  ├── Attacker sends message from different number                        │
│  ├── Attacker spoofs phone number                                        │
│  ├── Attacker replays intercepted webhook                                │
│  └── Attacker floods with messages (DoS)                                 │
│                                                                          │
│  LAYER 2: WEBHOOK ENDPOINT                                                │
│  ├── Attacker sends fake Twilio payload                                  │
│  ├── Attacker bypasses signature verification                            │
│  └── Attacker exploits parsing vulnerabilities                           │
│                                                                          │
│  LAYER 3: SESSION/STATE MANAGEMENT                                        │
│  ├── Attacker hijacks active session                                     │
│  ├── Attacker extends expired session                                    │
│  └── Attacker accesses another user's session                            │
│                                                                          │
│  LAYER 4: DATABASE ACCESS                                                 │
│  ├── Attacker bypasses RLS policies                                      │
│  ├── Attacker injects SQL through metadata                               │
│  └── Attacker accesses other user's tasks                                │
│                                                                          │
│  LAYER 5: API INTEGRATION                                                 │
│  ├── Attacker abuses AI API (cost attack)                                │
│  ├── Attacker extracts API keys                                          │
│  └── Attacker manipulates task data                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Risk Assessment Matrix

| Threat | Likelihood | Impact | Risk Score | Priority |
|--------|-----------|--------|------------|----------|
| Phone spoofing | Medium | High | 6 | P1 |
| Replay attacks | Low | High | 4 | P2 |
| Session hijacking | Low | Critical | 6 | P1 |
| API abuse | High | Medium | 6 | P1 |
| Impersonation | Medium | Critical | 8 | P0 |
| Data breach | Low | Critical | 6 | P1 |

---

## 3. Security Architecture Overview

### 3.1 Defense in Depth

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DEFENSE-IN-DEPTH ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 6: DATABASE SECURITY                                       │   │
│  │ • Row Level Security (RLS) policies                              │   │
│  │ • User isolation at database level                               │   │
│  │ • Audit logging                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ▲                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 5: APPLICATION SECURITY                                    │   │
│  │ • User context validation                                        │   │
│  │ • Workspace isolation                                            │   │
│  │ • Task ownership verification                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ▲                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 4: SESSION SECURITY                                        │   │
│  │ • Session tokens with expiration                                 │   │
│  │ • Device fingerprint matching                                    │   │
│  │ • Activity-based timeout                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ▲                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 3: RATE LIMITING                                           │   │
│  │ • Per-phone limits                                               │   │
│  │ • Per-user limits                                                │   │
│  │ • Progressive penalties                                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ▲                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 2: WEBHOOK SECURITY                                        │   │
│  │ • Twilio signature verification                                  │   │
│  │ • Replay attack prevention (nonce store)                         │   │
│  │ • Timestamp validation                                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ▲                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 1: VERIFICATION & BINDING                                  │   │
│  │ • Phone number verification (OTP)                                │   │
│  │ • Device fingerprint registration                                │   │
│  │ • One-user-per-phone enforcement                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Security Flow Summary

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │───▶│  Twilio  │───▶│ Webhook  │───▶│  Bot     │───▶│ Database │
│ WhatsApp │    │  API     │    │ Handler  │    │  Logic   │    │ (RLS)    │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         SECURITY CHECKS                                 │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Verify Twilio Signature (HMAC-SHA256)                               │
│ 2. Check Message ID against replay cache                               │
│ 3. Validate timestamp (reject old messages)                            │
│ 4. Check rate limits (phone + user)                                    │
│ 5. Verify phone is linked to user                                      │
│ 6. Validate device fingerprint                                         │
│ 7. Check session validity                                              │
│ 8. Execute command with user context                                   │
│ 9. Log audit trail                                                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Authentication Flow

### 4.1 Initial Linking Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│              INITIAL WHATSAPP LINKING (ONE-TIME SETUP)                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User (Web)                    Foco Backend                    WhatsApp │
│     │                              │                               │    │
│     │  1. Request WhatsApp linking │                               │    │
│     │─────────────────────────────▶│                               │    │
│     │                              │                               │    │
│     │  2. Show verification code   │                               │    │
│     │◀─────────────────────────────│                               │    │
│     │                              │                               │    │
│     │                              │  3. Send code via WhatsApp    │    │
│     │                              │──────────────────────────────▶│    │
│     │                              │                               │    │
│     │                              │  4. User sends code back      │    │
│     │                              │◀──────────────────────────────│    │
│     │                              │                               │    │
│     │                              │  5. Verify code matches       │    │
│     │                              │  6. Record device fingerprint │    │
│     │                              │  7. Create verified link      │    │
│     │                              │                               │    │
│     │  8. Confirm linking complete │                               │    │
│     │◀─────────────────────────────│                               │    │
│     │                              │                               │    │
└─────┼──────────────────────────────┼───────────────────────────────┼────┘
      │                              │                               │
      ▼                              ▼                               ▼

VERIFICATION REQUIREMENTS:
- 6-digit numeric code
- Expires after 10 minutes
- Max 3 attempts per code
- Single-use (deleted after verification)
```

### 4.2 Daily Usage Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DAILY WHATSAPP INTERACTION                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. User sends message via WhatsApp                                     │
│     "Create task: Review proposal"                                      │
│                                                                          │
│  2. Twilio receives and forwards to webhook                             │
│     - Includes: From, Body, MessageSid, Timestamp                       │
│                                                                          │
│  3. Webhook Handler Security Checks:                                    │
│     a) Verify Twilio signature (X-Twilio-Signature)                     │
│     b) Check MessageSid against processed_messages table                │
│     c) Validate timestamp (reject if >5 min old)                        │
│     d) Check rate limit for phone number                                │
│                                                                          │
│  4. Phone Number → User Resolution:                                     │
│     a) Lookup whatsapp_user_links by phone                              │
│     b) Verify link is verified=true                                     │
│     c) Check if account is locked                                       │
│                                                                          │
│  5. Session Validation:                                                 │
│     a) Check active session exists                                      │
│     b) Validate device fingerprint                                      │
│     c) Check session expiration                                         │
│     d) Extend session on activity                                       │
│                                                                          │
│  6. Command Processing:                                                 │
│     a) Parse intent from message                                        │
│     b) Execute with user's RLS context                                  │
│     c) Access only user's workspace data                                │
│                                                                          │
│  7. Response:                                                           │
│     a) Send response via Twilio                                         │
│     b) Log interaction to audit_log                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Session Timeout & Re-authentication

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SESSION LIFECYCLE                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Session Created ──────▶ Active Session ──────▶ Expired/Invalid         │
│       │                       │                      │                   │
│       │                       │                      │                   │
│       ▼                       ▼                      ▼                   │
│  ┌─────────┐           ┌─────────────┐        ┌─────────────┐           │
│  • 24hr   │           • On activity │        • 24hr idle  │           │
│  • Device │           • Extend 24hr │        • Suspicious │           │
│  • User   │           • Max 7 days  │          activity   │           │
│  • Phone  │                         │        • Device     │           │
│  └─────────┘                         │          mismatch   │           │
│                                      │                      │           │
│  RE-AUTHENTICATION REQUIRED:         │        LOCKOUT:     │           │
│  - Send verification code            │        - After 3    │           │
│  - User confirms via WhatsApp        │          failed     │           │
│  - New session created               │          attempts   │           │
│                                      │                      │           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Authorization Framework

### 5.1 Permission Matrix

| Action | Verified Phone | Active Session | Valid Fingerprint | Rate OK |
|--------|---------------|----------------|-------------------|---------|
| Create task | ✅ | ✅ | ✅ | ✅ |
| List tasks | ✅ | ✅ | ✅ | ✅ |
| Complete task | ✅ | ✅ | ✅ | ✅ |
| Delete task | ✅ | ✅ | ✅ | ✅ |
| View proposals | ✅ | ✅ | ✅ | ✅ |
| Accept proposal | ✅ | ✅ | ✅ | ✅ |
| Link new device | ✅ | ❌ | N/A | ✅ |
| Admin commands | ✅ | ✅ | ✅ | ✅ |

### 5.2 Authorization Code Pattern

```typescript
// Every bot command follows this pattern:

async function botCommandHandler(message: WhatsAppMessage) {
  // LAYER 1: Webhook verification
  await verifyTwilioSignature(message);
  
  // LAYER 2: Replay prevention
  await checkMessageNotProcessed(message.MessageSid);
  
  // LAYER 3: Rate limiting
  await checkRateLimits(message.From);
  
  // LAYER 4: Phone → User resolution
  const userLink = await getVerifiedUserLink(message.From);
  if (!userLink) throw new UnauthorizedError();
  
  // LAYER 5: Device validation
  const deviceFingerprint = generateDeviceFingerprint(message);
  await validateDevice(userLink.user_id, deviceFingerprint);
  
  // LAYER 6: Session validation
  const session = await validateOrCreateSession(userLink.user_id, deviceFingerprint);
  
  // LAYER 7: Execute with user context
  const result = await executeWithUserContext(userLink.user_id, async () => {
    return await processCommand(message.Body);
  });
  
  // LAYER 8: Audit logging
  await logAuditEvent(userLink.user_id, 'command_executed', result);
  
  return result;
}
```

---

## 6. Database Security

### 6.1 Security-Focused Schema Extensions

The following tables extend the existing WhatsApp integration with security features:

```sql
-- =====================================================
-- FOCOBOT SECURITY SCHEMA
-- =====================================================

-- 1. Device Fingerprints
-- Stores device characteristics for binding
CREATE TABLE whatsapp_device_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  
  -- Device characteristics (hashed)
  fingerprint_hash text NOT NULL,
  fingerprint_salt text NOT NULL,
  
  -- Metadata (encrypted at application level)
  device_info_encrypted text,
  
  -- Status
  is_trusted boolean DEFAULT false,
  is_blocked boolean DEFAULT false,
  
  -- Timestamps
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  blocked_at timestamptz,
  blocked_reason text,
  
  -- Constraints
  CONSTRAINT unique_device_per_user UNIQUE (user_id, fingerprint_hash)
);

-- 2. Bot Sessions
-- Tracks active bot sessions with expiration
CREATE TABLE whatsapp_bot_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  device_fingerprint_id uuid REFERENCES whatsapp_device_fingerprints(id),
  
  -- Session tokens (hashed)
  session_token_hash text NOT NULL,
  
  -- Expiration
  expires_at timestamptz NOT NULL,
  last_activity_at timestamptz DEFAULT now(),
  
  -- Status
  is_active boolean DEFAULT true,
  revoked_at timestamptz,
  revoked_reason text,
  
  -- Metadata
  ip_address inet,
  user_agent text,
  
  created_at timestamptz DEFAULT now()
);

-- 3. Processed Messages (Replay Prevention)
-- Tracks all processed message IDs to prevent replay attacks
CREATE TABLE whatsapp_processed_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_sid text NOT NULL UNIQUE,
  phone text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  
  -- Message metadata
  message_timestamp timestamptz NOT NULL,
  processed_at timestamptz DEFAULT now(),
  
  -- For cleanup (TTL: 24 hours)
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

-- 4. Rate Limit Tracking
-- Per-phone and per-user rate limit state
CREATE TABLE whatsapp_rate_limit_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  violation_type text NOT NULL, -- 'per_minute', 'per_hour', 'per_day'
  violation_count integer DEFAULT 1,
  
  -- Tracking
  first_violation_at timestamptz DEFAULT now(),
  last_violation_at timestamptz DEFAULT now(),
  
  -- Auto-cleanup after 7 days
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

-- 5. Security Audit Log
-- Comprehensive audit trail for all bot interactions
CREATE TABLE whatsapp_security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Actor
  user_id uuid REFERENCES auth.users(id),
  phone text,
  
  -- Action
  action_type text NOT NULL, -- 'message_received', 'command_executed', 
                             -- 'session_created', 'session_expired',
                             -- 'verification_attempt', 'verification_success',
                             -- 'verification_failed', 'rate_limit_violation',
                             -- 'unauthorized_access', 'device_blocked'
  
  -- Details
  action_details jsonb DEFAULT '{}',
  
  -- Context
  ip_address inet,
  user_agent text,
  device_fingerprint_id uuid,
  
  -- Result
  success boolean NOT NULL,
  error_code text,
  error_message text,
  
  -- Message reference
  message_sid text,
  
  -- Performance
  processing_time_ms integer,
  
  -- Timestamp
  created_at timestamptz DEFAULT now()
);

-- 6. Account Lockouts
-- Tracks locked accounts and lockout history
CREATE TABLE whatsapp_account_lockouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  
  -- Lockout details
  locked_at timestamptz DEFAULT now(),
  locked_until timestamptz NOT NULL,
  locked_reason text NOT NULL,
  
  -- Trigger
  triggered_by text, -- 'manual', 'auto_suspicious', 'auto_rate_limit'
  triggered_by_user_id uuid REFERENCES auth.users(id),
  
  -- Resolution
  unlocked_at timestamptz,
  unlocked_by uuid REFERENCES auth.users(id),
  unlock_reason text,
  
  -- Related events
  related_audit_log_ids uuid[]
);
```

### 6.2 Row Level Security Policies

```sql
-- =====================================================
-- RLS POLICIES FOR BOT SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE whatsapp_device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_processed_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_rate_limit_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_account_lockouts ENABLE ROW LEVEL SECURITY;

-- Device Fingerprints: Users can only see their own devices
CREATE POLICY "Users can view own device fingerprints"
  ON whatsapp_device_fingerprints FOR SELECT
  USING (auth.uid() = user_id);

-- Bot Sessions: Users can only see their own sessions
CREATE POLICY "Users can view own bot sessions"
  ON whatsapp_bot_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can revoke their own sessions
CREATE POLICY "Users can revoke own bot sessions"
  ON whatsapp_bot_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Processed Messages: Service role only (for replay prevention)
CREATE POLICY "Service role can manage processed messages"
  ON whatsapp_processed_messages FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Audit Log: Users can view their own audit trail
CREATE POLICY "Users can view own security audit log"
  ON whatsapp_security_audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- Account Lockouts: Users can view their own lockouts
CREATE POLICY "Users can view own account lockouts"
  ON whatsapp_account_lockouts FOR SELECT
  USING (auth.uid() = user_id);
```

### 6.3 Security Helper Functions

```sql
-- =====================================================
-- SECURITY HELPER FUNCTIONS
-- =====================================================

-- Check if user account is locked
CREATE OR REPLACE FUNCTION is_account_locked(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM whatsapp_account_lockouts
    WHERE user_id = p_user_id
      AND unlocked_at IS NULL
      AND locked_until > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get active session for user
CREATE OR REPLACE FUNCTION get_active_bot_session(p_user_id uuid, p_phone text)
RETURNS TABLE (
  session_id uuid,
  expires_at timestamptz,
  device_fingerprint_id uuid
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
    AND ws.expires_at > now()
  ORDER BY ws.last_activity_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check rate limit status
CREATE OR REPLACE FUNCTION check_rate_limit_status(p_phone text, p_user_id uuid)
RETURNS TABLE (
  violations_last_hour integer,
  violations_last_day integer,
  is_violator boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE last_violation_at > now() - interval '1 hour')::integer as violations_last_hour,
    COUNT(*) FILTER (WHERE last_violation_at > now() - interval '1 day')::integer as violations_last_day,
    EXISTS (
      SELECT 1 FROM whatsapp_rate_limit_violations
      WHERE (phone = p_phone OR user_id = p_user_id)
        AND last_violation_at > now() - interval '1 hour'
        AND violation_count >= 5
    ) as is_violator
  FROM whatsapp_rate_limit_violations
  WHERE phone = p_phone OR user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log security event
CREATE OR REPLACE FUNCTION log_whatsapp_security_event(
  p_user_id uuid,
  p_phone text,
  p_action_type text,
  p_action_details jsonb DEFAULT '{}',
  p_success boolean DEFAULT true,
  p_error_code text DEFAULT null,
  p_error_message text DEFAULT null,
  p_message_sid text DEFAULT null,
  p_processing_time_ms integer DEFAULT null
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
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

-- Cleanup old processed messages (run periodically)
CREATE OR REPLACE FUNCTION cleanup_processed_messages()
RETURNS integer AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM whatsapp_processed_messages
  WHERE expires_at < now();
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 7. Rate Limiting

### 7.1 Rate Limit Configuration

```typescript
// Rate limit tiers for different user types
interface RateLimitConfig {
  // Per-phone limits (before linking)
  unlinkedPhone: {
    perMinute: 3;   // Very restrictive
    perHour: 10;
    perDay: 20;
  };
  
  // Per-user limits (after verification)
  verifiedUser: {
    perMinute: 10;  // Normal usage
    perHour: 100;
    perDay: 500;
  };
  
  // Premium/Admin users
  premiumUser: {
    perMinute: 30;
    perHour: 300;
    perDay: 1500;
  };
}

// Progressive penalties
interface RateLimitPenalty {
  violationCount: number;
  action: 'warn' | 'delay' | 'temporary_block' | 'permanent_block';
  duration?: number; // seconds
}

const penalties: RateLimitPenalty[] = [
  { violationCount: 3, action: 'warn' },
  { violationCount: 5, action: 'delay', duration: 60 },
  { violationCount: 10, action: 'temporary_block', duration: 3600 },
  { violationCount: 20, action: 'permanent_block' }
];
```

### 7.2 Rate Limiting Implementation

See: [focobot-security.ts](../src/lib/security/focobot-security.ts)

---

## 8. Audit Logging

### 8.1 Audit Event Types

```typescript
type AuditEventType = 
  // Message events
  | 'message_received'
  | 'message_processed'
  | 'message_rejected'
  
  // Command events
  | 'command_executed'
  | 'command_failed'
  | 'command_unauthorized'
  
  // Session events
  | 'session_created'
  | 'session_validated'
  | 'session_expired'
  | 'session_revoked'
  
  // Verification events
  | 'verification_code_sent'
  | 'verification_attempt'
  | 'verification_success'
  | 'verification_failed'
  | 'verification_expired'
  
  // Device events
  | 'device_registered'
  | 'device_verified'
  | 'device_blocked'
  | 'device_unblocked'
  
  // Security events
  | 'rate_limit_violation'
  | 'suspicious_activity'
  | 'replay_attack_detected'
  | 'signature_verification_failed'
  | 'unauthorized_access_attempt'
  
  // Account events
  | 'account_locked'
  | 'account_unlocked'
  | 'account_linked'
  | 'account_unlinked';
```

### 8.2 Audit Log Retention

| Event Type | Retention Period | Storage Class |
|------------|-----------------|---------------|
| Security violations | 2 years | Hot storage |
| Session events | 90 days | Warm storage |
| Command events | 30 days | Warm storage |
| Message events | 7 days | Cold storage |

---

## 9. Emergency Procedures

### 9.1 Emergency Lockout

```sql
-- Lock a specific phone number immediately
CREATE OR REPLACE FUNCTION emergency_lock_phone(p_phone text, p_reason text)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user ID
  SELECT user_id INTO v_user_id
  FROM whatsapp_user_links
  WHERE phone = p_phone;
  
  -- Revoke all active sessions
  UPDATE whatsapp_bot_sessions
  SET is_active = false,
      revoked_at = now(),
      revoked_reason = 'emergency_lockout: ' || p_reason
  WHERE phone = p_phone AND is_active = true;
  
  -- Block all devices
  UPDATE whatsapp_device_fingerprints
  SET is_blocked = true,
      blocked_at = now(),
      blocked_reason = 'emergency_lockout: ' || p_reason
  WHERE phone = p_phone;
  
  -- Create lockout record
  IF v_user_id IS NOT NULL THEN
    INSERT INTO whatsapp_account_lockouts (
      user_id, phone, locked_until, locked_reason,
      triggered_by, triggered_by_user_id
    ) VALUES (
      v_user_id, p_phone, now() + interval '999 years', p_reason,
      'emergency_procedure', auth.uid()
    );
  END IF;
  
  -- Log the event
  PERFORM log_whatsapp_security_event(
    v_user_id, p_phone, 'account_locked',
    jsonb_build_object('reason', p_reason, 'type', 'emergency'),
    true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lock all access for a user (across all phones/devices)
CREATE OR REPLACE FUNCTION emergency_lock_user(p_user_id uuid, p_reason text)
RETURNS void AS $$
BEGIN
  -- Revoke all sessions
  UPDATE whatsapp_bot_sessions
  SET is_active = false,
      revoked_at = now(),
      revoked_reason = 'emergency_user_lockout: ' || p_reason
  WHERE user_id = p_user_id AND is_active = true;
  
  -- Block all devices
  UPDATE whatsapp_device_fingerprints
  SET is_blocked = true,
      blocked_at = now(),
      blocked_reason = 'emergency_user_lockout: ' || p_reason
  WHERE user_id = p_user_id;
  
  -- Create lockout record
  INSERT INTO whatsapp_account_lockouts (
    user_id, phone, locked_until, locked_reason,
    triggered_by, triggered_by_user_id
  )
  SELECT 
    p_user_id, phone, now() + interval '999 years', p_reason,
    'emergency_procedure', auth.uid()
  FROM whatsapp_user_links
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 9.2 Suspicious Activity Detection

```typescript
// Auto-lock triggers
interface SuspiciousActivityRule {
  name: string;
  condition: (events: AuditEvent[]) => boolean;
  action: 'warn' | 'lock_temp' | 'lock_permanent';
  duration?: number; // for temp lock
}

const suspiciousActivityRules: SuspiciousActivityRule[] = [
  {
    name: 'Rapid verification attempts',
    condition: (events) => {
      const attempts = events.filter(e => 
        e.type === 'verification_failed' && 
        e.timestamp > Date.now() - 60000
      );
      return attempts.length >= 5;
    },
    action: 'lock_temp',
    duration: 3600 // 1 hour
  },
  {
    name: 'Multiple device registrations',
    condition: (events) => {
      const devices = events.filter(e => 
        e.type === 'device_registered' && 
        e.timestamp > Date.now() - 86400000
      );
      return devices.length >= 5;
    },
    action: 'lock_temp',
    duration: 86400 // 24 hours
  },
  {
    name: 'Replay attack pattern',
    condition: (events) => {
      return events.some(e => e.type === 'replay_attack_detected');
    },
    action: 'lock_permanent'
  }
];
```

---

## 10. Implementation Guide

### 10.1 File Structure

```
src/
├── lib/
│   ├── security/
│   │   ├── focobot-security.ts      # Main security module
│   │   ├── rate-limiter.ts          # Bot-specific rate limiting
│   │   ├── device-fingerprint.ts    # Device identification
│   │   └── audit-logger.ts          # Security audit logging
│   └── whatsapp/
│       ├── webhook-handler.ts       # Secure webhook processor
│       ├── verification.ts          # Phone verification flow
│       └── session-manager.ts       # Session lifecycle
├── app/
│   └── api/
│       └── whatsapp/
│           └── webhook/
│               └── route.ts         # Secure webhook endpoint
└── types/
    └── focobot.ts                   # Bot security types
```

### 10.2 Environment Variables

```bash
# Twilio (for webhook signature verification)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=+1234567890

# Bot Security
FOCOBOT_SESSION_TIMEOUT_HOURS=24
FOCOBOT_MAX_SESSION_DAYS=7
FOCOBOT_VERIFICATION_CODE_EXPIRY_MINUTES=10
FOCOBOT_MAX_VERIFICATION_ATTEMPTS=3
FOCOBOT_DEVICE_CHANGE_THRESHOLD=3

# Rate Limiting (Redis recommended for production)
FOCOBOT_RATE_LIMIT_STORE=redis  # or 'memory'
REDIS_URL=redis://localhost:6379

# Encryption (for device info)
FOCOBOT_ENCRYPTION_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 10.3 Deployment Checklist

- [ ] Database migration applied (security schema)
- [ ] RLS policies enabled and verified
- [ ] Twilio webhook URL configured with signature verification
- [ ] Rate limiting store configured (Redis for production)
- [ ] Encryption keys generated and stored securely
- [ ] Audit log monitoring configured
- [ ] Emergency lockout procedures tested
- [ ] Backup/restore procedures documented
- [ ] Security incident response plan in place

---

## Appendix A: Security Checklist

### Pre-Deployment Security Review

| Check | Status | Notes |
|-------|--------|-------|
| Twilio signature verification implemented | ⬜ | |
| Replay attack prevention (nonce store) | ⬜ | |
| Rate limiting on all endpoints | ⬜ | |
| Phone verification required | ⬜ | |
| Device fingerprinting enabled | ⬜ | |
| Session timeout implemented | ⬜ | |
| RLS policies on all tables | ⬜ | |
| Audit logging active | ⬜ | |
| Emergency lockout tested | ⬜ | |
| Secrets rotation procedure documented | ⬜ | |

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-27  
**Classification:** Internal - Security Architecture
