import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper';

import { supabase } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic'

// Use untyped supabase client to avoid type instantiation depth issues
const untypedSupabase = supabase as any;

export async function PATCH(request: NextRequest) {
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
      return mergeAuthResponse(NextResponse.json(
        { error: 'Failed to mark notifications as read' },
        { status: 500 }
      ), authResponse);
    }

    const count = data?.length || 0;

    return mergeAuthResponse(NextResponse.json({
      success: true,
      count,
      message: `${count} notification${count !== 1 ? 's' : ''} marked as read`,
    }), authResponse);
  } catch (error) {
    console.error('Error in mark-all-read endpoint:', error);
    return mergeAuthResponse(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ), authResponse);
  }
}
