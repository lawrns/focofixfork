/**
 * WhatsApp Link Endpoint
 * Generates verification code for linking WhatsApp phone number
 *
 * POST /api/integrations/whatsapp/link
 * Body: { phone: string } (E.164 format)
 * Returns: { code: string, expiresAt: string, whatsappNumber: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { WhatsAppUserLinkRepository } from '@/lib/repositories/whatsapp-user-link-repository'
import { sanitizePhone } from '@/lib/utils/whatsapp-crypto'

export async function POST(request: NextRequest) {
  try {
    // 1. Get user from session (using standard auth helper)
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    // 2. Parse request body
    const body = await request.json()
    let { phone } = body

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // 3. Sanitize phone to E.164 format
    phone = sanitizePhone(phone)

    if (!phone) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use E.164 format: +1234567890' },
        { status: 400 }
      )
    }

    // 4. Check if phone is already linked to another user
    const linkRepo = new WhatsAppUserLinkRepository(supabase)
    const existingLinkResult = await linkRepo.findByPhone(phone)

    if (!existingLinkResult.ok) {
      return NextResponse.json(
        { error: 'Failed to check existing link' },
        { status: 500 }
      )
    }

    if (existingLinkResult.data && existingLinkResult.data.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Phone number already linked to another account' },
        { status: 409 }
      )
    }

    // 5. Generate verification code
    const codeResult = await linkRepo.createVerificationCode(user.id, phone)

    if (!codeResult.ok) {
      return NextResponse.json(
        { error: 'Failed to generate verification code' },
        { status: 500 }
      )
    }

    const code = codeResult.data

    // 6. Return verification code
    const jsonResponse = NextResponse.json({
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || '+1234567890',
      message: `Send this message to WhatsApp:\n\nVERIFY ${code}`,
    })

    return mergeAuthResponse(jsonResponse, authResponse)
  } catch (error) {
    console.error('Error generating WhatsApp verification code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
