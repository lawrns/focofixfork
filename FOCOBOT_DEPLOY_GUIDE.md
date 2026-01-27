# FocoBot Deployment Guide

Complete guide to deploying FocoBot for WhatsApp integration on foco.mx

## Overview

FocoBot is a WhatsApp-integrated AI assistant that allows users to:
- Create and manage tasks via WhatsApp
- Receive scheduled notifications (morning digest, evening summary)
- Query tasks using natural language (Spanish/English)
- Complete tasks by sending simple messages

## Architecture

```
User WhatsApp → Twilio → /api/integrations/whatsapp/webhook → WhatsAppRouter → FocoBot
                                                            ↓
                                                      Proposal Creation
```

## Prerequisites

1. **Twilio Account** with WhatsApp Business API enabled
2. **Supabase Project** with existing foco.mx database
3. **Environment Variables** configured
4. **OpenAI/Kimi API Key** for LLM processing

## Deployment Steps

### Step 1: Run Database Migration

Since direct database access is restricted, run the SQL via Supabase Dashboard:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (`ouvqnyfqipgnrjnuqsqq`)
3. Go to **SQL Editor** → **New Query**
4. Copy and paste the contents of `FOCOBOT_DEPLOY.sql`
5. Click **Run**

**This creates:**
- `whatsapp_device_fingerprints` - Device security tracking
- `whatsapp_bot_sessions` - Active bot sessions
- `whatsapp_processed_messages` - Replay prevention
- `whatsapp_rate_limit_violations` - Abuse prevention
- `whatsapp_security_audit_log` - Complete audit trail
- `whatsapp_account_lockouts` - Account security
- `focobot_command_history` - Command tracking
- `focobot_scheduled_notifications` - Notification queue

### Step 2: Configure Environment Variables

Add these to your `.env.local` and production environment:

```bash
# FocoBot Security
FOCOBOT_CRON_SECRET=your-random-cron-secret-min-32-chars
FOCOBOT_FINGERPRINT_SECRET=your-random-fingerprint-secret
FOCOBOT_ENCRYPTION_KEY=your-encryption-key-at-least-32-chars
FOCOBOT_SESSION_TIMEOUT_HOURS=24
FOCOBOT_MAX_SESSION_DAYS=7

# LLM Providers (at least one required)
OPENAI_API_KEY=sk-...
KIMI_API_KEY=sk-...
GLM_API_KEY=...

# Twilio WhatsApp (should already be configured)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_API_KEY_SECRET=...
TWILIO_PHONE_NUMBER=whatsapp:+14155238886
WHATSAPP_BUSINESS_NUMBER=+14155238886

# Base URL
NEXT_PUBLIC_BASE_URL=https://foco.mx
```

### Step 3: Deploy to Production

```bash
# Build and deploy
npm run build
npm run deploy  # or your deployment command
```

### Step 4: Configure Twilio Webhook

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Messaging** → **Try it out** → **Send a WhatsApp message**
3. Set webhook URL: `https://foco.mx/api/integrations/whatsapp/webhook`
4. Ensure HTTP POST is selected

### Step 5: Set Up Cron Job (Optional)

For scheduled notifications, add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/focobot/cron",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Or use any cron service to hit:
```
POST https://foco.mx/api/focobot/cron
Headers: { "Authorization": "Bearer your-cron-secret" }
```

## User Onboarding Flow

### For Users: Linking WhatsApp

1. **Log in** to foco.mx
2. Go to **Settings** → **Integrations**
3. Click **Link WhatsApp**
4. Enter phone number with country code (e.g., +521234567890)
5. Click **Generate Code**
6. Copy the 6-digit verification code
7. **Open WhatsApp** and message the Foco number
8. Send: `VERIFY 123456` (replace with your code)
9. Receive confirmation: "✅ WhatsApp linked!"

### Using FocoBot

Once linked, users can send natural language messages:

**Create Tasks:**
- "Crear tarea: Revisar propuesta del cliente"
- "Add task: Review client proposal"
- "Nueva tarea - Llamar a Juan mañana a las 3pm"

**List Tasks:**
- "/tareas"
- "Ver mis tareas"
- "What tasks do I have?"

**Complete Tasks:**
- "/completar 3"
- "Completar tarea 2"
- "Mark task 1 as done"

**Help:**
- "/bot"
- "/help"
- "What can you do?"

## File Structure

```
src/
├── lib/
│   ├── focobot/
│   │   ├── index.ts              # Module exports
│   │   ├── ai-service.ts         # LLM integration
│   │   ├── command-processor.ts  # Command routing
│   │   ├── security.ts           # Device fingerprinting
│   │   ├── task-service.ts       # Task CRUD
│   │   └── notification-service.ts # Notifications
│   └── services/
│       ├── whatsapp-router.ts    # Main message router
│       └── whatsapp-session.ts   # Session management
├── app/
│   └── api/
│       ├── focobot/
│       │   └── cron/route.ts     # Cron job endpoint
│       └── integrations/
│           └── whatsapp/
│               ├── link/route.ts     # Link generation
│               ├── unlink/route.ts   # Unlink device
│               ├── verify/route.ts   # Verify code
│               └── webhook/route.ts  # Twilio webhook
└── components/
    └── settings/
        └── whatsapp-settings.tsx # UI for linking
```

## Security Features

1. **Device Fingerprinting**: Each device is tracked and verified
2. **Session Management**: 24-hour sessions with automatic renewal
3. **Rate Limiting**: Prevents abuse (3/min unlinked, 10/min linked)
4. **Replay Prevention**: Message IDs tracked for 24 hours
5. **Audit Logging**: Complete history of all interactions
6. **Account Lockout**: Automatic lockout after violations
7. **Phone Verification**: 6-digit code required to link

## Monitoring

Check these tables for monitoring:

```sql
-- Recent commands
SELECT * FROM focobot_command_history 
ORDER BY created_at DESC 
LIMIT 10;

-- Failed commands
SELECT * FROM focobot_command_history 
WHERE success = false 
ORDER BY created_at DESC 
LIMIT 10;

-- Security events
SELECT * FROM whatsapp_security_audit_log 
ORDER BY created_at DESC 
LIMIT 10;

-- Pending notifications
SELECT * FROM focobot_scheduled_notifications 
WHERE status = 'pending';
```

## Troubleshooting

### Users Can't Link WhatsApp

1. Check `whatsapp_user_links` table for existing entries
2. Verify phone format is E.164 (+1234567890)
3. Check verification code hasn't expired (10 min)

### FocoBot Not Responding

1. Check Twilio webhook URL is correct
2. Verify environment variables are set
3. Check `whatsapp_security_audit_log` for errors
4. Ensure user has verified their phone

### Rate Limiting Issues

Users seeing "Rate limit exceeded":
- Default: 10 messages/minute for verified users
- Check `whatsapp_rate_limit_violations` table
- Clear violations: `DELETE FROM whatsapp_rate_limit_violations WHERE phone = '+1234567890'`

### Database Errors

If migration fails:
1. Check `whatsapp_user_links` table exists
2. Verify RLS policies don't conflict
3. Run functions individually to isolate errors

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/integrations/whatsapp/webhook` | POST | Twilio webhook |
| `/api/integrations/whatsapp/link` | POST | Generate verification code |
| `/api/integrations/whatsapp/unlink` | GET/DELETE | Manage link status |
| `/api/integrations/whatsapp/verify` | POST | Verify code (alternative) |
| `/api/focobot/cron` | POST | Process scheduled notifications |

## Support

For issues:
1. Check browser console for frontend errors
2. Check Vercel logs for API errors
3. Query audit logs in Supabase
4. Review this guide's troubleshooting section

---

**Deployment Date:** January 2026  
**Version:** 1.0.0  
**Maintainer:** Foco Team
