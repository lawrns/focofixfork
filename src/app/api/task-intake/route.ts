/**
 * GET /api/task-intake - List intake items for current user
 * POST /api/task-intake - Submit new raw text for intake
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api/auth-helper';
import { supabaseAdmin } from '@/lib/supabase-server';
import { submitIntake } from '@/features/task-intake';
import type { TaskIntakeItem } from '@/features/task-intake/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const { data, error: dbError } = await supabaseAdmin
      .from('task_intake_queue')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (dbError) {
      console.error('[TaskIntake:GET] Error:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ items: data as TaskIntakeItem[] });
  } catch (err) {
    console.error('[TaskIntake:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { rawText, projectId } = body;

    if (!rawText?.trim()) {
      return NextResponse.json(
        { error: 'rawText is required' },
        { status: 400 }
      );
    }

    const item = await submitIntake(user.id, rawText, {
      preferredProjectId: projectId,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error('[TaskIntake:POST] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
