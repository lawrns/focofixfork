/**
 * Dependency Scanner Service
 * Scans package.json files and checks npm registry for updates, deprecations, and security issues.
 */

import type {
  PackageJson,
  NpmRegistryResponse,
  OSVQueryResponse,
  OSVAdvisory,
  DependencySnapshot,
  ScanSummary,
} from '../types';

// Simple in-memory cache to avoid hammering npm registry
const npmCache = new Map<string, { data: NpmRegistryResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a cached entry is still valid
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL;
}

/**
 * Fetch package info from npm registry with caching
 */
export async function checkNpmRegistry(packageName: string): Promise<NpmRegistryResponse | null> {
  // Check cache first
  const cached = npmCache.get(packageName);
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data;
  }

  try {
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Package not found (possibly private or renamed)
      }
      throw new Error(`npm registry error: ${response.status}`);
    }

    const data = (await response.json()) as NpmRegistryResponse;

    // Cache the result
    npmCache.set(packageName, { data, timestamp: Date.now() });

    return data;
  } catch (error) {
    console.error(`[deps-scanner] Failed to fetch npm info for ${packageName}:`, error);
    return null;
  }
}

/**
 * Check if a specific package version is deprecated
 */
export async function checkDeprecated(
  packageName: string,
  version: string
): Promise<{ isDeprecated: boolean; message?: string }> {
  const registryInfo = await checkNpmRegistry(packageName);

  if (!registryInfo || !registryInfo.versions) {
    return { isDeprecated: false };
  }

  // Clean version string (remove ^, ~, etc.)
  const cleanVersion = version.replace(/^[\^~>=<]+/, '').split(' ')[0];

  const versionInfo = registryInfo.versions[cleanVersion];
  if (versionInfo && versionInfo.deprecated) {
    return { isDeprecated: true, message: versionInfo.deprecated };
  }

  // Also check if the entire package is deprecated (latest version has deprecation)
  const latestVersion = registryInfo['dist-tags']?.latest;
  if (latestVersion && registryInfo.versions[latestVersion]?.deprecated) {
    return {
      isDeprecated: true,
      message: registryInfo.versions[latestVersion].deprecated,
    };
  }

  return { isDeprecated: false };
}

/**
 * Detect if a package is unused by searching for imports in project files.
 * This is a simplified implementation that looks for common import patterns.
 */
export function detectUnused(
  packageName: string,
  projectFiles: string[]
): { isUnused: boolean; confidence: 'high' | 'medium' | 'low' } {
  // Packages that are commonly used without direct imports
  const commonRuntimePackages = [
    'react',
    'react-dom',
    'next',
    'typescript',
    '@types/',
    'tailwindcss',
    'postcss',
    'autoprefixer',
    'eslint',
    'prettier',
    'jest',
    'vitest',
    '@testing-library',
  ];

  // Skip checking for common runtime/build tools
  if (commonRuntimePackages.some((pkg) => packageName.startsWith(pkg) || packageName === pkg)) {
    return { isUnused: false, confidence: 'high' };
  }

  const importPatterns = [
    // ES6 imports
    `from ['"]${packageName}`,
    `from ['"]${packageName}/`,
    // CommonJS requires
    `require\\(['"]${packageName}`,
    `require\\(['"]${packageName}/`,
    // Dynamic imports
    `import\\(['"]${packageName}`,
    `import\\(['"]${packageName}/`,
  ];

  // Look for any import of this package
  const isImported = projectFiles.some((file) => {
    return importPatterns.some((pattern) => {
      const regex = new RegExp(pattern);
      return regex.test(file);
    });
  });

  if (isImported) {
    return { isUnused: false, confidence: 'high' };
  }

  // For scoped packages, also check the unscoped name
  if (packageName.startsWith('@')) {
    const parts = packageName.split('/');
    if (parts.length === 2) {
      const orgName = parts[0];
      const pkgName = parts[1];
      const scopedPatterns = [
        `from ['"]${orgName}`,
        `require\\(['"]${orgName}`,
      ];
      const isScopedImported = projectFiles.some((file) => {
        return scopedPatterns.some((pattern) => {
          const regex = new RegExp(pattern);
          return regex.test(file);
        });
      });
      if (isScopedImported) {
        return { isUnused: false, confidence: 'medium' };
      }
    }
  }

  return { isUnused: true, confidence: 'medium' };
}

/**
 * Check security advisories using OSV.dev API
 */
export async function checkSecurity(
  packageName: string,
  version: string
): Promise<OSVAdvisory[]> {
  try {
    // Clean version string
    const cleanVersion = version.replace(/^[\^~>=<]+/, '').split(' ')[0];

    const response = await fetch('https://api.osv.dev/v1/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        package: {
          name: packageName,
          ecosystem: 'npm',
        },
        version: cleanVersion,
      }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return []; // No vulnerabilities found
      }
      throw new Error(`OSV API error: ${response.status}`);
    }

    const data = (await response.json()) as OSVQueryResponse;
    return data.vulns || [];
  } catch (error) {
    console.error(`[deps-scanner] Failed to check security for ${packageName}:`, error);
    return [];
  }
}

/**
 * Calculate severity based on advisories and deprecation status
 */
function calculateSeverity(
  advisories: OSVAdvisory[],
  isDeprecated: boolean,
  isOutdated: boolean,
  daysOutdated: number
): 'critical' | 'high' | 'moderate' | 'low' | 'info' | undefined {
  // Check for critical vulnerabilities first
  const hasCriticalVuln = advisories.some((adv) =>
    adv.severity?.some((s) => s.type === 'CVSS_V3' && parseFloat(s.score) >= 9.0)
  );
  if (hasCriticalVuln) return 'critical';

  // Check for high severity vulnerabilities
  const hasHighVuln = advisories.some((adv) =>
    adv.severity?.some((s) => s.type === 'CVSS_V3' && parseFloat(s.score) >= 7.0)
  );
  if (hasHighVuln) return 'high';

  // Deprecation + security issues
  if (isDeprecated && advisories.length > 0) return 'high';

  // Critical level outdated (1+ years)
  if (daysOutdated > 365) return 'high';

  // Moderate level outdated (6+ months)
  if (daysOutdated > 180) return 'moderate';

  // Low level outdated (3+ months)
  if (daysOutdated > 90) return 'low';

  // Just deprecated or has low severity vulnerabilities
  if (isDeprecated || advisories.length > 0) return 'low';

  // Outdated but recent
  if (isOutdated) return 'info';

  return undefined;
}

/**
 * Calculate staleness days based on version difference
 */
function calculateStalenessDays(
  currentVersion: string,
  latestVersion: string,
  registryInfo: NpmRegistryResponse | null
): number | undefined {
  if (!registryInfo?.time) return undefined;

  const cleanCurrent = currentVersion.replace(/^[\^~>=<]+/, '').split(' ')[0];
  const currentPublished = registryInfo.time[cleanCurrent];
  const latestPublished = registryInfo.time[latestVersion];

  if (!currentPublished || !latestPublished) return undefined;

  const currentDate = new Date(currentPublished);
  const latestDate = new Date(latestPublished);

  return Math.floor((latestDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Compare two semantic versions
 * Returns: negative if a < b, 0 if equal, positive if a > b
 */
function compareVersions(a: string, b: string): number {
  const parseVersion = (v: string) => {
    const clean = v.replace(/^[\^~>=<]+/, '').split('-')[0];
    return clean.split('.').map((n) => parseInt(n, 10) || 0);
  };

  const va = parseVersion(a);
  const vb = parseVersion(b);

  for (let i = 0; i < Math.max(va.length, vb.length); i++) {
    const na = va[i] || 0;
    const nb = vb[i] || 0;
    if (na !== nb) return na - nb;
  }

  return 0;
}

/**
 * Scan a single package and return its snapshot
 */
export async function scanPackage(
  packageName: string,
  currentVersion: string,
  projectFiles?: string[]
): Promise<Omit<DependencySnapshot, 'id' | 'scan_id' | 'created_at'>> {
  // Fetch registry info
  const registryInfo = await checkNpmRegistry(packageName);
  const latestVersion = registryInfo?.['dist-tags']?.latest;

  // Check deprecation
  const deprecationInfo = await checkDeprecated(packageName, currentVersion);

  // Check security
  const advisories = await checkSecurity(packageName, currentVersion);

  // Check if unused (if project files provided)
  let isUnused = false;
  if (projectFiles && projectFiles.length > 0) {
    const unusedInfo = detectUnused(packageName, projectFiles);
    isUnused = unusedInfo.isUnused;
  }

  // Determine if outdated
  const isOutdated = latestVersion ? compareVersions(currentVersion, latestVersion) < 0 : false;

  // Calculate staleness
  const stalenessDays =
    isOutdated && latestVersion
      ? calculateStalenessDays(currentVersion, latestVersion, registryInfo)
      : undefined;

  // Calculate severity
  const severity = calculateSeverity(
    advisories,
    deprecationInfo.isDeprecated,
    isOutdated,
    stalenessDays || 0
  );

  // Format security advisories
  const securityAdvisories = advisories.map((adv) => ({
    id: adv.id,
    title: adv.summary || 'Unknown vulnerability',
    severity:
      adv.severity?.find((s) => s.type === 'CVSS_V3')?.score ||
      'unknown',
    url: adv.references?.find((r) => r.type === 'ADVISORY')?.url,
  }));

  return {
    package_name: packageName,
    current_version: currentVersion,
    latest_version: latestVersion,
    wanted_version: latestVersion, // Simplified: always suggest latest
    staleness_days: stalenessDays,
    is_deprecated: deprecationInfo.isDeprecated,
    is_unused: isUnused,
    security_advisories: securityAdvisories,
    severity,
  };
}

/**
 * Main scan function: scans a package.json and returns all dependency snapshots
 */
export async function scanPackageJson(
  projectId: string,
  packageJsonContent: PackageJson,
  projectFiles?: string[]
): Promise<{
  snapshots: Omit<DependencySnapshot, 'id' | 'scan_id' | 'created_at'>[];
  summary: ScanSummary;
}> {
  const allDeps: Record<string, string> = {
    ...packageJsonContent.dependencies,
    ...packageJsonContent.devDependencies,
    ...packageJsonContent.peerDependencies,
  };

  const packageNames = Object.keys(allDeps);
  const snapshots: Omit<DependencySnapshot, 'id' | 'scan_id' | 'created_at'>[] = [];

  // Process packages in batches to avoid overwhelming the APIs
  const BATCH_SIZE = 10;
  for (let i = 0; i < packageNames.length; i += BATCH_SIZE) {
    const batch = packageNames.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((name) => scanPackage(name, allDeps[name], projectFiles))
    );
    snapshots.push(...batchResults);
  }

  // Calculate summary
  const outdated = snapshots.filter((s) => {
    if (!s.latest_version) return false;
    return compareVersions(s.current_version, s.latest_version) < 0;
  }).length;

  const deprecated = snapshots.filter((s) => s.is_deprecated).length;
  const unused = snapshots.filter((s) => s.is_unused).length;
  const securityIssues = snapshots.reduce(
    (sum, s) => sum + s.security_advisories.length,
    0
  );

  const criticalIssues = snapshots.filter((s) => s.severity === 'critical').length;
  const highIssues = snapshots.filter((s) => s.severity === 'high').length;

  // Calculate health score (0-100)
  // Start at 100 and deduct for issues
  let healthScore = 100;
  healthScore -= criticalIssues * 20; // -20 per critical
  healthScore -= highIssues * 10; // -10 per high
  healthScore -= (securityIssues - criticalIssues - highIssues) * 5; // -5 per other security issue
  healthScore -= deprecated * 3; // -3 per deprecated
  healthScore -= Math.min(outdated * 2, 30); // -2 per outdated, max -30
  healthScore = Math.max(0, Math.min(100, healthScore));

  return {
    snapshots,
    summary: {
      total: snapshots.length,
      outdated,
      deprecated,
      unused,
      securityIssues,
      criticalIssues,
      highIssues,
      healthScore,
    },
  };
}

/**
 * Parse a package.json string into the PackageJson interface
 */
export function parsePackageJson(content: string): PackageJson | null {
  try {
    return JSON.parse(content) as PackageJson;
  } catch {
    return null;
  }
}

/**
 * Generate a unique scan ID
 */
export function generateScanId(): string {
  return `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Clear the npm registry cache
 */
export function clearNpmCache(): void {
  npmCache.clear();
}
