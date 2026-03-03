/**
 * Dependency Health Sync Service
 * Syncs dependency scan results to CRICO project suggestions
 */

import { supabaseAdmin } from '@/lib/supabase-server';
import type { DependencyScan, DependencySnapshot, ScanSummary } from '../types';

interface CricoSuggestion {
  project_id: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action_label?: string;
  action_url?: string;
  metadata: Record<string, unknown>;
}

/**
 * Create a CRICO suggestion for a dependency issue
 */
async function createSuggestion(suggestion: CricoSuggestion): Promise<void> {
  if (!supabaseAdmin) {
    console.error('[deps-health-sync] supabaseAdmin not available');
    return;
  }

  try {
    const { error } = await supabaseAdmin.from('crico_project_suggestions').insert({
      ...suggestion,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[deps-health-sync] Failed to create suggestion:', error);
    }
  } catch (err) {
    console.error('[deps-health-sync] Error creating suggestion:', err);
  }
}

/**
 * Clear existing dependency-related suggestions for a project
 */
async function clearDependencySuggestions(projectId: string): Promise<void> {
  if (!supabaseAdmin) {
    return;
  }

  try {
    await supabaseAdmin
      .from('crico_project_suggestions')
      .delete()
      .eq('project_id', projectId)
      .eq('category', 'dependency_issue');
  } catch (err) {
    console.error('[deps-health-sync] Error clearing suggestions:', err);
  }
}

/**
 * Sync scan summary to CRICO suggestions
 */
export async function syncSummaryToCrico(
  projectId: string,
  summary: ScanSummary
): Promise<void> {
  // Only create suggestions for significant issues
  const suggestions: CricoSuggestion[] = [];

  // Critical security issues
  if (summary.criticalIssues > 0) {
    suggestions.push({
      project_id: projectId,
      category: 'dependency_issue',
      severity: 'critical',
      title: `Critical security vulnerabilities found (${summary.criticalIssues})`,
      description: `Your project has ${summary.criticalIssues} critical security vulnerabilities in dependencies. Immediate action is required to update these packages.`,
      action_label: 'View Issues',
      action_url: `/projects/${projectId}/dependencies?severity=critical`,
      metadata: {
        type: 'security_critical',
        count: summary.criticalIssues,
      },
    });
  }

  // High severity issues
  if (summary.highIssues > 0) {
    suggestions.push({
      project_id: projectId,
      category: 'dependency_issue',
      severity: 'high',
      title: `High severity dependency issues (${summary.highIssues})`,
      description: `Your project has ${summary.highIssues} high severity issues including deprecated packages or security vulnerabilities.`,
      action_label: 'Review Issues',
      action_url: `/projects/${projectId}/dependencies?severity=high`,
      metadata: {
        type: 'security_high',
        count: summary.highIssues,
      },
    });
  }

  // Deprecated packages
  if (summary.deprecated > 0 && summary.deprecated >= 3) {
    suggestions.push({
      project_id: projectId,
      category: 'dependency_issue',
      severity: summary.deprecated > 5 ? 'high' : 'medium',
      title: `Multiple deprecated dependencies (${summary.deprecated})`,
      description: `${summary.deprecated} packages in your project are deprecated. Consider migrating to maintained alternatives.`,
      action_label: 'View Deprecated',
      action_url: `/projects/${projectId}/dependencies?filter=deprecated`,
      metadata: {
        type: 'deprecated',
        count: summary.deprecated,
      },
    });
  }

  // Outdated packages
  if (summary.outdated > 10) {
    suggestions.push({
      project_id: projectId,
      category: 'dependency_issue',
      severity: summary.outdated > 20 ? 'medium' : 'low',
      title: `Many outdated dependencies (${summary.outdated})`,
      description: `${summary.outdated} packages are out of date. Keeping dependencies updated improves security and gives access to new features.`,
      action_label: 'Review Updates',
      action_url: `/projects/${projectId}/dependencies?filter=outdated`,
      metadata: {
        type: 'outdated',
        count: summary.outdated,
      },
    });
  }

  // Low health score warning
  if (summary.healthScore < 50) {
    suggestions.push({
      project_id: projectId,
      category: 'dependency_issue',
      severity: 'high',
      title: 'Dependency health score is low',
      description: `Your project's dependency health score is ${summary.healthScore}/100. This indicates multiple issues that should be addressed to maintain code quality and security.`,
      action_label: 'View Health Report',
      action_url: `/projects/${projectId}/dependencies`,
      metadata: {
        type: 'health_score',
        score: summary.healthScore,
      },
    });
  }

  // Create all suggestions
  for (const suggestion of suggestions) {
    await createSuggestion(suggestion);
  }
}

/**
 * Sync individual dependency snapshots to CRICO suggestions
 */
export async function syncSnapshotsToCrico(
  projectId: string,
  snapshots: DependencySnapshot[]
): Promise<void> {
  // Get critical and high severity snapshots
  const criticalSnapshots = snapshots.filter((s) => s.severity === 'critical');
  const highSnapshots = snapshots.filter((s) => s.severity === 'high');

  // Create suggestions for critical issues (limit to first 5 to avoid spam)
  for (const snapshot of criticalSnapshots.slice(0, 5)) {
    const vulnCount = snapshot.security_advisories.length;
    const vulnText = vulnCount === 1 ? '1 vulnerability' : `${vulnCount} vulnerabilities`;

    await createSuggestion({
      project_id: projectId,
      category: 'dependency_issue',
      severity: 'critical',
      title: `Critical: ${snapshot.package_name} has security issues`,
      description: `${snapshot.package_name}@${snapshot.current_version} has ${vulnText}. Update to ${snapshot.latest_version || 'latest version'} immediately.`,
      action_label: 'View Details',
      action_url: `/projects/${projectId}/dependencies?package=${encodeURIComponent(snapshot.package_name)}`,
      metadata: {
        type: 'package_critical',
        package_name: snapshot.package_name,
        current_version: snapshot.current_version,
        latest_version: snapshot.latest_version,
        advisories: snapshot.security_advisories,
      },
    });
  }

  // Create suggestions for high severity deprecated packages (limit to first 5)
  const deprecatedHigh = highSnapshots.filter((s) => s.is_deprecated).slice(0, 5);
  for (const snapshot of deprecatedHigh) {
    await createSuggestion({
      project_id: projectId,
      category: 'dependency_issue',
      severity: 'high',
      title: `${snapshot.package_name} is deprecated`,
      description: `${snapshot.package_name}@${snapshot.current_version} is deprecated. Consider migrating to a maintained alternative.`,
      action_label: 'Find Alternatives',
      action_url: `https://www.npmjs.com/package/${encodeURIComponent(snapshot.package_name)}`,
      metadata: {
        type: 'package_deprecated',
        package_name: snapshot.package_name,
        current_version: snapshot.current_version,
      },
    });
  }
}

/**
 * Main sync function: syncs a scan and its snapshots to CRICO
 */
export async function syncToCricoHealth(
  projectId: string,
  scan: DependencyScan,
  snapshots: DependencySnapshot[],
  summary: ScanSummary
): Promise<void> {
  console.log(`[deps-health-sync] Syncing scan ${scan.id} to CRICO for project ${projectId}`);

  // Clear old dependency suggestions for this project
  await clearDependencySuggestions(projectId);

  // Sync summary-level suggestions
  await syncSummaryToCrico(projectId, summary);

  // Sync individual high-priority snapshots
  await syncSnapshotsToCrico(projectId, snapshots);

  console.log(`[deps-health-sync] Sync complete for project ${projectId}`);
}

/**
 * Get dependency health summary for a project
 */
export async function getDependencyHealthSummary(
  projectId: string
): Promise<{
  healthScore: number;
  lastScan?: DependencyScan;
  issueCounts: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
    total: number;
  };
} | null> {
  if (!supabaseAdmin) {
    return null;
  }

  try {
    // Get latest completed scan
    const { data: scan } = await supabaseAdmin
      .from('dependency_scans')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'complete')
      .order('scanned_at', { ascending: false })
      .limit(1)
      .single();

    if (!scan) {
      return null;
    }

    // Get issue counts by severity
    const { data: snapshots } = await supabaseAdmin
      .from('dependency_snapshots')
      .select('severity')
      .eq('scan_id', scan.id);

    const issueCounts = {
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      total: snapshots?.length || 0,
    };

    snapshots?.forEach((s: { severity: 'critical' | 'high' | 'moderate' | 'low' | null }) => {
      if (s.severity) {
        issueCounts[s.severity as keyof typeof issueCounts]++;
      }
    });

    // Calculate health score based on issues
    let healthScore = 100;
    healthScore -= issueCounts.critical * 20;
    healthScore -= issueCounts.high * 10;
    healthScore -= issueCounts.moderate * 5;
    healthScore -= issueCounts.low * 2;
    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      healthScore,
      lastScan: scan,
      issueCounts,
    };
  } catch (err) {
    console.error('[deps-health-sync] Error getting health summary:', err);
    return null;
  }
}
