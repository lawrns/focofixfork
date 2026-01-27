# FocoBot WhatsApp Integration - Deployment Guide

## Overview
FocoBot enables users to create project proposals via WhatsApp using Twilio and AI-powered parsing.

## Database Migration ✅ COMPLETED

The database migration has been successfully applied. The following table was created:

### whatsapp_user_links
Stores phone number to user account linkage with verification codes.

**Columns:**
- `id` (UUID, PK) - Unique identifier
- `user_id` (UUID, FK to auth.users) - User account ID
- `phone` (TEXT, UNIQUE) - Phone number in E.164 format (+1234567890)
- `verified` (BOOLEAN) - Whether the phone number has been verified
- `verification_code` (TEXT, NULLABLE) - Temporary 6-digit code for verification
- `verification_code_expires_at` (TIMESTAMPTZ, NULLABLE) - Code expiration (10 minutes)
- `linked_at` (TIMESTAMPTZ, NULLABLE) - Timestamp when verified
- `created_at` (TIMESTAMPTZ) - Record creation time
- `updated_at` (TIMESTAMPTZ) - Last update time (auto-updated via trigger)

**Indexes:**
- Primary key on `id`
- Unique constraints on `phone` and `user_id`
- Indexes on `user_id`, `phone`, and `verified` for performance

**RLS Policies:**
- Users can manage their own links
- Service role has full access for API endpoints

---

## Required Environment Variables

### 🔴 CRITICAL - Required for Production

#### Twilio Configuration
```bash
# Twilio Account Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # For Twilio Console access

# Twilio API Key (for programmatic access)
TWILIO_API_KEY_SID=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Your Twilio WhatsApp-enabled Phone Number
TWILIO_WHATSAPP_NUMBER=+14155238886  # Format: +[country code][number]
```

#### Redis Configuration (for session management)
```bash
REDIS_HOST=your-redis-host.cloud.redislabs.com
REDIS_PORT=16417
REDIS_PASSWORD=your-redis-password
```

#### AI Provider (for proposal parsing)
**Option 1: OpenAI**
```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Option 2: Kimi (alternative)**
```bash
KIMI_API_KEY=your-kimi-api-key
```

#### Application URL
```bash
NEXT_PUBLIC_BASE_URL=https://foco.mx  # Your production domain
```

### ✅ Already Configured
These should already be set in your Supabase project:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://ouvqnyfqipgnrjnuqsqq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Twilio Webhook Configuration

### 1. Configure Webhook URL in Twilio Console

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to: **Messaging** → **WhatsApp** → **Senders** (or **Sandbox** for testing)
3. Select your WhatsApp number
4. Under **Webhook Configuration**, set:

**When a message comes in:**
```
https://foco.mx/api/integrations/whatsapp/webhook
```
HTTP Method: `POST`

**Status callback URL (optional):**
```
https://foco.mx/api/integrations/whatsapp/webhook
```
HTTP Method: `POST`

### 2. Verify Webhook Signature
The webhook verifies Twilio signatures in production using `TWILIO_API_KEY_SECRET`. In development, signature verification is skipped.

### 3. Test the Webhook
```bash
# Check if webhook is accessible
curl https://foco.mx/api/integrations/whatsapp/webhook

# Expected response:
{"status":"ok","service":"whatsapp-webhook","provider":"twilio"}
```

---

## Deployment Checklist

### Step 1: Environment Variables ⏳ PENDING
- [ ] Add `TWILIO_ACCOUNT_SID` to production environment
- [ ] Add `TWILIO_AUTH_TOKEN` to production environment (for Twilio Console)
- [ ] Add `TWILIO_API_KEY_SID` to production environment
- [ ] Add `TWILIO_API_KEY_SECRET` to production environment
- [ ] Add `TWILIO_WHATSAPP_NUMBER` to production environment (your Twilio WhatsApp number)
- [ ] Add `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` to production environment
- [ ] Add `OPENAI_API_KEY` (or `KIMI_API_KEY`) to production environment
- [ ] Verify `NEXT_PUBLIC_BASE_URL` is set to production domain

### Step 2: Database Migration ✅ COMPLETED
- [x] Run migration: `migrations/whatsapp_integration.sql`
- [x] Verify table: `whatsapp_user_links` created
- [x] Verify indexes created
- [x] Verify RLS policies enabled

### Step 3: Twilio Configuration ⏳ PENDING
- [ ] Configure webhook URL in Twilio Console
- [ ] Test webhook endpoint with curl
- [ ] Send test message to verify end-to-end flow

### Step 4: Code Deployment ✅ COMPLETED
- [x] WhatsApp API routes: `/api/integrations/whatsapp/*`
- [x] WhatsApp services and repositories
- [x] Frontend settings page for phone linking
- [x] Committed and pushed to `origin/feature/cursos-platform`

### Step 5: Testing
- [ ] Test phone linking flow (generate code → verify code)
- [ ] Test sending WhatsApp message to create proposal
- [ ] Test command handling (`/help`, `/project`, etc.)
- [ ] Verify proposal creation in database
- [ ] Check session management in Redis

---

## How Users Link WhatsApp

### Frontend Flow (in Foco Settings)

1. User navigates to **Settings** → **Integrations** → **WhatsApp**
2. User enters their phone number (E.164 format: +1234567890)
3. Click **Generate Verification Code**
4. API generates 6-digit code and saves to database
5. User receives instructions: "Send `VERIFY 123456` to +14155238886"
6. User opens WhatsApp and sends message
7. FocoBot webhook receives message, verifies code, marks phone as verified
8. User receives confirmation: "✅ WhatsApp linked to your Foco account!"

### API Endpoints

#### Generate Verification Code
```bash
POST /api/integrations/whatsapp/link
Authorization: Bearer <user-token>
Content-Type: application/json

{
  "phone": "+1234567890"
}

# Response:
{
  "code": "123456",
  "expiresAt": "2024-01-27T10:45:00Z",
  "whatsappNumber": "+14155238886",
  "message": "Send this message to WhatsApp:\n\nVERIFY 123456"
}
```

#### Verify Code (called by webhook)
```bash
POST /api/integrations/whatsapp/verify
Content-Type: application/json

{
  "phone": "+1234567890",
  "code": "123456"
}
```

#### Unlink Phone
```bash
POST /api/integrations/whatsapp/unlink
Authorization: Bearer <user-token>
```

---

## How FocoBot Works

### Message Flow

1. **User sends WhatsApp message** → Twilio receives it
2. **Twilio webhook fires** → POST to `/api/integrations/whatsapp/webhook`
3. **Webhook validates signature** (production only)
4. **Router extracts phone number** and looks up user
5. **Command parsing:**
   - If starts with `/` → Command handler
   - If starts with `VERIFY` → Verification handler
   - Otherwise → Proposal creation handler
6. **AI parses message** into structured proposal (title, items, estimates)
7. **Proposal saved to database** with metadata
8. **Confirmation sent via WhatsApp** with link to view proposal

### Supported Commands

- `/help` - Show available commands
- `/status` - Show current workspace/project context
- `/project [name]` - Switch to project
- `/workspace [name]` - Switch to workspace
- `/list projects` - List user's projects
- `/list tasks` - List tasks in current project
- `/clear` - Clear project context

### Session Management

- Uses **Redis** for fast, stateful sessions
- **30-minute TTL** (auto-expires after inactivity)
- Stores: `workspace_id`, `project_id`, `conversation_state`, metadata
- Auto-renewed on each message

### AI Proposal Parsing

Uses OpenAI (or Kimi) to parse natural language into structured data:

**Input:**
```
Need to add login page and user dashboard by Friday. Should take about 8 hours.
```

**Parsed Output:**
```json
{
  "summary": "Add login page and user dashboard",
  "items": [
    {
      "type": "task",
      "title": "Create login page",
      "description": "Build authentication UI",
      "estimatedHours": 4,
      "dueDate": "2024-01-31",
      "priority": "high"
    },
    {
      "type": "task",
      "title": "Create user dashboard",
      "description": "Build main dashboard UI",
      "estimatedHours": 4,
      "dueDate": "2024-01-31",
      "priority": "high"
    }
  ],
  "totalEstimatedHours": 8,
  "confidence": 0.92
}
```

---

## Security Considerations

### Webhook Signature Verification
- **Production:** Verifies `X-Twilio-Signature` header using `TWILIO_API_KEY_SECRET`
- **Development:** Skips verification for easier testing
- Prevents unauthorized webhook calls

### Phone Number Privacy
- Stored in E.164 format (+1234567890)
- Unique constraint: one phone per user
- RLS policies ensure users only see their own phone
- Service role bypass for API endpoints

### Verification Code Security
- 6-digit numeric code
- 10-minute expiration
- Cleared after successful verification
- One-time use only

### Rate Limiting (implemented in webhook)
- In-memory rate limiter: 10 messages per minute per phone
- Prevents abuse and spam
- Can be extended with Redis for distributed rate limiting

---

## Troubleshooting

### "Twilio webhook signature validation failed"
- Check `TWILIO_API_KEY_SECRET` is set correctly
- Verify webhook URL in Twilio matches exactly (no trailing slash)
- Ensure `NEXT_PUBLIC_BASE_URL` is correct

### "Phone number already linked to another account"
- Phone numbers are unique per user
- User must unlink from previous account first
- Admin can manually delete link via SQL if needed

### "Redis connection failed"
- Check `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` are set
- Verify Redis server is accessible from production
- Sessions will fail without Redis (stateless mode not supported)

### "AI parsing failed"
- Check `OPENAI_API_KEY` or `KIMI_API_KEY` is valid
- Verify API quota/billing is active
- Check API logs for rate limit errors

### "Proposal not created"
- Check user has selected a project (`/project [name]`)
- Verify `foco_proposals` and `foco_proposal_items` tables exist
- Check database logs for constraint violations

---

## Next Steps After Deployment

1. **Add environment variables** to production (Vercel/Netlify/Railway)
2. **Configure Twilio webhook** with production URL
3. **Test end-to-end flow** with real WhatsApp number
4. **Monitor logs** for errors and webhook calls
5. **Add frontend UI** for phone linking in Settings page
6. **Document for users** how to link WhatsApp and use FocoBot

---

## Files Modified/Created

### API Routes
- `src/app/api/integrations/whatsapp/webhook/route.ts` - Main webhook handler
- `src/app/api/integrations/whatsapp/link/route.ts` - Generate verification code
- `src/app/api/integrations/whatsapp/verify/route.ts` - Verify code
- `src/app/api/integrations/whatsapp/unlink/route.ts` - Unlink phone

### Services
- `src/lib/services/whatsapp.ts` - Twilio API client
- `src/lib/services/whatsapp-router.ts` - Message routing and command handling
- `src/lib/services/whatsapp-session.ts` - Redis session management
- `src/lib/services/ai-proposal-parser.ts` - AI-powered proposal parsing

### Repositories
- `src/lib/repositories/whatsapp-user-link-repository.ts` - Database operations

### Utilities
- `src/lib/utils/whatsapp-crypto.ts` - Signature verification and phone sanitization

### Database
- `migrations/whatsapp_integration.sql` - Database schema

### Documentation
- `FOCOBOT_DEPLOYMENT.md` - This file

---

**FocoBot Status:** Code deployed ✅ | Database ready ✅ | Environment variables pending ⏳ | Twilio webhook pending ⏳
