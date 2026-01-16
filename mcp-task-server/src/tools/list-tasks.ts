import { z } from 'zod';
import { supabase, WorkItem } from '../db.js';
import { validateAdmin, isAdminOfWorkspace } from '../admin-auth.js';

export const listTasksSchema = z.object({
  workspace_id: z.string().uuid().optional().describe('Filter by workspace ID'),
  project_id: z.string().uuid().optional().describe('Filter by project ID'),
  assignee_id: z.string().uuid().optional().describe('Filter by assignee user ID'),
  assignee_email: z.string().email().optional().describe('Filter by assignee email'),
  status: z.enum(['backlog', 'next', 'in_progress', 'review', 'blocked', 'done']).optional().describe('Filter by status'),
  limit: z.number().min(1).max(100).default(50).describe('Max results to return'),
});

export type ListTasksInput = z.infer<typeof listTasksSchema>;

export async function listTasks(input: ListTasksInput) {
  const admin = await validateAdmin();

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
      assignee_id,
      reporter_id,
      due_date,
      created_at,
      updated_at
    `)
    .order('updated_at', { ascending: false })
    .limit(input.limit);

  // Apply filters
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
    // Filter to only admin's workspaces
    const workspaceIds = admin.workspaces.map(w => w.workspaceId);
    query = query.in('workspace_id', workspaceIds);
  }

  if (input.project_id) {
    query = query.eq('project_id', input.project_id);
  }

  if (input.status) {
    query = query.eq('status', input.status);
  }

  // Handle assignee filter
  let assigneeId = input.assignee_id;
  if (!assigneeId && input.assignee_email) {
    const { data: authData } = await supabase.auth.admin.listUsers();
    const user = (authData?.users || []).find((u: any) => u.email === input.assignee_email);
    if (user) {
      assigneeId = user.id;
    }
  }

  if (assigneeId) {
    query = query.eq('assignee_id', assigneeId);
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

  // Get assignee emails
  const assigneeIds = [...new Set(tasks?.filter(t => t.assignee_id).map(t => t.assignee_id) || [])];
  const { data: authData2 } = await supabase.auth.admin.listUsers();
  const userMap = new Map<string, string>();
  (authData2?.users || []).forEach((u: any) => userMap.set(u.id, u.email || ''));

  // Enrich tasks
  const enrichedTasks = tasks?.map(t => ({
    ...t,
    project_name: projectMap.get(t.project_id)?.name || 'Unknown',
    project_slug: projectMap.get(t.project_id)?.slug || 'unknown',
    assignee_email: t.assignee_id ? userMap.get(t.assignee_id) || null : null,
  })) || [];

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            tasks: enrichedTasks,
            count: enrichedTasks.length,
            filters: {
              workspace_id: input.workspace_id,
              project_id: input.project_id,
              assignee_id: assigneeId,
              status: input.status,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}
