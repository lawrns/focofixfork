import { NextRequest, NextResponse } from 'next/server'
import { OllamaProjectManager } from '@/lib/services/ollama-project-manager'
import { checkProjectPermission } from '@/lib/middleware/authorization'
import { z } from 'zod'

const CreateTaskSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  specification: z.string().min(5, 'Task specification must be at least 5 characters'),
  milestoneId: z.string().uuid('Invalid milestone ID').optional()
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
    const validation = CreateTaskSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { projectId, specification, milestoneId } = validation.data

    // Verify user has permission to manage this project
    const canManage = await checkProjectPermission(userId, projectId, 'manage_tasks')
    if (!canManage) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to create tasks for this project' },
        { status: 403 }
      )
    }

    // Create the task using Ollama
    const task = await OllamaProjectManager.createTask(
      projectId,
      specification,
      milestoneId,
      userId
    )

    return NextResponse.json({
      success: true,
      data: {
        task,
        summary: `Created task: ${task.title}`
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Ollama create task error:', error)

    if (error instanceof Error) {
      if (error.message.includes('Failed to create task')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error while creating task' },
      { status: 500 }
    )
  }
}
