import { NextRequest, NextResponse } from 'next/server'
import { CommentsService } from '@/lib/services/comments'
import { validateUpdateComment } from '@/lib/validation/schemas/comments'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * PUT /api/comments/[id] - Update a specific comment
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const commentId = params.id
    if (!commentId) {
      return NextResponse.json(
        { success: false, error: 'Comment ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate request body
    const validationResult = validateUpdateComment(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    // Transform data to match service expectations
    const updateData = {
      ...validationResult.data,
      parent_id: validationResult.data.parent_id || undefined,
    }

    const result = await CommentsService.updateComment(commentId, userId, updateData)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error('Comment update API error:', error)

    // Handle specific error types
    if (error.message?.includes('permission')) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to edit this comment' },
        { status: 403 }
      )
    }

    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/comments/[id] - Delete a specific comment
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const commentId = params.id
    if (!commentId) {
      return NextResponse.json(
        { success: false, error: 'Comment ID is required' },
        { status: 400 }
      )
    }

    await CommentsService.deleteComment(commentId, userId)

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully',
    })
  } catch (error: any) {
    console.error('Comment deletion API error:', error)

    // Handle specific error types
    if (error.message?.includes('permission')) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to delete this comment' },
        { status: 403 }
      )
    }

    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}