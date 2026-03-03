export interface DependencyScan {
  id: string;
  project_id: string;
  scan_id: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  total_deps: number;
  outdated_count: number;
  deprecated_count: number;
  unused_count: number;
  security_issues: number;
  scanned_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface DependencySnapshot {
  id: string;
  scan_id: string;
  package_name: string;
  current_version: string;
  latest_version?: string;
  wanted_version?: string;
  staleness_days?: number;
  is_deprecated: boolean;
  is_unused: boolean;
  security_advisories: Array<{
    id: string;
    title: string;
    severity: string;
    url?: string;
  }>;
  severity?: 'critical' | 'high' | 'moderate' | 'low' | 'info';
  created_at: string;
}

export interface PackageHealth {
  outdated: boolean;
  deprecated: boolean;
  unused: boolean;
  securityIssues: number;
  severity: 'critical' | 'high' | 'moderate' | 'low' | 'info' | null;
}

export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface NpmRegistryResponse {
  name: string;
  'dist-tags': {
    latest: string;
    [key: string]: string;
  };
  versions: Record<string, {
    deprecated?: string;
    version: string;
    published?: string;
  }>;
  time?: Record<string, string>;
}

export interface OSVAdvisory {
  id: string;
  summary: string;
  severity?: {
    type: string;
    score: string;
  }[];
  references?: {
    type: string;
    url: string;
  }[];
}

export interface OSVQueryResponse {
  vulns?: OSVAdvisory[];
}

export interface ScanSummary {
  total: number;
  outdated: number;
  deprecated: number;
  unused: number;
  securityIssues: number;
  criticalIssues: number;
  highIssues: number;
  healthScore: number;
}
