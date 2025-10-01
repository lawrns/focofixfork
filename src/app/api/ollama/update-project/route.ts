import { NextRequest, NextResponse } from 'next/server'
import { OllamaProjectManager } from '@/lib/services/ollama-project-manager'
import { checkProjectPermission } from '@/lib/middleware/authorization'
import { z } from 'zod'

const UpdateProjectSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  command: z.string().min(3, 'Update command must be at least 3 characters')
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
    const validation = UpdateProjectSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { projectId, command } = validation.data

    // Verify user has permission to update this project
    const canUpdate = await checkProjectPermission(userId, projectId, 'update_project')
    if (!canUpdate) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to update this project' },
        { status: 403 }
      )
    }

    // Update the project using Ollama
    const result = await OllamaProjectManager.updateProject(
      projectId,
      command,
      userId
    )

    return NextResponse.json({
      success: true,
      data: {
        changes: result.changes,
        summary: `Applied ${Object.keys(result.changes).length} change(s) to project`
      }
    })

  } catch (error) {
    console.error('Ollama update project error:', error)

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        )
      }

      if (error.message.includes('Failed to update')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error while updating project' },
      { status: 500 }
    )
  }
}
