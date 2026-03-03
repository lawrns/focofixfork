/**
 * Task Intake Parse API Route
 * POST: Quick parse endpoint for live preview while typing
 * Returns streaming SSE response for real-time feedback
 */

import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/api/auth-helper';
import { streamParseIntake } from '@/features/task-intake/services/intake-processor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/task-intake/parse
 * Body: { raw_text: string, project_context?: string }
 * Returns: SSE stream with parsed result
 */
export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser(req);
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { raw_text?: string; project_context?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { raw_text, project_context } = body;

  if (!raw_text?.trim()) {
    return new Response(
      JSON.stringify({ error: 'raw_text is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Stream the parsing result
    const stream = await streamParseIntake(raw_text, project_context);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[TaskIntakeParse] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Parsing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
