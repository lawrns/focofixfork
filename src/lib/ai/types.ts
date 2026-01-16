/**
 * AI Tool Executor Types
 * Type definitions for AI tool execution, policies, and audit logging
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Workspace AI Policy
 * Controls which AI tools and actions are allowed in a workspace
 */
export interface WorkspaceAIPolicy {
  allowed_tools: string[]
  allowed_actions: string[]
  auto_apply: boolean
  confidence_threshold: number
  data_sources: string[]
  audit_visible: boolean
  constraints?: {
    allow_task_creation?: boolean
    allow_task_updates?: boolean
    allow_task_deletion?: boolean
    allow_project_access?: boolean
    allow_team_access?: boolean
    require_approval_for_changes?: boolean
    max_tasks_per_operation?: number
  }
}

/**
 * Tool Call Context
 * Contains authentication and policy information for tool execution
 */
export interface ToolCallContext {
  userId: string
  workspaceId: string
  aiPolicy: WorkspaceAIPolicy
  correlationId: string
  supabase: SupabaseClient
  metadata?: Record<string, unknown>
}

/**
 * Tool Call Result
 * Standardized response format for tool execution
 */
export interface ToolCallResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  explanation?: string
  evidence?: string[]
  metadata?: {
    executionTime?: number
    dataSource?: string
    confidence?: number
    [key: string]: unknown
  }
}

/**
 * Tool Definition
 * Defines a tool's metadata and handler
 */
export interface ToolDefinition {
  name: string
  description: string
  category: 'read' | 'write' | 'analyze'
  requiredPermissions?: string[]
  schema?: ToolParameterSchema
  handler: ToolHandler
}

/**
 * Tool Parameter Schema
 * JSON Schema for validating tool arguments
 */
export interface ToolParameterSchema {
  type: 'object'
  properties: Record<string, {
    type: string
    description?: string
    required?: boolean
    enum?: string[]
    items?: Record<string, unknown>
    [key: string]: unknown
  }>
  required?: string[]
}

/**
 * Tool Handler Function
 * Executes the tool with given arguments and context
 */
export type ToolHandler = (
  args: Record<string, unknown>,
  context: ToolCallContext
) => Promise<ToolCallResult>

/**
 * Audit Log Entry
 * Record of a tool execution for compliance and debugging
 */
export interface AuditLogEntry {
  id?: string
  workspace_id: string
  user_id: string
  correlation_id: string
  tool_name: string
  tool_category: 'read' | 'write' | 'analyze'
  arguments: Record<string, unknown>
  result_success: boolean
  result_summary?: string
  error_message?: string
  execution_time_ms: number
  created_at?: string
}

/**
 * Tool Execution Error
 * Specialized error for tool execution failures
 */
export class ToolExecutionError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ToolExecutionError'
  }
}

/**
 * Policy Violation Error
 * Thrown when a tool execution violates workspace policy
 */
export class PolicyViolationError extends ToolExecutionError {
  constructor(
    message: string,
    public policy: string,
    details?: Record<string, unknown>
  ) {
    super('POLICY_VIOLATION', message, details)
    this.name = 'PolicyViolationError'
  }
}

/**
 * Task Query Arguments
 */
export interface QueryTasksArgs {
  filters?: {
    status?: string[]
    priority?: string[]
    assignee_id?: string
    project_id?: string
    type?: string[]
    search?: string
    due_date?: {
      before?: string
      after?: string
    }
  }
  sort?: {
    field: string
    order: 'asc' | 'desc'
  }
  limit?: number
  offset?: number
}

/**
 * Get Task Details Arguments
 */
export interface GetTaskDetailsArgs {
  task_id: string
  include_comments?: boolean
  include_dependencies?: boolean
  include_subtasks?: boolean
}

/**
 * Get Project Overview Arguments
 */
export interface GetProjectOverviewArgs {
  project_id: string
  include_task_breakdown?: boolean
  include_team_members?: boolean
}

/**
 * Get Team Workload Arguments
 */
export interface GetTeamWorkloadArgs {
  workspace_id?: string
  project_id?: string
  time_period?: 'current_week' | 'current_month' | 'custom'
  start_date?: string
  end_date?: string
}

/**
 * Analyze Blockers Arguments
 */
export interface AnalyzeBlockersArgs {
  workspace_id?: string
  project_id?: string
  include_dependencies?: boolean
}
