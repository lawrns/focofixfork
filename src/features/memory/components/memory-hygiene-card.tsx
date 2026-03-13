'use client';

import { useCallback, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Trash2, RefreshCw, AlertTriangle, Database, FileDown } from 'lucide-react';
import type { MemoryStats, MemoryHygieneReport } from '../types';

interface MemoryHygieneCardProps {
  projectId: string;
}

export function MemoryHygieneCard({ projectId }: MemoryHygieneCardProps) {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [report, setReport] = useState<MemoryHygieneReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/memory/${projectId}/index`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setReport(data.report);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const handleReindex = async () => {
    try {
      setActionLoading('reindex');
      const res = await fetch(`/api/memory/${projectId}/index`, {
        method: 'POST',
      });
      if (res.ok) {
        await loadStats();
      }
    } catch (error) {
      console.error('Reindex failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrune = async () => {
    try {
      setActionLoading('prune');
      const res = await fetch(`/api/memory?projectId=${projectId}&action=prune`, {
        method: 'POST',
      });
      if (res.ok) {
        await loadStats();
      }
    } catch (error) {
      console.error('Prune failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeduplicate = async () => {
    try {
      setActionLoading('dedupe');
      const res = await fetch(`/api/memory?projectId=${projectId}&action=dedupe`, {
        method: 'POST',
      });
      if (res.ok) {
        await loadStats();
      }
    } catch (error) {
      console.error('Deduplicate failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadIndex = async () => {
    try {
      const res = await fetch(`/api/memory/${projectId}/index?format=markdown`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AI_MEMORY_INDEX_${projectId.slice(0, 8)}.md`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (loading && !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Memory Hygiene</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const healthScore = stats
    ? Math.min(100, Math.round(stats.avgRelevance * 100 + (stats.totalSegments > 0 ? 20 : 0)))
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Memory Hygiene
          </div>
          <Badge
            variant={healthScore >= 80 ? 'default' : healthScore >= 50 ? 'secondary' : 'destructive'}
            className="font-mono"
          >
            {healthScore}% health
          </Badge>
        </CardTitle>
        <CardDescription>
          Manage and optimize project memory segments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health bar */}
        <div className="space-y-1">
          <Progress value={healthScore} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{stats?.totalSegments || 0} segments</span>
            <span>{((stats?.totalTokens || 0) / 1000).toFixed(1)}k tokens</span>
          </div>
        </div>

        {/* Warnings */}
        {report && report.totalPrunable > 0 && (
          <Alert className="text-xs border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {report.totalPrunable} segments can be pruned ({report.staleSegments.length} stale,{' '}
              {report.duplicates.length} duplicates)
            </AlertDescription>
          </Alert>
        )}

        {/* Stats by source */}
        {stats && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(stats.bySource).map(([source, count]) =>
              count > 0 ? (
                <div key={source} className="flex justify-between p-2 rounded bg-muted">
                  <span className="capitalize text-muted-foreground">{source.replace('_', ' ')}</span>
                  <span className="font-mono">{count}</span>
                </div>
              ) : null
            )}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReindex}
            disabled={actionLoading === 'reindex'}
            className="text-xs"
          >
            <RefreshCw className={cn('h-3 w-3 mr-1', actionLoading === 'reindex' && 'animate-spin')} />
            Re-index
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrune}
            disabled={actionLoading === 'prune' || !report?.totalPrunable}
            className="text-xs"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Prune
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeduplicate}
            disabled={actionLoading === 'dedupe' || !report?.duplicates.length}
            className="text-xs"
          >
            <Database className="h-3 w-3 mr-1" />
            Dedupe
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadIndex}
            className="text-xs"
          >
            <FileDown className="h-3 w-3 mr-1" />
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
