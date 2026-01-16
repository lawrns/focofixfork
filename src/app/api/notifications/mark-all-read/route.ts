import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api/auth-helper';

export const dynamic = 'force-dynamic'
import { supabase } from '@/lib/supabase-client';

// Use untyped supabase client to avoid type instantiation depth issues
const untypedSupabase = supabase as any;

export async function PATCH(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Update ALL unread inbox items (notifications) for the user
    const { data, error } = await untypedSupabase
      .from('inbox_items')
      .update({
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .select('id');

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return NextResponse.json(
        { error: 'Failed to mark notifications as read' },
        { status: 500 }
      );
    }

    const count = data?.length || 0;

    return NextResponse.json({
      success: true,
      count,
      message: `${count} notification${count !== 1 ? 's' : ''} marked as read`,
    });
  } catch (error) {
    console.error('Error in mark-all-read endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
