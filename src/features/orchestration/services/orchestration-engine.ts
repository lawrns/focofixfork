/**
 * Orchestration Engine - Core workflow execution logic
 * 
 * Manages the 12-phase workflow lifecycle:
 * - createWorkflow: Initialize a new workflow
 * - advancePhase: Execute the next phase by dispatching to ClawdBot
 * - shardPhase: Split a phase into parallel tasks
 * - completePhaseTask: Handle completion of a phase task
 */

import { supabaseAdmin } from '@/lib/supabase-server';
import { dispatchToClawdBot } from '@/lib/delegation/dispatchers';
import {
  OrchestrationWorkflow,
  WorkflowPhase,
  PhaseTask,
  OrchestrationPhaseType,
  CreateWorkflowInput,
  AdvancePhaseResult,
  PHASE_ORDER,
} from '../types';
import { buildPhaseContext, buildPhaseSystemPrompt } from './phase-templates';

const CALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/orchestration/callback`
  : 'http://localhost:3000/api/orchestration/callback';

/**
 * Create a new orchestration workflow with all 12 phases initialized
 */
export async function createWorkflow(
  input: CreateWorkflowInput
): Promise<{ success: boolean; workflow?: OrchestrationWorkflow; error?: string }> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Database not available' };
    }

    // Create the workflow
    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from('orchestration_workflows')
      .insert({
        project_id: input.project_id,
        title: input.title,
        status: 'draft',
        current_phase_idx: 0,
        context_accumulator: input.brain_dump ? { brain_dump: input.brain_dump } : {},
      })
      .select('*')
      .single();

    if (workflowError || !workflow) {
      console.error('[Orchestration] Failed to create workflow:', workflowError);
      return { success: false, error: workflowError?.message || 'Failed to create workflow' };
    }

    // Initialize all 12 phases
    const phases = PHASE_ORDER.map((phaseType, idx) => ({
      workflow_id: workflow.id,
      phase_type: phaseType,
      phase_idx: idx,
      status: idx === 0 ? 'pending' : 'pending',
    }));

    const { error: phasesError } = await supabaseAdmin
      .from('workflow_phases')
      .insert(phases);

    if (phasesError) {
      console.error('[Orchestration] Failed to create phases:', phasesError);
      // Clean up workflow
      await supabaseAdmin.from('orchestration_workflows').delete().eq('id', workflow.id);
      return { success: false, error: phasesError.message };
    }

    return { success: true, workflow: workflow as OrchestrationWorkflow };
  } catch (err) {
    console.error('[Orchestration] Unexpected error creating workflow:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unexpected error' 
    };
  }
}

/**
 * Get a workflow with all its phases
 */
export async function getWorkflowWithPhases(
  workflowId: string
): Promise<{ success: boolean; workflow?: OrchestrationWorkflow & { phases: WorkflowPhase[] }; error?: string }> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Database not available' };
    }

    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from('orchestration_workflows')
      .select(`
        *,
        phases:workflow_phases(*)
      `)
      .eq('id', workflowId)
      .single();

    if (workflowError || !workflow) {
      return { success: false, error: workflowError?.message || 'Workflow not found' };
    }

    return { success: true, workflow: workflow as OrchestrationWorkflow & { phases: WorkflowPhase[] } };
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unexpected error' 
    };
  }
}

/**
 * Advance to the next phase by dispatching to ClawdBot
 */
export async function advancePhase(workflowId: string): Promise<AdvancePhaseResult> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Database not available' };
    }

    // Get workflow with phases
    const { success, workflow, error } = await getWorkflowWithPhases(workflowId);
    if (!success || !workflow) {
      return { success: false, error: error || 'Workflow not found' };
    }

    // Check if workflow can be advanced
    if (workflow.status === 'complete') {
      return { success: false, error: 'Workflow is already complete' };
    }
    if (workflow.status === 'failed') {
      return { success: false, error: 'Workflow has failed' };
    }

    const currentPhaseIdx = workflow.current_phase_idx;
    const currentPhase = workflow.phases.find(p => p.phase_idx === currentPhaseIdx);

    if (!currentPhase) {
      return { success: false, error: 'Current phase not found' };
    }

    // If current phase is already running, can't advance
    if (currentPhase.status === 'running') {
      return { success: false, error: 'Current phase is already running' };
    }

    // Update workflow status to running
    await supabaseAdmin
      .from('orchestration_workflows')
      .update({ status: 'running' })
      .eq('id', workflowId);

    // Update phase status to running
    await supabaseAdmin
      .from('workflow_phases')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', currentPhase.id);

    // Get completed phases for context accumulation
    const completedPhases = workflow.phases.filter(p => p.phase_idx < currentPhaseIdx && p.status === 'complete');

    // Build phase context and prompt
    const phaseContext = buildPhaseContext(workflow, completedPhases);
    const systemPrompt = buildPhaseSystemPrompt(currentPhase.phase_type, phaseContext);

    // Create task ID with m2c1 prefix format: m2c1:{workflowId}:{phaseIdx}
    const taskId = `m2c1:${workflowId}:${currentPhaseIdx}`;

    // Dispatch to ClawdBot
    const dispatchResult = await dispatchToClawdBot({
      taskId,
      title: `${PHASE_ORDER[currentPhaseIdx]} - ${workflow.title}`,
      description: `Execute phase ${currentPhaseIdx + 1} of 12: ${PHASE_ORDER[currentPhaseIdx]}`,
      projectContext: workflow.context_accumulator?.brain_dump as string || '',
      featureContext: `Phase ${currentPhaseIdx + 1} of 12-phase workflow`,
      systemPrompt,
      agentId: 'orchestrator',
      callbackUrl: CALLBACK_URL,
    });

    if (!dispatchResult.success) {
      // Mark phase as failed
      await supabaseAdmin
        .from('workflow_phases')
        .update({ status: 'failed' })
        .eq('id', currentPhase.id);

      await supabaseAdmin
        .from('orchestration_workflows')
        .update({ status: 'failed' })
        .eq('id', workflowId);

      return { 
        success: false, 
        error: dispatchResult.error || 'Failed to dispatch to ClawdBot' 
      };
    }

    // Create phase task record
    const { data: task } = await supabaseAdmin
      .from('phase_tasks')
      .insert({
        phase_id: currentPhase.id,
        title: `${PHASE_ORDER[currentPhaseIdx]} execution`,
        status: 'running',
        external_run_id: dispatchResult.externalRunId,
      })
      .select('*')
      .single();

    return { 
      success: true, 
      phaseId: currentPhase.id,
      taskId: task?.id,
    };
  } catch (err) {
    console.error('[Orchestration] Error advancing phase:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unexpected error' 
    };
  }
}

/**
 * Shard a phase into parallel tasks
 * Useful for phases like implementation where work can be parallelized
 */
export async function shardPhase(
  phaseId: string,
  shards: { title: string; description?: string }[]
): Promise<{ success: boolean; tasks?: PhaseTask[]; error?: string }> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Database not available' };
    }

    // Get phase details
    const { data: phase, error: phaseError } = await supabaseAdmin
      .from('workflow_phases')
      .select(`
        *,
        workflow:orchestration_workflows(*)
      `)
      .eq('id', phaseId)
      .single();

    if (phaseError || !phase) {
      return { success: false, error: phaseError?.message || 'Phase not found' };
    }

    const workflow = phase.workflow as OrchestrationWorkflow;
    const tasks: PhaseTask[] = [];

    for (let i = 0; i < shards.length; i++) {
      const shard = shards[i];
      
      // Create task record
      const { data: task } = await supabaseAdmin
        .from('phase_tasks')
        .insert({
          phase_id: phaseId,
          shard_idx: i,
          title: shard.title,
          status: 'pending',
        })
        .select('*')
        .single();

      if (task) {
        tasks.push(task as PhaseTask);

        // Dispatch to ClawdBot for each shard
        const taskId = `m2c1:${workflow.id}:${phase.phase_idx}:${i}`;
        
        await dispatchToClawdBot({
          taskId,
          title: shard.title,
          description: shard.description,
          projectContext: workflow.context_accumulator?.brain_dump as string || '',
          featureContext: `Shard ${i + 1}/${shards.length} of phase ${phase.phase_type}`,
          systemPrompt: buildPhaseSystemPrompt(phase.phase_type, {
            workflowTitle: workflow.title,
            brainDump: workflow.context_accumulator?.brain_dump as string,
            accumulatedResults: {},
            currentPhaseIdx: phase.phase_idx,
          }),
          agentId: 'orchestrator',
          callbackUrl: CALLBACK_URL,
        });
      }
    }

    return { success: true, tasks };
  } catch (err) {
    console.error('[Orchestration] Error sharding phase:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unexpected error' 
    };
  }
}

/**
 * Complete a phase task and potentially advance the workflow
 */
export async function completePhaseTask(
  taskId: string,
  result: {
    status: 'complete' | 'failed';
    output: Record<string, unknown> | string;
    tokens_in?: number;
    tokens_out?: number;
    cost_usd?: number;
    model?: string;
  }
): Promise<{ success: boolean; workflowAdvanced?: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Database not available' };
    }

    // Get task with phase and workflow
    const { data: task, error: taskError } = await supabaseAdmin
      .from('phase_tasks')
      .select(`
        *,
        phase:workflow_phases(
          *,
          workflow:orchestration_workflows(*)
        )
      `)
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return { success: false, error: taskError?.message || 'Task not found' };
    }

    const phase = task.phase as WorkflowPhase & { workflow: OrchestrationWorkflow };
    const workflow = phase.workflow;

    // Update task
    await supabaseAdmin
      .from('phase_tasks')
      .update({
        status: result.status,
        result: typeof result.output === 'string' ? { output: result.output } : result.output,
      })
      .eq('id', taskId);

    // If task failed, mark phase and workflow as failed
    if (result.status === 'failed') {
      await supabaseAdmin
        .from('workflow_phases')
        .update({ status: 'failed' })
        .eq('id', phase.id);

      await supabaseAdmin
        .from('orchestration_workflows')
        .update({ status: 'failed' })
        .eq('id', workflow.id);

      return { success: true, workflowAdvanced: false };
    }

    // Check if all tasks in this phase are complete
    const { data: pendingTasks } = await supabaseAdmin
      .from('phase_tasks')
      .select('id')
      .eq('phase_id', phase.id)
      .in('status', ['pending', 'running']);

    const allTasksComplete = !pendingTasks || pendingTasks.length === 0;

    if (allTasksComplete) {
      // Aggregate results from all tasks
      const { data: allTasks } = await supabaseAdmin
        .from('phase_tasks')
        .select('result')
        .eq('phase_id', phase.id);

      const aggregatedResult = allTasks?.reduce((
        acc: Record<string, unknown>, 
        t: { result?: Record<string, unknown> | null }
      ) => {
        if (t.result) {
          return { ...acc, ...t.result };
        }
        return acc;
      }, {} as Record<string, unknown>);

      // Update phase as complete
      await supabaseAdmin
        .from('workflow_phases')
        .update({
          status: 'complete',
          result: aggregatedResult,
          artifact: aggregatedResult,
          tokens_in: result.tokens_in || 0,
          tokens_out: result.tokens_out || 0,
          cost_usd: result.cost_usd || 0,
          model: result.model,
          completed_at: new Date().toISOString(),
        })
        .eq('id', phase.id);

      // Update workflow totals and accumulator
      const newAccumulator = {
        ...workflow.context_accumulator,
        [phase.phase_type]: aggregatedResult,
      };

      const newPhaseIdx = phase.phase_idx + 1;
      const isComplete = newPhaseIdx >= PHASE_ORDER.length;

      await supabaseAdmin
        .from('orchestration_workflows')
        .update({
          current_phase_idx: newPhaseIdx,
          context_accumulator: newAccumulator,
          total_cost_usd: (workflow.total_cost_usd || 0) + (result.cost_usd || 0),
          total_tokens_in: (workflow.total_tokens_in || 0) + (result.tokens_in || 0),
          total_tokens_out: (workflow.total_tokens_out || 0) + (result.tokens_out || 0),
          status: isComplete ? 'complete' : workflow.status,
        })
        .eq('id', workflow.id);

      return { success: true, workflowAdvanced: true };
    }

    return { success: true, workflowAdvanced: false };
  } catch (err) {
    console.error('[Orchestration] Error completing phase task:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unexpected error' 
    };
  }
}

/**
 * Skip a phase (mark as skipped and advance)
 */
export async function skipPhase(workflowId: string): Promise<AdvancePhaseResult> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Database not available' };
    }

    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from('orchestration_workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (workflowError || !workflow) {
      return { success: false, error: workflowError?.message || 'Workflow not found' };
    }

    const currentPhaseIdx = workflow.current_phase_idx;

    // Mark current phase as skipped
    await supabaseAdmin
      .from('workflow_phases')
      .update({ status: 'skipped' })
      .eq('workflow_id', workflowId)
      .eq('phase_idx', currentPhaseIdx);

    // Advance workflow
    const newPhaseIdx = currentPhaseIdx + 1;
    const isComplete = newPhaseIdx >= PHASE_ORDER.length;

    await supabaseAdmin
      .from('orchestration_workflows')
      .update({
        current_phase_idx: newPhaseIdx,
        status: isComplete ? 'complete' : workflow.status,
      })
      .eq('id', workflowId);

    return { success: true };
  } catch (err) {
    console.error('[Orchestration] Error skipping phase:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unexpected error' 
    };
  }
}
