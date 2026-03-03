/**
 * POST /api/agent-surfaces/execute
 * Execute an action on a surface
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api/auth-helper';
import { dispatchToSurface } from '@/features/agent-surfaces';
import type { SurfaceAction } from '@/features/agent-surfaces/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { agentId, action, taskId } = body;

    if (!agentId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, action' },
        { status: 400 }
      );
    }

    const result = await dispatchToSurface(
      agentId,
      action as SurfaceAction,
      taskId,
      { logExecution: true }
    );

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          surfaceUsed: result.surfaceUsed,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      executionId: result.executionId,
      output: result.output,
      surfaceUsed: result.surfaceUsed,
    });
  } catch (err) {
    console.error('[AgentSurfaces:Execute] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
