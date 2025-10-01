import { NextRequest, NextResponse } from 'next/server'
import { OllamaProjectManager } from '@/lib/services/ollama-project-manager'
import { canManageOrganizationMembers } from '@/lib/middleware/authorization'
import { ollamaRateLimiter } from '@/lib/middleware/rate-limit'
import { z } from 'zod'

const CreateProjectSchema = z.object({
  specification: z.union([
    z.string().min(10, 'Specification must be at least 10 characters'),
    z.object({
      name: z.string().min(1, 'Project name is required'),
      description: z.string().min(1, 'Project description is required'),
      requirements: z.array(z.string()).optional(),
      timeline: z.object({
        start_date: z.string().optional(),
        due_date: z.string().optional(),
        duration_days: z.number().optional()
      }).optional(),
      team: z.object({
        size: z.number().optional(),
        roles: z.array(z.string()).optional()
      }).optional(),
      complexity: z.enum(['simple', 'moderate', 'complex', 'enterprise']).optional(),
      domain: z.string().optional()
    })
  ]),
  organizationId: z.string().uuid('Invalid organization ID')
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

    // Apply rate limiting
    const rateLimitResult = await ollamaRateLimiter.check(userId)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please wait before making another AI request.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          }
        }
      )
    }

    const body = await request.json()

    // Validate request body
    const validation = CreateProjectSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { specification, organizationId } = validation.data

    // Verify user can manage organization (create projects)
    const canManage = await canManageOrganizationMembers(userId, organizationId)
    if (!canManage) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to create projects in this organization' },
        { status: 403 }
      )
    }

    // Parse the project specification using Ollama
    const parsedProject = await OllamaProjectManager.parseProjectSpecification(
      specification,
      userId
    )

    // Create the project in the database
    const result = await OllamaProjectManager.createProject(
      parsedProject,
      userId,
      organizationId
    )

    return NextResponse.json({
      success: true,
      data: {
        project: result.project,
        milestones: result.milestones,
        tasks: result.tasks,
        summary: {
          project_name: result.project.name,
          total_milestones: result.milestones.length,
          total_tasks: result.tasks.length
        }
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Ollama create project error:', error)

    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('parsing failed')) {
        return NextResponse.json(
          { success: false, error: 'Failed to parse project specification. Please provide a clear project description.' },
          { status: 400 }
        )
      }

      if (error.message.includes('Failed to create')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error while creating project' },
      { status: 500 }
    )
  }
}
