/**
 * CRICO Project Suggestion Dismiss API
 * Marks a suggestion as dismissed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api/auth-helper';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Service unavailable' }, { status: 503 });
    }

    const { id: projectId, sid } = await params;

    const { error: updateError } = await supabaseAdmin
      .from('crico_project_suggestions')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', sid)
      .eq('project_id', projectId);

    if (updateError) {
      console.error('[CRICO dismiss] update error:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to dismiss suggestion' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[CRICO dismiss] unexpected error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
