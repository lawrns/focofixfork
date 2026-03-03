/**
 * GET /api/agent-surfaces - List surfaces
 * POST /api/agent-surfaces - Register new surface
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api/auth-helper';
import { supabaseAdmin } from '@/lib/supabase-server';
import { registerSurface, listAvailableSurfaces } from '@/features/agent-surfaces';
import type { AgentSurface, SurfaceType } from '@/features/agent-surfaces/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    const type = searchParams.get('type') as SurfaceType | null;

    if (agentId) {
      // Get surfaces for specific agent
      const { getSurfacesForAgent } = await import('@/features/agent-surfaces');
      const surfaces = await getSurfacesForAgent(agentId);
      return NextResponse.json({ surfaces });
    }

    // List all available surfaces
    const surfaces = await listAvailableSurfaces(type || undefined);
    return NextResponse.json({ surfaces });
  } catch (err) {
    console.error('[AgentSurfaces:GET] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { agentId, agentBackend, surfaceType, capabilities, config = {} } = body;

    if (!agentId || !surfaceType) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, surfaceType' },
        { status: 400 }
      );
    }

    const surface = await registerSurface(
      agentId,
      agentBackend || 'clawdbot',
      surfaceType as SurfaceType,
      capabilities || [surfaceType],
      { ...config, owner_id: user.id }
    );

    if (!surface) {
      return NextResponse.json(
        { error: 'Failed to register surface' },
        { status: 500 }
      );
    }

    return NextResponse.json({ surface }, { status: 201 });
  } catch (err) {
    console.error('[AgentSurfaces:POST] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
