# ✅ FocoBot WhatsApp Integration - Setup Complete!

**Deployment Date:** 2025-01-27
**Production URL:** https://foco.mx
**Status:** 🟢 Ready for Twilio Configuration

---

## What Was Completed ✅

### 1. Database Migration ✅
Created and applied `whatsapp_user_links` table in Supabase:
- Phone number linking with E.164 validation
- 6-digit verification code system (10-minute expiration)
- Row-level security (RLS) policies
- Auto-updating timestamps
- Proper indexes for performance

**Verification:**
```bash
psql "postgresql://postgres:***@db.ouvqnyfqipgnrjnuqsqq.supabase.co:5432/postgres" \
  -c "\d whatsapp_user_links"
```

### 2. Environment Variables ✅
All required credentials configured in Netlify:

#### Twilio WhatsApp
```bash
✅ TWILIO_ACCOUNT_SID=ACe276************be1 (configured)
✅ TWILIO_AUTH_TOKEN=******** (configured)
✅ TWILIO_API_KEY_SID=SK4ff9************971 (configured)
✅ TWILIO_API_KEY_SECRET=******** (configured)
✅ TWILIO_WHATSAPP_NUMBER=+525597535037
```

#### Redis (Session Management)
```bash
✅ REDIS_HOST=******** (already configured)
✅ REDIS_PORT=******** (already configured)
✅ REDIS_PASSWORD=******** (already configured)
```

#### AI Provider (Proposal Parsing)
```bash
✅ OPENAI_API_KEY=******** (already configured)
```

#### Application URL
```bash
✅ NEXT_PUBLIC_BASE_URL=https://foco.mx
```

### 3. Code Deployment ✅
- WhatsApp webhook endpoint: `https://foco.mx/api/integrations/whatsapp/webhook`
- Phone linking API: `https://foco.mx/api/integrations/whatsapp/link`
- Code verification API: `https://foco.mx/api/integrations/whatsapp/verify`
- Unlink API: `https://foco.mx/api/integrations/whatsapp/unlink`

**Webhook Health Check:** ✅ PASSING
```bash
$ curl https://foco.mx/api/integrations/whatsapp/webhook
{"status":"ok","service":"whatsapp-webhook","provider":"twilio"}
```

### 4. Build & Deploy ✅
- Production build completed successfully
- All 62 pages generated
- Functions bundled
- Deployed to: https://foco.mx
- Deploy ID: `6979014f268395360be5091f`

---

## Next Steps (Manual Configuration Required)

### Step 1: Configure Twilio Webhook 🔴 REQUIRED

1. **Go to Twilio Console:**
   👉 https://console.twilio.com/

2. **Navigate to WhatsApp Configuration:**
   - Click **Messaging** → **Try it out** → **Send a WhatsApp message**
   - OR: **Messaging** → **Senders** (if using production WhatsApp number)

3. **Configure Webhook for your number (+525597535037):**

   **When a message comes in:**
   ```
   URL: https://foco.mx/api/integrations/whatsapp/webhook
   HTTP Method: POST
   ```

   **Status callbacks (optional):**
   ```
   URL: https://foco.mx/api/integrations/whatsapp/webhook
   HTTP Method: POST
   ```

4. **Save Configuration**

---

### Step 2: Test the Integration 🧪

#### Test 1: Webhook Health Check ✅ ALREADY VERIFIED
```bash
curl https://foco.mx/api/integrations/whatsapp/webhook
# Expected: {"status":"ok","service":"whatsapp-webhook","provider":"twilio"}
```

#### Test 2: Phone Linking Flow

**2.1. Log into Foco:**
- Go to https://foco.mx
- Log in with your account

**2.2. Navigate to Settings → Integrations:**
- Click **Settings** in sidebar
- Go to **Integrations** tab
- Find **WhatsApp Integration** section

**2.3. Link Your Phone:**
- Enter your phone number: `+525597535037` (or any user's number)
- Click **Generate Verification Code**
- You should receive a 6-digit code (e.g., `123456`)

**2.4. Verify via WhatsApp:**
- Open WhatsApp
- Send message to Twilio number: `+525597535037`
- Message: `VERIFY 123456` (use the actual code you received)
- Wait for confirmation message from FocoBot

**Expected Response:**
```
✅ WhatsApp linked to your Foco account!
You can now send proposals and receive notifications.
```

#### Test 3: Create Proposal via WhatsApp

**3.1. Set Project Context:**
Send to `+525597535037`:
```
/list projects
```
You should see a list of your projects.

**3.2. Switch to a Project:**
```
/project [project name]
```
Replace `[project name]` with an actual project from the list.

**3.3. Send a Proposal:**
```
Need to add login page and user dashboard by Friday. Should take about 8 hours.
```

**Expected Response:**
```
✅ Proposal created!

📝 2 items
⏱️ 8 hours estimated

View: https://foco.mx/proposals/[id]
```

#### Test 4: Check Commands
```
/help
```
Should show all available commands.

---

## How FocoBot Works

### User Flow

```
1. User Links Phone
   ├─ User enters phone in Foco settings
   ├─ System generates 6-digit code (10-min expiration)
   └─ User sends "VERIFY 123456" to WhatsApp

2. WhatsApp Message Received
   ├─ Twilio forwards to: https://foco.mx/api/integrations/whatsapp/webhook
   ├─ System verifies Twilio signature (production only)
   ├─ System extracts phone number
   └─ System routes to appropriate handler

3. Message Processing
   ├─ Commands (/help, /project, etc.) → Command handler
   ├─ Verification (VERIFY 123456) → Verification handler
   └─ Regular messages → AI proposal parser

4. AI Proposal Parsing
   ├─ Natural language → Structured data
   ├─ OpenAI extracts: tasks, hours, deadlines, priorities
   └─ Saves to database with full proposal structure

5. Response Sent
   ├─ System sends confirmation via Twilio API
   └─ User receives WhatsApp message with proposal link
```

### Session Management

- **Redis-based sessions** with 30-minute TTL
- Stores: `workspace_id`, `project_id`, `conversation_state`
- Auto-renewed on each message
- No database writes for session management (fast!)

### Security

- **Webhook signature verification** (production only)
- **Phone number validation** (E.164 format required)
- **RLS policies** (users can only see their own phone links)
- **Rate limiting** (10 messages/minute per phone)
- **Verification code expiration** (10 minutes, one-time use)

---

## Available Commands

Users can send these commands via WhatsApp:

| Command | Description |
|---------|-------------|
| `/help` | Show all available commands |
| `/status` | Show current workspace/project context |
| `/project [name]` | Switch to a specific project |
| `/workspace [name]` | Switch to a specific workspace |
| `/list projects` | List all your projects |
| `/list tasks` | List tasks in current project |
| `/clear` | Clear project context |
| `VERIFY 123456` | Verify phone number linkage |

**Creating Proposals:**
Just send a natural language message describing what you need:
```
Need to add login page and user dashboard by Friday.
Should take about 8 hours.
```

FocoBot will:
1. Parse it into structured tasks
2. Estimate hours per task
3. Set deadlines based on context
4. Create proposal in database
5. Send confirmation with link

---

## Troubleshooting

### Issue: "Twilio webhook signature validation failed"
**Solution:**
- Verify `TWILIO_API_KEY_SECRET` is correct in Netlify
- Ensure webhook URL in Twilio exactly matches: `https://foco.mx/api/integrations/whatsapp/webhook`
- No trailing slash!

### Issue: "Phone number already linked to another account"
**Solution:**
- Phone numbers are unique per user
- User must unlink from previous account first
- Or admin can manually delete in Supabase:
  ```sql
  DELETE FROM whatsapp_user_links WHERE phone = '+525597535037';
  ```

### Issue: "Redis connection failed"
**Solution:**
- Verify Redis credentials in Netlify environment variables
- Check Redis server is accessible from Netlify
- Check Netlify function logs for detailed error

### Issue: "AI parsing failed"
**Solution:**
- Verify `OPENAI_API_KEY` is valid and has quota
- Check OpenAI API status
- Review function logs for rate limit errors

### Issue: "Proposal not created"
**Solution:**
- User must select a project first: `/project [name]`
- Verify `foco_proposals` table exists in database
- Check function logs for validation errors

### Issue: "Webhook not receiving messages"
**Solution:**
- Verify webhook URL in Twilio Console is correct
- Test webhook health: `curl https://foco.mx/api/integrations/whatsapp/webhook`
- Check Twilio webhook logs for delivery errors
- Ensure WhatsApp number in Twilio is active

---

## Monitoring & Logs

### Netlify Function Logs
👉 https://app.netlify.com/projects/focito/logs/functions

Monitor for:
- Webhook calls from Twilio
- Verification attempts
- Proposal creation
- Errors and exceptions

### Twilio Console Logs
👉 https://console.twilio.com/

Monitor for:
- Message delivery status
- Webhook delivery failures
- API errors

### Supabase Logs
👉 https://supabase.com/dashboard/project/ouvqnyfqipgnrjnuqsqq

Monitor for:
- Database errors
- RLS policy violations
- API errors

---

## Production Checklist

- [x] Database migration applied
- [x] Environment variables configured
- [x] Code deployed to production
- [x] Webhook endpoint accessible
- [ ] **Twilio webhook configured** 👈 DO THIS NOW
- [ ] **End-to-end test completed**
- [ ] Monitoring dashboards set up
- [ ] Error alerting configured

---

## Files Reference

| File | Purpose |
|------|---------|
| [FOCOBOT_DEPLOYMENT.md](FOCOBOT_DEPLOYMENT.md) | Full deployment guide with technical details |
| [migrations/whatsapp_integration.sql](migrations/whatsapp_integration.sql) | Database schema migration |
| [src/app/api/integrations/whatsapp/webhook/route.ts](src/app/api/integrations/whatsapp/webhook/route.ts) | Webhook handler |
| [src/lib/services/whatsapp-router.ts](src/lib/services/whatsapp-router.ts) | Message routing and commands |
| [src/lib/services/whatsapp-session.ts](src/lib/services/whatsapp-session.ts) | Redis session management |
| [src/lib/repositories/whatsapp-user-link-repository.ts](src/lib/repositories/whatsapp-user-link-repository.ts) | Database operations |

---

## Summary

✅ **Database:** Ready
✅ **Environment Variables:** Configured
✅ **Code:** Deployed
✅ **Webhook Endpoint:** Accessible
🔴 **Twilio Webhook:** Needs configuration (manual step)
⏳ **Testing:** Pending after Twilio configuration

**Next Action:** Configure Twilio webhook URL in [Twilio Console](https://console.twilio.com/)

---

**Questions or Issues?**
- Check [FOCOBOT_DEPLOYMENT.md](FOCOBOT_DEPLOYMENT.md) for detailed troubleshooting
- Review Netlify function logs for errors
- Test webhook health: `curl https://foco.mx/api/integrations/whatsapp/webhook`
