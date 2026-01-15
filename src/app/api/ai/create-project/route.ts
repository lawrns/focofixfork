import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'
import { OpenAIProjectManager } from '@/lib/services/openai-project-manager'
import { AICreateProjectSchema } from '@/lib/validation/schemas/ai-api.schema'
import {
  successResponse,
  authRequiredResponse,
  validationFailedResponse,
  internalErrorResponse,
} from '@/lib/api/response-helpers'

export async function POST(req: NextRequest) {
  try {
    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'AI features are not configured. Please set OPENAI_API_KEY environment variable.' },
        { status: 503 }
      )
    }

    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return authRequiredResponse()
    }

    const body = await req.json()

    // Validate request body
    const validation = AICreateProjectSchema.safeParse({ body })
    if (!validation.success) {
      return validationFailedResponse('Invalid request body', validation.error.errors)
    }

    const { prompt, organizationId } = validation.data.body

    // Get user's workspace if no organization provided
    let workspaceId = organizationId
    if (!workspaceId) {
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (!membership) {
        return NextResponse.json(
          { success: false, error: 'No workspace found. Please create or join a workspace first.' },
          { status: 400 }
        )
      }
      workspaceId = membership.workspace_id
    }

    // Parse the project specification using AI
    const parsedProject = await OpenAIProjectManager.parseProjectSpecification(prompt, user.id)

    // Create the project in the database
    const result = await OpenAIProjectManager.createProject(parsedProject, user.id, workspaceId)

    return successResponse({
      project: result.project,
      milestones: result.milestones,
      tasks: result.tasks,
      summary: {
        project_name: result.project.name,
        total_milestones: result.milestones.length,
        total_tasks: result.tasks.length,
      }
    }, undefined, 201)

  } catch (err: any) {
    console.error('AI Create Project error:', err)
    return internalErrorResponse(
      err.message || 'Failed to create project with AI',
      err.stack
    )
  }
}
