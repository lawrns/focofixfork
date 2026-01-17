import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { cachedFetch, generateCacheKey } from '@/lib/cache/redis'
import { CACHE_TTL } from '@/lib/cache/cache-config'
import { TaskRepository } from '@/lib/repositories/task-repository'
import { isError } from '@/lib/repositories/base-repository'
import {
  successResponse,
  authRequiredResponse,
  databaseErrorResponse,
  missingFieldResponse,
  projectNotFoundResponse,
  createPaginationMeta,
} from '@/lib/api/response-helpers'
import type { TaskFilters } from '@/lib/repositories/task-repository'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)

  if (error || !user) {
    return mergeAuthResponse(authRequiredResponse(), authResponse)
  }

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('project_id') || undefined
  const status = searchParams.get('status') as TaskFilters['status'] | null
  const assigneeId = searchParams.get('assignee_id') || undefined
  const workspaceId = searchParams.get('workspace_id') || undefined
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200)
  const offset = parseInt(searchParams.get('offset') || '0')

  const cacheKey = generateCacheKey('tasks', {
    projectId: projectId || 'all',
    status: status || 'all',
    assigneeId: assigneeId || 'all',
    workspaceId: workspaceId || 'all',
    limit,
    offset,
  })

  const result = await cachedFetch(
    cacheKey,
    async () => {
      const taskRepo = new TaskRepository(supabase)

      const filters: TaskFilters = {}
      if (projectId) filters.project_id = projectId
      if (status) filters.status = status
      if (assigneeId) filters.assignee_id = assigneeId
      if (workspaceId) filters.workspace_id = workspaceId

      const tasksResult = await taskRepo.findTasks(filters, { limit, offset })

      if (isError(tasksResult)) {
        throw new Error(tasksResult.error.message)
      }

      return tasksResult.data
    },
    { ttl: CACHE_TTL.TASKS }
  )

  return mergeAuthResponse(successResponse(
    result,
    createPaginationMeta(result.pagination.total, result.pagination.limit, result.pagination.offset)
  ), authResponse)
}

export async function POST(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)

  if (error || !user) {
    return mergeAuthResponse(authRequiredResponse(), authResponse)
  }

  const body = await req.json()

  // Validate required fields
  if (!body.title) {
    return missingFieldResponse('title')
  }

  if (!body.project_id) {
    return missingFieldResponse('project_id')
  }

  // Get workspace_id from project using ProjectRepository
  const { ProjectRepository } = await import('@/lib/repositories/project-repository')
  const projectRepo = new ProjectRepository(supabase)
  const projectResult = await projectRepo.findById(body.project_id)

  if (isError(projectResult)) {
    if (projectResult.error.code === 'NOT_FOUND') {
      return projectNotFoundResponse(body.project_id)
    }
    return databaseErrorResponse(projectResult.error.message, projectResult.error.details)
  }

  const project = projectResult.data

  // Create task using TaskRepository
  const taskRepo = new TaskRepository(supabase)
  const taskResult = await taskRepo.createTask({
    workspace_id: project.workspace_id,
    project_id: body.project_id,
    title: body.title,
    description: body.description || null,
    status: body.status || 'backlog',
    priority: body.priority || 'none',
    assignee_id: body.assignee_id || null,
    due_date: body.due_date || null,
    position: body.position, // Let repository generate fractional index if not provided
    reporter_id: user.id,
    type: 'task',
  })

  if (isError(taskResult)) {
    return databaseErrorResponse(taskResult.error.message, taskResult.error.details)
  }

  // OPTIMIZATION: Invalidate related caches after mutation
  const { invalidateCache } = await import('@/lib/cache/redis')
  const { CACHE_INVALIDATION_PATTERNS } = await import('@/lib/cache/cache-config')

  await invalidateCache(
    CACHE_INVALIDATION_PATTERNS.TASK(project.workspace_id, body.project_id)
  )

  return mergeAuthResponse(successResponse(taskResult.data, undefined, 201), authResponse)
}
