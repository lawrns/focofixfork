'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface HealthData {
  overall_score: number | null;
  velocity_score: number | null;
  quality_score: number | null;
  team_score: number | null;
  time_score: number | null;
  status: 'healthy' | 'at_risk' | 'critical' | 'unknown' | 'insufficient_data';
  metrics?: {
    total_tasks?: number;
    done_tasks?: number;
    completion_rate?: number;
    days_since_update?: number;
  };
}

interface Suggestion {
  id: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action_label?: string | null;
  action_url?: string | null;
  dismissed_at?: string | null;
}

interface ProjectInsightsPanelProps {
  projectId: string;
}

const SEVERITY_STYLES: Record<string, { badge: string; dot: string }> = {
  critical: { badge: 'bg-rose-100 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  high: { badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  medium: { badge: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  low: { badge: 'bg-zinc-100 text-zinc-600 border-zinc-200', dot: 'bg-zinc-400' },
};

const STATUS_STYLES: Record<string, { label: string; color: string; bar: string }> = {
  healthy: { label: 'Healthy', color: 'text-emerald-600', bar: 'bg-emerald-500' },
  at_risk: { label: 'At Risk', color: 'text-amber-600', bar: 'bg-amber-500' },
  critical: { label: 'Critical', color: 'text-rose-600', bar: 'bg-rose-500' },
  unknown: { label: 'Unknown', color: 'text-zinc-500', bar: 'bg-zinc-400' },
  insufficient_data: { label: 'Not enough data', color: 'text-zinc-500', bar: 'bg-zinc-300' },
};

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
      <span className="text-sm font-medium text-foreground w-8 text-right">{score}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-2 flex-1 rounded-full" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="p-3 rounded-lg border border-border space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function ProjectInsightsPanel({ projectId }: ProjectInsightsPanelProps) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, suggestionsRes] = await Promise.all([
        fetch(`/api/crico/projects/${projectId}/health`),
        fetch(`/api/crico/projects/${projectId}/suggestions`),
      ]);

      const [healthJson, suggestionsJson] = await Promise.all([
        healthRes.json(),
        suggestionsRes.json(),
      ]);

      if (healthJson.success) setHealth(healthJson.data);
      if (suggestionsJson.success) setSuggestions(suggestionsJson.data || []);
    } catch (err) {
      console.error('[ProjectInsightsPanel] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDismiss = async (suggestionId: string) => {
    setDismissing(suggestionId);
    try {
      const res = await fetch(
        `/api/crico/projects/${projectId}/suggestions/${suggestionId}/dismiss`,
        { method: 'POST' }
      );
      if (res.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      }
    } catch (err) {
      console.error('[ProjectInsightsPanel] dismiss error:', err);
    } finally {
      setDismissing(null);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  const statusStyle = STATUS_STYLES[health?.status || 'unknown'];
  const activeSuggestions = suggestions.filter(s => !s.dismissed_at);

  return (
    <div className="space-y-6 p-1">
      {/* Health Score Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Project Health</CardTitle>
            {health && (
              <div className="flex items-center gap-2">
                <span className={cn('text-sm font-semibold', statusStyle.color)}>
                  {statusStyle.label}
                </span>
                <span className="text-2xl font-bold text-foreground">
                  {health.overall_score}
                  <span className="text-sm font-normal text-muted-foreground">/100</span>
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {health?.status === 'insufficient_data' ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                Not enough data yet — add at least 5 tasks to enable AI health tracking.
              </p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <a href={`/projects/${projectId}?tab=board`}>Go to Board</a>
              </Button>
            </div>
          ) : health ? (
            <>
              <ScoreBar label="Velocity" score={health.velocity_score ?? 0} />
              <ScoreBar label="Quality" score={health.quality_score ?? 0} />
              <ScoreBar label="Team" score={health.team_score ?? 0} />
              <ScoreBar label="Timeline" score={health.time_score ?? 0} />
              {health.metrics && (
                <div className="pt-3 mt-3 border-t border-border grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-semibold text-foreground">
                      {health.metrics.total_tasks ?? 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Total tasks</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-foreground">
                      {health.metrics.done_tasks ?? 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-foreground">
                      {Math.round((health.metrics.completion_rate ?? 0) * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Completion</div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Health data unavailable.</p>
          )}
        </CardContent>
      </Card>

      {/* Suggestions Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Suggestions</CardTitle>
            {activeSuggestions.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {activeSuggestions.length} item{activeSuggestions.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {activeSuggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-2">✓</div>
              <p className="text-sm font-medium">No suggestions</p>
              <p className="text-xs mt-1">This project looks good — no issues to report.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSuggestions.map(suggestion => {
                const style = SEVERITY_STYLES[suggestion.severity] || SEVERITY_STYLES.low;
                return (
                  <div
                    key={suggestion.id}
                    className="p-3 rounded-lg border border-border bg-card space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={cn('w-2 h-2 rounded-full shrink-0 mt-0.5', style.dot)} />
                        <p className="text-sm font-medium text-foreground truncate">
                          {suggestion.title}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn('text-xs shrink-0 capitalize border', style.badge)}
                      >
                        {suggestion.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground pl-4">
                      {suggestion.description}
                    </p>
                    <div className="flex items-center gap-2 pl-4">
                      {suggestion.action_label && suggestion.action_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={suggestion.action_url}>{suggestion.action_label}</a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground h-7 text-xs"
                        disabled={dismissing === suggestion.id}
                        onClick={() => handleDismiss(suggestion.id)}
                      >
                        {dismissing === suggestion.id ? 'Dismissing...' : 'Dismiss'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
