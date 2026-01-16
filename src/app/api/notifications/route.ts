import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api/auth-helper';

export const dynamic = 'force-dynamic';import { NotificationsService } from '@/lib/services/notifications';

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Return empty notifications for now - notifications table not in schema
    // TODO: Implement notifications using inbox_items or activity_logs table
    return NextResponse.json({
      success: true,
      data: [],
      total: 0,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: true, data: [], total: 0 },
      { status: 200 }
    );
  }
}
