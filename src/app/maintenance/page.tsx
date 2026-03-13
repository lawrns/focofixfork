'use client';

import { useCallback, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { DependencyHealthCard } from '@/features/stale-deps/components/dependency-health-card';
import { DependencyTable } from '@/features/stale-deps/components/dependency-table';
import { useToastHelpers } from '@/components/ui/toast';
import type { DependencyScan, DependencySnapshot } from '@/features/stale-deps/types';
import {
  Wrench,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  ShieldAlert,
} from 'lucide-react';

interface ScanWithProject extends DependencyScan {
  foco_projects?: {
    id: string;
    name: string;
  };
}

function MaintenancePageContent() {
  const { error: showError, info: showInfo } = useToastHelpers();
  const searchParams = useSearchParams();
  const projectId = searchParams?.get('projectId') ?? null;

  const [activeTab, setActiveTab] = useState('overview');
  const [scans, setScans] = useState<ScanWithProject[]>([]);
  const [selectedScan, setSelectedScan] = useState<DependencyScan | null>(null);
  const [snapshots, setSnapshots] = useState<DependencySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);

  const fetchScans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stale-deps');
      if (!response.ok) {
        throw new Error('Failed to fetch scans');
      }
      const result = await response.json();
      if (result.success) {
        setScans(result.data.recentScans || []);
      }
    } catch (err) {
      showError('Error', 'Failed to load dependency scans');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const fetchSnapshots = async (scanId: string) => {
    try {
      setLoadingSnapshots(true);
      const response = await fetch(`/api/stale-deps/snapshots?scanId=${scanId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch snapshots');
      }
      const result = await response.json();
      if (result.success) {
        setSnapshots(result.data.snapshots);
      }
    } catch (err) {
      showError('Error', 'Failed to load dependency details');
    } finally {
      setLoadingSnapshots(false);
    }
  };

  const handleScanSelect = (scan: ScanWithProject) => {
    setSelectedScan(scan);
    setActiveTab('details');
    fetchSnapshots(scan.id);
  };

  useEffect(() => {
    void fetchScans();
  }, [fetchScans]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string }> = {
      complete: { className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' },
      running: { className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' },
      failed: { className: 'bg-red-100 text-red-700 dark:bg-red-900/30' },
      pending: { className: 'bg-gray-100 text-gray-700 dark:bg-gray-800' },
    };
    const config = variants[status] || variants.pending;
    return (
      <Badge variant="secondary" className={`text-[10px] ${config.className}`}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Maintenance Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor project health, dependencies, and technical debt
          </p>
        </div>
        <Button variant="outline" onClick={fetchScans} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="scans">Recent Scans</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <DependencyHealthCard />

            {/* Summary Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  Security Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : scans.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No scans available. Run a dependency scan to see security overview.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {scans.slice(0, 3).map((scan) => (
                      <div
                        key={scan.id}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          {getStatusIcon(scan.status)}
                          <span className="text-sm">
                            {scan.foco_projects?.name || 'Unknown Project'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {scan.security_issues > 0 && (
                            <Badge variant="destructive" className="text-[10px]">
                              {scan.security_issues} issues
                            </Badge>
                          )}
                          {getStatusBadge(scan.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                  <a href="/settings">
                    <Wrench className="h-4 w-4 mr-2" />
                    Project Settings
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                  <a href="/crons">
                    <Clock className="h-4 w-4 mr-2" />
                    Manage Cron Jobs
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                  <a href="/empire">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Empire Dashboard
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Dependencies Tab */}
        <TabsContent value="dependencies" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            <div className="space-y-4">
              <DependencyHealthCard />

              {/* Scan List */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Recent Scans</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {loading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12" />
                      <Skeleton className="h-12" />
                      <Skeleton className="h-12" />
                    </div>
                  ) : scans.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No scans available</p>
                  ) : (
                    scans.map((scan) => (
                      <button
                        key={scan.id}
                        onClick={() => handleScanSelect(scan)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedScan?.id === scan.id
                            ? 'bg-secondary border-primary'
                            : 'hover:bg-secondary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">
                            {scan.foco_projects?.name || 'Unknown Project'}
                          </span>
                          {getStatusBadge(scan.status)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{scan.total_deps} deps</span>
                          {scan.outdated_count > 0 && (
                            <span className="text-amber-600">{scan.outdated_count} outdated</span>
                          )}
                          {scan.security_issues > 0 && (
                            <span className="text-red-600">
                              {scan.security_issues} security
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Dependency Table */}
            <Card>
              <CardHeader>
                <CardTitle>Dependency Details</CardTitle>
                <CardDescription>
                  {selectedScan ? (
                    <>
                      Showing results for scan from{' '}
                      {new Date(selectedScan.scanned_at).toLocaleString()}
                    </>
                  ) : (
                    'Select a scan to view dependency details'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedScan ? (
                  loadingSnapshots ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12" />
                      <Skeleton className="h-12" />
                      <Skeleton className="h-12" />
                    </div>
                  ) : (
                    <DependencyTable
                      snapshots={snapshots}
                      projectId={selectedScan.project_id}
                      onCreateTask={(snapshot) => {
                        showInfo('Create Task', `Creating task for ${snapshot.package_name}`);
                      }}
                    />
                  )
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a scan from the list to view dependency details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Scans Tab */}
        <TabsContent value="scans">
          <Card>
            <CardHeader>
              <CardTitle>Recent Dependency Scans</CardTitle>
              <CardDescription>History of dependency scans across all projects</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : scans.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No scans available yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {scans.map((scan) => (
                    <div
                      key={scan.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {getStatusIcon(scan.status)}
                        <div>
                          <p className="font-medium">
                            {scan.foco_projects?.name || 'Unknown Project'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Scanned {new Date(scan.scanned_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p>{scan.total_deps} packages</p>
                          {scan.completed_at && (
                            <p className="text-muted-foreground">
                              Completed{' '}
                              {new Date(scan.completed_at).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {scan.outdated_count > 0 && (
                            <Badge variant="secondary" className="text-amber-600">
                              {scan.outdated_count} outdated
                            </Badge>
                          )}
                          {scan.deprecated_count > 0 && (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              {scan.deprecated_count} deprecated
                            </Badge>
                          )}
                          {scan.security_issues > 0 && (
                            <Badge variant="destructive">{scan.security_issues} security</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function MaintenancePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <MaintenancePageContent />
    </Suspense>
  );
}
