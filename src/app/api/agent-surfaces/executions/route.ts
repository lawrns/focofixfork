/**
 * GET /api/agent-surfaces/executions - List executions for an agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api/auth-helper';
import { getAgentExecutions } from '@/features/agent-surfaces';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing agentId parameter' },
        { status: 400 }
      );
    }

    const executions = await getAgentExecutions(agentId, 50);
    return NextResponse.json({ executions });
  } catch (err) {
    console.error('[AgentSurfaces:Executions] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
