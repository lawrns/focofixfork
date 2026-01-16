import { z } from 'zod';
import { supabase } from '../db.js';
import { validateAdmin, isAdminOfWorkspace } from '../admin-auth.js';

export const getUserTasksSchema = z.object({
  user_id: z.string().uuid().optional().describe('User ID to get tasks for'),
  user_email: z.string().email().optional().describe('User email to get tasks for'),
  workspace_id: z.string().uuid().optional().describe('Filter by workspace (optional)'),
  include_completed: z.boolean().default(false).describe('Include completed tasks'),
}).refine(
  data => data.user_id || data.user_email,
  { message: 'Either user_id or user_email must be provided' }
);

export type GetUserTasksInput = z.infer<typeof getUserTasksSchema>;

export async function getUserTasks(input: GetUserTasksInput) {
  const admin = await validateAdmin();

  // Resolve user_id from email if needed
  let userId = input.user_id;
  let userEmail = input.user_email;

  if (!userId && userEmail) {
    const { data: authData } = await supabase.auth.admin.listUsers();
    const user = (authData?.users || []).find((u: any) => u.email === userEmail);
    if (!user) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'NOT_FOUND',
              message: `User with email ${userEmail} not found`,
            }),
          },
        ],
        isError: true,
      };
    }
    userId = user.id;
  }

  // Get user email if not provided
  if (userId && !userEmail) {
    const { data: authData } = await supabase.auth.admin.getUserById(userId);
    userEmail = authData?.user?.email || undefined;
  }

  // Build query
  let query = supabase
    .from('work_items')
    .select(`
      id,
      workspace_id,
      project_id,
      title,
      description,
      status,
      priority,
      type,
      due_date,
      created_at,
      updated_at
    `)
    .eq('assignee_id', userId)
    .order('priority', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false });

  // Filter by workspace if provided
  if (input.workspace_id) {
    if (!isAdminOfWorkspace(admin, input.workspace_id)) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'UNAUTHORIZED',
              message: `You are not an admin of workspace ${input.workspace_id}`,
            }),
          },
        ],
        isError: true,
      };
    }
    query = query.eq('workspace_id', input.workspace_id);
  } else {
    // Only show tasks from admin's workspaces
    const workspaceIds = admin.workspaces.map(w => w.workspaceId);
    query = query.in('workspace_id', workspaceIds);
  }

  // Exclude completed unless requested
  if (!input.include_completed) {
    query = query.neq('status', 'done');
  }

  const { data: tasks, error } = await query;

  if (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: 'DATABASE_ERROR',
            message: error.message,
          }),
        },
      ],
      isError: true,
    };
  }

  // Get project names
  const projectIds = [...new Set(tasks?.map(t => t.project_id) || [])];
  const { data: projects } = await supabase
    .from('foco_projects')
    .select('id, name, slug')
    .in('id', projectIds);

  const projectMap = new Map(projects?.map(p => [p.id, p]) || []);

  // Enrich tasks
  const enrichedTasks = tasks?.map(t => ({
    ...t,
    project_name: projectMap.get(t.project_id)?.name || 'Unknown',
    project_slug: projectMap.get(t.project_id)?.slug || 'unknown',
  })) || [];

  // Group by status
  const byStatus = {
    urgent: enrichedTasks.filter(t => t.priority === 'urgent'),
    in_progress: enrichedTasks.filter(t => t.status === 'in_progress'),
    next: enrichedTasks.filter(t => t.status === 'next'),
    backlog: enrichedTasks.filter(t => t.status === 'backlog'),
    blocked: enrichedTasks.filter(t => t.status === 'blocked'),
    review: enrichedTasks.filter(t => t.status === 'review'),
    done: enrichedTasks.filter(t => t.status === 'done'),
  };

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            user: {
              id: userId,
              email: userEmail,
            },
            summary: {
              total: enrichedTasks.length,
              urgent: byStatus.urgent.length,
              in_progress: byStatus.in_progress.length,
              next: byStatus.next.length,
              blocked: byStatus.blocked.length,
            },
            tasks: enrichedTasks,
          },
          null,
          2
        ),
      },
    ],
  };
}
