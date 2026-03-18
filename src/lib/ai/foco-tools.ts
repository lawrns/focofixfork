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

  {
    type: 'function',
    function: {
      name: 'search_workspace',
      description: 'Search pages, blocks, databases, and structured rows across the current workspace.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Workspace search query',
          },
          entity_types: {
            anyOf: [
              { type: 'array', items: { type: 'string' } },
              { type: 'null' }
            ],
            description: 'Optional entity type filter (page, block, database, database_row)',
          },
          limit: {
            anyOf: [
              { type: 'number' },
              { type: 'null' }
            ],
            description: 'Maximum number of results to return',
          },
        },
        required: ['query', 'entity_types', 'limit'],
        additionalProperties: false,
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'get_page',
      description: 'Load a page and optionally include blocks and attached databases.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {
          page_id: { type: 'string', description: 'The page ID to fetch' },
          include_blocks: {
            anyOf: [{ type: 'boolean' }, { type: 'null' }],
            description: 'Whether to include blocks in the response',
          },
          include_databases: {
            anyOf: [{ type: 'boolean' }, { type: 'null' }],
            description: 'Whether to include attached databases in the response',
          },
        },
        required: ['page_id', 'include_blocks', 'include_databases'],
        additionalProperties: false,
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'create_page',
      description: 'Create a workspace page and optionally seed its initial blocks.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Page title' },
          parent_id: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Optional parent page ID' },
          project_id: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Optional project ID' },
          template: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Optional template key' },
          metadata: { anyOf: [{ type: 'object' }, { type: 'null' }], description: 'Optional metadata' },
          blocks: { anyOf: [{ type: 'array', items: { type: 'object' } }, { type: 'null' }], description: 'Optional initial blocks' },
        },
        required: ['title', 'parent_id', 'project_id', 'template', 'metadata', 'blocks'],
        additionalProperties: false,
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'update_page',
      description: 'Update page title, hierarchy, template, or metadata.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {
          page_id: { type: 'string', description: 'Page ID to update' },
          title: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Updated page title' },
          parent_id: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Updated parent page ID' },
          project_id: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Updated project ID' },
          template: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Updated template key' },
          metadata: { anyOf: [{ type: 'object' }, { type: 'null' }], description: 'Updated metadata' },
        },
        required: ['page_id', 'title', 'parent_id', 'project_id', 'template', 'metadata'],
        additionalProperties: false,
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'append_blocks',
      description: 'Append or replace page blocks.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {
          page_id: { type: 'string', description: 'Page ID' },
          mode: { anyOf: [{ type: 'string', enum: ['append', 'replace'] }, { type: 'null' }], description: 'Append or replace mode' },
          blocks: { type: 'array', items: { type: 'object' }, description: 'Blocks to write' },
        },
        required: ['page_id', 'mode', 'blocks'],
        additionalProperties: false,
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'create_database',
      description: 'Create a structured database attached to a page or workspace root.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {
          parent_doc_id: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Optional parent page ID' },
          title: { type: 'string', description: 'Database title' },
          description: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Database description' },
          schema: { type: 'array', items: { type: 'object' }, description: 'Property schema' },
          default_view: { anyOf: [{ type: 'object' }, { type: 'null' }], description: 'Default view configuration' },
        },
        required: ['parent_doc_id', 'title', 'description', 'schema', 'default_view'],
        additionalProperties: false,
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'query_database',
      description: 'Query a structured database with filters, sorts, and pagination.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {
          database_id: { type: 'string', description: 'Database ID' },
          filters: { anyOf: [{ type: 'array', items: { type: 'object' } }, { type: 'null' }], description: 'Query filters' },
          sorts: { anyOf: [{ type: 'array', items: { type: 'object' } }, { type: 'null' }], description: 'Sort definitions' },
          limit: { anyOf: [{ type: 'number' }, { type: 'null' }], description: 'Maximum rows to return' },
          offset: { anyOf: [{ type: 'number' }, { type: 'null' }], description: 'Pagination offset' },
        },
        required: ['database_id', 'filters', 'sorts', 'limit', 'offset'],
        additionalProperties: false,
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'upsert_database_row',
      description: 'Create or update a structured database row.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {
          database_id: { type: 'string', description: 'Database ID' },
          row_id: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Optional existing row ID to update' },
          page_id: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Optional linked page ID' },
          position: { anyOf: [{ type: 'number' }, { type: 'null' }], description: 'Optional row position' },
          properties: { type: 'object', description: 'Structured row values' },
        },
        required: ['database_id', 'row_id', 'page_id', 'position', 'properties'],
        additionalProperties: false,
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'list_connectors',
      description: 'List the Slack and Mail connectors currently available in the workspace.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {
          provider: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
            description: 'Optional provider filter (slack, mail, gmail)',
          },
        },
        required: ['provider'],
        additionalProperties: false,
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'search_mail',
      description: 'Search workspace mail records, including queued and delivered emails.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Mail search query' },
          limit: {
            anyOf: [{ type: 'number' }, { type: 'null' }],
            description: 'Maximum number of mail records to return',
          },
          status: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
            description: 'Optional status filter',
          },
        },
        required: ['query', 'limit', 'status'],
        additionalProperties: false,
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'send_mail',
      description: 'Queue a workspace email through a connected Mail or Gmail channel.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {
          connector_id: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Optional connector ID' },
          to: { type: 'array', items: { type: 'string' }, description: 'Recipient email addresses' },
          cc: { anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }], description: 'CC recipients' },
          bcc: { anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }], description: 'BCC recipients' },
          subject: { type: 'string', description: 'Email subject' },
          body_md: { type: 'string', description: 'Markdown body' },
          body_html: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Optional HTML body' },
          project_id: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Optional project scope' },
          metadata: { anyOf: [{ type: 'object' }, { type: 'null' }], description: 'Optional metadata' },
        },
        required: ['connector_id', 'to', 'cc', 'bcc', 'subject', 'body_md', 'body_html', 'project_id', 'metadata'],
        additionalProperties: false,
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'post_slack_message',
      description: 'Send a governed message into a connected Slack channel.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {
          connector_id: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Optional connector ID' },
          channel: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Optional Slack channel override' },
          message: { type: 'string', description: 'Slack message body' },
          blocks: { anyOf: [{ type: 'array', items: { type: 'object' } }, { type: 'null' }], description: 'Optional Slack block payload' },
        },
        required: ['connector_id', 'channel', 'message', 'blocks'],
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
  SEARCH_WORKSPACE: 'search_workspace',
  GET_PAGE: 'get_page',
  CREATE_PAGE: 'create_page',
  UPDATE_PAGE: 'update_page',
  APPEND_BLOCKS: 'append_blocks',
  CREATE_DATABASE: 'create_database',
  QUERY_DATABASE: 'query_database',
  UPSERT_DATABASE_ROW: 'upsert_database_row',
  LIST_CONNECTORS: 'list_connectors',
  SEARCH_MAIL: 'search_mail',
  SEND_MAIL: 'send_mail',
  POST_SLACK_MESSAGE: 'post_slack_message',
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

export interface SearchWorkspaceParams {
  query: string
  entity_types: string[] | null
  limit: number | null
}

export interface GetPageParams {
  page_id: string
  include_blocks: boolean | null
  include_databases: boolean | null
}

export interface CreatePageParams {
  title: string
  parent_id: string | null
  project_id: string | null
  template: string | null
  metadata: Record<string, unknown> | null
  blocks: Record<string, unknown>[] | null
}

export interface UpdatePageParams {
  page_id: string
  title: string | null
  parent_id: string | null
  project_id: string | null
  template: string | null
  metadata: Record<string, unknown> | null
}

export interface AppendBlocksParams {
  page_id: string
  mode: 'append' | 'replace' | null
  blocks: Record<string, unknown>[]
}

export interface CreateDatabaseParams {
  parent_doc_id: string | null
  title: string
  description: string | null
  schema: Record<string, unknown>[]
  default_view: Record<string, unknown> | null
}

export interface QueryDatabaseParams {
  database_id: string
  filters: Record<string, unknown>[] | null
  sorts: Record<string, unknown>[] | null
  limit: number | null
  offset: number | null
}

export interface UpsertDatabaseRowParams {
  database_id: string
  row_id: string | null
  page_id: string | null
  position: number | null
  properties: Record<string, unknown>
}

export interface ListConnectorsParams {
  provider: string | null
}

export interface SearchMailParams {
  query: string
  limit: number | null
  status: string | null
}

export interface SendMailParams {
  connector_id: string | null
  to: string[]
  cc: string[] | null
  bcc: string[] | null
  subject: string
  body_md: string
  body_html: string | null
  project_id: string | null
  metadata: Record<string, unknown> | null
}

export interface PostSlackMessageParams {
  connector_id: string | null
  channel: string | null
  message: string
  blocks: Record<string, unknown>[] | null
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

export function isSearchWorkspaceParams(params: unknown): params is SearchWorkspaceParams {
  const p = params as Record<string, unknown>
  return (
    typeof p === 'object' &&
    p !== null &&
    typeof p.query === 'string' &&
    (p.entity_types === null || Array.isArray(p.entity_types)) &&
    (p.limit === null || typeof p.limit === 'number')
  )
}

export function isGetPageParams(params: unknown): params is GetPageParams {
  const p = params as Record<string, unknown>
  return (
    typeof p === 'object' &&
    p !== null &&
    typeof p.page_id === 'string' &&
    (p.include_blocks === null || typeof p.include_blocks === 'boolean') &&
    (p.include_databases === null || typeof p.include_databases === 'boolean')
  )
}

export function isCreatePageParams(params: unknown): params is CreatePageParams {
  const p = params as Record<string, unknown>
  return (
    typeof p === 'object' &&
    p !== null &&
    typeof p.title === 'string' &&
    (p.parent_id === null || typeof p.parent_id === 'string') &&
    (p.project_id === null || typeof p.project_id === 'string') &&
    (p.template === null || typeof p.template === 'string') &&
    (p.metadata === null || (typeof p.metadata === 'object' && !Array.isArray(p.metadata))) &&
    (p.blocks === null || Array.isArray(p.blocks))
  )
}

export function isUpdatePageParams(params: unknown): params is UpdatePageParams {
  const p = params as Record<string, unknown>
  return (
    typeof p === 'object' &&
    p !== null &&
    typeof p.page_id === 'string' &&
    (p.title === null || typeof p.title === 'string') &&
    (p.parent_id === null || typeof p.parent_id === 'string') &&
    (p.project_id === null || typeof p.project_id === 'string') &&
    (p.template === null || typeof p.template === 'string') &&
    (p.metadata === null || (typeof p.metadata === 'object' && !Array.isArray(p.metadata)))
  )
}

export function isAppendBlocksParams(params: unknown): params is AppendBlocksParams {
  const p = params as Record<string, unknown>
  return (
    typeof p === 'object' &&
    p !== null &&
    typeof p.page_id === 'string' &&
    (p.mode === null || p.mode === 'append' || p.mode === 'replace') &&
    Array.isArray(p.blocks)
  )
}

export function isCreateDatabaseParams(params: unknown): params is CreateDatabaseParams {
  const p = params as Record<string, unknown>
  return (
    typeof p === 'object' &&
    p !== null &&
    (p.parent_doc_id === null || typeof p.parent_doc_id === 'string') &&
    typeof p.title === 'string' &&
    (p.description === null || typeof p.description === 'string') &&
    Array.isArray(p.schema) &&
    (p.default_view === null || (typeof p.default_view === 'object' && !Array.isArray(p.default_view)))
  )
}

export function isQueryDatabaseParams(params: unknown): params is QueryDatabaseParams {
  const p = params as Record<string, unknown>
  return (
    typeof p === 'object' &&
    p !== null &&
    typeof p.database_id === 'string' &&
    (p.filters === null || Array.isArray(p.filters)) &&
    (p.sorts === null || Array.isArray(p.sorts)) &&
    (p.limit === null || typeof p.limit === 'number') &&
    (p.offset === null || typeof p.offset === 'number')
  )
}

export function isUpsertDatabaseRowParams(params: unknown): params is UpsertDatabaseRowParams {
  const p = params as Record<string, unknown>
  return (
    typeof p === 'object' &&
    p !== null &&
    typeof p.database_id === 'string' &&
    (p.row_id === null || typeof p.row_id === 'string') &&
    (p.page_id === null || typeof p.page_id === 'string') &&
    (p.position === null || typeof p.position === 'number') &&
    typeof p.properties === 'object' &&
    p.properties !== null &&
    !Array.isArray(p.properties)
  )
}

export function isListConnectorsParams(params: unknown): params is ListConnectorsParams {
  const p = params as Record<string, unknown>
  return (
    typeof p === 'object' &&
    p !== null &&
    (p.provider === null || typeof p.provider === 'string')
  )
}

export function isSearchMailParams(params: unknown): params is SearchMailParams {
  const p = params as Record<string, unknown>
  return (
    typeof p === 'object' &&
    p !== null &&
    typeof p.query === 'string' &&
    (p.limit === null || typeof p.limit === 'number') &&
    (p.status === null || typeof p.status === 'string')
  )
}

export function isSendMailParams(params: unknown): params is SendMailParams {
  const p = params as Record<string, unknown>
  return (
    typeof p === 'object' &&
    p !== null &&
    (p.connector_id === null || typeof p.connector_id === 'string') &&
    Array.isArray(p.to) &&
    (p.cc === null || Array.isArray(p.cc)) &&
    (p.bcc === null || Array.isArray(p.bcc)) &&
    typeof p.subject === 'string' &&
    typeof p.body_md === 'string' &&
    (p.body_html === null || typeof p.body_html === 'string') &&
    (p.project_id === null || typeof p.project_id === 'string') &&
    (p.metadata === null || (typeof p.metadata === 'object' && !Array.isArray(p.metadata)))
  )
}

export function isPostSlackMessageParams(params: unknown): params is PostSlackMessageParams {
  const p = params as Record<string, unknown>
  return (
    typeof p === 'object' &&
    p !== null &&
    (p.connector_id === null || typeof p.connector_id === 'string') &&
    (p.channel === null || typeof p.channel === 'string') &&
    typeof p.message === 'string' &&
    (p.blocks === null || Array.isArray(p.blocks))
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

    case TOOL_NAMES.SEARCH_WORKSPACE:
      return {
        valid: isSearchWorkspaceParams(params),
        error: isSearchWorkspaceParams(params) ? undefined : 'Invalid search_workspace parameters',
      }

    case TOOL_NAMES.GET_PAGE:
      return {
        valid: isGetPageParams(params),
        error: isGetPageParams(params) ? undefined : 'Invalid get_page parameters',
      }

    case TOOL_NAMES.CREATE_PAGE:
      return {
        valid: isCreatePageParams(params),
        error: isCreatePageParams(params) ? undefined : 'Invalid create_page parameters',
      }

    case TOOL_NAMES.UPDATE_PAGE:
      return {
        valid: isUpdatePageParams(params),
        error: isUpdatePageParams(params) ? undefined : 'Invalid update_page parameters',
      }

    case TOOL_NAMES.APPEND_BLOCKS:
      return {
        valid: isAppendBlocksParams(params),
        error: isAppendBlocksParams(params) ? undefined : 'Invalid append_blocks parameters',
      }

    case TOOL_NAMES.CREATE_DATABASE:
      return {
        valid: isCreateDatabaseParams(params),
        error: isCreateDatabaseParams(params) ? undefined : 'Invalid create_database parameters',
      }

    case TOOL_NAMES.QUERY_DATABASE:
      return {
        valid: isQueryDatabaseParams(params),
        error: isQueryDatabaseParams(params) ? undefined : 'Invalid query_database parameters',
      }

    case TOOL_NAMES.UPSERT_DATABASE_ROW:
      return {
        valid: isUpsertDatabaseRowParams(params),
        error: isUpsertDatabaseRowParams(params) ? undefined : 'Invalid upsert_database_row parameters',
      }

    case TOOL_NAMES.LIST_CONNECTORS:
      return {
        valid: isListConnectorsParams(params),
        error: isListConnectorsParams(params) ? undefined : 'Invalid list_connectors parameters',
      }

    case TOOL_NAMES.SEARCH_MAIL:
      return {
        valid: isSearchMailParams(params),
        error: isSearchMailParams(params) ? undefined : 'Invalid search_mail parameters',
      }

    case TOOL_NAMES.SEND_MAIL:
      return {
        valid: isSendMailParams(params),
        error: isSendMailParams(params) ? undefined : 'Invalid send_mail parameters',
      }

    case TOOL_NAMES.POST_SLACK_MESSAGE:
      return {
        valid: isPostSlackMessageParams(params),
        error: isPostSlackMessageParams(params) ? undefined : 'Invalid post_slack_message parameters',
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
