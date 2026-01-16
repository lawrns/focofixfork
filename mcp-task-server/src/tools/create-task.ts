import { z } from 'zod';
import { supabase, WorkItemStatus, PriorityLevel, WorkItemType } from '../db.js';
import { validateAdmin, isAdminOfWorkspace } from '../admin-auth.js';

export const createTaskSchema = z.object({
  project_id: z.string().uuid().describe('The project ID to create the task in'),
  title: z.string().min(1).max(500).describe('Task title'),
  description: z.string().optional().describe('Task description (optional)'),
  assignee_id: z.string().uuid().optional().describe('User ID to assign the task to (optional)'),
  assignee_email: z.string().email().optional().describe('Email of user to assign (alternative to assignee_id)'),
  status: z.enum(['backlog', 'next', 'in_progress', 'review', 'blocked', 'done']).default('backlog').describe('Task status'),
  priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).default('none').describe('Task priority'),
  type: z.enum(['task', 'bug', 'feature', 'milestone']).default('task').describe('Work item type'),
  due_date: z.string().optional().describe('Due date in YYYY-MM-DD format (optional)'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

function generateFractionalIndex(): string {
  return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export async function createTask(input: CreateTaskInput) {
  const admin = await validateAdmin();

  // Get project to verify workspace access
  const { data: project, error: projectError } = await supabase
    .from('foco_projects')
    .select('id, workspace_id, name')
    .eq('id', input.project_id)
    .single();

  if (projectError || !project) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: 'NOT_FOUND',
            message: `Project ${input.project_id} not found`,
          }),
        },
      ],
      isError: true,
    };
  }

  if (!isAdminOfWorkspace(admin, project.workspace_id)) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: 'UNAUTHORIZED',
            message: `You are not an admin of the workspace containing this project`,
          }),
        },
      ],
      isError: true,
    };
  }

  // Resolve assignee_id from email if provided
  let assigneeId = input.assignee_id;
  if (!assigneeId && input.assignee_email) {
    const { data: authData } = await supabase.auth.admin.listUsers();
    const user = (authData?.users || []).find((u: any) => u.email === input.assignee_email);
    if (user) {
      assigneeId = user.id;
    } else {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'NOT_FOUND',
              message: `User with email ${input.assignee_email} not found`,
            }),
          },
        ],
        isError: true,
      };
    }
  }

  // Verify assignee is a workspace member
  if (assigneeId) {
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', project.workspace_id)
      .eq('user_id', assigneeId)
      .single();

    if (!membership) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'INVALID_ASSIGNEE',
              message: `User is not a member of this workspace`,
            }),
          },
        ],
        isError: true,
      };
    }
  }

  // Create the task
  const { data: task, error: taskError } = await supabase
    .from('work_items')
    .insert({
      workspace_id: project.workspace_id,
      project_id: input.project_id,
      title: input.title,
      description: input.description || null,
      assignee_id: assigneeId || null,
      reporter_id: admin.userId,
      status: input.status as WorkItemStatus,
      priority: input.priority as PriorityLevel,
      type: input.type as WorkItemType,
      due_date: input.due_date || null,
      position: generateFractionalIndex(),
      ai_context_sources: [],
      metadata: { created_via: 'mcp-task-server' },
    })
    .select()
    .single();

  if (taskError) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: 'DATABASE_ERROR',
            message: taskError.message,
          }),
        },
      ],
      isError: true,
    };
  }

  // Get assignee email for response
  let assigneeEmail: string | undefined;
  if (assigneeId) {
    const { data: authData } = await supabase.auth.admin.getUserById(assigneeId);
    assigneeEmail = authData?.user?.email || undefined;
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            message: assigneeId 
              ? `Task "${input.title}" created and assigned to ${assigneeEmail}`
              : `Task "${input.title}" created (unassigned)`,
            task: {
              id: task.id,
              title: task.title,
              project: project.name,
              status: task.status,
              priority: task.priority,
              assignee_id: task.assignee_id,
              assignee_email: assigneeEmail,
              due_date: task.due_date,
              created_at: task.created_at,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}
