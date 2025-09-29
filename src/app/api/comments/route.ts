import { NextRequest, NextResponse } from 'next/server'
import { CommentsService } from '@/lib/services/comments'
import { validateCreateComment } from '@/lib/validation/schemas/comments'
import { z } from 'zod'

// Query schema for filtering comments
const getCommentsQuerySchema = z.object({
  milestone_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  author_id: z.string().uuid().optional(),
  limit: z.string().transform(val => parseInt(val)).optional(),
  offset: z.string().transform(val => parseInt(val)).optional(),
})

/**
 * GET /api/comments - List comments with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const queryValidation = getCommentsQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!queryValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: queryValidation.error.issues
        },
        { status: 400 }
      )
    }

    const filters = queryValidation.data

    // Map to service filters
    const serviceFilters = {
      entity_type: filters.milestone_id ? 'milestone' : filters.project_id ? 'project' : undefined,
      entity_id: filters.milestone_id || filters.project_id,
      author_id: filters.author_id,
      limit: filters.limit,
      offset: filters.offset,
    }

    const result = await CommentsService.getComments(serviceFilters)

    return NextResponse.json({
      success: true,
      data: result.comments,
      threads: result.threads,
      total: result.total,
    })
  } catch (error: any) {
    console.error('Comments API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/comments - Create a new comment
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate request body
    const validationResult = validateCreateComment(body)
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

    // Get user info for comment creation
    const commentData = {
      content: validationResult.data.content,
      author_id: userId,
      author_name: 'User', // TODO: Get from user profile
      entity_type: validationResult.data.milestone_id ? 'milestone' as const : 'project' as const,
      entity_id: validationResult.data.milestone_id || validationResult.data.project_id!,
      parent_id: validationResult.data.parent_id || undefined,
    }

    const result = await CommentsService.createComment(commentData)

    return NextResponse.json(
      { success: true, data: result },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Comment creation API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}