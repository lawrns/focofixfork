/**
 * Codemap API Routes
 * GET /api/codemap/[projectId] - Get codemap for project
 * POST /api/codemap/[projectId] - Trigger codemap regeneration
 * DELETE /api/codemap/[projectId] - Delete codemap for project
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { generateAndStore, getCodemap, deleteCodemap } from '@/features/codemap';
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper';
import { authRequiredResponse, successResponse, errorResponse, notFoundResponse, forbiddenResponse, internalErrorResponse } from '@/lib/api/response-helpers';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/codemap/[projectId]
 * Returns the codemap for a project
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(req);

    if (authError || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse);
    }

    const { projectId } = await params;

    // Check if user has access to the project
    const { data: projectAccess, error: accessError } = await supabase
      .from('foco_projects')
      .select('id')
      .eq('id', projectId)
      .or(`owner_id.eq.${user.id},id.in.(SELECT project_id FROM project_team_assignments WHERE user_id = ${user.id})`)
      .single();

    if (accessError || !projectAccess) {
      return mergeAuthResponse(
        notFoundResponse('Project', projectId),
        authResponse
      );
    }

    // Get codemap from database
    const codemap = await getCodemap(projectId);

    if (!codemap) {
      return mergeAuthResponse(
        notFoundResponse('Codemap', projectId),
        authResponse
      );
    }

    return mergeAuthResponse(successResponse(codemap), authResponse);
  } catch (err) {
    console.error('[Codemap:GET] Error:', err);
    return internalErrorResponse(
      err instanceof Error ? err.message : 'Failed to fetch codemap'
    );
  }
}

/**
 * POST /api/codemap/[projectId]
 * Triggers codemap regeneration for a project
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(req);

    if (authError || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse);
    }

    const { projectId } = await params;
    const body = await req.json().catch(() => ({}));

    // Check if user has write access to the project
    const { data: project, error: projectError } = await supabase
      .from('foco_projects')
      .select('id, owner_id, path')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return mergeAuthResponse(
        notFoundResponse('Project', projectId),
        authResponse
      );
    }

    // Check ownership or team membership with write permissions
    const isOwner = project.owner_id === user.id;
    
    if (!isOwner) {
      const { data: teamMember } = await supabase
        .from('project_team_assignments')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

      if (!teamMember || teamMember.role === 'viewer') {
        return mergeAuthResponse(
          forbiddenResponse('Insufficient permissions to update codemap'),
          authResponse
        );
      }
    }

    // Get project path from request or use default
    const projectPath = body.projectPath || project.path || `/projects/${projectId}`;

    // Generate and store codemap
    const result = await generateAndStore(projectId, projectPath);

    if (!result.success) {
      return mergeAuthResponse(
        internalErrorResponse(result.error || 'Failed to generate codemap'),
        authResponse
      );
    }

    return mergeAuthResponse(
      successResponse({
        success: true,
        codemap: result.codemap,
        message: 'Codemap generated successfully',
      }),
      authResponse
    );
  } catch (err) {
    console.error('[Codemap:POST] Error:', err);
    return internalErrorResponse(
      err instanceof Error ? err.message : 'Failed to generate codemap'
    );
  }
}

/**
 * DELETE /api/codemap/[projectId]
 * Deletes the codemap for a project
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(req);

    if (authError || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse);
    }

    const { projectId } = await params;

    // Check ownership
    const { data: project, error: projectError } = await supabase
      .from('foco_projects')
      .select('owner_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return mergeAuthResponse(
        notFoundResponse('Project', projectId),
        authResponse
      );
    }

    if (project.owner_id !== user.id) {
      return mergeAuthResponse(
        forbiddenResponse('Only project owner can delete codemap'),
        authResponse
      );
    }

    const success = await deleteCodemap(projectId);

    if (!success) {
      return mergeAuthResponse(
        internalErrorResponse('Failed to delete codemap'),
        authResponse
      );
    }

    return mergeAuthResponse(
      successResponse({ deleted: true }),
      authResponse
    );
  } catch (err) {
    console.error('[Codemap:DELETE] Error:', err);
    return internalErrorResponse(
      err instanceof Error ? err.message : 'Failed to delete codemap'
    );
  }
}
