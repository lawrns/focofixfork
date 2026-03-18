#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { listWorkspaces, listWorkspacesSchema } from './tools/list-workspaces.js';
import { listProjects, listProjectsSchema } from './tools/list-projects.js';
import { listMembers, listMembersSchema } from './tools/list-members.js';
import { createTask, createTaskSchema } from './tools/create-task.js';
import { assignTask, assignTaskSchema } from './tools/assign-task.js';
import { listTasks, listTasksSchema } from './tools/list-tasks.js';
import { getUserTasks, getUserTasksSchema } from './tools/get-user-tasks.js';
import { listPages, listPagesSchema } from './tools/list-pages.js';
import { getPage, getPageSchema } from './tools/get-page.js';
import { createPage, createPageSchema } from './tools/create-page.js';
import { appendBlocks, appendBlocksSchema } from './tools/append-blocks.js';
import { listDatabases, listDatabasesSchema } from './tools/list-databases.js';
import { createDatabase, createDatabaseSchema } from './tools/create-database.js';
import { queryDatabase, queryDatabaseSchema } from './tools/query-database.js';
import { upsertDatabaseRow, upsertDatabaseRowSchema } from './tools/upsert-database-row.js';
import { searchWorkspace, searchWorkspaceSchema } from './tools/search-workspace.js';

const server = new Server(
  {
    name: 'foco-task-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const TOOLS = [
  {
    name: 'list_workspaces',
    description: 'List all workspaces where you are an admin or owner. Use this first to get workspace IDs.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'list_projects',
    description: 'List all projects in a workspace. Requires workspace_id.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspace_id: {
          type: 'string',
          description: 'The workspace ID to list projects from',
        },
      },
      required: ['workspace_id'],
    },
  },
  {
    name: 'list_members',
    description: 'List all team members in a workspace with their roles and emails.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspace_id: {
          type: 'string',
          description: 'The workspace ID to list members from',
        },
      },
      required: ['workspace_id'],
    },
  },
  {
    name: 'create_task',
    description: 'Create a new task in a project and optionally assign it to a team member.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_id: {
          type: 'string',
          description: 'The project ID to create the task in',
        },
        title: {
          type: 'string',
          description: 'Task title (required)',
        },
        description: {
          type: 'string',
          description: 'Task description (optional)',
        },
        assignee_id: {
          type: 'string',
          description: 'User ID to assign the task to (optional)',
        },
        assignee_email: {
          type: 'string',
          description: 'Email of user to assign (alternative to assignee_id)',
        },
        status: {
          type: 'string',
          enum: ['backlog', 'next', 'in_progress', 'review', 'blocked', 'done'],
          description: 'Task status (default: backlog)',
        },
        priority: {
          type: 'string',
          enum: ['urgent', 'high', 'medium', 'low', 'none'],
          description: 'Task priority (default: none)',
        },
        type: {
          type: 'string',
          enum: ['task', 'bug', 'feature', 'milestone'],
          description: 'Work item type (default: task)',
        },
        due_date: {
          type: 'string',
          description: 'Due date in YYYY-MM-DD format (optional)',
        },
      },
      required: ['project_id', 'title'],
    },
  },
  {
    name: 'assign_task',
    description: 'Assign an existing task to a team member.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        task_id: {
          type: 'string',
          description: 'The task ID to assign',
        },
        assignee_id: {
          type: 'string',
          description: 'User ID to assign the task to',
        },
        assignee_email: {
          type: 'string',
          description: 'Email of user to assign (alternative to assignee_id)',
        },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'list_tasks',
    description: 'List tasks with optional filters by workspace, project, assignee, or status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspace_id: {
          type: 'string',
          description: 'Filter by workspace ID (optional)',
        },
        project_id: {
          type: 'string',
          description: 'Filter by project ID (optional)',
        },
        assignee_id: {
          type: 'string',
          description: 'Filter by assignee user ID (optional)',
        },
        assignee_email: {
          type: 'string',
          description: 'Filter by assignee email (optional)',
        },
        status: {
          type: 'string',
          enum: ['backlog', 'next', 'in_progress', 'review', 'blocked', 'done'],
          description: 'Filter by status (optional)',
        },
        limit: {
          type: 'number',
          description: 'Max results to return (default: 50, max: 100)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_user_tasks',
    description: 'Get all tasks assigned to a specific user, grouped by priority and status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        user_id: {
          type: 'string',
          description: 'User ID to get tasks for',
        },
        user_email: {
          type: 'string',
          description: 'User email to get tasks for (alternative to user_id)',
        },
        workspace_id: {
          type: 'string',
          description: 'Filter by workspace (optional)',
        },
        include_completed: {
          type: 'boolean',
          description: 'Include completed tasks (default: false)',
        },
      },
      required: [],
    },
  },
  {
    name: 'list_pages',
    description: 'List workspace pages backed by the block-based document model.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspace_id: { type: 'string', description: 'Workspace ID' },
        project_id: { type: 'string', description: 'Optional project filter' },
        parent_id: { type: 'string', description: 'Optional parent page filter' },
        include_archived: { type: 'boolean', description: 'Include archived pages' },
        limit: { type: 'number', description: 'Maximum page count' },
      },
      required: ['workspace_id'],
    },
  },
  {
    name: 'get_page',
    description: 'Fetch a workspace page with optional blocks and databases.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspace_id: { type: 'string', description: 'Workspace ID' },
        page_id: { type: 'string', description: 'Page ID' },
        include_blocks: { type: 'boolean', description: 'Include page blocks' },
        include_databases: { type: 'boolean', description: 'Include databases attached to the page' },
        include_archived: { type: 'boolean', description: 'Include archived records' },
      },
      required: ['workspace_id', 'page_id'],
    },
  },
  {
    name: 'create_page',
    description: 'Create a workspace page and optionally seed initial blocks.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspace_id: { type: 'string', description: 'Workspace ID' },
        title: { type: 'string', description: 'Page title' },
        parent_id: { type: 'string', description: 'Optional parent page ID' },
        project_id: { type: 'string', description: 'Optional project ID' },
        template: { type: 'string', description: 'Optional template key' },
        metadata: { type: 'object', description: 'Optional metadata' },
        blocks: { type: 'array', description: 'Optional initial blocks', items: { type: 'object' } },
      },
      required: ['workspace_id', 'title'],
    },
  },
  {
    name: 'append_blocks',
    description: 'Append or replace blocks on an existing page.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspace_id: { type: 'string', description: 'Workspace ID' },
        page_id: { type: 'string', description: 'Page ID' },
        mode: { type: 'string', enum: ['append', 'replace'], description: 'Write mode' },
        blocks: { type: 'array', description: 'Blocks to write', items: { type: 'object' } },
      },
      required: ['workspace_id', 'page_id', 'blocks'],
    },
  },
  {
    name: 'list_databases',
    description: 'List structured workspace databases.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspace_id: { type: 'string', description: 'Workspace ID' },
        parent_doc_id: { type: 'string', description: 'Optional parent page filter' },
        include_archived: { type: 'boolean', description: 'Include archived databases' },
        limit: { type: 'number', description: 'Maximum database count' },
      },
      required: ['workspace_id'],
    },
  },
  {
    name: 'create_database',
    description: 'Create a structured workspace database.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspace_id: { type: 'string', description: 'Workspace ID' },
        parent_doc_id: { type: 'string', description: 'Optional parent page ID' },
        title: { type: 'string', description: 'Database title' },
        description: { type: 'string', description: 'Optional description' },
        schema: { type: 'array', description: 'Property schema', items: { type: 'object' } },
        default_view: { type: 'object', description: 'Optional default view config' },
      },
      required: ['workspace_id', 'title', 'schema'],
    },
  },
  {
    name: 'query_database',
    description: 'Query a structured database with filters and sorting.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspace_id: { type: 'string', description: 'Workspace ID' },
        database_id: { type: 'string', description: 'Database ID' },
        filters: { type: 'array', description: 'Optional filters', items: { type: 'object' } },
        sorts: { type: 'array', description: 'Optional sort order', items: { type: 'object' } },
        include_archived: { type: 'boolean', description: 'Include archived rows' },
        limit: { type: 'number', description: 'Maximum row count' },
        offset: { type: 'number', description: 'Pagination offset' },
      },
      required: ['workspace_id', 'database_id'],
    },
  },
  {
    name: 'upsert_database_row',
    description: 'Create or update a structured database row.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspace_id: { type: 'string', description: 'Workspace ID' },
        database_id: { type: 'string', description: 'Database ID' },
        row_id: { type: 'string', description: 'Optional row ID to update' },
        page_id: { type: 'string', description: 'Optional linked page ID' },
        position: { type: 'number', description: 'Optional row position' },
        properties: { type: 'object', description: 'Structured row properties' },
      },
      required: ['workspace_id', 'database_id', 'properties'],
    },
  },
  {
    name: 'search_workspace',
    description: 'Search pages, blocks, databases, and rows in a workspace.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspace_id: { type: 'string', description: 'Workspace ID' },
        query: { type: 'string', description: 'Search query' },
        entity_types: { type: 'array', description: 'Optional entity type filter', items: { type: 'string' } },
        limit: { type: 'number', description: 'Maximum result count' },
      },
      required: ['workspace_id', 'query'],
    },
  },
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request: { params: { name: string; arguments?: unknown } }) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_workspaces':
        return await listWorkspaces();

      case 'list_projects':
        const projectsInput = listProjectsSchema.parse(args);
        return await listProjects(projectsInput);

      case 'list_members':
        const membersInput = listMembersSchema.parse(args);
        return await listMembers(membersInput);

      case 'create_task':
        const createInput = createTaskSchema.parse(args);
        return await createTask(createInput);

      case 'assign_task':
        const assignInput = assignTaskSchema.parse(args);
        return await assignTask(assignInput);

      case 'list_tasks':
        const listInput = listTasksSchema.parse(args);
        return await listTasks(listInput);

      case 'get_user_tasks':
        const getUserInput = getUserTasksSchema.parse(args);
        return await getUserTasks(getUserInput);

      case 'list_pages':
        return await listPages(listPagesSchema.parse(args));

      case 'get_page':
        return await getPage(getPageSchema.parse(args));

      case 'create_page':
        return await createPage(createPageSchema.parse(args));

      case 'append_blocks':
        return await appendBlocks(appendBlocksSchema.parse(args));

      case 'list_databases':
        return await listDatabases(listDatabasesSchema.parse(args));

      case 'create_database':
        return await createDatabase(createDatabaseSchema.parse(args));

      case 'query_database':
        return await queryDatabase(queryDatabaseSchema.parse(args));

      case 'upsert_database_row':
        return await upsertDatabaseRow(upsertDatabaseRowSchema.parse(args));

      case 'search_workspace':
        return await searchWorkspace(searchWorkspaceSchema.parse(args));

      default:
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: 'UNKNOWN_TOOL', message: `Unknown tool: ${name}` }),
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ error: 'TOOL_ERROR', message }),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 Foco MCP Task Server running');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
