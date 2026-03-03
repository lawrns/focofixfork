/**
 * POST /api/orchestration/[id]/advance - Advance workflow to next phase
 * Body: { skip?: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { advancePhase, skipPhase } from '@/features/orchestration/services/orchestration-engine';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { skip = false } = body;

    let result;

    if (skip) {
      result = await skipPhase(id);
    } else {
      result = await advancePhase(id);
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to advance phase' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      phaseId: result.phaseId,
      taskId: result.taskId,
    });
  } catch (err) {
    console.error('[Orchestration:API] Error advancing phase:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
