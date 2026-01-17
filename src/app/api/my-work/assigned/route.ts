import { NextRequest } from 'next/server';
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper';

import { TaskRepository } from '@/lib/repositories/task-repository';
import { isError } from '@/lib/repositories/base-repository';
import {
  successResponse,
  authRequiredResponse,
  databaseErrorResponse,
} from '@/lib/api/response-helpers';

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req);

  if (error || !user) {
    return mergeAuthResponse(authRequiredResponse(), authResponse);
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as any;
  const includeCompleted = searchParams.get('include_completed') === 'true';
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);
  const offset = parseInt(searchParams.get('offset') || '0');

  const taskRepo = new TaskRepository(supabase);

  // Get tasks assigned to the current user
  const tasksResult = await taskRepo.findTasks(
    { 
      assignee_id: user.id,
      ...(status && status !== 'all' ? { status } : {}),
    },
    { limit, offset }
  );

  if (isError(tasksResult)) {
    return databaseErrorResponse(tasksResult.error.message, tasksResult.error.details);
  }

  // Filter out completed if not requested
  let tasks = tasksResult.data.data;
  if (!includeCompleted) {
    tasks = tasks.filter(t => t.status !== 'done');
  }

  // Get project details for each task
  const projectIds = [...new Set(tasks.map(t => t.project_id))];
  const { data: projects } = await supabase
    .from('foco_projects')
    .select('id, name, slug, color')
    .in('id', projectIds);

  const projectMap = new Map(projects?.map(p => [p.id, p]) || []);

  // Enrich tasks with project info and section mapping
  const enrichedTasks = tasks.map(t => ({
    ...t,
    project: projectMap.get(t.project_id) || null,
    section: mapStatusToSection(t.status, t.priority),
  }));

  // Group by priority for summary
  const summary = {
    total: enrichedTasks.length,
    urgent: enrichedTasks.filter(t => t.priority === 'urgent').length,
    high: enrichedTasks.filter(t => t.priority === 'high').length,
    in_progress: enrichedTasks.filter(t => t.status === 'in_progress').length,
    blocked: enrichedTasks.filter(t => t.status === 'blocked').length,
    overdue: enrichedTasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length,
  };

  return mergeAuthResponse(successResponse({
    tasks: enrichedTasks,
    summary,
    pagination: tasksResult.data.pagination,
  }), authResponse);
}

function mapStatusToSection(status: string, priority: string): string {
  if (status === 'in_progress') return 'now';
  if (status === 'blocked') return 'waiting';
  if (priority === 'urgent' || priority === 'high') return 'next';
  if (status === 'next') return 'next';
  return 'later';
}
