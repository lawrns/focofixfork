import { NextRequest } from 'next/server';
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper';

import { TaskTagRepository } from '@/lib/repositories/task-tag-repository';
import { isError } from '@/lib/repositories/base-repository';
import {
  authRequiredResponse,
  successResponse,
  databaseErrorResponse,
  taskNotFoundResponse,
  workspaceAccessDeniedResponse,
  notFoundResponse,
  validateUUID,
} from '@/lib/api/response-helpers';

export const dynamic = 'force-dynamic'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tag_id: string }> }
) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req);

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse);
    }

    const { id: taskId, tag_id: tagId } = await params;

    const taskUuidError = validateUUID('id', taskId);
    if (taskUuidError) {
      return taskUuidError;
    }

    const tagUuidError = validateUUID('tag_id', tagId);
    if (tagUuidError) {
      return tagUuidError;
    }

    const repo = new TaskTagRepository(supabase);

    const taskResult = await repo.getTaskWithWorkspace(taskId);
    if (isError(taskResult)) {
      if (taskResult.error.code === 'NOT_FOUND') {
        return taskNotFoundResponse(taskId);
      }
      return databaseErrorResponse(taskResult.error.message, taskResult.error.details);
    }

    const task = taskResult.data;

    const accessResult = await repo.verifyWorkspaceAccess(task.workspace_id, user.id);
    if (isError(accessResult)) {
      if (accessResult.error.code === 'WORKSPACE_ACCESS_DENIED') {
        return workspaceAccessDeniedResponse(task.workspace_id);
      }
      return databaseErrorResponse(accessResult.error.message, accessResult.error.details);
    }

    const tagResult = await repo.verifyTagInWorkspace(tagId, task.workspace_id);
    if (isError(tagResult)) {
      if (tagResult.error.code === 'NOT_FOUND') {
        return notFoundResponse('Tag', tagId);
      }
      return databaseErrorResponse(tagResult.error.message, tagResult.error.details);
    }

    const removeResult = await repo.removeTagFromTask(taskId, tagId);
    if (isError(removeResult)) {
      const errorRes = databaseErrorResponse(removeResult.error.message, removeResult.error.details);
      return mergeAuthResponse(errorRes, authResponse);
    }

    return mergeAuthResponse(successResponse(
      {
        task_id: taskId,
        tag_id: tagId,
        message: 'Tag removed from task',
      },
      undefined,
      200
    ), authResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to remove tag from task', message);
  }
}
