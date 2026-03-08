'use client';

import { useState, useEffect } from 'react';
import { Loader2, Sparkles, ExternalLink, Twitter, Instagram, Youtube, Antenna, FileAudio2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Insight {
  id: string;
  summary: string;
  tags: string[];
  relevance: number;
  platform: string;
  source_name: string;
  source_url: string;
  published_at: string;
  signal_type?: string;
  urgency?: 'monitor' | 'active' | 'urgent';
  confidence?: number;
  upgrade_implication?: string;
  evidence_excerpt?: string;
}

interface Theme {
  tag: string;
  count: number;
}

interface InsightsData {
  top_insights: Insight[];
  themes: Theme[];
  grouped_signals: Array<{
    signal_type: string;
    tag: string;
    item_count: number;
    max_relevance: number;
    max_confidence: number;
    urgency: 'monitor' | 'active' | 'urgent';
    summaries: string[];
    upgrade_implications: string[];
    source_names: string[];
  }>;
  platform_counts: Record<string, number>;
  total_items: number;
  analyzed_count: number;
  transcript_coverage?: {
    total_video_items: number;
    completed: number;
    failed: number;
    pending: number;
  };
  unresolved_failures?: Array<{
    id: string;
    title?: string;
    platform?: string;
    source_name?: string;
    transcript_status?: string;
    analysis_status?: string;
    analysis_error?: string;
  }>;
}

interface SocialInsightsPanelProps {
  onViewAll?: () => void;
}

const platformIcons: Record<string, { label: string; Icon: typeof Twitter }> = {
  twitter: { label: 'X', Icon: Twitter },
  instagram: { label: 'Instagram', Icon: Instagram },
  youtube: { label: 'YouTube', Icon: Youtube },
};

function relevanceBadge(score: number) {
  if (score >= 0.8) return <Badge variant="default" className="bg-emerald-600 text-[10px]">High</Badge>;
  if (score >= 0.5) return <Badge variant="secondary" className="text-[10px]">Medium</Badge>;
  return <Badge variant="outline" className="text-[10px]">Low</Badge>;
}

function urgencyBadge(urgency?: 'monitor' | 'active' | 'urgent') {
  if (urgency === 'urgent') return <Badge variant="destructive" className="text-[10px]">Urgent</Badge>;
  if (urgency === 'active') return <Badge variant="default" className="bg-amber-600 text-[10px]">Active</Badge>;
  return <Badge variant="outline" className="text-[10px]">Monitor</Badge>;
}

function PlatformBadge({ platform }: { platform: string }) {
  const meta = platformIcons[platform];
  const Icon = meta?.Icon ?? Antenna;

  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {meta?.label ?? platform}
    </span>
  );
}

export function SocialInsightsPanel({ onViewAll }: SocialInsightsPanelProps) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await fetch('/api/content-pipeline/social/insights');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json.data);
      } catch {
        // Silently fail — panel just shows empty state
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[14px] flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[color:var(--foco-teal)]" />
            Social Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading insights...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || (data.top_insights.length === 0 && data.grouped_signals.length === 0)) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[14px] flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Social Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No social insights yet. Add channels and poll them to generate AI-powered insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  const visibleInsights = expanded ? data.top_insights : data.top_insights.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[14px] flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[color:var(--foco-teal)]" />
            Social Insights
          </CardTitle>
          <span className="text-[11px] text-muted-foreground">
            {data.analyzed_count} analyzed / {data.total_items} total
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.keys(data.platform_counts).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.platform_counts).map(([platform, count]) => (
              <Badge key={platform} variant="outline" className="text-[11px]">
                <PlatformBadge platform={platform} /> {count}
              </Badge>
            ))}
            {data.transcript_coverage && (
              <Badge variant="outline" className="text-[11px]">
                <FileAudio2 className="mr-1 h-3 w-3" />
                {data.transcript_coverage.completed}/{data.transcript_coverage.total_video_items} transcribed
              </Badge>
            )}
          </div>
        )}

        {data.grouped_signals.length > 0 && (
          <div className="space-y-3">
            <div className="text-[11px] font-mono-display text-muted-foreground uppercase tracking-wide">
              Upgrade Clusters
            </div>
            {data.grouped_signals.slice(0, 4).map((signal) => (
              <div key={`${signal.signal_type}-${signal.tag}`} className="rounded-md border border-border/70 bg-muted/20 px-3 py-2.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{signal.signal_type}</Badge>
                    <span className="text-[12px] font-medium">{signal.tag}</span>
                  </div>
                  {urgencyBadge(signal.urgency)}
                </div>
                <p className="text-[12px] text-muted-foreground">
                  {signal.item_count} supporting items, confidence {Math.round(signal.max_confidence * 100)}%
                </p>
                {signal.upgrade_implications[0] && (
                  <p className="mt-1 text-[12px] text-foreground">{signal.upgrade_implications[0]}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {visibleInsights.map((insight) => (
            <div
              key={insight.id}
              className="rounded-md border border-border/70 bg-muted/20 px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <PlatformBadge platform={insight.platform} />
                  <span className="truncate max-w-[150px]">{insight.source_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {urgencyBadge(insight.urgency)}
                  {relevanceBadge(insight.relevance)}
                </div>
              </div>
              <p className="text-[12px] text-foreground leading-relaxed">{insight.summary}</p>
              {insight.upgrade_implication && (
                <p className="mt-1 text-[12px] text-muted-foreground">{insight.upgrade_implication}</p>
              )}
              {insight.evidence_excerpt && (
                <p className="mt-1 text-[11px] text-muted-foreground/80">{insight.evidence_excerpt}</p>
              )}
              {insight.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {insight.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {data.top_insights.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show fewer' : `Show all ${data.top_insights.length} insights`}
          </Button>
        )}

        {/* Themes */}
        {data.themes.length > 0 && (
          <div>
            <div className="text-[11px] font-mono-display text-muted-foreground uppercase tracking-wide mb-2">
              Trending Themes
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.themes.map((theme) => (
                <Badge key={theme.tag} variant="outline" className="text-[11px]">
                  {theme.tag}
                  <span className="ml-1 text-muted-foreground">{theme.count}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {Boolean(data.unresolved_failures?.length) && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-mono-display uppercase tracking-wide text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              Unresolved Failures
            </div>
            <div className="space-y-2">
              {data.unresolved_failures?.slice(0, 3).map((failure) => (
                <div key={failure.id} className="rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[12px]">
                  <div className="font-medium">{failure.title || failure.source_name || 'Content item'}</div>
                  <div className="text-muted-foreground">
                    {[failure.platform, failure.transcript_status, failure.analysis_status].filter(Boolean).join(' • ')}
                  </div>
                  {failure.analysis_error && <div className="text-rose-700 dark:text-rose-300">{failure.analysis_error}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] w-full"
            onClick={onViewAll}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View all in Social Intel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
