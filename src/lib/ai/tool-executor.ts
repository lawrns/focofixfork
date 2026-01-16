/**
 * AI Tool Executor
 * Enforces admin policies and executes Foco API tools
 *
 * Architecture:
 * - Policy enforcement before execution
 * - Delegated access (uses user's Supabase client)
 * - Comprehensive audit logging
 * - Type-safe tool handlers
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { TaskRepository, type Task } from '../repositories/task-repository'
import { ProjectRepository, type Project } from '../repositories/project-repository'
import { WorkspaceRepository } from '../repositories/workspace-repository'
import { isError } from '../repositories/base-repository'
import {
  type WorkspaceAIPolicy,
  type ToolCallContext,
  type ToolCallResult,
  type ToolDefinition,
  type AuditLogEntry,
  ToolExecutionError,
  PolicyViolationError,
  type QueryTasksArgs,
  type GetTaskDetailsArgs,
  type GetProjectOverviewArgs,
  type GetTeamWorkloadArgs,
  type AnalyzeBlockersArgs,
} from './types'

/**
 * Main Tool Executor
 * Validates policies and executes tools with audit logging
 */
export class ToolExecutor {
  private tools: Map<string, ToolDefinition> = new Map()

  constructor() {
    this.registerTools()
  }

  /**
   * Execute a tool call with policy enforcement and audit logging
   */
  async executeToolCall<T = unknown>(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<ToolCallResult<T>> {
    const startTime = Date.now()

    try {
      // 1. Check if tool exists
      const tool = this.tools.get(toolName)
      if (!tool) {
        throw new ToolExecutionError(
          'TOOL_NOT_FOUND',
          `Tool '${toolName}' does not exist`,
          { toolName, availableTools: Array.from(this.tools.keys()) }
        )
      }

      // 2. Enforce policy checks
      await this.enforcePolicies(tool, args, context)

      // 3. Validate arguments against schema
      if (tool.schema) {
        this.validateArguments(args, tool.schema)
      }

      // 4. Execute the tool handler
      const result = await tool.handler(args, context) as ToolCallResult<T>

      // 5. Log successful execution
      await this.logAudit({
        workspace_id: context.workspaceId,
        user_id: context.userId,
        correlation_id: context.correlationId,
        tool_name: toolName,
        tool_category: tool.category,
        arguments: this.redactSensitiveArgs(args),
        result_success: true,
        result_summary: this.summarizeResult(result),
        execution_time_ms: Date.now() - startTime,
      }, context.supabase)

      return result

    } catch (error) {
      // Log failed execution
      await this.logAudit({
        workspace_id: context.workspaceId,
        user_id: context.userId,
        correlation_id: context.correlationId,
        tool_name: toolName,
        tool_category: this.tools.get(toolName)?.category || 'read',
        arguments: this.redactSensitiveArgs(args),
        result_success: false,
        error_message: error instanceof Error ? error.message : String(error),
        execution_time_ms: Date.now() - startTime,
      }, context.supabase)

      // Return error result
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        explanation: this.getErrorExplanation(error),
      }
    }
  }

  /**
   * Enforce policy checks before tool execution
   */
  private async enforcePolicies(
    tool: ToolDefinition,
    args: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<void> {
    const { aiPolicy } = context

    // Check 1: Tool must be in allowed_tools list
    if (!aiPolicy.allowed_tools.includes(tool.name) && !aiPolicy.allowed_tools.includes('*')) {
      throw new PolicyViolationError(
        `Tool '${tool.name}' is not allowed by workspace policy`,
        'allowed_tools',
        { tool: tool.name, allowedTools: aiPolicy.allowed_tools }
      )
    }

    // Check 2: For write tools, check constraints
    if (tool.category === 'write' && aiPolicy.constraints) {
      const constraints = aiPolicy.constraints

      // Check specific write permissions
      if (tool.name === 'create_task' && constraints.allow_task_creation === false) {
        throw new PolicyViolationError(
          'Task creation is disabled by workspace policy',
          'allow_task_creation'
        )
      }

      if (tool.name === 'update_task' && constraints.allow_task_updates === false) {
        throw new PolicyViolationError(
          'Task updates are disabled by workspace policy',
          'allow_task_updates'
        )
      }

      if (tool.name === 'delete_task' && constraints.allow_task_deletion === false) {
        throw new PolicyViolationError(
          'Task deletion is disabled by workspace policy',
          'allow_task_deletion'
        )
      }

      // Check max tasks per operation
      if (constraints.max_tasks_per_operation) {
        const taskCount = this.countTasksInArgs(args)
        if (taskCount > constraints.max_tasks_per_operation) {
          throw new PolicyViolationError(
            `Operation would affect ${taskCount} tasks, but policy limits to ${constraints.max_tasks_per_operation}`,
            'max_tasks_per_operation',
            { taskCount, limit: constraints.max_tasks_per_operation }
          )
        }
      }

      // Check if approval is required
      if (constraints.require_approval_for_writes === true) {
        throw new PolicyViolationError(
          'Write operations require manual approval',
          'require_approval_for_writes'
        )
      }
    }

    // Check 3: Verify required permissions
    if (tool.requiredPermissions && tool.requiredPermissions.length > 0) {
      // For Phase 1, all tools use user's own permissions via RLS
      // In future phases, this can be extended for role-based checks
    }
  }

  /**
   * Validate arguments against tool schema
   */
  private validateArguments(
    args: Record<string, unknown>,
    schema: ToolDefinition['schema']
  ): void {
    if (!schema) return

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in args) || args[field] === undefined) {
          throw new ToolExecutionError(
            'INVALID_ARGUMENTS',
            `Required field '${field}' is missing`,
            { field, providedArgs: Object.keys(args) }
          )
        }
      }
    }

    // Validate field types (basic validation)
    for (const [field, value] of Object.entries(args)) {
      const fieldSchema = schema.properties[field]
      if (!fieldSchema) {
        // Unknown field - allow for forward compatibility
        continue
      }

      if (value !== null && value !== undefined) {
        const actualType = Array.isArray(value) ? 'array' : typeof value
        if (fieldSchema.type !== actualType && fieldSchema.type !== 'any') {
          throw new ToolExecutionError(
            'INVALID_ARGUMENTS',
            `Field '${field}' has type '${actualType}' but expected '${fieldSchema.type}'`,
            { field, actualType, expectedType: fieldSchema.type }
          )
        }
      }
    }
  }

  /**
   * Log audit entry to activity_log table
   */
  private async logAudit(
    entry: AuditLogEntry,
    supabase: SupabaseClient
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('activity_log')
        .insert({
          workspace_id: entry.workspace_id,
          entity_type: 'ai_tool_execution',
          entity_id: entry.correlation_id,
          action: `ai_tool:${entry.tool_name}`,
          changes: {
            tool_name: entry.tool_name,
            tool_category: entry.tool_category,
            arguments: entry.arguments,
            result_success: entry.result_success,
            result_summary: entry.result_summary,
            error_message: entry.error_message,
            execution_time_ms: entry.execution_time_ms,
          },
          user_id: entry.user_id,
          is_ai_action: true,
          can_undo: false,
        })

      if (error) {
        console.error('Failed to log audit entry:', error)
        // Don't throw - audit logging failures shouldn't block tool execution
      }
    } catch (error) {
      console.error('Exception during audit logging:', error)
      // Don't throw - audit logging failures shouldn't block tool execution
    }
  }

  /**
   * Redact sensitive information from arguments for logging
   */
  private redactSensitiveArgs(args: Record<string, unknown>): Record<string, unknown> {
    const redacted = { ...args }
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'api_key']

    for (const key of Object.keys(redacted)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        redacted[key] = '[REDACTED]'
      }
    }

    return redacted
  }

  /**
   * Summarize result for audit log
   */
  private summarizeResult(result: ToolCallResult): string | undefined {
    if (!result.success) {
      return `Error: ${result.error}`
    }

    if (result.explanation) {
      return result.explanation
    }

    if (result.data) {
      if (Array.isArray(result.data)) {
        return `Returned ${result.data.length} items`
      }
      if (typeof result.data === 'object' && result.data !== null) {
        return `Returned object with ${Object.keys(result.data).length} properties`
      }
    }

    return 'Success'
  }

  /**
   * Get user-friendly error explanation
   */
  private getErrorExplanation(error: unknown): string {
    if (error instanceof PolicyViolationError) {
      return `This action is blocked by your workspace's AI policy. Contact a workspace admin to enable '${error.policy}'.`
    }

    if (error instanceof ToolExecutionError) {
      return error.message
    }

    if (error instanceof Error) {
      return error.message
    }

    return 'An unexpected error occurred while executing this tool.'
  }

  /**
   * Count how many tasks would be affected by an operation
   */
  private countTasksInArgs(args: Record<string, unknown>): number {
    // For batch operations
    if (args.task_ids && Array.isArray(args.task_ids)) {
      return args.task_ids.length
    }

    // For single task operations
    if (args.task_id) {
      return 1
    }

    // Default to 1 for other operations
    return 1
  }

  /**
   * Register all available tools
   */
  private registerTools(): void {
    // Read-only tools for Phase 1
    this.tools.set('query_tasks', {
      name: 'query_tasks',
      description: 'Query tasks with filters and pagination',
      category: 'read',
      schema: {
        type: 'object',
        properties: {
          filters: {
            type: 'object',
            description: 'Filter criteria for tasks',
          },
          sort: {
            type: 'object',
            description: 'Sort configuration',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results',
          },
          offset: {
            type: 'number',
            description: 'Pagination offset',
          },
        },
      },
      handler: this.handleQueryTasks.bind(this),
    })

    this.tools.set('get_task_details', {
      name: 'get_task_details',
      description: 'Get detailed information about a specific task',
      category: 'read',
      schema: {
        type: 'object',
        properties: {
          task_id: {
            type: 'string',
            description: 'Task ID',
            required: true,
          },
          include_comments: {
            type: 'boolean',
            description: 'Include task comments',
          },
          include_dependencies: {
            type: 'boolean',
            description: 'Include task dependencies',
          },
          include_subtasks: {
            type: 'boolean',
            description: 'Include subtasks',
          },
        },
        required: ['task_id'],
      },
      handler: this.handleGetTaskDetails.bind(this),
    })

    this.tools.set('get_project_overview', {
      name: 'get_project_overview',
      description: 'Get project overview with task counts and team info',
      category: 'read',
      schema: {
        type: 'object',
        properties: {
          project_id: {
            type: 'string',
            description: 'Project ID',
            required: true,
          },
          include_task_breakdown: {
            type: 'boolean',
            description: 'Include task breakdown by status',
          },
          include_team_members: {
            type: 'boolean',
            description: 'Include team member list',
          },
        },
        required: ['project_id'],
      },
      handler: this.handleGetProjectOverview.bind(this),
    })

    this.tools.set('get_team_workload', {
      name: 'get_team_workload',
      description: 'Get team workload aggregated by assignee',
      category: 'analyze',
      schema: {
        type: 'object',
        properties: {
          workspace_id: {
            type: 'string',
            description: 'Workspace ID',
          },
          project_id: {
            type: 'string',
            description: 'Project ID',
          },
          time_period: {
            type: 'string',
            description: 'Time period for workload',
            enum: ['current_week', 'current_month', 'custom'],
          },
          start_date: {
            type: 'string',
            description: 'Start date for custom period',
          },
          end_date: {
            type: 'string',
            description: 'End date for custom period',
          },
        },
      },
      handler: this.handleGetTeamWorkload.bind(this),
    })

    this.tools.set('analyze_blockers', {
      name: 'analyze_blockers',
      description: 'Find tasks with blocked status and analyze dependencies',
      category: 'analyze',
      schema: {
        type: 'object',
        properties: {
          workspace_id: {
            type: 'string',
            description: 'Workspace ID',
          },
          project_id: {
            type: 'string',
            description: 'Project ID',
          },
          include_dependencies: {
            type: 'boolean',
            description: 'Include dependency analysis',
          },
        },
      },
      handler: this.handleAnalyzeBlockers.bind(this),
    })
  }

  /**
   * Tool Handler: Query Tasks
   */
  private async handleQueryTasks(
    args: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<ToolCallResult<Task[]>> {
    const typedArgs = args as unknown as QueryTasksArgs
    const taskRepo = new TaskRepository(context.supabase)

    // Build filters
    const filters: Record<string, unknown> = {}

    if (typedArgs.filters?.project_id) {
      filters.project_id = typedArgs.filters.project_id
    }

    if (typedArgs.filters?.status && typedArgs.filters.status.length > 0) {
      // Note: TaskRepository currently supports single status, need to query each
      // For now, use the first status
      filters.status = typedArgs.filters.status[0]
    }

    if (typedArgs.filters?.assignee_id) {
      filters.assignee_id = typedArgs.filters.assignee_id
    }

    filters.workspace_id = context.workspaceId

    const result = await taskRepo.findTasks(filters as any, {
      limit: typedArgs.limit,
      offset: typedArgs.offset,
      sortBy: typedArgs.sort?.field,
      sortOrder: typedArgs.sort?.order,
    })

    if (isError(result)) {
      throw new ToolExecutionError(
        result.error.code,
        result.error.message,
        result.error.details as Record<string, unknown> | undefined
      )
    }

    return {
      success: true,
      data: result.data.data,
      explanation: `Found ${result.data.data.length} tasks`,
      evidence: result.data.data.map(t => t.id),
      metadata: {
        total: result.data.pagination.total,
        hasMore: result.data.pagination.hasMore,
      },
    }
  }

  /**
   * Tool Handler: Get Task Details
   */
  private async handleGetTaskDetails(
    args: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<ToolCallResult<Task>> {
    const typedArgs = args as unknown as GetTaskDetailsArgs
    const taskRepo = new TaskRepository(context.supabase)

    const result = await taskRepo.getTaskWithDetails(typedArgs.task_id)

    if (isError(result)) {
      throw new ToolExecutionError(
        result.error.code,
        result.error.message,
        result.error.details as Record<string, unknown> | undefined
      )
    }

    // Verify workspace access
    if (result.data.workspace_id !== context.workspaceId) {
      throw new ToolExecutionError(
        'ACCESS_DENIED',
        'Task does not belong to the current workspace',
        { taskId: typedArgs.task_id, taskWorkspace: result.data.workspace_id }
      )
    }

    return {
      success: true,
      data: result.data,
      explanation: `Retrieved task: ${result.data.title}`,
      evidence: [result.data.id],
    }
  }

  /**
   * Tool Handler: Get Project Overview
   */
  private async handleGetProjectOverview(
    args: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<ToolCallResult> {
    const typedArgs = args as unknown as GetProjectOverviewArgs
    const projectRepo = new ProjectRepository(context.supabase)
    const taskRepo = new TaskRepository(context.supabase)

    // Get project
    const projectResult = await projectRepo.findById(typedArgs.project_id)
    if (isError(projectResult)) {
      throw new ToolExecutionError(
        projectResult.error.code,
        projectResult.error.message,
        projectResult.error.details as Record<string, unknown> | undefined
      )
    }

    // Verify workspace access
    if (projectResult.data.workspace_id !== context.workspaceId) {
      throw new ToolExecutionError(
        'ACCESS_DENIED',
        'Project does not belong to the current workspace',
        { projectId: typedArgs.project_id }
      )
    }

    const overview: Record<string, unknown> = {
      project: projectResult.data,
    }

    // Get task breakdown if requested
    if (typedArgs.include_task_breakdown) {
      const tasksResult = await taskRepo.findByProject(typedArgs.project_id, {})
      if (!isError(tasksResult)) {
        const tasks = tasksResult.data.data
        overview.task_breakdown = {
          total: tasks.length,
          by_status: this.groupBy(tasks, 'status'),
          by_priority: this.groupBy(tasks, 'priority'),
        }
      }
    }

    return {
      success: true,
      data: overview,
      explanation: `Retrieved project overview: ${projectResult.data.name}`,
      evidence: [projectResult.data.id],
    }
  }

  /**
   * Tool Handler: Get Team Workload
   */
  private async handleGetTeamWorkload(
    args: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<ToolCallResult> {
    const typedArgs = args as unknown as GetTeamWorkloadArgs
    const taskRepo = new TaskRepository(context.supabase)

    const filters: Record<string, unknown> = {
      workspace_id: typedArgs.workspace_id || context.workspaceId,
    }

    if (typedArgs.project_id) {
      filters.project_id = typedArgs.project_id
    }

    const result = await taskRepo.findTasks(filters as any, { limit: 1000 })

    if (isError(result)) {
      throw new ToolExecutionError(
        result.error.code,
        result.error.message,
        result.error.details as Record<string, unknown> | undefined
      )
    }

    // Filter by date if specified
    let tasks = result.data.data
    if (typedArgs.start_date || typedArgs.end_date) {
      tasks = tasks.filter(task => {
        if (!task.due_date) return false
        const dueDate = new Date(task.due_date)
        if (typedArgs.start_date && dueDate < new Date(typedArgs.start_date)) return false
        if (typedArgs.end_date && dueDate > new Date(typedArgs.end_date)) return false
        return true
      })
    }

    // Group by assignee
    const workload = this.aggregateByAssignee(tasks)

    return {
      success: true,
      data: workload,
      explanation: `Analyzed workload for ${Object.keys(workload).length} team members`,
      evidence: tasks.map(t => t.id),
    }
  }

  /**
   * Tool Handler: Analyze Blockers
   */
  private async handleAnalyzeBlockers(
    args: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<ToolCallResult> {
    const typedArgs = args as unknown as AnalyzeBlockersArgs
    const taskRepo = new TaskRepository(context.supabase)

    const filters: Record<string, unknown> = {
      workspace_id: typedArgs.workspace_id || context.workspaceId,
      status: 'blocked',
    }

    if (typedArgs.project_id) {
      filters.project_id = typedArgs.project_id
    }

    const result = await taskRepo.findTasks(filters as any, { limit: 200 })

    if (isError(result)) {
      throw new ToolExecutionError(
        result.error.code,
        result.error.message,
        result.error.details as Record<string, unknown> | undefined
      )
    }

    const blockedTasks = result.data.data
    const analysis = {
      total_blocked: blockedTasks.length,
      blocked_tasks: blockedTasks.map(task => ({
        id: task.id,
        title: task.title,
        blocked_reason: task.blocked_reason,
        blocked_by_id: task.blocked_by_id,
        assignee_id: task.assignee_id,
      })),
      by_reason: this.groupBy(blockedTasks, 'blocked_reason'),
    }

    return {
      success: true,
      data: analysis,
      explanation: `Found ${blockedTasks.length} blocked tasks`,
      evidence: blockedTasks.map(t => t.id),
    }
  }

  /**
   * Helper: Group items by a field
   */
  private groupBy(items: any[], field: string): Record<string, number> {
    const groups: Record<string, number> = {}
    for (const item of items) {
      const key = item[field] || 'null'
      groups[key] = (groups[key] || 0) + 1
    }
    return groups
  }

  /**
   * Helper: Aggregate tasks by assignee
   */
  private aggregateByAssignee(tasks: Task[]): Record<string, any> {
    const workload: Record<string, any> = {}

    for (const task of tasks) {
      const assigneeId = task.assignee_id || 'unassigned'

      if (!workload[assigneeId]) {
        workload[assigneeId] = {
          assignee_id: assigneeId,
          total_tasks: 0,
          by_status: {},
          by_priority: {},
          estimated_hours: 0,
        }
      }

      workload[assigneeId].total_tasks++
      workload[assigneeId].by_status[task.status] =
        (workload[assigneeId].by_status[task.status] || 0) + 1
      workload[assigneeId].by_priority[task.priority] =
        (workload[assigneeId].by_priority[task.priority] || 0) + 1

      if (task.estimate_hours) {
        workload[assigneeId].estimated_hours += task.estimate_hours
      }
    }

    return workload
  }
}

/**
 * Convenience function to execute a tool call
 */
export async function executeToolCall<T = unknown>(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolCallContext
): Promise<ToolCallResult<T>> {
  const executor = new ToolExecutor()
  return executor.executeToolCall<T>(toolName, args, context)
}
