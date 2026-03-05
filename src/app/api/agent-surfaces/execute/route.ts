/**
 * POST /api/agent-surfaces/execute
 * Execute an action on a surface
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api/auth-helper';
import { dispatchToSurface } from '@/features/agent-surfaces';
import type { SurfaceAction } from '@/features/agent-surfaces/types';
import { isLane, isReadPathAllowedForLane, isWritePathAllowedForLane } from '@/lib/agent-ops/lane-policy';
import type { AgentLane, CustomAgentProfileRow } from '@/lib/agent-ops/types';
import { logClawdActionVisibility } from '@/lib/cofounder-mode/clawd-visibility';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { agentId, action, taskId, lane: laneInput, customAgentId } = body;

    if (!agentId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, action' },
        { status: 400 }
      );
    }

    let lane: AgentLane | null = isLane(laneInput) ? laneInput : null
    if (!lane && typeof customAgentId === 'string' && customAgentId.length > 0) {
      const { data: profile } = await supabase
        .from('custom_agent_profiles')
        .select('id, lane, workspace_id, user_id')
        .eq('id', customAgentId)
        .eq('user_id', user.id)
        .maybeSingle<Pick<CustomAgentProfileRow, 'id' | 'lane' | 'workspace_id' | 'user_id'>>()
      if (profile && isLane(profile.lane)) {
        lane = profile.lane
      }
    }

    if (lane && action && typeof action === 'object' && 'path' in (action as Record<string, unknown>)) {
      const fileAction = action as Record<string, unknown>
      const path = typeof fileAction.path === 'string' ? fileAction.path : ''
      const type = typeof fileAction.type === 'string' ? fileAction.type : ''
      const writeKinds = new Set(['write', 'delete', 'mkdir'])
      const isWrite = writeKinds.has(type)
      const allowed = isWrite ? isWritePathAllowedForLane(lane, path) : isReadPathAllowedForLane(lane, path)

      if (!allowed) {
        await logClawdActionVisibility(supabase, {
          userId: user.id,
          eventType: 'agent_lane_violation_blocked',
          title: 'Lane policy blocked file-system action',
          detail: `${lane} denied ${type} on ${path}`,
          payload: {
            lane,
            action_type: type,
            path,
            agent_id: agentId,
            task_id: taskId ?? null,
          },
        })

        return NextResponse.json(
          { error: `Lane policy denied ${type} on ${path}` },
          { status: 403 }
        );
      }
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
