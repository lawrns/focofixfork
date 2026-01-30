/**
 * WhatsApp Webhook Endpoint (Twilio)
 * Receives and processes WhatsApp messages from Twilio
 *
 * Handles:
 * - POST: Incoming messages and status updates
 *
 * Twilio sends webhooks as application/x-www-form-urlencoded
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyTwilioSignature, extractPhoneFromTwilio } from '@/lib/utils/whatsapp-crypto'
import { getWhatsAppRouter } from '@/lib/services/whatsapp-router'

// Twilio signs webhooks with Auth Token, not API Key Secret
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || ''
const WEBHOOK_URL = process.env.NEXT_PUBLIC_BASE_URL
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/integrations/whatsapp/webhook`
  : ''

/**
 * POST: Incoming webhook events from Twilio
 * Twilio sends form-urlencoded data with message details
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse form data
    const formData = await request.formData()
    const params: Record<string, string> = {}

    formData.forEach((value, key) => {
      params[key] = value.toString()
    })

    // 2. Verify signature (optional in dev, required in production)
    const signature = request.headers.get('X-Twilio-Signature')

    if (process.env.NODE_ENV === 'production' && WEBHOOK_URL && AUTH_TOKEN) {
      if (!verifyTwilioSignature(WEBHOOK_URL, params, signature, AUTH_TOKEN)) {
        console.error('Invalid Twilio webhook signature')
        return new NextResponse('Invalid signature', { status: 401 })
      }
    }

    // 3. Extract message details from Twilio format
    const messageSid = params['MessageSid'] || params['SmsSid']
    const from = params['From'] // Format: whatsapp:+1234567890
    const to = params['To']
    const body = params['Body'] || ''
    const numMedia = parseInt(params['NumMedia'] || '0', 10)
    const messageStatus = params['MessageStatus'] // For status callbacks

    // 4. Handle status callbacks (delivery receipts)
    if (messageStatus && !body) {
      await handleMessageStatus(messageSid, messageStatus, from)
      return createTwiMLResponse()
    }

    // 5. Skip if no message body (media-only messages not supported yet)
    if (!body.trim()) {
      if (numMedia > 0) {
        console.log(`Media message received from ${from}, not supported yet`)
      }
      return createTwiMLResponse()
    }

    // 6. Extract phone number from whatsapp: prefix
    const phoneNumber = extractPhoneFromTwilio(from)

    console.log(`Incoming WhatsApp from ${phoneNumber}: ${body}`)

    // 7. Route to message handler
    const router = getWhatsAppRouter()
    await router.routeMessage({
      from: phoneNumber,
      messageId: messageSid,
      text: body,
      timestamp: new Date().toISOString(),
    })

    // 8. Return empty TwiML response (Twilio expects this)
    return createTwiMLResponse()
  } catch (error) {
    console.error('Error processing Twilio webhook:', error)
    // Return empty TwiML to prevent Twilio from retrying
    return createTwiMLResponse()
  }
}

/**
 * Handle message status update (delivery receipts)
 */
async function handleMessageStatus(
  messageSid: string,
  status: string,
  recipient: string
): Promise<void> {
  // Status values: queued, failed, sent, delivered, undelivered, read
  console.log(`Message ${messageSid} to ${recipient}: ${status}`)

  // TODO: Update message status in database if needed
  // For now, just log
}

/**
 * Create empty TwiML response
 * Twilio expects a TwiML response, even if we don't want to reply immediately
 * (We send replies via the API instead for more control)
 */
function createTwiMLResponse(): NextResponse {
  const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
  return new NextResponse(twiml, {
    status: 200,
    headers: {
      'Content-Type': 'text/xml',
    },
  })
}

/**
 * GET: Health check endpoint
 * Useful for verifying webhook is accessible
 */
export async function GET() {
  return new NextResponse(
    JSON.stringify({
      status: 'ok',
      service: 'whatsapp-webhook',
      provider: 'twilio'
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

/**
 * Rate limiting (optional)
 * Prevents abuse by limiting requests per phone number
 */
const messageRateLimiter = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(phone: string, maxPerMinute = 10): boolean {
  const now = Date.now()
  const limiter = messageRateLimiter.get(phone)

  if (!limiter || limiter.resetAt < now) {
    messageRateLimiter.set(phone, {
      count: 1,
      resetAt: now + 60 * 1000, // 1 minute
    })
    return true
  }

  if (limiter.count >= maxPerMinute) {
    return false // Rate limit exceeded
  }

  limiter.count++
  return true
}
