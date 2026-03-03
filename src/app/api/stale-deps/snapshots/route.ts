/**
 * Dependency Snapshots API
 * GET: Get snapshots for a specific scan
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api/auth-helper';

export const dynamic = 'force-dynamic';

/**
 * GET /api/stale-deps/snapshots?scanId=xxx
 * Returns all snapshots for a specific scan
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const scanId = searchParams.get('scanId');

    if (!scanId) {
      return NextResponse.json(
        { success: false, error: 'scanId is required' },
        { status: 400 }
      );
    }

    // Get the scan first to verify access
    const { data: scan, error: scanError } = await supabaseAdmin
      .from('dependency_scans')
      .select(`
        id,
        project_id,
        foco_projects!inner(workspace_id, foco_workspace_members!inner(user_id))
      `)
      .eq('id', scanId)
      .eq('foco_projects.foco_workspace_members.user_id', user.id)
      .single();

    if (scanError || !scan) {
      return NextResponse.json(
        { success: false, error: 'Scan not found or access denied' },
        { status: 404 }
      );
    }

    // Get filter parameters
    const severity = searchParams.get('severity');
    const filterDeprecated = searchParams.get('filter') === 'deprecated';
    const filterOutdated = searchParams.get('filter') === 'outdated';
    const packageName = searchParams.get('package');

    // Build query
    let query = supabaseAdmin
      .from('dependency_snapshots')
      .select('*')
      .eq('scan_id', scanId);

    // Apply filters
    if (severity) {
      query = query.eq('severity', severity);
    }

    if (filterDeprecated) {
      query = query.eq('is_deprecated', true);
    }

    if (filterOutdated) {
      // Outdated means latest_version differs from current_version
      query = query.not('latest_version', 'is', null);
      query = query.neq('latest_version', '');
    }

    if (packageName) {
      query = query.ilike('package_name', `%${packageName}%`);
    }

    // Order by severity (most severe first), then by package name
    const { data: snapshots, error } = await query.order('severity', {
      ascending: false,
      nullsFirst: false,
    }).order('package_name', { ascending: true });

    if (error) {
      console.error('[stale-deps/snapshots] Query error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch snapshots' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        snapshots: snapshots || [],
        count: snapshots?.length || 0,
        scanId,
      },
    });
  } catch (err) {
    console.error('[stale-deps/snapshots] GET error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
