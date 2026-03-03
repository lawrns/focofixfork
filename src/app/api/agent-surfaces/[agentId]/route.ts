/**
 * GET /api/agent-surfaces/[agentId] - Get surfaces for agent
 * PUT /api/agent-surfaces/[agentId] - Update surface
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api/auth-helper';
import { supabaseAdmin } from '@/lib/supabase-server';
import type { SurfaceStatus } from '@/features/agent-surfaces/types';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ agentId: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { agentId } = await params;
    
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const { data, error } = await supabaseAdmin
      .from('agent_surfaces')
      .select('*')
      .eq('agent_id', agentId)
      .order('surface_type');

    if (error) {
      console.error('[AgentSurfaces:GET] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ surfaces: data });
  } catch (err) {
    console.error('[AgentSurfaces:GET] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { agentId } = await params;
    const { user, error } = await getAuthUser(req);
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const body = await req.json();
    const { surfaceType, status, capabilities, config } = body;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) updates.status = status as SurfaceStatus;
    if (capabilities) updates.capabilities = capabilities;
    if (config) updates.config = config;

    const { data, error: updateError } = await supabaseAdmin
      .from('agent_surfaces')
      .update(updates)
      .eq('agent_id', agentId)
      .eq('surface_type', surfaceType)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ surface: data });
  } catch (err) {
    console.error('[AgentSurfaces:PUT] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
