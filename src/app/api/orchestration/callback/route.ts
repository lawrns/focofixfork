/**
 * POST /api/orchestration/callback
 * Called by ClawdBot when an orchestration phase completes.
 * Routes based on m2c1:{workflowId}:{phaseIdx} pattern in task_id.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { completePhaseTask } from '@/features/orchestration/services/orchestration-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ ok: false, error: 'DB not available' }, { status: 500 });
    }

    const body = await req.json();
    // ClawdBot sends: run_id (external), status, output, task_id, tokens_in, tokens_out, cost_usd, model, completed_at
    // task_id format: m2c1:{workflow_id}:{phase_idx} or m2c1:{workflow_id}:{phase_idx}:{shard_idx}
    const { 
      task_id, 
      status, 
      output, 
      tokens_in, 
      tokens_out, 
      cost_usd, 
      model, 
      completed_at 
    } = body;

    if (!task_id) {
      return NextResponse.json({ ok: false, error: 'Missing task_id' }, { status: 400 });
    }

    // Parse m2c1 routing from task_id
    // Format: m2c1:{workflow_id}:{phase_idx} or m2c1:{workflow_id}:{phase_idx}:{shard_idx}
    const match = task_id.match(/^m2c1:([^:]+):(\d+)(?::(\d+))?$/);
    if (!match) {
      // Not an orchestration callback — ignore silently
      return NextResponse.json({ ok: true, skipped: true });
    }

    const workflowId = match[1];
    const phaseIdx = parseInt(match[2], 10);
    const shardIdx = match[3] ? parseInt(match[3], 10) : undefined;

    console.log('[Orchestration:callback] Received callback:', {
      workflowId,
      phaseIdx,
      shardIdx,
      status,
    });

    // Handle failed status
    if (status === 'failed' || status === 'error') {
      // Find the phase and mark it as failed
      const { data: phase } = await supabaseAdmin
        .from('workflow_phases')
        .select('id')
        .eq('workflow_id', workflowId)
        .eq('phase_idx', phaseIdx)
        .single();

      if (phase) {
        await supabaseAdmin
          .from('workflow_phases')
          .update({ status: 'failed' })
          .eq('id', phase.id);

        await supabaseAdmin
          .from('orchestration_workflows')
          .update({ status: 'failed' })
          .eq('id', workflowId);
      }

      return NextResponse.json({ ok: true });
    }

    // Parse output JSON
    let parsedOutput: Record<string, unknown> | string;
    try {
      parsedOutput = typeof output === 'string' ? JSON.parse(output) : output;
    } catch {
      // If not valid JSON, use as string
      parsedOutput = typeof output === 'string' ? output : JSON.stringify(output);
    }

    // Find the phase
    const { data: phase, error: phaseError } = await supabaseAdmin
      .from('workflow_phases')
      .select('id')
      .eq('workflow_id', workflowId)
      .eq('phase_idx', phaseIdx)
      .single();

    if (phaseError || !phase) {
      console.error('[Orchestration:callback] Phase not found:', { workflowId, phaseIdx });
      return NextResponse.json(
        { ok: false, error: 'Phase not found' },
        { status: 404 }
      );
    }

    // Find the task (either by external_run_id or find/create one)
    // First, try to find by matching phase and running status
    let { data: task } = await supabaseAdmin
      .from('phase_tasks')
      .select('id')
      .eq('phase_id', phase.id)
      .eq('status', 'running')
      .maybeSingle();

    // If no running task found and this is a shard, look for pending tasks
    if (!task && shardIdx !== undefined) {
      const { data: shardTask } = await supabaseAdmin
        .from('phase_tasks')
        .select('id')
        .eq('phase_id', phase.id)
        .eq('shard_idx', shardIdx)
        .maybeSingle();
      
      if (shardTask) {
        task = shardTask;
      }
    }

    // If still no task, create one
    if (!task) {
      const { data: newTask } = await supabaseAdmin
        .from('phase_tasks')
        .insert({
          phase_id: phase.id,
          shard_idx: shardIdx ?? 0,
          title: `Phase ${phaseIdx} execution`,
          status: 'running',
        })
        .select('id')
        .single();
      
      task = newTask;
    }

    if (!task) {
      return NextResponse.json(
        { ok: false, error: 'Could not find or create task' },
        { status: 500 }
      );
    }

    // Complete the phase task
    const result = await completePhaseTask(task.id, {
      status: 'complete',
      output: parsedOutput,
      tokens_in: tokens_in ?? 0,
      tokens_out: tokens_out ?? 0,
      cost_usd: cost_usd ?? 0,
      model,
    });

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 500 }
      );
    }

    console.log('[Orchestration:callback] Phase completed:', {
      workflowId,
      phaseIdx,
      workflowAdvanced: result.workflowAdvanced,
    });

    return NextResponse.json({ 
      ok: true, 
      workflowAdvanced: result.workflowAdvanced,
    });
  } catch (err) {
    console.error('[Orchestration:callback] Unexpected error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
