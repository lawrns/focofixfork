/**
 * Codemap Mermaid Diagram API Route
 * GET /api/codemap/[projectId]/mermaid - Returns Mermaid diagram as text
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMermaidDiagram } from '@/features/codemap';
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper';
import { authRequiredResponse, notFoundResponse, internalErrorResponse } from '@/lib/api/response-helpers';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/codemap/[projectId]/mermaid
 * Returns the Mermaid dependency diagram for a project as text
 * Supports Accept header for different response formats
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

    // Get Mermaid diagram
    const diagram = await getMermaidDiagram(projectId);

    if (!diagram) {
      return mergeAuthResponse(
        notFoundResponse('Diagram', `${projectId}/mermaid`),
        authResponse
      );
    }

    // Check Accept header for response format
    const acceptHeader = req.headers.get('accept') || '';
    const format = new URL(req.url).searchParams.get('format');

    // Return as plain text if requested
    if (acceptHeader.includes('text/plain') || format === 'text') {
      return new NextResponse(diagram, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'private, max-age=60',
        },
      });
    }

    // Return as downloadable file if requested
    if (format === 'download') {
      return new NextResponse(diagram, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="codemap-${projectId}.mmd"`,
        },
      });
    }

    // Default JSON response
    return mergeAuthResponse(
      NextResponse.json({
        success: true,
        projectId,
        diagram,
        format: 'mermaid',
      }),
      authResponse
    );
  } catch (err) {
    console.error('[Codemap:Mermaid:GET] Error:', err);
    return internalErrorResponse(
      err instanceof Error ? err.message : 'Failed to fetch diagram'
    );
  }
}
