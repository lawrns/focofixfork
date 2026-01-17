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

    // Return empty notifications for now - notifications table not in schema
    // TODO: Implement notifications using inbox_items or activity_logs table
    return mergeAuthResponse(NextResponse.json({
      success: true,
      data: [],
      total: 0,
    }), authResponse);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return mergeAuthResponse(NextResponse.json(
      { success: true, data: [], total: 0 },
      { status: 200 }
    ), authResponse);
  }
}
