#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
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
