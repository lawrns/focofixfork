import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    const { data: invitation, error } = await supabaseAdmin
      .from('organization_invitations')
      .select(`
        *,
        organizations (name),
        profiles:invited_by (full_name, email)
      `)
      .eq('token', token)
      .eq('status', 'pending')
      .single()

    if (error || !invitation) {
      return NextResponse.json(
        { success: false, error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      // Update status to expired
      await supabaseAdmin
        .from('organization_invitations')
        .update({ status: 'expired' })
        .eq('token', token)

      return NextResponse.json(
        { success: false, error: 'Invitation has expired' },
        { status: 410 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        email: invitation.email,
        role: invitation.role,
        organization_name: invitation.organizations?.name,
        invited_by_name: invitation.profiles?.full_name || invitation.profiles?.email,
        expires_at: invitation.expires_at
      }
    })
  } catch (error) {
    console.error('Validate invitation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}