import { NextRequest, NextResponse } from 'next/server'
import { ollamaService } from '@/lib/services/ollama'
import { z } from 'zod'

const generateTasksSchema = z.object({
  project_id: z.string().min(1, 'Project ID is required'),
  context: z.string().optional(),
  count: z.number().min(1).max(10).default(5),
  focus_area: z.string().optional()
})

/**
 * POST /api/ai/generate-tasks - Generate task suggestions for a project
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
    const validationResult = generateTasksSchema.safeParse(body)
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

    const { project_id, context, count, focus_area } = validationResult.data

    // Verify user has access to this project
    const { data: project } = await fetch(
      `${request.nextUrl.origin}/api/projects/${project_id}`,
      {
        headers: { 'x-user-id': userId }
      }
    ).then(r => r.json())

    if (!project?.success) {
      return NextResponse.json(
        { success: false, error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Enhance context with focus area if provided
    const enhancedContext = focus_area
      ? `${context || ''}\n\nFocus Area: ${focus_area}`.trim()
      : context

    // Generate task suggestions
    const suggestions = await ollamaService.suggestTasks(project_id, enhancedContext)

    // Limit to requested count
    const limitedSuggestions = suggestions.slice(0, count)

    // Save suggestions to database
    for (const suggestion of limitedSuggestions) {
      await ollamaService.saveSuggestion(suggestion)
    }

    return NextResponse.json({
      success: true,
      data: limitedSuggestions,
      message: `Generated ${limitedSuggestions.length} task suggestions`
    })

  } catch (error: any) {
    console.error('AI task generation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate task suggestions',
        details: error.message
      },
      { status: 500 }
    )
  }
}
