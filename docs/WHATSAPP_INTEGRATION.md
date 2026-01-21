# WhatsApp Integration for Foco (Twilio)

Complete guide to setting up and using WhatsApp integration with Foco via Twilio.

## Overview

The WhatsApp integration enables:

- **Inbound**: Send messages to WhatsApp → Auto-create proposals/tasks in Foco
- **Outbound**: Receive project updates (assignments, mentions, completions) via WhatsApp
- **Context-aware**: Maintains conversation context for multi-turn interactions

## Architecture

Uses Twilio WhatsApp Business API:
- Simple setup with sandbox for testing
- Pay-as-you-go pricing (~$0.005-0.05/message)
- Webhook-based real-time delivery
- Session messages (24-hour window) + Templates for notifications

## Setup Guide

### 1. Create Twilio Account

1. Go to [Twilio Console](https://console.twilio.com/)
2. Sign up for a free account (includes trial credits)
3. Verify your email and phone number

### 2. Get a WhatsApp-Enabled Number

#### Option A: Use Twilio Sandbox (Testing)
1. Go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Follow the instructions to join the sandbox
3. Send "join <sandbox-code>" to the Twilio sandbox number

#### Option B: Get a Production Number
1. Go to **Phone Numbers** → **Buy a number**
2. Select a number with WhatsApp capability
3. Or connect your existing WhatsApp Business number

### 3. Create API Credentials

1. Go to **Account** → **API keys & tokens**
2. Click **Create API key**
3. Give it a friendly name (e.g., "Foco WhatsApp")
4. Copy the **SID** and **Secret** immediately (secret shown only once!)
5. Note your **Account SID** from the dashboard (starts with `AC`)

### 4. Configure Webhook

#### Development (using ngrok):

1. Install ngrok: `npm install -g ngrok`
2. Start your app: `npm run dev`
3. Start ngrok: `ngrok http 3000`
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

#### Configure in Twilio:

1. Go to **Messaging** → **Settings** → **WhatsApp sandbox settings** (or your number settings)
2. Set **When a message comes in**:
   - URL: `https://YOUR_DOMAIN/api/integrations/whatsapp/webhook`
   - Method: `POST`
3. Set **Status callback URL** (optional):
   - URL: `https://YOUR_DOMAIN/api/integrations/whatsapp/webhook`
   - Method: `POST`
4. Click **Save**

### 5. Environment Variables

Add to your `.env.local` file:

```bash
# Twilio WhatsApp Integration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY_SID=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY_SECRET=your_api_key_secret_here
TWILIO_WHATSAPP_NUMBER=+1234567890

# App URL (Required for webhooks)
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# Redis (Required for sessions)
UPSTASH_REDIS_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_TOKEN=your_upstash_redis_token
```

### 6. Run Database Migration

```bash
# Apply WhatsApp tables migration
npx supabase migration up
```

This creates:
- `whatsapp_user_links` - Phone number to user mapping
- `whatsapp_sessions` - Conversation context storage

### 7. Test the Integration

#### Verify webhook is accessible:

```bash
curl https://YOUR_DOMAIN/api/integrations/whatsapp/webhook
# Should return: {"status":"ok","service":"whatsapp-webhook","provider":"twilio"}
```

#### Link Your Phone:

1. Go to Foco Settings → Integrations
2. Click "Link WhatsApp"
3. Enter your phone number (with country code: +1234567890)
4. Click "Generate Code"
5. Open WhatsApp and message the Twilio number (your TWILIO_WHATSAPP_NUMBER)
6. Send: `VERIFY 123456` (use the code shown)
7. You'll receive a confirmation message

#### Test Inbound (Create Proposal):

1. Select a project: Send `/project My Project`
2. Create proposal: Send "Add login page and user dashboard by Friday"
3. Check Foco - proposal should be created automatically!

#### Test Outbound (Receive Notification):

1. Have someone assign you a task in Foco
2. You should receive a WhatsApp message
3. Click the link to open the task

## Usage

### Commands

Send these commands to the WhatsApp number:

- `/help` - Show available commands
- `/status` - Show current workspace/project context
- `/project [name]` - Switch to a project
- `/workspace [name]` - Switch to a workspace
- `/list projects` - List your projects
- `/list tasks` - List tasks in current project
- `/clear` - Clear project context

### Creating Proposals

Just send a natural language message:

**Examples**:
- "Need to add login page and user dashboard"
- "Fix the bug in checkout flow - users can't complete payment"
- "Update homepage design and improve mobile responsiveness"

The AI will:
- Parse your message
- Extract tasks
- Estimate hours
- Create proposal in Foco

### Session Context

Sessions last 30 minutes. The bot remembers:
- Current workspace
- Current project
- Last command

After 30 minutes of inactivity, context is cleared.

## Troubleshooting

### Webhook not receiving messages

1. Check ngrok is running: `ngrok http 3000`
2. Verify webhook URL in Twilio console is correct
3. Check Twilio debugger: **Monitor** → **Logs** → **Errors**
4. Test webhook endpoint directly with curl

### Verification code not working

1. Ensure code hasn't expired (10-minute TTL)
2. Check phone format is E.164: +1234567890 (no spaces/dashes)
3. If using sandbox, ensure you've joined first
4. Check server logs for errors

### Messages not sending

1. Check Twilio account has credits
2. Verify API credentials are correct
3. If using sandbox, recipient must have joined
4. Check Twilio error logs in console

### "Session" vs "Template" Messages

WhatsApp has two message types:
- **Session messages**: Free-form text within 24 hours of user's last message
- **Template messages**: Pre-approved templates for outbound notifications

For outbound notifications to users who haven't messaged recently, you'll need Content Templates.

## Rate Limits

- **Twilio API**: 1 message/second per number (can be increased)
- **Foco**: 10 messages/minute per phone, 100/hour per user

## Pricing

### Twilio Costs:
- WhatsApp Business API: ~$0.005-0.08 per message (varies by country)
- Phone number: ~$1-2/month
- Trial account: Free credits to start

### Message Pricing Examples:
- US: $0.0042 per message
- Mexico: $0.0315 per message
- UK: $0.0088 per message

## Security

- Webhook signature verification (Twilio HMAC-SHA1)
- Phone verification required before message processing
- Row-level security on database tables
- Rate limiting on endpoints
- End-to-end encryption (built into WhatsApp)

## Production Deployment

### Before Going Live:

1. **Get production number**:
   - Buy a WhatsApp-capable number in Twilio
   - Or register your existing business number

2. **Update webhook URL**:
   - Point to production domain (not ngrok)
   - Ensure HTTPS with valid certificate

3. **Enable signature verification**:
   - Already enabled in production mode
   - Uses `TWILIO_API_KEY_SECRET` for verification

4. **Create Content Templates** (for outbound notifications):
   - Go to **Messaging** → **Content Editor**
   - Create templates for notifications
   - Templates are auto-approved (no manual review like Meta)

5. **Monitor**:
   - Use Twilio Console → Monitor → Logs
   - Set up alerts for errors
   - Track message delivery rates

### Environment Variables (Production):

Store securely in:
- Vercel: Project Settings → Environment Variables
- AWS: AWS Secrets Manager
- Google Cloud: Secret Manager

Never commit credentials to git.

## Comparison: Twilio vs Meta Cloud API

| Feature | Twilio | Meta Cloud API |
|---------|--------|----------------|
| Setup complexity | Simple | Complex |
| Sandbox/testing | Built-in sandbox | Test numbers limited |
| Template approval | Auto-approved | Manual review (24-48h) |
| Pricing | Pay-per-message | Free tier + per-conversation |
| Documentation | Excellent | Good |
| Signature verification | HMAC-SHA1 | HMAC-SHA256 |

## Support

- Twilio Documentation: https://www.twilio.com/docs/whatsapp
- Twilio Support: https://support.twilio.com
- Foco Issues: https://github.com/your-repo/issues

## Next Steps

After basic setup:
1. Enable for your team in Settings → Integrations
2. Test end-to-end flows
3. Create Content Templates for notifications
4. Monitor usage and costs in Twilio Console
5. Consider upgrading to production number for reliability
