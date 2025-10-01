import { NextRequest, NextResponse } from 'next/server'
import { OllamaProjectManager } from '@/lib/services/ollama-project-manager'
import { checkProjectPermission } from '@/lib/middleware/authorization'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify user has permission to view this project
    const canView = await checkProjectPermission(userId, id, 'view_project')
    if (!canView) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to view this project' },
        { status: 403 }
      )
    }

    // Get the complete project details
    const result = await OllamaProjectManager.getProject(id)

    if (!result.project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        project: result.project,
        milestones: result.milestones,
        tasks: result.tasks,
        summary: {
          total_milestones: result.milestones.length,
          total_tasks: result.tasks.length,
          completed_tasks: result.tasks.filter((t: any) => t.status === 'done').length,
          progress_percentage: result.project.progress_percentage || 0
        }
      }
    })

  } catch (error) {
    console.error('Ollama get project error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error while fetching project' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify user has permission to delete this project
    const canDelete = await checkProjectPermission(userId, id, 'delete_project')
    if (!canDelete) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to delete this project' },
        { status: 403 }
      )
    }

    // Delete the project
    const result = await OllamaProjectManager.deleteProject(id)

    return NextResponse.json({
      success: true,
      data: {
        message: 'Project deleted successfully',
        project_id: id
      }
    })

  } catch (error) {
    console.error('Ollama delete project error:', error)

    if (error instanceof Error && error.message.includes('Failed to delete')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error while deleting project' },
      { status: 500 }
    )
  }
}
