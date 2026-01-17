import { NextRequest } from 'next/server'
import { WorkspaceRepository } from '@/lib/repositories/workspace-repository'
import { isError } from '@/lib/repositories/base-repository'
import {
  authRequiredResponse,
  successResponse,
  databaseErrorResponse,
  forbiddenResponse,
  workspaceNotFoundResponse,
  validationFailedResponse,
  isValidUUID,
  invalidUUIDResponse
} from '@/lib/api/response-helpers'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema for validating the AI policy update
const WorkspaceAIPolicySchema = z.object({
  system_instructions: z.string().max(2000).default(''),
  task_prompts: z.object({
    task_generation: z.string().default(''),
    task_analysis: z.string().default(''),
    prioritization: z.string().default(''),
  }).default({
    task_generation: '',
    task_analysis: '',
    prioritization: '',
  }),
  allowed_tools: z.array(z.string()).default([]),
  constraints: z.object({
    allow_task_creation: z.boolean().default(true),
    allow_task_updates: z.boolean().default(true),
    allow_task_deletion: z.boolean().default(false),
    require_approval_for_changes: z.boolean().default(true),
    max_tokens_per_request: z.number().min(256).max(32768).default(4096),
  }).default({
    allow_task_creation: true,
    allow_task_updates: true,
    allow_task_deletion: false,
    require_approval_for_changes: true,
    max_tokens_per_request: 4096,
  }),
  audit_level: z.enum(['minimal', 'standard', 'full']).default('standard'),
})

type WorkspaceAIPolicy = z.infer<typeof WorkspaceAIPolicySchema> & {
  version: number
  last_updated_by?: string
  last_updated_at?: string
}

/**
 * GET /api/workspaces/[id]/ai-policy
 * Fetch the current AI policy for a workspace
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: workspaceId } = params

    // Validate UUID
    if (!isValidUUID(workspaceId)) {
      return invalidUUIDResponse('workspaceId', workspaceId)
    }

    // Get authenticated user
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return authRequiredResponse()
    }

    const repo = new WorkspaceRepository(supabase)

    // Check if user has access to this workspace
    const isMemberResult = await repo.isMember(workspaceId, user.id)
    if (isError(isMemberResult)) {
      return mergeAuthResponse(databaseErrorResponse(isMemberResult.error.message), authResponse)
    }

    if (!isMemberResult.data) {
      return mergeAuthResponse(forbiddenResponse('You do not have access to this workspace'), authResponse)
    }

    // Fetch workspace to get ai_policy
    const workspaceResult = await repo.findById(workspaceId)
    if (isError(workspaceResult)) {
      if (workspaceResult.error.code === 'NOT_FOUND') {
        return mergeAuthResponse(workspaceNotFoundResponse(workspaceId), authResponse)
      }
      return mergeAuthResponse(databaseErrorResponse(workspaceResult.error.message), authResponse)
    }

    const workspace = workspaceResult.data

    // Parse and return the AI policy with defaults
    const defaultPolicy: WorkspaceAIPolicy = {
      system_instructions: '',
      task_prompts: {
        task_generation: '',
        task_analysis: '',
        prioritization: '',
      },
      allowed_tools: ['query_tasks', 'get_task_details', 'get_project_overview'],
      constraints: {
        allow_task_creation: true,
        allow_task_updates: true,
        allow_task_deletion: false,
        require_approval_for_changes: true,
        max_tokens_per_request: 4096,
      },
      audit_level: 'standard',
      version: 1,
    }

    // Merge stored policy with defaults
    const storedPolicy = workspace.ai_policy as Partial<WorkspaceAIPolicy> | null
    const aiPolicy: WorkspaceAIPolicy = {
      ...defaultPolicy,
      ...storedPolicy,
      task_prompts: {
        ...defaultPolicy.task_prompts,
        ...(storedPolicy?.task_prompts || {}),
      },
      constraints: {
        ...defaultPolicy.constraints,
        ...(storedPolicy?.constraints || {}),
      },
    }

    return mergeAuthResponse(successResponse(aiPolicy), authResponse)
  } catch (error) {
    console.error('Failed to fetch AI policy:', error)
    return databaseErrorResponse('Failed to fetch AI policy', error)
  }
}

/**
 * PUT /api/workspaces/[id]/ai-policy
 * Update the AI policy for a workspace (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: workspaceId } = params

    // Validate UUID
    if (!isValidUUID(workspaceId)) {
      return invalidUUIDResponse('workspaceId', workspaceId)
    }

    // Get authenticated user
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return authRequiredResponse()
    }

    const repo = new WorkspaceRepository(supabase)

    // Check if user has admin access
    const hasAdminResult = await repo.hasAdminAccess(workspaceId, user.id)
    if (isError(hasAdminResult)) {
      return mergeAuthResponse(databaseErrorResponse(hasAdminResult.error.message), authResponse)
    }

    if (!hasAdminResult.data) {
      return mergeAuthResponse(forbiddenResponse('You need admin access to update AI settings'), authResponse)
    }

    // Parse request body
    const body = await request.json()

    // Validate with Zod schema
    const parseResult = WorkspaceAIPolicySchema.safeParse(body)
    if (!parseResult.success) {
      return mergeAuthResponse(
        validationFailedResponse('Invalid AI policy data', parseResult.error.flatten()),
        authResponse
      )
    }

    // Fetch current workspace to get existing policy version
    const workspaceResult = await repo.findById(workspaceId)
    if (isError(workspaceResult)) {
      if (workspaceResult.error.code === 'NOT_FOUND') {
        return mergeAuthResponse(workspaceNotFoundResponse(workspaceId), authResponse)
      }
      return mergeAuthResponse(databaseErrorResponse(workspaceResult.error.message), authResponse)
    }

    const currentPolicy = workspaceResult.data.ai_policy as Partial<WorkspaceAIPolicy> | null
    const currentVersion = currentPolicy?.version || 0

    // Create updated policy with incremented version
    const updatedPolicy: WorkspaceAIPolicy = {
      ...parseResult.data,
      version: currentVersion + 1,
      last_updated_by: user.email || user.id,
      last_updated_at: new Date().toISOString(),
    }

    // Update workspace with new ai_policy
    const updateResult = await repo.update(workspaceId, {
      ai_policy: updatedPolicy,
      updated_at: new Date().toISOString(),
    })

    if (isError(updateResult)) {
      return mergeAuthResponse(databaseErrorResponse(updateResult.error.message), authResponse)
    }

    return mergeAuthResponse(successResponse(updatedPolicy), authResponse)
  } catch (error) {
    console.error('Failed to update AI policy:', error)
    return databaseErrorResponse('Failed to update AI policy', error)
  }
}
