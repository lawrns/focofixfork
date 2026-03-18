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
import { WorkspaceAgentService } from '../workspace-agent/service'
import { WorkspaceAgentStudioService } from '../workspace-agent/studio'
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

  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  getToolDefinition(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
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
      if (constraints.require_approval_for_changes === true) {
        throw new PolicyViolationError(
          'Write operations require manual approval',
          'require_approval_for_changes'
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

    this.tools.set('search_workspace', {
      name: 'search_workspace',
      description: 'Search pages, blocks, databases, and rows across the current workspace',
      category: 'read',
      schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          entity_types: { type: 'array', description: 'Optional entity type filter', items: { type: 'string' } },
          limit: { type: 'number', description: 'Maximum result count' },
        },
        required: ['query'],
      },
      handler: this.handleSearchWorkspace.bind(this),
    })

    this.tools.set('get_page', {
      name: 'get_page',
      description: 'Fetch a workspace page with optional blocks and databases',
      category: 'read',
      schema: {
        type: 'object',
        properties: {
          page_id: { type: 'string', description: 'Page ID', required: true },
          include_blocks: { type: 'boolean', description: 'Include page blocks' },
          include_databases: { type: 'boolean', description: 'Include attached databases' },
        },
        required: ['page_id'],
      },
      handler: this.handleGetPage.bind(this),
    })

    this.tools.set('create_page', {
      name: 'create_page',
      description: 'Create a workspace page and optionally seed blocks',
      category: 'write',
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Page title', required: true },
          parent_id: { type: 'string', description: 'Optional parent page ID' },
          project_id: { type: 'string', description: 'Optional project ID' },
          template: { type: 'string', description: 'Optional template key' },
          metadata: { type: 'object', description: 'Optional page metadata' },
          blocks: { type: 'array', description: 'Optional initial blocks', items: { type: 'object' } },
        },
        required: ['title'],
      },
      handler: this.handleCreatePage.bind(this),
    })

    this.tools.set('update_page', {
      name: 'update_page',
      description: 'Update a page title, parent, project, template, or metadata',
      category: 'write',
      schema: {
        type: 'object',
        properties: {
          page_id: { type: 'string', description: 'Page ID', required: true },
          title: { type: 'string', description: 'Updated title' },
          parent_id: { type: 'string', description: 'Updated parent page ID' },
          project_id: { type: 'string', description: 'Updated project ID' },
          template: { type: 'string', description: 'Updated template key' },
          metadata: { type: 'object', description: 'Updated metadata object' },
        },
        required: ['page_id'],
      },
      handler: this.handleUpdatePage.bind(this),
    })

    this.tools.set('append_blocks', {
      name: 'append_blocks',
      description: 'Append or replace blocks for an existing page',
      category: 'write',
      schema: {
        type: 'object',
        properties: {
          page_id: { type: 'string', description: 'Page ID', required: true },
          mode: { type: 'string', description: 'append or replace', enum: ['append', 'replace'] },
          blocks: { type: 'array', description: 'Blocks to write', items: { type: 'object' } },
        },
        required: ['page_id', 'blocks'],
      },
      handler: this.handleAppendBlocks.bind(this),
    })

    this.tools.set('create_database', {
      name: 'create_database',
      description: 'Create a structured database attached to a page or workspace root',
      category: 'write',
      schema: {
        type: 'object',
        properties: {
          parent_doc_id: { type: 'string', description: 'Optional parent page ID' },
          title: { type: 'string', description: 'Database title', required: true },
          description: { type: 'string', description: 'Optional description' },
          schema: { type: 'array', description: 'Property schema', items: { type: 'object' } },
          default_view: { type: 'object', description: 'Default view settings' },
        },
        required: ['title', 'schema'],
      },
      handler: this.handleCreateDatabase.bind(this),
    })

    this.tools.set('query_database', {
      name: 'query_database',
      description: 'Query a structured database with filters, sorts, and pagination',
      category: 'read',
      schema: {
        type: 'object',
        properties: {
          database_id: { type: 'string', description: 'Database ID', required: true },
          filters: { type: 'array', description: 'Filter definitions', items: { type: 'object' } },
          sorts: { type: 'array', description: 'Sort definitions', items: { type: 'object' } },
          limit: { type: 'number', description: 'Maximum rows to return' },
          offset: { type: 'number', description: 'Pagination offset' },
        },
        required: ['database_id'],
      },
      handler: this.handleQueryDatabase.bind(this),
    })

    this.tools.set('upsert_database_row', {
      name: 'upsert_database_row',
      description: 'Create or update a database row',
      category: 'write',
      schema: {
        type: 'object',
        properties: {
          database_id: { type: 'string', description: 'Database ID', required: true },
          row_id: { type: 'string', description: 'Existing row ID to update' },
          page_id: { type: 'string', description: 'Optional linked page ID' },
          position: { type: 'number', description: 'Optional row position' },
          properties: { type: 'object', description: 'Structured row properties', required: true },
        },
        required: ['database_id', 'properties'],
      },
      handler: this.handleUpsertDatabaseRow.bind(this),
    })

    this.tools.set('list_connectors', {
      name: 'list_connectors',
      description: 'List the Slack and Mail connectors available to the current workspace',
      category: 'read',
      schema: {
        type: 'object',
        properties: {
          provider: { type: 'string', description: 'Optional connector provider filter' },
        },
      },
      handler: this.handleListConnectors.bind(this),
    })

    this.tools.set('search_mail', {
      name: 'search_mail',
      description: 'Search workspace email records by recipient, subject, or body',
      category: 'read',
      schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Mail search query', required: true },
          limit: { type: 'number', description: 'Maximum number of messages to return' },
          status: { type: 'string', description: 'Optional delivery status filter' },
        },
        required: ['query'],
      },
      handler: this.handleSearchMail.bind(this),
    })

    this.tools.set('send_mail', {
      name: 'send_mail',
      description: 'Queue a workspace email through a connected Mail or Gmail channel',
      category: 'write',
      schema: {
        type: 'object',
        properties: {
          connector_id: { type: 'string', description: 'Optional connector ID' },
          to: { type: 'array', description: 'Recipient email addresses', items: { type: 'string' } },
          cc: { type: 'array', description: 'CC email addresses', items: { type: 'string' } },
          bcc: { type: 'array', description: 'BCC email addresses', items: { type: 'string' } },
          subject: { type: 'string', description: 'Email subject', required: true },
          body_md: { type: 'string', description: 'Markdown email body', required: true },
          body_html: { type: 'string', description: 'Optional HTML email body' },
          project_id: { type: 'string', description: 'Optional project scope' },
          metadata: { type: 'object', description: 'Optional message metadata' },
        },
        required: ['to', 'subject', 'body_md'],
      },
      handler: this.handleSendMail.bind(this),
    })

    this.tools.set('post_slack_message', {
      name: 'post_slack_message',
      description: 'Post a message to a governed Slack webhook configured for the workspace',
      category: 'write',
      schema: {
        type: 'object',
        properties: {
          connector_id: { type: 'string', description: 'Optional connector ID' },
          channel: { type: 'string', description: 'Optional Slack channel override' },
          message: { type: 'string', description: 'Message body', required: true },
          blocks: { type: 'array', description: 'Optional Slack block payload', items: { type: 'object' } },
        },
        required: ['message'],
      },
      handler: this.handlePostSlackMessage.bind(this),
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

  private async handleSearchWorkspace(
    args: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<ToolCallResult> {
    const service = new WorkspaceAgentService(context.supabase)
    const query = typeof args.query === 'string' ? args.query.trim() : ''
    if (!query) {
      throw new ToolExecutionError('INVALID_ARGUMENTS', 'query is required')
    }

    const results = await service.searchWorkspace(context.workspaceId, {
      query,
      entityTypes: Array.isArray(args.entity_types)
        ? args.entity_types.filter((value): value is string => typeof value === 'string')
        : undefined,
      limit: typeof args.limit === 'number' ? args.limit : undefined,
    })

    return {
      success: true,
      data: results,
      explanation: `Found ${results.length} workspace results`,
      evidence: results.map((result) => result.entity_id),
    }
  }

  private async handleGetPage(
    args: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<ToolCallResult> {
    const service = new WorkspaceAgentService(context.supabase)
    const pageId = typeof args.page_id === 'string' ? args.page_id : ''
    if (!pageId) {
      throw new ToolExecutionError('INVALID_ARGUMENTS', 'page_id is required')
    }

    const page = await service.getPageState(context.workspaceId, pageId, {
      includeBlocks: args.include_blocks !== false,
      includeDatabases: args.include_databases !== false,
    })

    if (!page) {
      throw new ToolExecutionError('NOT_FOUND', `Page ${pageId} not found`, { pageId })
    }

    return {
      success: true,
      data: page,
      explanation: `Retrieved page: ${page.page.title}`,
      evidence: [page.page.id, ...page.blocks.map((block) => block.id)],
    }
  }

  private async handleCreatePage(
    args: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<ToolCallResult> {
    const service = new WorkspaceAgentService(context.supabase)
    const title = typeof args.title === 'string' ? args.title.trim() : ''
    if (!title) {
      throw new ToolExecutionError('INVALID_ARGUMENTS', 'title is required')
    }

    const state = await service.createPage(context.workspaceId, context.userId, {
      title,
      parent_id: typeof args.parent_id === 'string' ? args.parent_id : null,
      project_id: typeof args.project_id === 'string' ? args.project_id : null,
      template: typeof args.template === 'string' ? args.template : null,
      metadata: args.metadata && typeof args.metadata === 'object' && !Array.isArray(args.metadata)
        ? args.metadata as Record<string, unknown>
        : undefined,
      blocks: Array.isArray(args.blocks)
        ? args.blocks.filter((value): value is Record<string, unknown> => !!value && typeof value === 'object')
          .map((block) => block as any)
        : undefined,
    })

    return {
      success: true,
      data: state,
      explanation: `Created page: ${state.page.title}`,
      evidence: [state.page.id, ...state.blocks.map((block) => block.id)],
    }
  }

  private async handleUpdatePage(
    args: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<ToolCallResult> {
    const service = new WorkspaceAgentService(context.supabase)
    const pageId = typeof args.page_id === 'string' ? args.page_id : ''
    if (!pageId) {
      throw new ToolExecutionError('INVALID_ARGUMENTS', 'page_id is required')
    }

    const state = await service.updatePage(context.workspaceId, context.userId, pageId, {
      title: typeof args.title === 'string' ? args.title : undefined,
      parent_id: typeof args.parent_id === 'string' ? args.parent_id : undefined,
      project_id: typeof args.project_id === 'string' ? args.project_id : undefined,
      template: typeof args.template === 'string' ? args.template : undefined,
      metadata: args.metadata && typeof args.metadata === 'object' && !Array.isArray(args.metadata)
        ? args.metadata as Record<string, unknown>
        : undefined,
    })

    return {
      success: true,
      data: state,
      explanation: `Updated page: ${state.page.title}`,
      evidence: [state.page.id],
    }
  }

  private async handleAppendBlocks(
    args: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<ToolCallResult> {
    const service = new WorkspaceAgentService(context.supabase)
    const pageId = typeof args.page_id === 'string' ? args.page_id : ''
    if (!pageId || !Array.isArray(args.blocks)) {
      throw new ToolExecutionError('INVALID_ARGUMENTS', 'page_id and blocks are required')
    }

    const blocks = args.blocks
      .filter((value): value is Record<string, unknown> => !!value && typeof value === 'object')
      .map((block) => block as any)

    const mode = args.mode === 'replace' ? 'replace' : 'append'
    const updatedBlocks = mode === 'replace'
      ? await service.replaceBlocks(context.workspaceId, context.userId, pageId, blocks)
      : await service.appendBlocks(context.workspaceId, context.userId, pageId, blocks)

    return {
      success: true,
      data: updatedBlocks,
      explanation: `${mode === 'replace' ? 'Replaced' : 'Appended'} ${blocks.length} blocks`,
      evidence: updatedBlocks.map((block) => block.id),
    }
  }

  private async handleCreateDatabase(
    args: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<ToolCallResult> {
    const service = new WorkspaceAgentService(context.supabase)
    const title = typeof args.title === 'string' ? args.title.trim() : ''
    if (!title || !Array.isArray(args.schema)) {
      throw new ToolExecutionError('INVALID_ARGUMENTS', 'title and schema are required')
    }

    const state = await service.createDatabase(context.workspaceId, context.userId, {
      parent_doc_id: typeof args.parent_doc_id === 'string' ? args.parent_doc_id : null,
      title,
      description: typeof args.description === 'string' ? args.description : null,
      schema: args.schema.filter((value): value is Record<string, unknown> => !!value && typeof value === 'object')
        .map((property) => ({
          id: typeof property.id === 'string' ? property.id : crypto.randomUUID(),
          name: typeof property.name === 'string' ? property.name : 'Untitled',
          type: typeof property.type === 'string' ? property.type as any : 'rich_text',
          options: Array.isArray(property.options)
            ? property.options.filter((value): value is string => typeof value === 'string')
            : [],
          config: property.config && typeof property.config === 'object' && !Array.isArray(property.config)
            ? property.config as Record<string, unknown>
            : {},
        })),
      default_view: args.default_view && typeof args.default_view === 'object' && !Array.isArray(args.default_view)
        ? args.default_view as Record<string, unknown>
        : undefined,
    })

    return {
      success: true,
      data: state,
      explanation: `Created database: ${state.database.title}`,
      evidence: [state.database.id],
    }
  }

  private async handleQueryDatabase(
    args: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<ToolCallResult> {
    const service = new WorkspaceAgentService(context.supabase)
    const databaseId = typeof args.database_id === 'string' ? args.database_id : ''
    if (!databaseId) {
      throw new ToolExecutionError('INVALID_ARGUMENTS', 'database_id is required')
    }

    const result = await service.queryDatabase(context.workspaceId, databaseId, {
      filters: Array.isArray(args.filters) ? args.filters as any : undefined,
      sorts: Array.isArray(args.sorts) ? args.sorts as any : undefined,
      limit: typeof args.limit === 'number' ? args.limit : undefined,
      offset: typeof args.offset === 'number' ? args.offset : undefined,
    })

    return {
      success: true,
      data: result,
      explanation: `Retrieved ${result.rows.length} database rows`,
      evidence: result.rows.map((row) => row.id),
    }
  }

  private async handleUpsertDatabaseRow(
    args: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<ToolCallResult> {
    const service = new WorkspaceAgentService(context.supabase)
    const databaseId = typeof args.database_id === 'string' ? args.database_id : ''
    if (!databaseId || !args.properties || typeof args.properties !== 'object' || Array.isArray(args.properties)) {
      throw new ToolExecutionError('INVALID_ARGUMENTS', 'database_id and properties are required')
    }

    const row = typeof args.row_id === 'string' && args.row_id.trim().length > 0
      ? await service.updateDatabaseRow(context.workspaceId, context.userId, args.row_id, {
        page_id: typeof args.page_id === 'string' ? args.page_id : undefined,
        position: typeof args.position === 'number' ? args.position : undefined,
        properties: args.properties as Record<string, unknown>,
      })
      : await service.createDatabaseRow(context.workspaceId, context.userId, databaseId, {
        page_id: typeof args.page_id === 'string' ? args.page_id : undefined,
        position: typeof args.position === 'number' ? args.position : undefined,
        properties: args.properties as Record<string, unknown>,
      })

    return {
      success: true,
      data: row,
      explanation: `${typeof args.row_id === 'string' ? 'Updated' : 'Created'} database row`,
      evidence: [row.id],
    }
  }

  private async handleListConnectors(
    args: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<ToolCallResult> {
    const studio = new WorkspaceAgentStudioService(context.supabase)
    const provider = typeof args.provider === 'string' ? args.provider : null
    const connectors = (await studio.listConnectors(context.workspaceId))
      .filter((connector) => !provider || connector.provider === provider)

    return {
      success: true,
      data: connectors,
      explanation: `Found ${connectors.length} workspace connectors`,
      evidence: connectors.map((connector) => connector.id),
    }
  }

  private async handleSearchMail(
    args: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<ToolCallResult> {
    const query = typeof args.query === 'string' ? args.query.trim().toLowerCase() : ''
    if (!query) {
      throw new ToolExecutionError('INVALID_ARGUMENTS', 'query is required')
    }

    const limit = typeof args.limit === 'number' ? Math.min(Math.max(args.limit, 1), 50) : 20
    let deliveryQuery = context.supabase
      .from('email_deliveries')
      .select('*')
      .eq('workspace_id', context.workspaceId)
      .order('created_at', { ascending: false })
      .limit(120)

    if (typeof args.status === 'string' && args.status.trim().length > 0) {
      deliveryQuery = deliveryQuery.eq('status', args.status.trim())
    }

    const { data, error } = await deliveryQuery
    if (error) {
      throw new ToolExecutionError('DATABASE_ERROR', `Failed to search mail: ${error.message}`)
    }

    const rows = Array.isArray(data) ? data : []
    const results = rows.filter((row) => {
      const haystack = [
        row.subject,
        row.body_md,
        ...(Array.isArray(row.to) ? row.to : []),
        ...(Array.isArray(row.cc) ? row.cc : []),
        ...(Array.isArray(row.bcc) ? row.bcc : []),
      ]
        .filter((value): value is string => typeof value === 'string')
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    }).slice(0, limit)

    return {
      success: true,
      data: results,
      explanation: `Found ${results.length} mail records`,
      evidence: results.map((row) => String(row.id)),
    }
  }

  private async handleSendMail(
    args: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<ToolCallResult> {
    const studio = new WorkspaceAgentStudioService(context.supabase)
    const recipients = Array.isArray(args.to)
      ? args.to.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : typeof args.to === 'string' && args.to.trim().length > 0
        ? [args.to.trim()]
        : []

    const subject = typeof args.subject === 'string' ? args.subject.trim() : ''
    const bodyMd = typeof args.body_md === 'string' ? args.body_md.trim() : ''

    if (recipients.length === 0 || !subject || !bodyMd) {
      throw new ToolExecutionError('INVALID_ARGUMENTS', 'to, subject, and body_md are required')
    }

    const connector = typeof args.connector_id === 'string' && args.connector_id.trim().length > 0
      ? await studio.getConnector(context.workspaceId, args.connector_id, { includeSecrets: true })
      : await studio.resolveConnectorByProvider(context.workspaceId, 'gmail') ?? await studio.resolveConnectorByProvider(context.workspaceId, 'mail')

    if (!connector || (connector.provider !== 'mail' && connector.provider !== 'gmail')) {
      throw new ToolExecutionError('CONNECTOR_NOT_FOUND', 'No connected Mail or Gmail connector is available')
    }

    const metadata = args.metadata && typeof args.metadata === 'object' && !Array.isArray(args.metadata)
      ? args.metadata as Record<string, unknown>
      : {}
    const cc = Array.isArray(args.cc) ? args.cc.filter((value): value is string => typeof value === 'string') : []
    const bcc = Array.isArray(args.bcc) ? args.bcc.filter((value): value is string => typeof value === 'string') : []
    const now = new Date().toISOString()

    const { data: outbox, error: outboxError } = await context.supabase
      .from('email_outbox')
      .insert({
        to: recipients,
        cc,
        bcc,
        subject,
        body_md: bodyMd,
        body_html: typeof args.body_html === 'string' ? args.body_html : null,
        status: 'queued',
        queued_at: now,
        workspace_id: context.workspaceId,
        project_id: typeof args.project_id === 'string' ? args.project_id : null,
        metadata: {
          ...metadata,
          connector_id: connector.id,
          connector_provider: connector.provider,
        },
      })
      .select('id')
      .single()

    if (outboxError || !outbox) {
      throw new ToolExecutionError('DATABASE_ERROR', `Failed to queue email: ${outboxError?.message ?? 'unknown error'}`)
    }

    const { data: delivery, error: deliveryError } = await context.supabase
      .from('email_deliveries')
      .insert({
        outbox_id: outbox.id,
        to: recipients,
        cc,
        bcc,
        subject,
        body_md: bodyMd,
        body_html: typeof args.body_html === 'string' ? args.body_html : null,
        status: 'queued',
        provider: connector.provider,
        workspace_id: context.workspaceId,
        project_id: typeof args.project_id === 'string' ? args.project_id : null,
        metadata: {
          ...metadata,
          connector_id: connector.id,
          connector_provider: connector.provider,
        },
      })
      .select('id')
      .single()

    if (deliveryError || !delivery) {
      throw new ToolExecutionError('DATABASE_ERROR', `Failed to create email delivery: ${deliveryError?.message ?? 'unknown error'}`)
    }

    return {
      success: true,
      data: {
        outbox_id: outbox.id,
        delivery_id: delivery.id,
        connector: {
          id: connector.id,
          provider: connector.provider,
          label: connector.label,
        },
      },
      explanation: `Queued email to ${recipients.join(', ')}`,
      evidence: [String(outbox.id), String(delivery.id)],
    }
  }

  private async handlePostSlackMessage(
    args: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<ToolCallResult> {
    const studio = new WorkspaceAgentStudioService(context.supabase)
    const message = typeof args.message === 'string' ? args.message.trim() : ''
    if (!message) {
      throw new ToolExecutionError('INVALID_ARGUMENTS', 'message is required')
    }

    const connector = typeof args.connector_id === 'string' && args.connector_id.trim().length > 0
      ? await studio.getConnector(context.workspaceId, args.connector_id, { includeSecrets: true })
      : await studio.resolveConnectorByProvider(context.workspaceId, 'slack')

    if (!connector || connector.provider !== 'slack') {
      throw new ToolExecutionError('CONNECTOR_NOT_FOUND', 'No connected Slack connector is available')
    }

    const webhookUrl = typeof connector.config.webhook_url === 'string'
      ? connector.config.webhook_url.trim()
      : ''

    if (!webhookUrl) {
      throw new ToolExecutionError('CONNECTOR_MISCONFIGURED', 'Slack connector is missing an incoming webhook URL')
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: message,
        ...(typeof args.channel === 'string' && args.channel.trim().length > 0 ? { channel: args.channel.trim() } : {}),
        ...(Array.isArray(args.blocks) ? { blocks: args.blocks } : {}),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new ToolExecutionError('SLACK_POST_FAILED', `Slack webhook returned HTTP ${response.status}`, {
        response: errorText.slice(0, 200),
      })
    }

    await context.supabase
      .from('workspace_agent_connectors')
      .update({
        last_sync_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', connector.id)

    return {
      success: true,
      data: {
        connector_id: connector.id,
        provider: connector.provider,
        channel: typeof args.channel === 'string' ? args.channel : connector.config.default_channel ?? null,
      },
      explanation: 'Posted message to Slack',
      evidence: [connector.id],
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
