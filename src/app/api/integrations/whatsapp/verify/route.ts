/**
 * WhatsApp Verify Endpoint
 * Verifies code sent via WhatsApp and completes phone linking
 *
 * POST /api/integrations/whatsapp/verify
 * Body: { phone: string, code: string }
 * Returns: { success: boolean, linked: boolean }
 *
 * Note: This is a fallback endpoint for manual verification
 * The primary verification flow happens automatically via webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { WhatsAppUserLinkRepository } from '@/lib/repositories/whatsapp-user-link-repository'
import { sanitizePhone } from '@/lib/utils/whatsapp-crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    // 1. Get user from session
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request body
    const body = await request.json()
    let { phone, code } = body

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Phone and code are required' },
        { status: 400 }
      )
    }

    // 3. Sanitize phone to E.164 format
    phone = sanitizePhone(phone)

    if (!phone) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // 4. Verify code
    const linkRepo = new WhatsAppUserLinkRepository(supabase)
    const verifyResult = await linkRepo.verifyCode(phone, code)

    if (!verifyResult.ok) {
      return NextResponse.json(
        { error: 'Failed to verify code' },
        { status: 500 }
      )
    }

    if (!verifyResult.data) {
      return NextResponse.json(
        {
          success: false,
          linked: false,
          error: 'Invalid or expired verification code',
        },
        { status: 400 }
      )
    }

    // 5. Success
    return NextResponse.json({
      success: true,
      linked: true,
      message: 'WhatsApp linked successfully',
    })
  } catch (error) {
    console.error('Error verifying WhatsApp code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
