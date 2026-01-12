import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api/auth-helper';
import { NotificationsService } from '@/lib/services/notifications';

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const isReadParam = searchParams.get('is_read');
    const typeParam = searchParams.get('type');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    // Parse filters
    const filters: any = {};

    if (isReadParam) {
      filters.is_read = isReadParam === 'true' ? [true] : isReadParam === 'false' ? [false] : [true, false];
    }

    if (typeParam) {
      filters.type = typeParam.split(',');
    }

    if (limitParam) {
      filters.limit = parseInt(limitParam, 10);
    }

    if (offsetParam) {
      filters.offset = parseInt(offsetParam, 10);
    }

    // Fetch notifications
    const { notifications, total } = await NotificationsService.getNotifications(user.id, filters);

    // Transform to API format
    const data = notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.message,
      is_read: n.is_read,
      actor: n.data?.actor_name ? {
        full_name: n.data.actor_name,
        avatar: n.data.actor_avatar,
      } : {
        full_name: 'System',
      },
      project: n.data?.metadata?.project ? {
        name: n.data.metadata.project.name,
        color: n.data.metadata.project.color,
      } : undefined,
      work_item: n.data?.metadata?.work_item ? {
        title: n.data.metadata.work_item.title,
      } : undefined,
      created_at: n.created_at,
    }));

    return NextResponse.json({
      success: true,
      data,
      total,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
