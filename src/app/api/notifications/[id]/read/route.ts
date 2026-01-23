import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { NotificationsService } from '@/lib/services/notifications'
import { authRequiredResponse, successResponse, notFoundResponse, databaseErrorResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Capture authResponse for use in catch block
  const authResult = await getAuthUser(req)
  const { user, error, response: authResponse } = authResult

  if (error || !user) {
    return mergeAuthResponse(authRequiredResponse(), authResponse)
  }

  const { id: notificationId } = await params

  try {
    if (!notificationId) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 }
      ), authResponse)
    }

    // Mark notification as read
    const notification = await NotificationsService.markAsRead(notificationId, user.id)

    return mergeAuthResponse(successResponse(notification, undefined, 200), authResponse)
  } catch (err: any) {
    console.error('Mark notification as read error:', err)

    // Handle PGRST116 error (not found)
    if (err.code === 'PGRST116') {
      return mergeAuthResponse(notFoundResponse('Notification', notificationId), authResponse)
    }

    return mergeAuthResponse(databaseErrorResponse('Failed to mark notification as read', err), authResponse)
  }
}
