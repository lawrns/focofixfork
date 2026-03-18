/**
 * POST /api/task-intake/callback
 * Callback endpoint for ClawdBot parsing results
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleIntakeCallback } from '@/features/task-intake';
import { authorizeAgentCallback } from '@/lib/security/agent-callback-auth'

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    if (!authorizeAgentCallback(req, rawBody)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = rawBody ? JSON.parse(rawBody) : {};
    
    // ClawdBot sends: task_id (format: "intake:{uuid}"), output, status
    const { task_id, output, status } = body;

    if (!task_id) {
      return NextResponse.json({ error: 'Missing task_id' }, { status: 400 });
    }

    // Parse intake ID from task_id format: "intake:{uuid}"
    const match = task_id.match(/^intake:(.+)$/);
    if (!match) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const intakeId = match[1];

    if (status === 'failed' || status === 'error') {
      // Mark as discarded on failure
      const { discardIntake } = await import('@/features/task-intake');
      await discardIntake(intakeId);
      return NextResponse.json({ ok: true });
    }

    // Process the parsed output
    await handleIntakeCallback(intakeId, output);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[TaskIntake:Callback] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
