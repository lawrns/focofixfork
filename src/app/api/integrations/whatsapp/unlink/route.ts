/**
 * WhatsApp Unlink Endpoint
 * Removes WhatsApp phone link from user account
 *
 * DELETE /api/integrations/whatsapp/unlink
 * Returns: { success: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { WhatsAppUserLinkRepository } from '@/lib/repositories/whatsapp-user-link-repository'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function DELETE(request: NextRequest) {
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
    return NextResponse.json({
      success: true,
      message: 'WhatsApp unlinked successfully',
    })
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
      return NextResponse.json({
        linked: false,
        phone: null,
        verified: false,
      })
    }

    return NextResponse.json({
      linked: true,
      phone: linkResult.data.phone,
      verified: linkResult.data.verified,
      linkedAt: linkResult.data.linked_at,
    })
  } catch (error) {
    console.error('Error checking WhatsApp link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
