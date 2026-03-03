/**
 * Stale Dependencies API
 * GET: Get latest scan for a project
 * POST: Trigger a new scan for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api/auth-helper';
import {
  scanPackageJson,
  parsePackageJson,
  generateScanId,
} from '@/features/stale-deps/services/deps-scanner';
import { syncToCricoHealth } from '@/features/stale-deps/services/deps-health-sync';
import type { PackageJson } from '@/features/stale-deps/types';

export const dynamic = 'force-dynamic';

interface HealthData {
  scan: {
    id: string;
    project_id: string;
    scan_id: string;
    status: string;
    total_deps: number;
    outdated_count: number;
    deprecated_count: number;
    unused_count: number;
    security_issues: number;
    scanned_at: string;
    completed_at?: string;
    error_message?: string;
  } | null;
  healthScore: number;
  issueCounts: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
}

/**
 * GET /api/stale-deps?projectId=xxx
 * Returns the latest dependency scan for a project
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
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      // Return summary across all user's projects
      const { data: scans } = await supabaseAdmin
        .from('dependency_scans')
        .select(`
          *,
          foco_projects!inner(workspace_id, foco_workspace_members!inner(user_id))
        `)
        .eq('foco_projects.foco_workspace_members.user_id', user.id)
        .eq('status', 'complete')
        .order('scanned_at', { ascending: false });

      const latestScans = scans?.slice(0, 5) || [];
      
      return NextResponse.json({
        success: true,
        data: {
          recentScans: latestScans,
          totalScanned: latestScans.length,
        },
      });
    }

    // Verify user has access to this project
    const { data: projectAccess } = await supabaseAdmin
      .from('foco_projects')
      .select('id')
      .eq('id', projectId)
      .or(`owner_id.eq.${user.id},foco_workspace_members.user_id.eq.${user.id}`)
      .maybeSingle();

    if (!projectAccess) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    // Get latest completed scan
    const { data: scan } = await supabaseAdmin
      .from('dependency_scans')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'complete')
      .order('scanned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!scan) {
      return NextResponse.json({
        success: true,
        data: {
          scan: null,
          healthScore: 0,
          issueCounts: { critical: 0, high: 0, moderate: 0, low: 0 },
        } as HealthData,
      });
    }

    // Get issue counts by severity
    const { data: snapshots } = await supabaseAdmin
      .from('dependency_snapshots')
      .select('severity, is_deprecated, is_unused')
      .eq('scan_id', scan.id);

    const issueCounts = {
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
    };

    snapshots?.forEach((s: { severity: string | null }) => {
      if (s.severity) {
        issueCounts[s.severity as keyof typeof issueCounts]++;
      }
    });

    // Calculate health score
    let healthScore = 100;
    healthScore -= issueCounts.critical * 20;
    healthScore -= issueCounts.high * 10;
    healthScore -= issueCounts.moderate * 5;
    healthScore -= issueCounts.low * 2;
    healthScore = Math.max(0, Math.min(100, healthScore));

    const response: HealthData = {
      scan: {
        id: scan.id,
        project_id: scan.project_id,
        scan_id: scan.scan_id,
        status: scan.status,
        total_deps: scan.total_deps,
        outdated_count: scan.outdated_count,
        deprecated_count: scan.deprecated_count,
        unused_count: scan.unused_count,
        security_issues: scan.security_issues,
        scanned_at: scan.scanned_at,
        completed_at: scan.completed_at,
        error_message: scan.error_message,
      },
      healthScore,
      issueCounts,
    };

    return NextResponse.json({ success: true, data: response });
  } catch (err) {
    console.error('[stale-deps] GET error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stale-deps
 * Triggers a new dependency scan for a project
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this project
    const { data: project } = await supabaseAdmin
      .from('foco_projects')
      .select('id, owner_id, workspace_id')
      .eq('id', projectId)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    // Check if user is owner or workspace member
    const isOwner = project.owner_id === user.id;
    if (!isOwner) {
      const { data: membership } = await supabaseAdmin
        .from('foco_workspace_members')
        .select('id')
        .eq('workspace_id', project.workspace_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
    }

    // Get package.json from project artifacts or memory
    const { data: artifacts } = await supabaseAdmin
      .from('project_artifacts')
      .select('content, file_path')
      .eq('project_id', projectId)
      .or('file_path.ilike.%package.json%,name.ilike.%package%')
      .limit(10);

    let packageJson: PackageJson | null = null;
    let packageJsonSource = '';

    // Look for package.json in artifacts
    for (const artifact of artifacts || []) {
      if (artifact.file_path?.toLowerCase().includes('package.json')) {
        const parsed = parsePackageJson(artifact.content);
        if (parsed && (parsed.dependencies || parsed.devDependencies)) {
          packageJson = parsed;
          packageJsonSource = artifact.content;
          break;
        }
      }
    }

    // If not found, check project memory
    if (!packageJson) {
      const { data: memory } = await supabaseAdmin
        .from('project_memory')
        .select('content')
        .eq('project_id', projectId)
        .or('content.ilike.%.dependencies%,content.ilike.%package.json%')
        .limit(5);

      for (const mem of memory || []) {
        const parsed = parsePackageJson(mem.content);
        if (parsed && (parsed.dependencies || parsed.devDependencies)) {
          packageJson = parsed;
          packageJsonSource = mem.content;
          break;
        }
      }
    }

    if (!packageJson) {
      return NextResponse.json(
        { success: false, error: 'No package.json found for this project' },
        { status: 404 }
      );
    }

    // Create scan record
    const scanId = generateScanId();
    const { data: scan, error: scanError } = await supabaseAdmin
      .from('dependency_scans')
      .insert({
        project_id: projectId,
        scan_id: scanId,
        status: 'running',
        total_deps: 0,
        scanned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (scanError || !scan) {
      console.error('[stale-deps] Failed to create scan:', scanError);
      return NextResponse.json(
        { success: false, error: 'Failed to create scan' },
        { status: 500 }
      );
    }

    // Perform the scan asynchronously
    try {
      const { snapshots, summary } = await scanPackageJson(projectId, packageJson);

      // Insert snapshots
      const snapshotRecords = snapshots.map((s) => ({
        scan_id: scan.id,
        ...s,
      }));

      const { error: snapshotError } = await supabaseAdmin
        .from('dependency_snapshots')
        .insert(snapshotRecords);

      if (snapshotError) {
        console.error('[stale-deps] Failed to insert snapshots:', snapshotError);
      }

      // Update scan with results
      const { error: updateError } = await supabaseAdmin
        .from('dependency_scans')
        .update({
          status: 'complete',
          total_deps: summary.total,
          outdated_count: summary.outdated,
          deprecated_count: summary.deprecated,
          unused_count: summary.unused,
          security_issues: summary.securityIssues,
          completed_at: new Date().toISOString(),
        })
        .eq('id', scan.id);

      if (updateError) {
        console.error('[stale-deps] Failed to update scan:', updateError);
      }

      // Sync to CRICO health
      await syncToCricoHealth(
        projectId,
        {
          ...scan,
          status: 'complete',
          total_deps: summary.total,
          outdated_count: summary.outdated,
          deprecated_count: summary.deprecated,
          unused_count: summary.unused,
          security_issues: summary.securityIssues,
        },
        snapshotRecords as any,
        summary
      );

      return NextResponse.json({
        success: true,
        data: {
          scanId: scan.id,
          status: 'complete',
          summary,
        },
      });
    } catch (scanErr) {
      // Update scan with error
      await supabaseAdmin
        .from('dependency_scans')
        .update({
          status: 'failed',
          error_message: scanErr instanceof Error ? scanErr.message : 'Scan failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', scan.id);

      throw scanErr;
    }
  } catch (err) {
    console.error('[stale-deps] POST error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
