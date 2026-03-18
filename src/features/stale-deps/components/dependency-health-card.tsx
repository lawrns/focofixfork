'use client';

import { useCallback, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ShieldAlert, Package, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import type { DependencyScan } from '../types';

interface DependencyHealthCardProps {
  projectId?: string;
  className?: string;
}

interface HealthData {
  scan: DependencyScan | null;
  healthScore: number;
  issueCounts: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
}

export function DependencyHealthCard({ projectId, className }: DependencyHealthCardProps) {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const url = projectId
        ? `/api/stale-deps?projectId=${projectId}`
        : '/api/stale-deps';

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch dependency health');
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const triggerScan = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stale-deps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error('Failed to trigger scan');
      }

      // Refresh after a short delay to get updated results
      setTimeout(fetchHealthData, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger scan');
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHealthData();
  }, [fetchHealthData]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            Dependency Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-2 w-full" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            Dependency Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchHealthData}>
            <RefreshCw className="h-3 w-3 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.scan) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            Dependency Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            No dependency scan available for this project.
          </p>
          <Button variant="outline" size="sm" onClick={triggerScan} disabled={loading}>
            <RefreshCw className="h-3 w-3 mr-2" />
            Run Scan
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { scan, healthScore, issueCounts } = data;
  const hasIssues = issueCounts.critical > 0 || issueCounts.high > 0;
  const totalIssues = issueCounts.critical + issueCounts.high + issueCounts.moderate + issueCounts.low;

  // Determine health color
  const getHealthColor = () => {
    if (healthScore >= 80) return 'bg-emerald-500';
    if (healthScore >= 60) return 'bg-amber-500';
    if (healthScore >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Dependency Health
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={triggerScan}
            disabled={loading}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Health Score</span>
            <span className="font-medium">{healthScore}/100</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full transition-all duration-500 ${getHealthColor()}`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>

        {/* Issue Counts */}
        <div className="grid grid-cols-2 gap-2">
          {/* Security Issues */}
          <div className="flex items-center gap-2 rounded-lg border p-2">
            <ShieldAlert
              className={`h-4 w-4 ${
                issueCounts.critical > 0 || issueCounts.high > 0
                  ? 'text-red-500'
                  : 'text-muted-foreground'
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Security</p>
              <p className="text-sm font-medium truncate">
                {issueCounts.critical > 0 && (
                  <Badge variant="destructive" className="h-4 text-[10px] mr-1">
                    {issueCounts.critical}
                  </Badge>
                )}
                {issueCounts.high > 0 && (
                  <Badge
                    variant="default"
                    className="h-4 text-[10px] mr-1 bg-orange-500 hover:bg-orange-600"
                  >
                    {issueCounts.high}
                  </Badge>
                )}
                {issueCounts.critical === 0 && issueCounts.high === 0 && (
                  <span className="text-emerald-600">Clean</span>
                )}
              </p>
            </div>
          </div>

          {/* Outdated */}
          <div className="flex items-center gap-2 rounded-lg border p-2">
            <AlertTriangle
              className={`h-4 w-4 ${
                scan.outdated_count > 0 ? 'text-amber-500' : 'text-muted-foreground'
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Outdated</p>
              <p className="text-sm font-medium truncate">
                {scan.outdated_count > 0 ? (
                  <Badge variant="secondary" className="h-4 text-[10px]">
                    {scan.outdated_count}
                  </Badge>
                ) : (
                  <span className="text-emerald-600">Up to date</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Deprecated */}
        {scan.deprecated_count > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-2">
            <span className="text-sm text-amber-800 dark:text-amber-200">
              Deprecated packages
            </span>
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              {scan.deprecated_count}
            </Badge>
          </div>
        )}

        {/* Summary */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {scan.total_deps} packages scanned
          </span>
          <span>
            {totalIssues > 0 ? `${totalIssues} issues found` : 'All clear'}
          </span>
        </div>

        {/* View Details Link */}
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href={projectId ? `/projects/${projectId}/dependencies` : '/maintenance'}>
            View Details
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
