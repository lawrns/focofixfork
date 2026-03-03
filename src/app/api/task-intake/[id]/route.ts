/**
 * PATCH /api/task-intake/[id] - Update intake item (convert, discard, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api/auth-helper';
import { supabaseAdmin } from '@/lib/supabase-server';
import { convertIntakeToTask, discardIntake } from '@/features/task-intake';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { user, error } = await getAuthUser(req);
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    // Verify ownership
    const { data: item, error: fetchError } = await supabaseAdmin
      .from('task_intake_queue')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (item.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { action, overrides } = body;

    switch (action) {
      case 'convert': {
        const taskId = await convertIntakeToTask(id, overrides || {});
        if (!taskId) {
          return NextResponse.json(
            { error: 'Failed to create task' },
            { status: 500 }
          );
        }
        return NextResponse.json({ success: true, taskId });
      }

      case 'discard': {
        await discardIntake(id);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error('[TaskIntake:PATCH] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
