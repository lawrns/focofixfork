/**
 * Audit Repository
 * Logs admin actions and batch operations for compliance and debugging
 */

import { BaseRepository, Result, Ok, Err } from './base-repository'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AuditLog {
  id: string
  user_id: string
  workspace_id: string | null
  action: string
  entity_type: string
  entity_ids: string[]
  details: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface CreateAuditLogData {
  user_id: string
  workspace_id?: string | null
  action: string
  entity_type: string
  entity_ids: string[]
  details?: Record<string, unknown>
  ip_address?: string | null
  user_agent?: string | null
}

export class AuditRepository extends BaseRepository<AuditLog> {
  protected table = 'audit_logs'

  constructor(supabase: SupabaseClient) {
    super(supabase)
  }

  /**
   * Log an audit event
   */
  async logAction(data: CreateAuditLogData): Promise<Result<AuditLog>> {
    const logData = {
      user_id: data.user_id,
      workspace_id: data.workspace_id || null,
      action: data.action,
      entity_type: data.entity_type,
      entity_ids: data.entity_ids,
      details: data.details || {},
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
      created_at: new Date().toISOString(),
    }

    const { data: result, error } = await this.supabase
      .from(this.table)
      .insert(logData)
      .select()
      .single()

    if (error) {
      console.error('[AuditLog] Failed to log action:', error)
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to create audit log',
        details: error,
      })
    }

    return Ok(result as AuditLog)
  }

  /**
   * Get audit logs for a workspace
   */
  async getByWorkspace(
    workspaceId: string,
    options?: {
      limit?: number
      offset?: number
      action?: string
      entityType?: string
    }
  ): Promise<Result<AuditLog[]>> {
    let query = this.supabase
      .from(this.table)
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (options?.action) {
      query = query.eq('action', options.action)
    }
    if (options?.entityType) {
      query = query.eq('entity_type', options.entityType)
    }
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch audit logs',
        details: error,
      })
    }

    return Ok((data || []) as AuditLog[])
  }

  /**
   * Get audit logs for a user
   */
  async getByUser(
    userId: string,
    options?: {
      limit?: number
      offset?: number
    }
  ): Promise<Result<AuditLog[]>> {
    const limit = options?.limit || 50
    const offset = options?.offset || 0

    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch audit logs for user',
        details: error,
      })
    }

    return Ok((data || []) as AuditLog[])
  }
}
