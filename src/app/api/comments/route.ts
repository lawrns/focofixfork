import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { GetCommentsSchema, CreateCommentApiSchema } from '@/lib/validation/schemas/comment-api.schema'
import { CommentsService } from '@/lib/services/comments'

/**
 * GET /api/comments - List comments with optional filtering
 */
export async function GET(request: NextRequest) {
  return wrapRoute(GetCommentsSchema, async ({ input, user, correlationId }) => {
    const filters = input.query || {}

    // Map to service filters
    const serviceFilters = {
      entity_type: filters.task_id ? 'task' : filters.project_id ? 'project' : undefined,
      entity_id: filters.task_id || filters.project_id,
      limit: filters.limit,
      offset: filters.offset,
    }

    const result = await CommentsService.getComments(serviceFilters)

    return {
      data: result.comments,
      threads: result.threads,
      total: result.total,
    }
  })(request)
}

/**
 * POST /api/comments - Create a new comment
 */
export async function POST(request: NextRequest) {
  return wrapRoute(CreateCommentApiSchema, async ({ input, user, correlationId }) => {
    // Get user info for comment creation
    const commentData = {
      content: input.body.content,
      author_id: user.id,
      author_name: 'User', // TODO: Get from user profile
      entity_type: input.body.task_id ? 'task' as const : 'project' as const,
      entity_id: input.body.task_id || input.body.project_id!,
      parent_id: input.body.parent_id || undefined,
    }

    const result = await CommentsService.createComment(commentData)

    return result
  })(request)
}
