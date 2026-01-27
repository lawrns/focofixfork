# FocoBot WhatsApp Device Linking Implementation Plan

## Executive Summary

This document outlines the implementation plan for adding WhatsApp device linking capabilities to FocoBot, allowing users to link their personal WhatsApp accounts to Foco. The system will support both QR code and 8-digit pairing code methods for device linking, similar to how users link devices to WhatsApp Web.

**Key Distinction**: The existing Foco implementation uses Twilio to send messages FROM a business number TO users. This new implementation enables FocoBot to act on behalf of the user's personal WhatsApp account.

---

## Table of Contents

1. [Architecture Decision: API Approach Comparison](#1-architecture-decision-api-approach-comparison)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Database Schema](#3-database-schema)
4. [API Endpoints](#4-api-endpoints)
5. [Device Linking Flow](#5-device-linking-flow)
6. [Security Considerations](#6-security-considerations)
7. [Implementation Phases](#7-implementation-phases)
8. [Error Handling & Retry Logic](#8-error-handling--retry-logic)
9. [Multi-Device Support](#9-multi-device-support)
10. [Frontend Components](#10-frontend-components)

---

## 1. Architecture Decision: API Approach Comparison

### 1.1 Comparison Matrix

| Feature | Twilio WhatsApp Business API | WhatsApp Web (Baileys) | WhatsApp Cloud API |
|---------|------------------------------|------------------------|-------------------|
| **Official/Meta-approved** | ✅ Yes | ❌ Unofficial | ✅ Yes |
| **Send from user's number** | ❌ No (from Twilio number) | ✅ Yes | ❌ No (from WABA number) |
| **QR Code linking** | N/A | ✅ Yes | N/A |
| **8-digit pairing code** | N/A | ✅ Yes | N/A |
| **Message templates required** | ✅ Yes (for outbound) | ❌ No | ✅ Yes |
| **24-hour session window** | ✅ Yes | ❌ No | ✅ Yes |
| **Rate limiting** | Strict | WhatsApp's native | Strict |
| **Cost** | Per-message fees | Free (infrastructure only) | Per-conversation |
| **Setup complexity** | Low | High | Medium |
| **Maintenance** | Low | Medium | Low |
| **Risk of ban** | Low | Medium (unofficial) | Low |

### 1.2 Recommended Approach: **Hybrid System**

**Primary**: Continue using **Twilio WhatsApp Business API** for:
- Notifications and alerts FROM focobot
- Reliable delivery with fallback
- Official Meta support

**Secondary**: Implement **WhatsApp Web (Baileys)** for:
- Advanced users who want to send proposals AS themselves
- Two-way sync with user's personal WhatsApp
- Device linking experience similar to WhatsApp Web

This hybrid approach provides flexibility while maintaining reliability.

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FOCO PLATFORM                                      │
│                                                                              │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐     │
│  │   Frontend      │    │   API Routes     │    │   Services          │     │
│  │   (Next.js)     │◄──►│   (Next.js API)  │◄──►│   - WhatsAppService │     │
│  │                 │    │                  │    │   - SessionManager  │     │
│  │  - QR Display   │    │  - /link         │    │   - DeviceManager   │     │
│  │  - Pairing Code │    │  - /verify       │    │                     │     │
│  │  - Status UI    │    │  - /status       │    │  ┌───────────────┐  │     │
│  │                 │    │  - /webhook      │    │  │  Baileys      │  │     │
│  └─────────────────┘    └──────────────────┘    │  │  WhatsApp     │  │     │
│           │                      │              │  │  Client       │  │     │
│           │                      │              │  └───────────────┘  │     │
│           ▼                      ▼              └─────────────────────┘     │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │                         Database (Supabase)                       │      │
│  │  - whatsapp_devices      - whatsapp_sessions    - whatsapp_logs  │      │
│  └──────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ QR / Pairing Code
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER'S WHATSAPP                                     │
│                                                                              │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐       │
│   │   Primary    │◄───────►│   Linked     │◄───────►│  FocoBot     │       │
│   │   Phone      │  Sync   │   Device     │  Link   │  (Baileys)   │       │
│   │              │         │  (Browser)   │         │              │       │
│   └──────────────┘         └──────────────┘         └──────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ Fallback / Notifications
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TWILIO WHATSAPP API                                 │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────┐       │
│   │   - Business Number: +1XXX XXX XXXX                            │       │
│   │   - Template Messages                                          │       │
│   │   - Session-based Messaging                                    │       │
│   └────────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema

### 3.1 New Tables

#### `whatsapp_devices` - Linked Device Registry

```sql
-- Stores linked WhatsApp devices (using Baileys/WhatsApp Web)
CREATE TABLE whatsapp_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Device info
  device_name text NOT NULL DEFAULT 'FocoBot',
  device_type text NOT NULL CHECK (device_type IN ('mobile', 'desktop', 'web')),
  phone_number text NOT NULL,
  
  -- Linking status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'linking', 'active', 'disconnected', 'expired', 'revoked')),
  
  -- Baileys session data (encrypted)
  auth_creds jsonb, -- Encrypted credentials
  auth_keys jsonb,  -- Encrypted keys
  
  -- Linking method used
  link_method text CHECK (link_method IN ('qr_code', 'pairing_code')),
  linking_started_at timestamptz,
  linked_at timestamptz,
  last_connected_at timestamptz,
  disconnected_at timestamptz,
  
  -- Session management
  session_id text UNIQUE,
  client_id text UNIQUE, -- Baileys client ID
  
  -- Metadata
  platform text, -- android, ios, web, etc.
  push_name text, -- User's WhatsApp display name
  
  -- Expiration
  expires_at timestamptz,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_phone_format CHECK (phone_number ~ '^\+[1-9]\d{1,14}$')
);

-- Indexes
CREATE INDEX idx_whatsapp_devices_user ON whatsapp_devices(user_id);
CREATE INDEX idx_whatsapp_devices_status ON whatsapp_devices(status);
CREATE INDEX idx_whatsapp_devices_phone ON whatsapp_devices(phone_number);
CREATE INDEX idx_whatsapp_devices_active ON whatsapp_devices(user_id, status) WHERE status = 'active';
```

#### `whatsapp_linking_attempts` - Linking Process Tracking

```sql
-- Tracks device linking attempts for audit and retry logic
CREATE TABLE whatsapp_linking_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id uuid REFERENCES whatsapp_devices(id) ON DELETE SET NULL,
  
  -- Attempt details
  attempt_number integer NOT NULL DEFAULT 1,
  method text NOT NULL CHECK (method IN ('qr_code', 'pairing_code')),
  
  -- QR Code data (temporary)
  qr_code_data text, -- Base64 QR code image or raw QR string
  qr_code_expires_at timestamptz,
  
  -- Pairing code data (temporary)
  pairing_code text, -- 8-digit code
  pairing_code_expires_at timestamptz,
  
  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scanned', 'pairing', 'success', 'failed', 'expired', 'cancelled')),
  
  -- Error tracking
  error_code text,
  error_message text,
  
  -- IP and user agent for security
  ip_address inet,
  user_agent text,
  
  -- Timestamps
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '5 minutes'),
  
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_whatsapp_linking_attempts_user ON whatsapp_linking_attempts(user_id);
CREATE INDEX idx_whatsapp_linking_attempts_status ON whatsapp_linking_attempts(status);
CREATE INDEX idx_whatsapp_linking_attempts_expires ON whatsapp_linking_attempts(expires_at) WHERE status = 'pending';
```

#### `whatsapp_messages` - Message Sync Log

```sql
-- Stores messages sent/received through linked devices
CREATE TABLE whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES whatsapp_devices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Message details
  message_id text NOT NULL, -- WhatsApp message ID
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document', 'location', 'contact')),
  
  -- Content
  content text,
  media_url text,
  media_mimetype text,
  media_size integer,
  
  -- Sender/Recipient
  from_number text,
  to_number text,
  
  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  
  -- Timestamps
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  
  -- Constraints
  UNIQUE(device_id, message_id)
);

-- Indexes
CREATE INDEX idx_whatsapp_messages_device ON whatsapp_messages(device_id);
CREATE INDEX idx_whatsapp_messages_user ON whatsapp_messages(user_id);
CREATE INDEX idx_whatsapp_messages_created ON whatsapp_messages(created_at DESC);
CREATE INDEX idx_whatsapp_messages_direction ON whatsapp_messages(direction, status);
```

#### `whatsapp_sessions` - Extended Session Tracking

```sql
-- Enhances existing whatsapp_sessions with device linking context
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS device_id uuid REFERENCES whatsapp_devices(id) ON DELETE SET NULL;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS link_method text CHECK (link_method IN ('twilio', 'baileys'));
```

### 3.2 RLS Policies

```sql
-- Enable RLS
ALTER TABLE whatsapp_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_linking_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Devices: Users can only see their own devices
CREATE POLICY "Users can manage own WhatsApp devices"
  ON whatsapp_devices FOR ALL
  USING (auth.uid() = user_id);

-- Linking attempts: Users can see their own attempts
CREATE POLICY "Users can view own linking attempts"
  ON whatsapp_linking_attempts FOR SELECT
  USING (auth.uid() = user_id);

-- Messages: Users can view their own messages
CREATE POLICY "Users can view own WhatsApp messages"
  ON whatsapp_messages FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all (for webhook processing)
CREATE POLICY "Service role can manage all WhatsApp data"
  ON whatsapp_devices FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all linking attempts"
  ON whatsapp_linking_attempts FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
```

---

## 4. API Endpoints

### 4.1 Device Linking Endpoints

#### `POST /api/integrations/whatsapp/device/link`

Initiates device linking process.

**Request:**
```json
{
  "method": "qr_code" | "pairing_code",
  "phoneNumber": "+1234567890",
  "deviceName": "FocoBot Web"
}
```

**Response:**
```json
{
  "success": true,
  "attemptId": "uuid",
  "method": "qr_code",
  "status": "pending",
  
  // For QR code method
  "qrCode": "data:image/png;base64,iVBORw0KGgo...",
  "qrCodeData": "2@...", // Raw QR string for manual entry
  "expiresAt": "2026-01-27T10:00:00Z",
  
  // For pairing code method
  "pairingCode": "ABCD-EFGH",
  "instructions": "Open WhatsApp > Settings > Linked Devices > Link with phone number"
}
```

#### `GET /api/integrations/whatsapp/device/link/:attemptId/status`

Check linking status (polling endpoint).

**Response:**
```json
{
  "attemptId": "uuid",
  "status": "pending" | "scanned" | "pairing" | "success" | "failed" | "expired",
  "progress": {
    "qrScanned": true,
    "deviceLinked": false,
    "syncComplete": false
  },
  "device": {
    "id": "uuid",
    "status": "linking",
    "phoneNumber": "+1234567890",
    "pushName": "John Doe"
  },
  "error": null
}
```

#### `DELETE /api/integrations/whatsapp/device/link/:attemptId`

Cancel ongoing linking attempt.

#### `POST /api/integrations/whatsapp/device/:deviceId/refresh`

Refresh/reconnect a linked device.

#### `DELETE /api/integrations/whatsapp/device/:deviceId`

Unlink and remove a device.

### 4.2 Device Management Endpoints

#### `GET /api/integrations/whatsapp/devices`

List all linked devices for the user.

**Response:**
```json
{
  "devices": [
    {
      "id": "uuid",
      "deviceName": "FocoBot Web",
      "deviceType": "web",
      "phoneNumber": "+1234567890",
      "status": "active",
      "pushName": "John Doe",
      "platform": "android",
      "linkedAt": "2026-01-20T10:00:00Z",
      "lastConnectedAt": "2026-01-27T09:30:00Z",
      "expiresAt": "2026-02-27T10:00:00Z"
    }
  ]
}
```

#### `GET /api/integrations/whatsapp/device/:deviceId/status`

Get detailed device status.

**Response:**
```json
{
  "id": "uuid",
  "status": "active",
  "connectionState": "connected",
  "battery": 85,
  "isCharging": true,
  "platform": "android",
  "phoneNumber": "+1234567890",
  "pushName": "John Doe",
  "lastMessageReceived": "2026-01-27T09:30:00Z"
}
```

### 4.3 Webhook/Socket Endpoints

#### `WS /api/integrations/whatsapp/device/:deviceId/stream`

WebSocket for real-time status updates during linking.

**Events:**
- `qr_code` - New QR code generated
- `pairing_code` - Pairing code available
- `connected` - Device connected
- `disconnected` - Device disconnected
- `message` - New message received
- `error` - Error occurred

### 4.4 Messaging Endpoints (via Linked Device)

#### `POST /api/integrations/whatsapp/device/:deviceId/send`

Send message through linked device.

**Request:**
```json
{
  "to": "+9876543210",
  "message": "Hello from Foco!",
  "messageType": "text"
}
```

---

## 5. Device Linking Flow

### 5.1 QR Code Method Flow

```
┌──────────┐     ┌──────────────┐     ┌─────────────────┐     ┌─────────────┐
│  User    │     │   Frontend   │     │   API Server    │     │  Baileys    │
└────┬─────┘     └──────┬───────┘     └────────┬────────┘     └──────┬──────┘
     │                  │                      │                     │
     │  1. Click Link   │                      │                     │
     │─────────────────►│                      │                     │
     │                  │  2. POST /link       │                     │
     │                  │  {method: "qr"}      │                     │
     │                  │─────────────────────►│                     │
     │                  │                      │  3. Create session   │
     │                  │                      │────────────────────►│
     │                  │                      │◄────────────────────│
     │                  │                      │  4. Return QR data   │
     │                  │◄─────────────────────│                     │
     │  5. Show QR      │                      │                     │
     │◄─────────────────│                      │                     │
     │                  │                      │                     │
     │  6. Scan with    │                      │                     │
     │     WhatsApp     │                      │                     │
     │──────────────────┼──────────────────────┼────────────────────►│
     │                  │                      │  7. QR scanned      │
     │                  │                      │◄────────────────────│
     │                  │  8. WS: connected    │                     │
     │                  │◄─────────────────────│                     │
     │  9. Linking...   │                      │                     │
     │◄─────────────────│                      │                     │
     │                  │                      │  10. Pairing        │
     │                  │                      │◄────────────────────│
     │                  │  11. WS: linked      │                     │
     │                  │◄─────────────────────│                     │
     │  12. Success!    │                      │                     │
     │◄─────────────────│                      │                     │
```

### 5.2 Pairing Code Method Flow

```
┌──────────┐     ┌──────────────┐     ┌─────────────────┐     ┌─────────────┐
│  User    │     │   Frontend   │     │   API Server    │     │  Baileys    │
└────┬─────┘     └──────┬───────┘     └────────┬────────┘     └──────┬──────┘
     │                  │                      │                     │
     │  1. Select       │                      │                     │
     │     Pairing Code │                      │                     │
     │─────────────────►│                      │                     │
     │                  │  2. POST /link       │                     │
     │                  │  {method: "code"}    │                     │
     │                  │─────────────────────►│                     │
     │                  │                      │  3. Request code     │
     │                  │                      │────────────────────►│
     │                  │                      │◄────────────────────│
     │                  │                      │  4. Return 8-digit   │
     │                  │◄─────────────────────│                     │
     │  5. Show code    │                      │                     │
     │◄─────────────────│                      │                     │
     │                  │                      │                     │
     │  6. Enter in     │                      │                     │
     │     WhatsApp     │                      │                     │
     │──────────────────┼──────────────────────┼────────────────────►│
     │                  │                      │  7. Code entered    │
     │                  │                      │◄────────────────────│
     │                  │  8. WS: pairing      │                     │
     │                  │◄─────────────────────│                     │
     │  9. Complete     │                      │                     │
     │     on phone     │                      │                     │
     │──────────────────┼──────────────────────┼────────────────────►│
     │                  │                      │  10. Linked!        │
     │                  │                      │◄────────────────────│
     │                  │  11. WS: success     │                     │
     │                  │◄─────────────────────│                     │
     │  12. Done!       │                      │                     │
     │◄─────────────────│                      │                     │
```

### 5.3 Phone Number Verification with 6-Digit Codes

**Integration with Existing Foco System:**

The existing 6-digit verification code system will be enhanced to support device linking:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     VERIFICATION FLOW (Enhanced)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: User requests to link device                                       │
│  ─────────────────────────────────────                                     │
│  POST /api/integrations/whatsapp/link                                       │
│  {                                                                          │
│    "phone": "+1234567890",                                                  │
│    "deviceLinking": true,  // NEW flag                                     │
│    "method": "qr_code" | "pairing_code"                                     │
│  }                                                                          │
│                                                                             │
│  Step 2: System generates 6-digit verification code                         │
│  ─────────────────────────────────────────                                 │
│  - Code sent via Twilio to user's phone                                     │
│  - Code expires in 10 minutes                                               │
│  - Stored in whatsapp_user_links table                                      │
│                                                                             │
│  Step 3: User receives and enters code                                      │
│  ─────────────────────────────────────                                     │
│  - Via WhatsApp message to Twilio number: "VERIFY 123456"                   │
│  - OR via web UI in verification dialog                                     │
│                                                                             │
│  Step 4: After phone verification, proceed to device linking                │
│  ─────────────────────────────────────────────────────────────             │
│  - If deviceLinking=true and phone verified                                 │
│  - Initiate Baileys connection                                              │
│  - Generate QR code or pairing code                                         │
│  - Return linking credentials                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Security Considerations

### 6.1 Credential Encryption

```typescript
// Baileys credentials must be encrypted at rest
interface EncryptedCredentials {
  iv: string;           // Initialization vector
  encryptedData: string; // Encrypted JSON
  authTag: string;      // AES-GCM auth tag
  version: number;      // Encryption version for migrations
}

// Encryption service
class CredentialEncryptionService {
  private readonly ENCRYPTION_KEY: Buffer;
  
  encrypt(credentials: any): EncryptedCredentials {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return {
      iv: iv.toString('base64'),
      encryptedData: encrypted,
      authTag: cipher.getAuthTag().toString('base64'),
      version: 1
    };
  }
  
  decrypt(encrypted: EncryptedCredentials): any {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.ENCRYPTION_KEY,
      Buffer.from(encrypted.iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64'));
    
    let decrypted = decipher.update(encrypted.encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
}
```

### 6.2 Session Security

| Threat | Mitigation |
|--------|------------|
| Session hijacking | TLS 1.3 for all connections, certificate pinning |
| Credential theft | AES-256-GCM encryption at rest |
| QR code interception | 60-second QR expiration, one-time use |
| Replay attacks | Nonce validation, timestamp verification |
| Man-in-the-middle | WebSocket secure (WSS), signature verification |

### 6.3 Rate Limiting

```typescript
// Rate limiting configuration
const RATE_LIMITS = {
  // Linking attempts per user
  linkingAttempts: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5
  },
  
  // QR code generations per attempt
  qrCodeGenerations: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3
  },
  
  // Messages per device per minute
  messages: {
    windowMs: 60 * 1000, // 1 minute
    max: 30
  }
};
```

### 6.4 Audit Logging

```sql
-- Audit log table
CREATE TABLE whatsapp_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  device_id uuid REFERENCES whatsapp_devices(id),
  action text NOT NULL, -- link_start, link_complete, unlink, message_sent, etc.
  ip_address inet,
  user_agent text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Log all sensitive operations
CREATE OR REPLACE FUNCTION log_whatsapp_action()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO whatsapp_audit_log (user_id, device_id, action, metadata)
  VALUES (
    NEW.user_id,
    NEW.id,
    TG_OP,
    jsonb_build_object('status', NEW.status)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Database & Infrastructure:**
- [ ] Create database migrations for new tables
- [ ] Set up Baileys dependencies and types
- [ ] Implement credential encryption service
- [ ] Create Redis session store for Baileys connections

**Core Services:**
- [ ] Implement `WhatsAppDeviceManager` service
- [ ] Implement `BaileysConnectionManager` service
- [ ] Create WebSocket handler for real-time updates

### Phase 2: API Implementation (Week 3-4)

**API Endpoints:**
- [ ] `POST /api/integrations/whatsapp/device/link`
- [ ] `GET /api/integrations/whatsapp/device/link/:id/status`
- [ ] `DELETE /api/integrations/whatsapp/device/link/:id`
- [ ] `GET /api/integrations/whatsapp/devices`
- [ ] `DELETE /api/integrations/whatsapp/device/:id`

**Integration with Existing:**
- [ ] Extend current `/link` endpoint with device linking option
- [ ] Update verification flow to support device linking
- [ ] Maintain backward compatibility with Twilio-only users

### Phase 3: Frontend (Week 5)

**UI Components:**
- [ ] `WhatsAppDeviceLinker` - Main linking component
- [ ] `QRCodeDisplay` - Animated QR code with countdown
- [ ] `PairingCodeDisplay` - 8-digit code display
- [ ] `DeviceStatusCard` - Linked device status
- [ ] `DeviceManagementPanel` - List and manage devices

**Real-time Updates:**
- [ ] WebSocket hook for linking status
- [ ] Polling fallback for status checks
- [ ] Toast notifications for progress updates

### Phase 4: Testing & Polish (Week 6)

**Testing:**
- [ ] Unit tests for services
- [ ] Integration tests for linking flow
- [ ] E2E tests for complete user journey
- [ ] Load testing for concurrent connections

**Documentation:**
- [ ] API documentation
- [ ] User guide for device linking
- [ ] Troubleshooting guide
- [ ] Security documentation

---

## 8. Error Handling & Retry Logic

### 8.1 Error Codes

```typescript
enum WhatsAppErrorCode {
  // Connection errors
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  CONNECTION_CLOSED = 'CONNECTION_CLOSED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  
  // Linking errors
  QR_EXPIRED = 'QR_EXPIRED',
  PAIRING_CODE_EXPIRED = 'PAIRING_CODE_EXPIRED',
  LINKING_CANCELLED = 'LINKING_CANCELLED',
  DEVICE_ALREADY_LINKED = 'DEVICE_ALREADY_LINKED',
  
  // Device errors
  DEVICE_DISCONNECTED = 'DEVICE_DISCONNECTED',
  DEVICE_BANNED = 'DEVICE_BANNED',
  SESSION_INVALID = 'SESSION_INVALID',
  
  // Message errors
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_RECIPIENT = 'INVALID_RECIPIENT',
  MESSAGE_TOO_LARGE = 'MESSAGE_TOO_LARGE'
}
```

### 8.2 Retry Strategy

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: WhatsAppErrorCode[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    WhatsAppErrorCode.CONNECTION_TIMEOUT,
    WhatsAppErrorCode.CONNECTION_CLOSED,
    WhatsAppErrorCode.RATE_LIMITED
  ]
};

async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error;
  let delay = config.baseDelayMs;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      const errorCode = (error as any).code;
      if (!config.retryableErrors.includes(errorCode)) {
        throw error;
      }
      
      if (attempt < config.maxRetries) {
        await sleep(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
      }
    }
  }
  
  throw lastError!;
}
```

### 8.3 Automatic Reconnection

```typescript
class BaileysReconnectionManager {
  private reconnectAttempts = new Map<string, number>();
  private maxReconnectAttempts = 5;
  
  async handleDisconnect(deviceId: string, reason: DisconnectReason): Promise<boolean> {
    const attempts = this.reconnectAttempts.get(deviceId) || 0;
    
    // Don't reconnect if logged out
    if (reason === DisconnectReason.loggedOut) {
      await this.markDeviceDisconnected(deviceId);
      return false;
    }
    
    // Attempt reconnection with exponential backoff
    if (attempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
      this.reconnectAttempts.set(deviceId, attempts + 1);
      
      await sleep(delay);
      await this.reconnectDevice(deviceId);
      return true;
    }
    
    // Max attempts reached
    await this.markDeviceDisconnected(deviceId);
    return false;
  }
}
```

---

## 9. Multi-Device Support

### 9.1 Architecture for Multiple Devices

```
┌─────────────────────────────────────────────────────────────┐
│                    FOCO USER                                │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Personal    │  │   Work       │  │   Tablet     │      │
│  │  Phone       │  │   Phone      │  │   (iPad)     │      │
│  │  +1234567890 │  │  +0987654321 │  │  +1111111111 │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │              │
│         └─────────────────┴──────────────────┘              │
│                           │                                 │
│                    ┌──────┴──────┐                         │
│                    │  FocoBot    │                         │
│                    │  Manager    │                         │
│                    └──────┬──────┘                         │
│                           │                                 │
│         ┌─────────────────┼─────────────────┐              │
│         ▼                 ▼                 ▼              │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐       │
│  │  Baileys   │    │  Baileys   │    │  Baileys   │       │
│  │  Client 1  │    │  Client 2  │    │  Client 3  │       │
│  └────────────┘    └────────────┘    └────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Device Priority System

```typescript
interface DevicePriority {
  deviceId: string;
  priority: number; // 1 = highest
  useFor: ('proposals' | 'notifications' | 'all')[];
}

// Example: User wants work phone for proposals, personal for notifications
const userDevicePriorities: DevicePriority[] = [
  { deviceId: 'work-phone-id', priority: 1, useFor: ['proposals'] },
  { deviceId: 'personal-phone-id', priority: 2, useFor: ['notifications', 'proposals'] }
];
```

### 9.3 Multi-Device Limitations

| Limitation | Value | Notes |
|------------|-------|-------|
| Max linked devices per WhatsApp account | 4 | WhatsApp's limit |
| Max devices per Foco user | 5 | Configurable |
| Sync delay between devices | 1-5s | WhatsApp's sync time |
| Active connections per server | 1000 | Based on infrastructure |

---

## 10. Frontend Components

### 10.1 Component Hierarchy

```
WhatsAppSettings (existing)
├── WhatsAppDeviceSection (new)
│   ├── DeviceStatusCard
│   │   └── DeviceActions (refresh, unlink)
│   ├── AddDeviceButton
│   └── DeviceLinkingModal
│       ├── LinkingMethodSelector (QR vs Pairing Code)
│       ├── QRCodeStep
│       │   ├── QRCodeDisplay (with countdown)
│       │   └── QRCodeInstructions
│       ├── PairingCodeStep
│       │   ├── PairingCodeDisplay
│       │   └── PairingInstructions
│       ├── LinkingProgress (step indicator)
│       └── ErrorDisplay (with retry)
├── WhatsAppMessagesSection (new)
│   └── MessageHistoryTable
└── WhatsAppSecuritySection (new)
    └── SecurityStatusCard
```

### 10.2 Key Component Specifications

#### `QRCodeDisplay`

```typescript
interface QRCodeDisplayProps {
  qrCodeData: string;        // Raw QR data
  expiresAt: Date;           // Expiration timestamp
  onRefresh: () => void;     // Generate new QR
  onCancel: () => void;      // Cancel linking
}

// Features:
// - Animated countdown timer
// - Auto-refresh 10 seconds before expiry
// - Visual QR code with logo overlay
// - Copy raw data option
// - Manual entry fallback
```

#### `PairingCodeDisplay`

```typescript
interface PairingCodeDisplayProps {
  pairingCode: string;       // 8-character code
  phoneNumber: string;       // Associated phone
  expiresAt: Date;
  onRefresh: () => void;
}

// Features:
// - Large, readable code display
// - Copy to clipboard
// - Step-by-step instructions
// - Visual guide images
// - Platform-specific instructions (iOS/Android)
```

### 10.3 State Management

```typescript
// React Context for WhatsApp Device State
interface WhatsAppDeviceContext {
  // State
  devices: WhatsAppDevice[];
  activeLinkingAttempt: LinkingAttempt | null;
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  startLinking: (method: LinkMethod, phone: string) => Promise<void>;
  cancelLinking: () => Promise<void>;
  refreshDevice: (deviceId: string) => Promise<void>;
  unlinkDevice: (deviceId: string) => Promise<void>;
  
  // Real-time
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}
```

---

## 11. Environment Configuration

### 11.1 Required Environment Variables

```bash
# Existing (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_API_KEY_SID=
TWILIO_API_KEY_SECRET=
TWILIO_WHATSAPP_NUMBER=

# New (Baileys/Device Linking)
WHATSAPP_DEVICE_LINKING_ENABLED=true
WHATSAPP_BAILEYS_AUTH_DIR=/data/auth
WHATSAPP_MAX_DEVICES_PER_USER=5
WHATSAPP_QR_TIMEOUT_SECONDS=60
WHATSAPP_PAIRING_CODE_TIMEOUT_SECONDS=120
WHATSAPP_ENCRYPTION_KEY=<32-byte-key-for-credential-encryption>
WHATSAPP_REDIS_URL=redis://localhost:6379/1
WHATSAPP_WEBSOCKET_URL=wss://api.foco.mx/whatsapp

# Security
WHATSAPP_RATE_LIMIT_LINKING_PER_HOUR=5
WHATSAPP_RATE_LIMIT_MESSAGES_PER_MINUTE=30
WHATSAPP_MAX_RECONNECT_ATTEMPTS=5
```

---

## 12. Monitoring & Alerts

### 12.1 Key Metrics

```typescript
interface WhatsAppMetrics {
  // Connection metrics
  activeConnections: number;
  connectionFailures: number;
  reconnectionAttempts: number;
  
  // Linking metrics
  linkingAttempts: number;
  linkingSuccessRate: number;
  averageLinkingTime: number;
  
  // Message metrics
  messagesSent: number;
  messagesReceived: number;
  deliveryRate: number;
  
  // Error metrics
  errorRate: number;
  topErrorCodes: string[];
}
```

### 12.2 Alert Conditions

| Condition | Severity | Action |
|-----------|----------|--------|
| Connection failure rate > 5% | Warning | Notify on-call |
| Linking success rate < 80% | Critical | Page on-call, investigate |
| Active connections > 90% of limit | Warning | Scale infrastructure |
| Credential decryption failures | Critical | Immediate investigation |
| Rate limit errors spike | Warning | Review rate limits |

---

## 13. Migration Strategy

### 13.1 Backward Compatibility

```typescript
// Existing users continue using Twilio
// New device linking is opt-in

interface WhatsAppIntegrationConfig {
  mode: 'twilio-only' | 'device-linking' | 'hybrid';
  
  // For hybrid mode
  twilioFor: ('notifications' | 'broadcasts')[];
  deviceFor: ('proposals' | 'direct-messages')[];
}

// Default for existing users
const DEFAULT_CONFIG: WhatsAppIntegrationConfig = {
  mode: 'twilio-only',
  twilioFor: ['notifications', 'broadcasts'],
  deviceFor: []
};
```

### 13.2 Data Migration

```sql
-- Migrate existing whatsapp_user_links to new schema
INSERT INTO whatsapp_devices (
  user_id,
  device_name,
  device_type,
  phone_number,
  status,
  link_method,
  linked_at,
  created_at
)
SELECT 
  user_id,
  'Twilio Linked Phone',
  'mobile',
  phone,
  CASE WHEN verified THEN 'active' ELSE 'pending' END,
  'twilio',
  linked_at,
  created_at
FROM whatsapp_user_links;
```

---

## Appendix A: Baileys Integration Code Sample

```typescript
// lib/services/baileys-client.ts
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';

export class BaileysClient {
  private socket: WASocket | null = null;
  private deviceId: string;
  private onQRCode?: (qr: string) => void;
  private onPairingCode?: (code: string) => void;
  private onConnected?: () => void;
  private onDisconnected?: (reason: DisconnectReason) => void;
  
  constructor(config: {
    deviceId: string;
    authState: any;
    onQRCode?: (qr: string) => void;
    onPairingCode?: (code: string) => void;
    onConnected?: () => void;
    onDisconnected?: (reason: DisconnectReason) => void;
  }) {
    this.deviceId = config.deviceId;
    this.onQRCode = config.onQRCode;
    this.onPairingCode = config.onPairingCode;
    this.onConnected = config.onConnected;
    this.onDisconnected = config.onDisconnected;
  }
  
  async connect(phoneNumber?: string): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(
      `./auth/${this.deviceId}`
    );
    
    this.socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      generateHighQualityLinkPreview: true,
      // Use pairing code if phone number provided
      ...(phoneNumber && {
        phoneNumber
      })
    });
    
    // Handle connection events
    this.socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      // QR code generated
      if (qr && this.onQRCode) {
        this.onQRCode(qr);
      }
      
      // Connected
      if (connection === 'open') {
        this.onConnected?.();
      }
      
      // Disconnected
      if (connection === 'close') {
        const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
        this.onDisconnected?.(reason as DisconnectReason);
      }
    });
    
    // Save credentials
    this.socket.ev.on('creds.update', saveCreds);
    
    // Request pairing code if phone number provided
    if (phoneNumber && this.socket.requestPairingCode) {
      const code = await this.socket.requestPairingCode(phoneNumber);
      this.onPairingCode?.(code);
    }
  }
  
  async sendMessage(to: string, message: string): Promise<string> {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    
    const result = await this.socket.sendMessage(to, { text: message });
    return result.key.id!;
  }
  
  async disconnect(): Promise<void> {
    await this.socket?.logout();
    this.socket = null;
  }
}
```

---

## Appendix B: File Structure

```
src/
├── app/
│   └── api/
│       └── integrations/
│           └── whatsapp/
│               ├── link/                    # Existing: Twilio linking
│               ├── unlink/                  # Existing: Twilio unlinking
│               ├── verify/                  # Existing: Twilio verification
│               ├── webhook/                 # Existing: Twilio webhook
│               └── device/                  # NEW: Device linking
│                   ├── link/
│                   │   └── route.ts         # POST: Start linking
│                   ├── link/[id]/
│                   │   ├── status/
│                   │   │   └── route.ts     # GET: Linking status
│                   │   └── route.ts         # DELETE: Cancel linking
│                   ├── [id]/
│                   │   ├── refresh/
│                   │   │   └── route.ts     # POST: Refresh connection
│                   │   └── route.ts         # DELETE: Unlink device
│                   └── route.ts             # GET: List devices
├── components/
│   └── settings/
│       ├── whatsapp-settings.tsx            # Existing (extended)
│       └── whatsapp-device/                 # NEW
│           ├── device-linker.tsx
│           ├── qr-code-display.tsx
│           ├── pairing-code-display.tsx
│           ├── device-status-card.tsx
│           └── linking-progress.tsx
├── lib/
│   ├── services/
│   │   ├── whatsapp.ts                      # Existing: Twilio
│   │   ├── whatsapp-session.ts              # Existing
│   │   ├── whatsapp-router.ts               # Existing
│   │   ├── whatsapp-device-manager.ts       # NEW
│   │   ├── baileys-client.ts                # NEW
│   │   └── baileys-connection-pool.ts       # NEW
│   ├── repositories/
│   │   ├── whatsapp-user-link-repository.ts # Existing
│   │   ├── whatsapp-device-repository.ts    # NEW
│   │   └── whatsapp-linking-repository.ts   # NEW
│   └── utils/
│       ├── whatsapp-crypto.ts               # Existing (extended)
│       └── credential-encryption.ts         # NEW
└── hooks/
    └── use-whatsapp-device.ts               # NEW
```

---

## Summary

This implementation plan provides a comprehensive roadmap for adding WhatsApp device linking to FocoBot. The hybrid approach maintains the reliability of Twilio for notifications while enabling advanced users to link their personal WhatsApp accounts for a richer messaging experience.

**Key Decisions:**
1. **Hybrid architecture** - Twilio for reliability, Baileys for flexibility
2. **Both QR and pairing code methods** - Maximum user convenience
3. **Strong encryption** - AES-256-GCM for credential protection
4. **Comprehensive retry logic** - Automatic reconnection with exponential backoff
5. **Multi-device support** - Up to 5 devices per user

**Next Steps:**
1. Review and approve architecture decisions
2. Set up development environment with Baileys
3. Begin Phase 1 implementation (database and foundation)
4. Create feature branch and start development

---

*Document Version: 1.0*
*Last Updated: 2026-01-27*
*Author: Foco Development Team*
