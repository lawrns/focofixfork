import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; invitationId: string } }
) {
  try {
    // Extract user ID from headers (set by middleware)
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id: organizationId, invitationId } = params

    // Update invitation status to cancelled
    const { error } = await supabaseAdmin
      .from('organization_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId)
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Cancel invitation error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to cancel invitation' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully'
    })
  } catch (error) {
    console.error('Cancel invitation API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}