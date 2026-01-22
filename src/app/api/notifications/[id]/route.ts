import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { supabase } from '@/lib/supabase-client'
import { authRequiredResponse, successResponse, notFoundResponse, databaseErrorResponse, forbiddenResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

// DELETE /api/notifications/[id] - Delete a notification
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const notificationId = params.id

    if (!notificationId) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 }
      ), authResponse)
    }

    // First verify the notification belongs to the user
    const { data: existingNotification, error: fetchError } = await supabase
      .from('inbox_items')
      .select('id, user_id')
      .eq('id', notificationId)
      .maybeSingle()

    if (fetchError) {
      return databaseErrorResponse('Failed to fetch notification', fetchError)
    }

    if (!existingNotification) {
      return mergeAuthResponse(notFoundResponse('Notification not found'), authResponse)
    }

    if (existingNotification.user_id !== user.id) {
      return mergeAuthResponse(forbiddenResponse('You can only delete your own notifications'), authResponse)
    }

    // Delete the notification
    const { error: deleteError } = await supabase
      .from('inbox_items')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id)

    if (deleteError) {
      return databaseErrorResponse('Failed to delete notification', deleteError)
    }

    return mergeAuthResponse(successResponse({
      id: notificationId,
      deleted: true
    }), authResponse)
  } catch (err: any) {
    console.error('Delete notification error:', err)
    return databaseErrorResponse('Failed to delete notification', err)
  }
}
