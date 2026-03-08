import { NextRequest, NextResponse } from 'next/server'

import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, databaseErrorResponse, successResponse, validationFailedResponse } from '@/lib/api/response-helpers'
import { verifyWorkspaceMembership } from '@/lib/cofounder-mode/config-resolver'
import { loadNightLaunchProjects } from '@/lib/autonomy/night-session'
import { SPECIALIST_ADVISORS } from '@/lib/agent-avatars'
import { loadFounderProfile, scoreTextAgainstFounderProfile } from '@/lib/cofounder-mode/founder-profile'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response
    if (authError || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspace_id')
    if (!workspaceId) {
      return mergeAuthResponse(validationFailedResponse('workspace_id is required'), authResponse)
    }

    const isMember = await verifyWorkspaceMembership(supabase, user.id, workspaceId)
    if (!isMember) {
      return mergeAuthResponse(validationFailedResponse('Workspace access denied'), authResponse)
    }

    const [projects, customAgentsResult, defaultsResult, founderProfile] = await Promise.all([
      loadNightLaunchProjects(supabase, user.id, workspaceId),
      supabase
        .from('custom_agent_profiles')
        .select('id, name, kind, role, description, expertise, incentives, risk_model, active')
        .eq('user_id', user.id)
        .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
        .eq('active', true)
        .order('updated_at', { ascending: false })
        .limit(50),
      supabase
        .from('foco_workspaces')
        .select('agent_planning_defaults')
        .eq('id', workspaceId)
        .maybeSingle<{ agent_planning_defaults: Record<string, unknown> | null }>(),
      loadFounderProfile(),
    ])

    if (customAgentsResult.error) {
      return mergeAuthResponse(databaseErrorResponse('Failed to load custom agents', customAgentsResult.error.message), authResponse)
    }
    if (defaultsResult.error) {
      return mergeAuthResponse(databaseErrorResponse('Failed to load workspace planning defaults', defaultsResult.error.message), authResponse)
    }

    const advisors = SPECIALIST_ADVISORS.map((advisor) => ({
      id: advisor.id,
      kind: 'persona' as const,
      name: advisor.name,
      role: advisor.role,
      expertise: advisor.personaTags,
      incentives: [
        'Provide a differentiated strategic lens',
        'Challenge default assumptions',
        'Push for sharper tradeoffs',
      ],
      risk_model: advisor.description,
      description: advisor.description,
      source: 'advisor_catalog',
    }))

    const customAgents = (customAgentsResult.data ?? []).map((agent) => ({
      id: agent.id,
      kind: agent.kind ?? 'custom',
      name: agent.name,
      role: agent.role ?? 'Custom agent',
      expertise: Array.isArray(agent.expertise) ? agent.expertise : [],
      incentives: Array.isArray(agent.incentives) ? agent.incentives : [],
      risk_model: typeof agent.risk_model === 'string' ? agent.risk_model : 'Not specified.',
      description: agent.description ?? null,
      source: 'custom_agent_profiles',
    }))

    const defaultSelectedAgents = Array.isArray(defaultsResult.data?.agent_planning_defaults?.selected_agents)
      ? defaultsResult.data?.agent_planning_defaults?.selected_agents
      : []

    const rankedProjects = projects
      .map((project) => ({
        ...project,
        founder_alignment: scoreTextAgainstFounderProfile(
          founderProfile?.parsed ?? null,
          [project.name, project.slug, project.description ?? '', project.local_path].join(' '),
        ),
      }))
      .sort((left, right) => right.founder_alignment.score - left.founder_alignment.score || left.name.localeCompare(right.name))

    return mergeAuthResponse(successResponse({
      workspace_id: workspaceId,
      agents: [...defaultSelectedAgents, ...advisors, ...customAgents]
        .filter((agent, index, items) => items.findIndex((candidate) => candidate?.id === agent?.id) === index),
      projects: rankedProjects,
      git_defaults: {
        syncBeforeRun: true,
        branchPrefix: 'autonomy',
        allowPush: true,
        allowCommit: true,
        neverPushProtectedBranches: true,
      },
      founder_profile: founderProfile,
    }), authResponse)
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to load night autonomy launch options', error), authResponse)
  }
}
