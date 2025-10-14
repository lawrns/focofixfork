import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { UpdateCommentApiSchema, DeleteCommentSchema } from '@/lib/validation/schemas/comment-api.schema'
import { CommentsService } from '@/lib/services/comments'
import { ForbiddenError } from '@/server/auth/requireAuth'

interface RouteContext {
  params: {
    id: string
  }
}

/**
 * PUT /api/comments/[id] - Update a specific comment
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  return wrapRoute(UpdateCommentApiSchema, async ({ input, user, correlationId }) => {
    const commentId = context.params.id

    if (!commentId) {
      const err: any = new Error('Comment ID is required')
      err.code = 'INVALID_COMMENT_ID'
      err.statusCode = 400
      throw err
    }

    try {
      const result = await CommentsService.updateComment(commentId, user.id, input.body)
      return result
    } catch (error: any) {
      if (error.message?.includes('permission')) {
        throw new ForbiddenError('You do not have permission to edit this comment')
      }
      if (error.message?.includes('not found')) {
        const err: any = new Error('Comment not found')
        err.code = 'COMMENT_NOT_FOUND'
        err.statusCode = 404
        throw err
      }
      throw error
    }
  })(request)
}

/**
 * DELETE /api/comments/[id] - Delete a specific comment
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  return wrapRoute(DeleteCommentSchema, async ({ user, correlationId }) => {
    const commentId = context.params.id

    if (!commentId) {
      const err: any = new Error('Comment ID is required')
      err.code = 'INVALID_COMMENT_ID'
      err.statusCode = 400
      throw err
    }

    try {
      await CommentsService.deleteComment(commentId, user.id)
      return { message: 'Comment deleted successfully' }
    } catch (error: any) {
      if (error.message?.includes('permission')) {
        throw new ForbiddenError('You do not have permission to delete this comment')
      }
      if (error.message?.includes('not found')) {
        const err: any = new Error('Comment not found')
        err.code = 'COMMENT_NOT_FOUND'
        err.statusCode = 404
        throw err
      }
      throw error
    }
  })(request)
}
