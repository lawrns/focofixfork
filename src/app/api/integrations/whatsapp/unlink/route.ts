/**
 * WhatsApp Unlink Endpoint
 * Removes WhatsApp phone link from user account
 *
 * DELETE /api/integrations/whatsapp/unlink
 * Returns: { success: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { WhatsAppUserLinkRepository } from '@/lib/repositories/whatsapp-user-link-repository'

export async function DELETE(request: NextRequest) {
  try {
    // 1. Get user from session (using standard auth helper)
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    // 2. Unlink WhatsApp
    const linkRepo = new WhatsAppUserLinkRepository(supabase)
    const unlinkResult = await linkRepo.unlinkByUserId(user.id)

    if (!unlinkResult.ok) {
      return NextResponse.json(
        { error: 'Failed to unlink WhatsApp' },
        { status: 500 }
      )
    }

    // 3. Success
    const jsonResponse = NextResponse.json({
      success: true,
      message: 'WhatsApp unlinked successfully',
    })

    return mergeAuthResponse(jsonResponse, authResponse)
  } catch (error) {
    console.error('Error unlinking WhatsApp:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET: Check if WhatsApp is linked
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Get user from session (using standard auth helper)
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    // 2. Check link status
    const linkRepo = new WhatsAppUserLinkRepository(supabase)
    const linkResult = await linkRepo.findByUserId(user.id)

    if (!linkResult.ok) {
      return NextResponse.json(
        { error: 'Failed to check link status' },
        { status: 500 }
      )
    }

    if (!linkResult.data) {
      const jsonResponse = NextResponse.json({
        linked: false,
        phone: null,
        verified: false,
      })
      return mergeAuthResponse(jsonResponse, authResponse)
    }

    const jsonResponse = NextResponse.json({
      linked: true,
      phone: linkResult.data.phone,
      verified: linkResult.data.verified,
      linkedAt: linkResult.data.linked_at,
    })

    return mergeAuthResponse(jsonResponse, authResponse)
  } catch (error) {
    console.error('Error checking WhatsApp link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
