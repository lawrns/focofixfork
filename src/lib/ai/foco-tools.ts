/**
 * Foco API Tools for DeepSeek
 * Read-only Phase 1 tools with STRICT MODE compliance
 *
 * CRITICAL: DeepSeek strict mode requirements:
 * - ALL properties must be in the `required` array
 * - Optional fields use `anyOf: [{ type: "string" }, { type: "null" }]`
 * - `additionalProperties: false` on every object
 * - `strict: true` on function definition
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface ToolCallResult {
  success: boolean
  data?: unknown
  error?: string
  explanation?: string // User-safe rationale for the result
  evidence?: string[] // Task/project IDs that support the result
}

export interface FocoTool {
  type: 'function'
  function: {
    name: string
    description: string
    strict: boolean
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required: string[]
      additionalProperties: false
    }
  }
}

// ============================================================================
// Tool Definitions (Phase 1: Read-Only)
// ============================================================================

export const FOCO_TOOLS: FocoTool[] = [
  // -------------------------------------------------------------------------
  // 1. query_tasks - Search tasks with filters
  // -------------------------------------------------------------------------
  {
    type: 'function',
    function: {
      name: 'query_tasks',
      description: 'Search and filter tasks across workspace or project. Returns tasks matching the specified criteria including status, assignee, and search query. Useful for answering questions like "what tasks are in progress?" or "show me blocked tasks".',
      strict: true,
      parameters: {
        type: 'object',
        properties: {
          workspace_id: {
            type: 'string',
            description: 'The workspace ID to search tasks in (required)',
          },
          project_id: {
            anyOf: [
              { type: 'string' },
              { type: 'null' }
            ],
            description: 'Filter by specific project ID (optional)',
          },
          status: {
            anyOf: [
              {
                type: 'string',
                enum: ['backlog', 'next', 'in_progress', 'review', 'blocked', 'done']
              },
              { type: 'null' }
            ],
            description: 'Filter by task status (optional)',
          },
          assignee_id: {
            anyOf: [
              { type: 'string' },
              { type: 'null' }
            ],
            description: 'Filter by assignee user ID (optional)',
          },
          search_query: {
            anyOf: [
              { type: 'string' },
              { type: 'null' }
            ],
            description: 'Search in task title and description (optional)',
          },
          limit: {
            anyOf: [
              { type: 'number' },
              { type: 'null' }
            ],
            description: 'Maximum number of tasks to return (default: 50, max: 200)',
          },
        },
        required: [
          'workspace_id',
          'project_id',
          'status',
          'assignee_id',
          'search_query',
          'limit'
        ],
        additionalProperties: false,
      },
    },
  },

  // -------------------------------------------------------------------------
  // 2. get_task_details - Get single task with subtasks
  // -------------------------------------------------------------------------
  {
    type: 'function',
    function: {
      name: 'get_task_details',
      description: 'Retrieve detailed information about a specific task including its subtasks and optionally comments. Use when you need full context about a particular task.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {
          task_id: {
            type: 'string',
            description: 'The task ID to retrieve details for',
          },
          include_subtasks: {
            anyOf: [
              { type: 'boolean' },
              { type: 'null' }
            ],
            description: 'Include subtasks in the response (default: true)',
          },
          include_comments: {
            anyOf: [
              { type: 'boolean' },
              { type: 'null' }
            ],
            description: 'Include comments in the response (default: false)',
          },
        },
        required: [
          'task_id',
          'include_subtasks',
          'include_comments'
        ],
        additionalProperties: false,
      },
    },
  },

  // -------------------------------------------------------------------------
  // 3. get_project_overview - Project summary with task counts
  // -------------------------------------------------------------------------
  {
    type: 'function',
    function: {
      name: 'get_project_overview',
      description: 'Get a comprehensive overview of a project including task counts by status, team members, and progress metrics. Useful for project status updates and planning.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {
          project_id: {
            type: 'string',
            description: 'The project ID to get overview for',
          },
        },
        required: ['project_id'],
        additionalProperties: false,
      },
    },
  },

  // -------------------------------------------------------------------------
  // 4. get_team_workload - Workload distribution
  // -------------------------------------------------------------------------
  {
    type: 'function',
    function: {
      name: 'get_team_workload',
      description: 'Analyze team workload distribution showing active tasks per team member, completion rates, and capacity. Helps identify overloaded team members and balance work distribution.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {
          workspace_id: {
            type: 'string',
            description: 'The workspace ID to analyze team workload for',
          },
          time_range_days: {
            anyOf: [
              { type: 'number' },
              { type: 'null' }
            ],
            description: 'Number of days to look back for completed tasks (default: 14)',
          },
        },
        required: [
          'workspace_id',
          'time_range_days'
        ],
        additionalProperties: false,
      },
    },
  },

  // -------------------------------------------------------------------------
  // 5. analyze_blockers - Find blocked tasks
  // -------------------------------------------------------------------------
  {
    type: 'function',
    function: {
      name: 'analyze_blockers',
      description: 'Identify all blocked tasks in a project including the blocker reasons and relationships. Helps prioritize unblocking work and resolve dependencies.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {
          project_id: {
            type: 'string',
            description: 'The project ID to analyze blockers for',
          },
        },
        required: ['project_id'],
        additionalProperties: false,
      },
    },
  },
]

// ============================================================================
// Tool Name Registry (for type-safe handler lookup)
// ============================================================================

export const TOOL_NAMES = {
  QUERY_TASKS: 'query_tasks',
  GET_TASK_DETAILS: 'get_task_details',
  GET_PROJECT_OVERVIEW: 'get_project_overview',
  GET_TEAM_WORKLOAD: 'get_team_workload',
  ANALYZE_BLOCKERS: 'analyze_blockers',
} as const

export type ToolName = typeof TOOL_NAMES[keyof typeof TOOL_NAMES]

// ============================================================================
// Parameter Types (for implementation)
// ============================================================================

export interface QueryTasksParams {
  workspace_id: string
  project_id: string | null
  status: 'backlog' | 'next' | 'in_progress' | 'review' | 'blocked' | 'done' | null
  assignee_id: string | null
  search_query: string | null
  limit: number | null
}

export interface GetTaskDetailsParams {
  task_id: string
  include_subtasks: boolean | null
  include_comments: boolean | null
}

export interface GetProjectOverviewParams {
  project_id: string
}

export interface GetTeamWorkloadParams {
  workspace_id: string
  time_range_days: number | null
}

export interface AnalyzeBlockersParams {
  project_id: string
}

// ============================================================================
// Type Guards (for runtime parameter validation)
// ============================================================================

export function isQueryTasksParams(params: unknown): params is QueryTasksParams {
  const p = params as Record<string, unknown>
  return (
    typeof p === 'object' &&
    p !== null &&
    typeof p.workspace_id === 'string' &&
    (p.project_id === null || typeof p.project_id === 'string') &&
    (p.status === null ||
     ['backlog', 'next', 'in_progress', 'review', 'blocked', 'done'].includes(p.status as string)) &&
    (p.assignee_id === null || typeof p.assignee_id === 'string') &&
    (p.search_query === null || typeof p.search_query === 'string') &&
    (p.limit === null || typeof p.limit === 'number')
  )
}

export function isGetTaskDetailsParams(params: unknown): params is GetTaskDetailsParams {
  const p = params as Record<string, unknown>
  return (
    typeof p === 'object' &&
    p !== null &&
    typeof p.task_id === 'string' &&
    (p.include_subtasks === null || typeof p.include_subtasks === 'boolean') &&
    (p.include_comments === null || typeof p.include_comments === 'boolean')
  )
}

export function isGetProjectOverviewParams(params: unknown): params is GetProjectOverviewParams {
  const p = params as Record<string, unknown>
  return (
    typeof p === 'object' &&
    p !== null &&
    typeof p.project_id === 'string'
  )
}

export function isGetTeamWorkloadParams(params: unknown): params is GetTeamWorkloadParams {
  const p = params as Record<string, unknown>
  return (
    typeof p === 'object' &&
    p !== null &&
    typeof p.workspace_id === 'string' &&
    (p.time_range_days === null || typeof p.time_range_days === 'number')
  )
}

export function isAnalyzeBlockersParams(params: unknown): params is AnalyzeBlockersParams {
  const p = params as Record<string, unknown>
  return (
    typeof p === 'object' &&
    p !== null &&
    typeof p.project_id === 'string'
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate tool parameters against expected schema
 */
export function validateToolParams(toolName: ToolName, params: unknown): {
  valid: boolean
  error?: string
} {
  switch (toolName) {
    case TOOL_NAMES.QUERY_TASKS:
      return {
        valid: isQueryTasksParams(params),
        error: isQueryTasksParams(params) ? undefined : 'Invalid query_tasks parameters',
      }

    case TOOL_NAMES.GET_TASK_DETAILS:
      return {
        valid: isGetTaskDetailsParams(params),
        error: isGetTaskDetailsParams(params) ? undefined : 'Invalid get_task_details parameters',
      }

    case TOOL_NAMES.GET_PROJECT_OVERVIEW:
      return {
        valid: isGetProjectOverviewParams(params),
        error: isGetProjectOverviewParams(params) ? undefined : 'Invalid get_project_overview parameters',
      }

    case TOOL_NAMES.GET_TEAM_WORKLOAD:
      return {
        valid: isGetTeamWorkloadParams(params),
        error: isGetTeamWorkloadParams(params) ? undefined : 'Invalid get_team_workload parameters',
      }

    case TOOL_NAMES.ANALYZE_BLOCKERS:
      return {
        valid: isAnalyzeBlockersParams(params),
        error: isAnalyzeBlockersParams(params) ? undefined : 'Invalid analyze_blockers parameters',
      }

    default:
      return {
        valid: false,
        error: `Unknown tool: ${toolName}`,
      }
  }
}

/**
 * Create a success result
 */
export function successResult(data: unknown, explanation?: string, evidence?: string[]): ToolCallResult {
  return {
    success: true,
    data,
    explanation,
    evidence,
  }
}

/**
 * Create an error result
 */
export function errorResult(error: string, explanation?: string): ToolCallResult {
  return {
    success: false,
    error,
    explanation,
  }
}

// ============================================================================
// Exports
// ============================================================================

export default FOCO_TOOLS
