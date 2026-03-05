import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { OpenAIProjectManager } from '@/lib/services/openai-project-manager'
import { AICreateProjectSchema } from '@/lib/validation/schemas/ai-api.schema'
import { normalizeWorkspaceAIPolicy } from '@/lib/ai/policy'
import { resolveAIExecutionProfile } from '@/lib/ai/resolver'
import {
  successResponse,
  authRequiredResponse,
  validationFailedResponse,
  internalErrorResponse,
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let authResponse: NextResponse | undefined;
  try {
    // Check if any configured provider is available
    if (!process.env.OPENAI_API_KEY && !process.env.GLM_API_KEY && !process.env.Z_AI_API_KEY && !process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'AI features are not configured. Set at least one provider key.' },
        { status: 503 }
      )
    }

    const { user, supabase, error, response } = await getAuthUser(req)
    authResponse = response;

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
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
        .from('foco_workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (!membership) {
        return mergeAuthResponse(NextResponse.json(
          { success: false, error: 'No workspace found. Please create or join a workspace first.' },
          { status: 400 }
        ), authResponse)
      }
      workspaceId = membership.workspace_id
    }

    // Ensure workspaceId is defined before creating project
    if (!workspaceId) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'Workspace ID is required to create a project' },
        { status: 400 }
        ), authResponse)
    }

    const { data: workspace } = await supabase
      .from('foco_workspaces')
      .select('ai_policy')
      .eq('id', workspaceId)
      .maybeSingle<{ ai_policy: Record<string, unknown> | null }>()

    const policy = normalizeWorkspaceAIPolicy(workspace?.ai_policy)
    const profile = await resolveAIExecutionProfile({
      useCase: 'project_parsing',
      policy,
    })

    // Parse the project specification using AI
    const parsedProject = await OpenAIProjectManager.parseProjectSpecification(prompt, user.id, profile)

    // Create the project in the database
    const result = await OpenAIProjectManager.createProject(parsedProject, user.id, workspaceId)

    return mergeAuthResponse(successResponse({
      project: result.project,
      milestones: result.milestones,
      tasks: result.tasks,
      summary: {
        project_name: result.project.name,
        total_milestones: result.milestones.length,
        total_tasks: result.tasks.length,
      }
    }, undefined, 201), authResponse)

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create project with AI'
    return mergeAuthResponse(internalErrorResponse(message), authResponse)
  }
}
