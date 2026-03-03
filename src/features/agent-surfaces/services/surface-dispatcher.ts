/**
 * Surface Dispatcher Service
 * Dispatches actions to appropriate surfaces and logs executions
 */

import { supabaseAdmin } from '@/lib/supabase-server';
import { matchSurfaceToTask, updateSurfaceStatus } from './surface-registry';
import { executeBrowserAction } from './browser-surface';
import { executeApiCall } from './api-surface';
import type { 
  AgentSurface, 
  SurfaceAction, 
  SurfaceExecution,
  BrowserAction,
  ApiAction 
} from '../types';

export interface DispatchResult {
  success: boolean;
  executionId?: string;
  output?: Record<string, unknown>;
  error?: string;
  surfaceUsed?: AgentSurface;
}

/**
 * Dispatch an action to the appropriate surface
 */
export async function dispatchToSurface(
  agentId: string,
  action: SurfaceAction,
  taskId?: string,
  options: {
    logExecution?: boolean;
    fallbackToAny?: boolean;
  } = {}
): Promise<DispatchResult> {
  const { logExecution = true } = options;

  // Find best matching surface
  const match = await matchSurfaceToTask(agentId, action);
  
  if (!match) {
    return {
      success: false,
      error: `No suitable surface found for action on agent ${agentId}`,
    };
  }

  // Mark surface as busy
  await updateSurfaceStatus(match.surface.id, 'busy');

  // Log execution start
  let execution: SurfaceExecution | null = null;
  if (logExecution) {
    execution = await logExecutionStart(match.surface.id, agentId, taskId, action);
  }

  try {
    // Execute based on surface type
    let result: { success: boolean; data?: Record<string, unknown>; error?: string };

    switch (match.surface.surface_type) {
      case 'browser':
        result = await executeBrowserAction(action as BrowserAction);
        break;
      
      case 'api':
        result = await executeApiCall(action as ApiAction);
        break;
      
      case 'file_system':
        result = await executeFileSystemAction(action as any);
        break;
      
      case 'communication':
        result = await executeCommunicationAction(action as any);
        break;
      
      case 'calendar':
        result = await executeCalendarAction(action as any);
        break;
      
      default:
        result = { success: false, error: `Unknown surface type: ${match.surface.surface_type}` };
    }

    // Update execution log
    if (execution) {
      await logExecutionComplete(execution.id, result.success, result.data, result.error);
    }

    // Mark surface as available
    await updateSurfaceStatus(match.surface.id, 'available');

    return {
      success: result.success,
      executionId: execution?.id,
      output: result.data,
      error: result.error,
      surfaceUsed: match.surface,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (execution) {
      await logExecutionComplete(execution.id, false, undefined, errorMessage);
    }
    
    await updateSurfaceStatus(match.surface.id, 'available');

    return {
      success: false,
      executionId: execution?.id,
      error: errorMessage,
      surfaceUsed: match.surface,
    };
  }
}

/**
 * Log execution start
 */
async function logExecutionStart(
  surfaceId: string,
  agentId: string,
  taskId: string | undefined,
  action: SurfaceAction
): Promise<SurfaceExecution | null> {
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin
    .from('surface_executions')
    .insert({
      surface_id: surfaceId,
      agent_id: agentId,
      task_id: taskId,
      action: (action as any).type || 'unknown',
      input: action,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[SurfaceDispatcher] Log start error:', error);
    return null;
  }

  return data as SurfaceExecution;
}

/**
 * Log execution completion
 */
async function logExecutionComplete(
  executionId: string,
  success: boolean,
  output?: Record<string, unknown>,
  errorMessage?: string
): Promise<void> {
  if (!supabaseAdmin) return;

  await supabaseAdmin
    .from('surface_executions')
    .update({
      status: success ? 'complete' : 'failed',
      output: output || {},
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', executionId);
}

/**
 * Placeholder for file system actions (server-side only)
 */
async function executeFileSystemAction(action: any): Promise<any> {
  // File system actions should be handled server-side with proper sandboxing
  return {
    success: false,
    error: 'File system actions not implemented in this environment',
  };
}

/**
 * Placeholder for communication actions
 */
async function executeCommunicationAction(action: any): Promise<any> {
  // Communication actions integrate with email/Slack/Discord APIs
  return {
    success: false,
    error: 'Communication actions not implemented in this environment',
  };
}

/**
 * Placeholder for calendar actions
 */
async function executeCalendarAction(action: any): Promise<any> {
  // Calendar actions integrate with Google Calendar, Outlook, etc.
  return {
    success: false,
    error: 'Calendar actions not implemented in this environment',
  };
}

/**
 * Get recent executions for an agent
 */
export async function getAgentExecutions(
  agentId: string,
  limit: number = 50
): Promise<SurfaceExecution[]> {
  if (!supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from('surface_executions')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[SurfaceDispatcher] Get executions error:', error);
    return [];
  }

  return data as SurfaceExecution[];
}

/**
 * Get execution statistics
 */
export async function getExecutionStats(
  agentId?: string
): Promise<{
  total: number;
  successRate: number;
  bySurface: Record<string, number>;
  recent: SurfaceExecution[];
}> {
  if (!supabaseAdmin) {
    return { total: 0, successRate: 0, bySurface: {}, recent: [] };
  }

  let query = supabaseAdmin
    .from('surface_executions')
    .select('*');

  if (agentId) {
    query = query.eq('agent_id', agentId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return { total: 0, successRate: 0, bySurface: {}, recent: [] };
  }

  const total = data.length;
  const complete = data.filter((e: any) => e.status === 'complete').length;
  const successRate = total > 0 ? (complete / total) * 100 : 0;

  const bySurface: Record<string, number> = {};
  for (const exec of data as any[]) {
    bySurface[exec.surface_id] = (bySurface[exec.surface_id] || 0) + 1;
  }

  return {
    total,
    successRate,
    bySurface,
    recent: data.slice(0, 10) as SurfaceExecution[],
  };
}
