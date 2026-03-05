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
import { DEFAULT_WORKSPACE_AI_POLICY, normalizeWorkspaceAIPolicy, type WorkspaceAIPolicy } from '@/lib/ai/policy'

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
    require_approval_for_changes: false,
    max_tokens_per_request: 4096,
  }),
  execution_mode: z.enum(['auto', 'semi_auto']).default('auto'),
  approval_thresholds: z.object({
    confidence_min_for_auto: z.number().min(0).max(1).default(0.75),
  }).default({
    confidence_min_for_auto: 0.75,
  }),
  model_profiles: z.record(z.object({
    provider: z.enum(['openai', 'deepseek', 'glm']).optional(),
    model: z.string().min(1).max(200).optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().min(1).max(32768).optional(),
    fallback_chain: z.array(z.string()).default([]),
  })).default({}),
  tool_profiles: z.record(z.object({
    tool_mode: z.enum(['none', 'llm_tools_only', 'surfaces_only', 'llm_tools_and_surfaces']).optional(),
    allowed_tools: z.array(z.string()).default([]),
  })).default({}),
  prompt_profiles: z.record(z.object({
    system_instructions: z.string().max(2000).optional(),
    prompt_instructions: z.string().max(6000).optional(),
    handbook_slugs: z.array(z.string()).default([]),
  })).default({}),
  agent_profiles: z.record(z.object({
    provider: z.enum(['openai', 'deepseek', 'glm']).optional(),
    model: z.string().min(1).max(200).optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().min(1).max(32768).optional(),
    fallback_chain: z.array(z.string()).default([]),
    tool_mode: z.enum(['none', 'llm_tools_only', 'surfaces_only', 'llm_tools_and_surfaces']).optional(),
    allowed_tools: z.array(z.string()).default([]),
    system_prompt: z.string().max(12000).optional(),
    handbook_slugs: z.array(z.string()).default([]),
  })).default({}),
  skills_policy: z.object({
    use_case_handbooks: z.record(z.array(z.string())).default({}),
    allow_workspace_handbooks: z.boolean().default(true),
  }).default({
    use_case_handbooks: {},
    allow_workspace_handbooks: true,
  }),
  audit_level: z.enum(['minimal', 'standard', 'full']).default('standard'),
})

/**
 * GET /api/workspaces/[id]/ai-policy
 * Fetch the current AI policy for a workspace
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params

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
    const aiPolicy = normalizeWorkspaceAIPolicy(workspace.ai_policy)

    return mergeAuthResponse(successResponse(aiPolicy), authResponse)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return databaseErrorResponse('Failed to fetch AI policy', message)
  }
}

/**
 * PUT /api/workspaces/[id]/ai-policy
 * Update the AI policy for a workspace (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params

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
      ...DEFAULT_WORKSPACE_AI_POLICY,
      ...normalizeWorkspaceAIPolicy(parseResult.data),
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return databaseErrorResponse('Failed to update AI policy', message)
  }
}
