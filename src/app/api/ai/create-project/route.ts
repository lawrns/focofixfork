import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/services/openai'
import { supabase } from '@/lib/supabase'
import { canManageOrganizationMembers } from '@/lib/middleware/authorization'
import { z } from 'zod'

const CreateProjectSchema = z.object({
  specification: z.string().min(10, 'Project description must be at least 10 characters'),
  organizationId: z.string().uuid('Invalid organization ID')
})

// Simple rate limiter (10 requests per minute per user)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const windowMs = 60000 // 1 minute
  const maxRequests = 10

  const userLimit = rateLimitMap.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize
    const resetTime = now + windowMs
    rateLimitMap.set(userId, { count: 1, resetTime })
    return { allowed: true, remaining: maxRequests - 1, resetTime }
  }

  if (userLimit.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: userLimit.resetTime }
  }

  userLimit.count++
  return { allowed: true, remaining: maxRequests - userLimit.count, resetTime: userLimit.resetTime }
}

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
    const rateLimitResult = checkRateLimit(userId)
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

    // Check AI service availability
    const connectionTest = await aiService.testConnection()
    if (!connectionTest.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service is currently unavailable. Please try again in a few minutes.',
          details: connectionTest.message
        },
        { status: 503 }
      )
    }

    // Generate project structure using OpenAI
    console.log('[AI Project Creation] Generating structure for:', specification.substring(0, 100))
    const projectStructure = await aiService.generateProjectStructure(specification)
    console.log('[AI Project Creation] Generated structure:', {
      name: projectStructure.name,
      milestonesCount: projectStructure.milestones.length,
      tasksCount: projectStructure.milestones.reduce((acc, m) => acc + m.tasks.length, 0)
    })

    // Create project in database
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: projectStructure.name,
        description: projectStructure.description,
        status: 'active',
        priority: projectStructure.priority,
        created_by: userId,
        organization_id: organizationId,
        start_date: new Date().toISOString(),
        end_date: projectStructure.milestones.length > 0
          ? projectStructure.milestones[projectStructure.milestones.length - 1].dueDate
          : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (projectError) {
      console.error('[AI Project Creation] Error creating project:', projectError)
      return NextResponse.json(
        { success: false, error: 'Failed to create project in database' },
        { status: 500 }
      )
    }

    console.log('[AI Project Creation] Project created:', project.id)

    // Create milestones and tasks
    const createdMilestones = []
    const createdTasks = []

    for (const milestone of projectStructure.milestones) {
      const { data: createdMilestone, error: milestoneError } = await supabase
        .from('milestones')
        .insert({
          name: milestone.name,
          description: milestone.description,
          project_id: project.id,
          due_date: milestone.dueDate,
          priority: milestone.priority,
          status: 'not_started',
          created_by: userId,
        })
        .select()
        .single()

      if (milestoneError) {
        console.error('[AI Project Creation] Error creating milestone:', milestoneError)
        continue
      }

      createdMilestones.push(createdMilestone)

      // Create tasks for this milestone
      const tasksToCreate = milestone.tasks.map(task => ({
        name: task.name,
        description: task.description,
        project_id: project.id,
        milestone_id: createdMilestone.id,
        status: 'todo',
        priority: task.priority,
        estimated_hours: task.estimatedHours,
        created_by: userId,
        assigned_to: userId,
      }))

      if (tasksToCreate.length > 0) {
        const { data: tasksBatch, error: tasksError } = await supabase
          .from('tasks')
          .insert(tasksToCreate)
          .select()

        if (tasksError) {
          console.error('[AI Project Creation] Error creating tasks:', tasksError)
        } else {
          createdTasks.push(...tasksBatch)
        }
      }
    }

    console.log('[AI Project Creation] Success:', {
      projectId: project.id,
      milestones: createdMilestones.length,
      tasks: createdTasks.length
    })

    return NextResponse.json({
      success: true,
      data: {
        project,
        milestones: createdMilestones,
        tasks: createdTasks,
        summary: {
          project_name: project.name,
          total_milestones: createdMilestones.length,
          total_tasks: createdTasks.length
        }
      }
    }, { status: 201 })

  } catch (error) {
    console.error('AI create project error:', error)

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
