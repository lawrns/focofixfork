import { NextRequest, NextResponse } from 'next/server'
import { OpenAIProjectManager } from '@/lib/services/openai-project-manager'
import { z } from 'zod'

const CreateMilestoneSchema = z.object({
  specification: z.string().min(5, 'Milestone specification must be at least 5 characters'),
  projectId: z.string().uuid('Invalid project ID'),
})

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
    const validation = CreateMilestoneSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { specification, projectId } = validation.data

    // Check AI service availability
    const { aiService } = await import('@/lib/services/openai')
    const connectionTest = await aiService.testConnection()
    if (!connectionTest.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service is currently unavailable. Please try again later.',
          details: connectionTest.message
        },
        { status: 503 }
      )
    }

    // Create the milestone using OpenAI
    const milestone = await OpenAIProjectManager.createMilestone(
      projectId,
      specification,
      userId
    )

    return NextResponse.json({
      success: true,
      data: { milestone }
    }, { status: 201 })

  } catch (error) {
    console.error('AI create milestone error:', error)

    if (error instanceof Error) {
      if (error.message.includes('Failed to create')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error while creating milestone' },
      { status: 500 }
    )
  }
}
