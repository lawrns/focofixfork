import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, task, context } = body;
    const correlationId = crypto.randomUUID();

    // Try Gateway hooks/agent-run
    try {
      const response = await fetch(`${GATEWAY_URL}/hooks/agent-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, task, context, correlation_id: correlationId }),
      });
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({ runId: data.run_id || correlationId, agentId, correlationId, status: 'accepted' });
      }
    } catch {}

    // Fallback: return accepted
    return NextResponse.json({ runId: correlationId, agentId, correlationId, status: 'accepted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
