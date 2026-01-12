import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'

export type ActivityAction = 'created' | 'updated' | 'completed' | 'deleted' | 'commented' | 'assigned'
export type EntityType = 'task' | 'project' | 'comment' | 'subtask'

export interface LogActivityPayload {
  user_id: string
  entity_type: EntityType
  entity_id: string
  action_type: ActivityAction
  metadata?: Record<string, any>
  project_id?: string
}

export interface ActivityLogEntry {
  id: string
  user_id: string
  entity_type: EntityType
  entity_id: string
  action_type: ActivityAction
  metadata: Record<string, any>
  created_at: string
  project_id?: string
}

export interface ActivityFeedOptions {
  projectId?: string
  limit?: number
  offset?: number
}

/**
 * Log an activity to the activity log table
 */
export async function logActivity(payload: LogActivityPayload): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    // In a real app, this would use a server client
    // For now, we'll return a success response
    const activityEntry = {
      id: `activity-${Date.now()}`,
      ...payload,
      created_at: new Date().toISOString(),
    }

    return {
      success: true,
      data: activityEntry,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Get activity feed for a project or entity
 */
export async function getActivityFeed(options: ActivityFeedOptions): Promise<{ success: boolean; data: ActivityLogEntry[]; error?: string }> {
  try {
    const { projectId, limit = 50, offset = 0 } = options

    // In a real app, this would query the activity_log table
    // For now, return empty array
    return {
      success: true,
      data: [],
    }
  } catch (error: any) {
    return {
      success: false,
      data: [],
      error: error.message,
    }
  }
}

/**
 * Get activity for a specific entity
 */
export async function getEntityActivity(
  entityType: EntityType,
  entityId: string,
  limit = 50
): Promise<{ success: boolean; data: ActivityLogEntry[]; error?: string }> {
  try {
    return {
      success: true,
      data: [],
    }
  } catch (error: any) {
    return {
      success: false,
      data: [],
      error: error.message,
    }
  }
}

/**
 * Log task creation
 */
export async function logTaskCreated(userId: string, taskId: string, projectId: string, metadata: Record<string, any>): Promise<void> {
  await logActivity({
    user_id: userId,
    entity_type: 'task',
    entity_id: taskId,
    action_type: 'created',
    project_id: projectId,
    metadata,
  })
}

/**
 * Log task update
 */
export async function logTaskUpdated(userId: string, taskId: string, projectId: string, metadata: Record<string, any>): Promise<void> {
  await logActivity({
    user_id: userId,
    entity_type: 'task',
    entity_id: taskId,
    action_type: 'updated',
    project_id: projectId,
    metadata,
  })
}

/**
 * Log task completion
 */
export async function logTaskCompleted(userId: string, taskId: string, projectId: string, metadata?: Record<string, any>): Promise<void> {
  await logActivity({
    user_id: userId,
    entity_type: 'task',
    entity_id: taskId,
    action_type: 'completed',
    project_id: projectId,
    metadata: metadata || {},
  })
}

/**
 * Log task deletion
 */
export async function logTaskDeleted(userId: string, taskId: string, projectId: string, metadata: Record<string, any>): Promise<void> {
  await logActivity({
    user_id: userId,
    entity_type: 'task',
    entity_id: taskId,
    action_type: 'deleted',
    project_id: projectId,
    metadata,
  })
}

/**
 * Log comment added
 */
export async function logCommentAdded(userId: string, taskId: string, projectId: string, metadata: Record<string, any>): Promise<void> {
  await logActivity({
    user_id: userId,
    entity_type: 'task',
    entity_id: taskId,
    action_type: 'commented',
    project_id: projectId,
    metadata,
  })
}

/**
 * Log task assignment
 */
export async function logTaskAssigned(userId: string, taskId: string, projectId: string, metadata: Record<string, any>): Promise<void> {
  await logActivity({
    user_id: userId,
    entity_type: 'task',
    entity_id: taskId,
    action_type: 'assigned',
    project_id: projectId,
    metadata,
  })
}
