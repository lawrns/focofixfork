import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { NotificationsService } from '@/lib/services/notifications'
import { authRequiredResponse, successResponse, notFoundResponse, databaseErrorResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function PATCH(
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

    // Mark notification as read
    const notification = await NotificationsService.markAsRead(notificationId, user.id)

    return mergeAuthResponse(successResponse(notification, undefined, 200), authResponse)
  } catch (err: any) {
    console.error('Mark notification as read error:', err)

    // Handle PGRST116 error (not found)
    if (err.code === 'PGRST116') {
      return mergeAuthResponse(notFoundResponse('Notification not found'), await getAuthUser(req).then(r => r.response))
    }

    return databaseErrorResponse('Failed to mark notification as read', err)
  }
}
