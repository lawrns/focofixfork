/**
 * Cron-callable Dependency Scan Endpoint
 * POST: Scans all projects with package.json (cron job)
 * Protected by x-cron-secret header
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  scanPackageJson,
  parsePackageJson,
  generateScanId,
} from '@/features/stale-deps/services/deps-scanner';
import { syncToCricoHealth } from '@/features/stale-deps/services/deps-health-sync';
import type { PackageJson } from '@/features/stale-deps/types';

export const dynamic = 'force-dynamic';

interface ScanResult {
  projectId: string;
  success: boolean;
  scanId?: string;
  error?: string;
  summary?: {
    total: number;
    outdated: number;
    deprecated: number;
    unused: number;
    securityIssues: number;
    healthScore: number;
  };
}

/**
 * Verify cron secret from header
 */
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = request.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error('[stale-deps/scan] CRON_SECRET not configured');
    return false;
  }

  return cronSecret === expectedSecret;
}

/**
 * Find package.json for a project from various sources
 */
async function findPackageJson(projectId: string): Promise<{ content: PackageJson; source: string } | null> {
  if (!supabaseAdmin) return null;

  // 1. Check project artifacts
  const { data: artifacts } = await supabaseAdmin
    .from('project_artifacts')
    .select('content, file_path')
    .eq('project_id', projectId)
    .or('file_path.ilike.%package.json%,file_path.ilike.%package-lock.json%')
    .limit(10);

  for (const artifact of artifacts || []) {
    // Skip lock files
    if (artifact.file_path?.toLowerCase().includes('package-lock.json')) {
      continue;
    }

    if (artifact.file_path?.toLowerCase().includes('package.json')) {
      const parsed = parsePackageJson(artifact.content);
      if (parsed && (parsed.dependencies || parsed.devDependencies)) {
        return { content: parsed, source: `artifact:${artifact.file_path}` };
      }
    }
  }

  // 2. Check project memory
  const { data: memory } = await supabaseAdmin
    .from('project_memory')
    .select('content, source')
    .eq('project_id', projectId)
    .or('content.ilike.%.dependencies%,content.ilike.%package.json%')
    .limit(10);

  for (const mem of memory || []) {
    const parsed = parsePackageJson(mem.content);
    if (parsed && (parsed.dependencies || parsed.devDependencies)) {
      return { content: parsed, source: `memory:${mem.source || 'unknown'}` };
    }
  }

  // 3. Check if project has package.json stored in metadata
  const { data: project } = await supabaseAdmin
    .from('foco_projects')
    .select('metadata')
    .eq('id', projectId)
    .single();

  if (project?.metadata?.package_json) {
    const parsed = parsePackageJson(JSON.stringify(project.metadata.package_json));
    if (parsed && (parsed.dependencies || parsed.devDependencies)) {
      return { content: parsed, source: 'project:metadata' };
    }
  }

  return null;
}

/**
 * Scan a single project
 */
async function scanProject(projectId: string): Promise<ScanResult> {
  console.log(`[stale-deps/scan] Scanning project ${projectId}`);

  try {
    // Find package.json
    const packageJsonData = await findPackageJson(projectId);

    if (!packageJsonData) {
      return {
        projectId,
        success: false,
        error: 'No package.json found',
      };
    }

    // Create scan record
    const scanId = generateScanId();
    const { data: scan, error: scanError } = await supabaseAdmin!.from('dependency_scans').insert({
      project_id: projectId,
      scan_id: scanId,
      status: 'running',
      total_deps: 0,
      scanned_at: new Date().toISOString(),
    }).select().single();

    if (scanError || !scan) {
      throw new Error(`Failed to create scan: ${scanError?.message}`);
    }

    // Perform scan
    const { snapshots, summary } = await scanPackageJson(
      projectId,
      packageJsonData.content
    );

    // Insert snapshots
    const snapshotRecords = snapshots.map((s) => ({
      scan_id: scan.id,
      ...s,
    }));

    const { error: snapshotError } = await supabaseAdmin!.from('dependency_snapshots').insert(
      snapshotRecords
    );

    if (snapshotError) {
      console.error(`[stale-deps/scan] Failed to insert snapshots for ${projectId}:`, snapshotError);
    }

    // Update scan with results
    await supabaseAdmin!.from('dependency_scans').update({
      status: 'complete',
      total_deps: summary.total,
      outdated_count: summary.outdated,
      deprecated_count: summary.deprecated,
      unused_count: summary.unused,
      security_issues: summary.securityIssues,
      completed_at: new Date().toISOString(),
    }).eq('id', scan.id);

    // Sync to CRICO
    await syncToCricoHealth(
      projectId,
      {
        id: scan.id,
        project_id: projectId,
        scan_id: scanId,
        status: 'complete',
        total_deps: summary.total,
        outdated_count: summary.outdated,
        deprecated_count: summary.deprecated,
        unused_count: summary.unused,
        security_issues: summary.securityIssues,
        scanned_at: scan.scanned_at,
        completed_at: new Date().toISOString(),
      },
      snapshotRecords as any,
      summary
    );

    console.log(`[stale-deps/scan] Completed scan for ${projectId}:`, summary);

    return {
      projectId,
      success: true,
      scanId: scan.id,
      summary: {
        total: summary.total,
        outdated: summary.outdated,
        deprecated: summary.deprecated,
        unused: summary.unused,
        securityIssues: summary.securityIssues,
        healthScore: summary.healthScore,
      },
    };
  } catch (error) {
    console.error(`[stale-deps/scan] Failed to scan project ${projectId}:`, error);

    // Try to update scan status to failed if we have a scan ID
    try {
      const { data: latestScan } = await supabaseAdmin!
        .from('dependency_scans')
        .select('id')
        .eq('project_id', projectId)
        .eq('status', 'running')
        .order('scanned_at', { ascending: false })
        .limit(1)
        .single();

      if (latestScan) {
        await supabaseAdmin!.from('dependency_scans').update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        }).eq('id', latestScan.id);
      }
    } catch (updateErr) {
      // Ignore update errors
    }

    return {
      projectId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * POST /api/stale-deps/scan
 * Cron job endpoint to scan all projects with package.json
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - invalid cron secret' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Service unavailable' },
        { status: 503 }
      );
    }

    // Get scan options from body
    const body = await request.json().catch(() => ({}));
    const { projectIds, limit = 100 } = body;

    let projectsToScan: string[] = [];

    if (projectIds && Array.isArray(projectIds) && projectIds.length > 0) {
      // Scan specific projects
      projectsToScan = projectIds;
    } else {
      // Find all projects that might have package.json
      // Look in artifacts first
      const { data: artifactProjects } = await supabaseAdmin
        .from('project_artifacts')
        .select('project_id')
        .or('file_path.ilike.%package.json%,file_path.ilike.%package-lock.json%')
        .limit(limit * 2);

      // Look in memory
      const { data: memoryProjects } = await supabaseAdmin
        .from('project_memory')
        .select('project_id')
        .or('content.ilike.%.dependencies%,content.ilike.%package.json%')
        .limit(limit * 2);

      // Combine unique project IDs
      const projectSet = new Set<string>();
      artifactProjects?.forEach((p: { project_id: string }) => projectSet.add(p.project_id));
      memoryProjects?.forEach((p: { project_id: string }) => projectSet.add(p.project_id));

      projectsToScan = Array.from(projectSet).slice(0, limit);
    }

    console.log(`[stale-deps/scan] Starting scan of ${projectsToScan.length} projects`);

    // Scan projects sequentially to avoid overwhelming APIs
    const results: ScanResult[] = [];
    for (const projectId of projectsToScan) {
      const result = await scanProject(projectId);
      results.push(result);

      // Small delay between scans to be nice to npm registry
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      data: {
        totalScanned: results.length,
        successCount,
        failCount,
        results,
      },
    });
  } catch (err) {
    console.error('[stale-deps/scan] Cron scan error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stale-deps/scan
 * Returns scan status for monitoring
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - invalid cron secret' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24', 10);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Get scan statistics
    const { data: stats } = await supabaseAdmin
      .from('dependency_scans')
      .select('status, count')
      .gte('scanned_at', since)
      .group('status');

    const { data: recentScans } = await supabaseAdmin
      .from('dependency_scans')
      .select(`
        id,
        project_id,
        status,
        total_deps,
        outdated_count,
        deprecated_count,
        security_issues,
        scanned_at,
        completed_at,
        foco_projects(name)
      `)
      .gte('scanned_at', since)
      .order('scanned_at', { ascending: false })
      .limit(20);

    // Calculate aggregates
    const statusCounts: Record<string, number> = {};
    stats?.forEach((s: any) => {
      statusCounts[s.status] = parseInt(s.count, 10);
    });

    return NextResponse.json({
      success: true,
      data: {
        period: `${hours}h`,
        statusCounts,
        totalScans: Object.values(statusCounts).reduce((a, b) => a + b, 0),
        recentScans: recentScans || [],
      },
    });
  } catch (err) {
    console.error('[stale-deps/scan] Status error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
