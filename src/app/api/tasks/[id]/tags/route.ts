import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/api/auth-helper';

import { z } from 'zod';
import { TaskTagRepository } from '@/lib/repositories/task-tag-repository';
import { isError } from '@/lib/repositories/base-repository';
import {
  authRequiredResponse,
  successResponse,
  databaseErrorResponse,
  taskNotFoundResponse,
  workspaceAccessDeniedResponse,
  validationFailedResponse,
  notFoundResponse,
  validateUUID,
} from '@/lib/api/response-helpers';

export const dynamic = 'force-dynamic'

const AssignTagSchema = z.object({
  tag_ids: z.array(z.string().uuid()).min(1, 'At least one tag is required'),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req);

    if (error || !user) {
      return authRequiredResponse();
    }

    const { id: taskId } = params;

    const uuidError = validateUUID('id', taskId);
    if (uuidError) {
      return uuidError;
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

    const tagsResult = await repo.getTagsForTask(taskId);
    if (isError(tagsResult)) {
      return databaseErrorResponse(tagsResult.error.message, tagsResult.error.details);
    }

    return successResponse(tagsResult.data);
  } catch (err: any) {
    console.error('Task tags GET error:', err);
    return databaseErrorResponse('Failed to fetch task tags', err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req);

    if (error || !user) {
      return authRequiredResponse();
    }

    const { id: taskId } = params;

    const uuidError = validateUUID('id', taskId);
    if (uuidError) {
      return uuidError;
    }

    const body = await req.json();

    const validationResult = AssignTagSchema.safeParse(body);
    if (!validationResult.success) {
      return validationFailedResponse(
        'Invalid request',
        validationResult.error.errors
      );
    }

    const { tag_ids } = validationResult.data;

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

    const tagsResult = await repo.verifyTagsInWorkspace(tag_ids, task.workspace_id);
    if (isError(tagsResult)) {
      if (tagsResult.error.code === 'NOT_FOUND') {
        return notFoundResponse('tags', tag_ids.join(','));
      }
      if (tagsResult.error.code === 'VALIDATION_FAILED') {
        return validationFailedResponse(
          tagsResult.error.message,
          tagsResult.error.details
        );
      }
      return databaseErrorResponse(tagsResult.error.message, tagsResult.error.details);
    }

    const existingTagIdsResult = await repo.getExistingTagIds(taskId);
    if (isError(existingTagIdsResult)) {
      return databaseErrorResponse(
        existingTagIdsResult.error.message,
        existingTagIdsResult.error.details
      );
    }

    const existingTagIds = existingTagIdsResult.data;
    const tagsToAdd = tag_ids.filter(id => !existingTagIds.includes(id));

    if (tagsToAdd.length > 0) {
      const assignResult = await repo.assignTagsToTask(taskId, tagsToAdd);
      if (isError(assignResult)) {
        return databaseErrorResponse(
          assignResult.error.message,
          assignResult.error.details
        );
      }
    }

    const updatedTagsResult = await repo.getTagsForTask(taskId);
    if (isError(updatedTagsResult)) {
      return databaseErrorResponse(
        updatedTagsResult.error.message,
        updatedTagsResult.error.details
      );
    }

    return successResponse(
      {
        task_id: taskId,
        tags: updatedTagsResult.data.tags,
        added_count: tagsToAdd.length,
      },
      undefined,
      201
    );
  } catch (err: any) {
    console.error('Task tags POST error:', err);
    return databaseErrorResponse('Failed to assign tags', err);
  }
}
