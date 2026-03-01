import { supabaseAdmin } from '@/lib/supabase-server'

export type DelegationStatus = 'none' | 'pending' | 'delegated' | 'running' | 'completed' | 'failed' | 'cancelled'
export type AgentType = 'codex' | 'claude-code' | 'pi' | 'auto' | 'bosun'

export interface DelegationResult {
  success: boolean
  runId?: string
  taskId?: string
  error?: string
}

export interface TimelineItem {
  id: string
  type: 'ledger' | 'run'
  timestamp: string
  entity_type: string
  entity_id: string
  title: string
  description: string | null
  actor_id: string | null
  actor_name: string | null
  metadata: Record<string, unknown>
  run_id: string | null
  run_status: string | null
  artifact_count: number
}

export class DelegationService {
  static async delegateTask(
    taskId: string,
    agentType: AgentType,
    userId: string,
    options?: { instructions?: string; timeoutMinutes?: number; requireApproval?: boolean }
  ): Promise<DelegationResult> {
    try {
      const { data: run, error: runError } = await supabaseAdmin
        .from('runs')
        .insert({
          runner: agentType,
          status: 'pending',
          task_id: taskId,
          trace: {
            description: 'Delegated task',
            instructions: options?.instructions,
            delegated_by: userId,
            delegated_at: new Date().toISOString()
          }
        })
        .select()
        .single()

      if (runError || !run) {
        return { success: false, error: 'Failed to create run' }
      }

      const { error: updateError } = await supabaseAdmin
        .from('work_items')
        .update({
          delegation_status: 'pending',  // Engine will pick this up and dispatch
          assigned_agent: agentType,
          run_id: run.id,
          approval_required: options?.requireApproval ?? false,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (updateError) {
        await supabaseAdmin.from('runs').delete().eq('id', run.id)
        return { success: false, error: 'Failed to update task' }
      }

      return { success: true, runId: run.id, taskId }
    } catch (error: any) {
      return { success: false, error: error.message || 'Delegation failed' }
    }
  }

  static async cancelDelegation(taskId: string, userId: string): Promise<DelegationResult> {
    const { data: task } = await supabaseAdmin
      .from('work_items')
      .select('run_id')
      .eq('id', taskId)
      .single()

    if (task?.run_id) {
      await supabaseAdmin
        .from('runs')
        .update({ status: 'cancelled', ended_at: new Date().toISOString() })
        .eq('id', task.run_id)
    }

    await supabaseAdmin
      .from('work_items')
      .update({ delegation_status: 'cancelled', assigned_agent: null, run_id: null })
      .eq('id', taskId)

    return { success: true, taskId }
  }

  static async getProjectTimeline(projectId: string, options?: { limit?: number; offset?: number }): Promise<TimelineItem[]> {
    const { data, error } = await supabaseAdmin.rpc('get_project_timeline', {
      p_project_id: projectId,
      p_limit: options?.limit || 50,
      p_offset: options?.offset || 0
    })

    if (error) return []
    return (data || []).map((item: any) => ({
      id: item.id,
      type: item.type,
      timestamp: item.timestamp,
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      title: item.title,
      description: item.description,
      actor_id: item.actor_id,
      actor_name: item.actor_name,
      metadata: item.metadata || {},
      run_id: item.run_id,
      run_status: item.run_status,
      artifact_count: Number(item.artifact_count) || 0
    }))
  }
}

export default DelegationService
