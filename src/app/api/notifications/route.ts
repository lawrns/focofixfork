import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper';
import { NotificationsService } from '@/lib/services/notifications';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  let authResponse: NextResponse | undefined;
  try {
    const { user, error: authError, response } = await getAuthUser(request);
    authResponse = response;

    if (authError || !user) {
      return mergeAuthResponse(NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ), authResponse);
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const { notifications, total } = await NotificationsService.getNotifications(user.id, {
      is_read: unreadOnly ? [false] : undefined,
      limit,
      offset,
    });

    return mergeAuthResponse(NextResponse.json({
      success: true,
      data: notifications,
      total,
    }), authResponse);
  } catch (err) {
    console.error('Notifications API error:', err);
    return mergeAuthResponse(NextResponse.json(
      { success: true, data: [], total: 0 },
      { status: 200 }
    ), authResponse);
  }
}
