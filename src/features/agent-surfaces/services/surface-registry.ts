/**
 * Surface Registry Service
 * Manages agent surface registrations and matching
 */

import { supabaseAdmin } from '@/lib/supabase-server';
import type { AgentSurface, SurfaceType, SurfaceMatch, SurfaceAction } from '../types';

/**
 * Register a new surface for an agent
 */
export async function registerSurface(
  agentId: string,
  agentBackend: string,
  surfaceType: SurfaceType,
  capabilities: string[],
  config: Record<string, unknown> = {}
): Promise<AgentSurface | null> {
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin
    .from('agent_surfaces')
    .upsert({
      agent_id: agentId,
      agent_backend: agentBackend,
      surface_type: surfaceType,
      capabilities,
      config,
      status: 'available',
    }, {
      onConflict: 'agent_id,surface_type'
    })
    .select()
    .single();

  if (error) {
    console.error('[SurfaceRegistry] Register error:', error);
    return null;
  }

  return data as AgentSurface;
}

/**
 * Get all surfaces for an agent
 */
export async function getSurfacesForAgent(agentId: string): Promise<AgentSurface[]> {
  if (!supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from('agent_surfaces')
    .select('*')
    .eq('agent_id', agentId)
    .eq('status', 'available')
    .order('surface_type');

  if (error) {
    console.error('[SurfaceRegistry] Get surfaces error:', error);
    return [];
  }

  return data as AgentSurface[];
}

/**
 * Find the best matching surface for a task
 */
export async function matchSurfaceToTask(
  agentId: string,
  action: SurfaceAction
): Promise<SurfaceMatch | null> {
  const surfaces = await getSurfacesForAgent(agentId);
  
  if (surfaces.length === 0) return null;

  // Score each surface based on action type and capabilities
  const matches: SurfaceMatch[] = surfaces.map(surface => {
    let score = 0;
    let reason = '';

    // Check if surface type matches action
    if ('url' in action && surface.surface_type === 'browser') {
      score += 3;
      reason = 'Browser action matches browser surface';
    } else if ('method' in action && surface.surface_type === 'api') {
      score += 3;
      reason = 'HTTP action matches API surface';
    } else if ('path' in action && surface.surface_type === 'file_system') {
      score += 3;
      reason = 'File action matches file system surface';
    } else if ('to' in action && surface.surface_type === 'communication') {
      score += 3;
      reason = 'Message action matches communication surface';
    } else if ('start_time' in action && surface.surface_type === 'calendar') {
      score += 3;
      reason = 'Event action matches calendar surface';
    }

    // Bonus for specific capabilities
    const actionType = (action as any).type;
    if (surface.capabilities.includes(actionType)) {
      score += 2;
      reason += ` (has ${actionType} capability)`;
    }

    return { surface, score, reason };
  });

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  // Return best match if score > 0
  return matches[0]?.score > 0 ? matches[0] : null;
}

/**
 * Update surface status
 */
export async function updateSurfaceStatus(
  surfaceId: string,
  status: 'available' | 'busy' | 'disabled'
): Promise<boolean> {
  if (!supabaseAdmin) return false;

  const { error } = await supabaseAdmin
    .from('agent_surfaces')
    .update({ status, last_used_at: new Date().toISOString() })
    .eq('id', surfaceId);

  if (error) {
    console.error('[SurfaceRegistry] Update status error:', error);
    return false;
  }

  return true;
}

/**
 * List all available surfaces across all agents
 */
export async function listAvailableSurfaces(
  type?: SurfaceType
): Promise<AgentSurface[]> {
  if (!supabaseAdmin) return [];

  let query = supabaseAdmin
    .from('agent_surfaces')
    .select('*')
    .eq('status', 'available');

  if (type) {
    query = query.eq('surface_type', type);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[SurfaceRegistry] List error:', error);
    return [];
  }

  return data as AgentSurface[];
}

/**
 * Get surface statistics
 */
export async function getSurfaceStats(): Promise<{
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  total: number;
}> {
  if (!supabaseAdmin) {
    return { byType: {}, byStatus: {}, total: 0 };
  }

  const { data, error } = await supabaseAdmin
    .from('agent_surfaces')
    .select('surface_type, status');

  if (error || !data) {
    return { byType: {}, byStatus: {}, total: 0 };
  }

  const stats = {
    byType: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
    total: data.length,
  };

  for (const surface of data) {
    stats.byType[surface.surface_type] = (stats.byType[surface.surface_type] || 0) + 1;
    stats.byStatus[surface.status] = (stats.byStatus[surface.status] || 0) + 1;
  }

  return stats;
}
