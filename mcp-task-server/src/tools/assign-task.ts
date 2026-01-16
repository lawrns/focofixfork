import { z } from 'zod';
import { supabase } from '../db.js';
import { validateAdmin, isAdminOfWorkspace } from '../admin-auth.js';

export const assignTaskSchema = z.object({
  task_id: z.string().uuid().describe('The task ID to assign'),
  assignee_id: z.string().uuid().optional().describe('User ID to assign the task to'),
  assignee_email: z.string().email().optional().describe('Email of user to assign (alternative to assignee_id)'),
}).refine(
  data => data.assignee_id || data.assignee_email,
  { message: 'Either assignee_id or assignee_email must be provided' }
);

export type AssignTaskInput = z.infer<typeof assignTaskSchema>;

export async function assignTask(input: AssignTaskInput) {
  const admin = await validateAdmin();

  // Get task to verify workspace access
  const { data: task, error: taskError } = await supabase
    .from('work_items')
    .select('id, workspace_id, project_id, title')
    .eq('id', input.task_id)
    .single();

  if (taskError || !task) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: 'NOT_FOUND',
            message: `Task ${input.task_id} not found`,
          }),
        },
      ],
      isError: true,
    };
  }

  if (!isAdminOfWorkspace(admin, task.workspace_id)) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: 'UNAUTHORIZED',
            message: `You are not an admin of the workspace containing this task`,
          }),
        },
      ],
      isError: true,
    };
  }

  // Resolve assignee_id from email if provided
  let assigneeId = input.assignee_id;
  let assigneeEmail = input.assignee_email;

  if (!assigneeId && assigneeEmail) {
    const { data: authData } = await supabase.auth.admin.listUsers();
    const user = (authData?.users || []).find((u: any) => u.email === assigneeEmail);
    if (user) {
      assigneeId = user.id;
    } else {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'NOT_FOUND',
              message: `User with email ${assigneeEmail} not found`,
            }),
          },
        ],
        isError: true,
      };
    }
  }

  // Get assignee email if not provided
  if (assigneeId && !assigneeEmail) {
    const { data: authData } = await supabase.auth.admin.getUserById(assigneeId);
    assigneeEmail = authData?.user?.email || undefined;
  }

  // Verify assignee is a workspace member
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', task.workspace_id)
    .eq('user_id', assigneeId)
    .single();

  if (!membership) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: 'INVALID_ASSIGNEE',
            message: `User ${assigneeEmail} is not a member of this workspace`,
          }),
        },
      ],
      isError: true,
    };
  }

  // Update the task assignment
  const { error: updateError } = await supabase
    .from('work_items')
    .update({
      assignee_id: assigneeId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.task_id);

  if (updateError) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: 'DATABASE_ERROR',
            message: updateError.message,
          }),
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            message: `Task "${task.title}" assigned to ${assigneeEmail}`,
            task: {
              id: task.id,
              title: task.title,
              assignee_id: assigneeId,
              assignee_email: assigneeEmail,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}
