'use client';

import { useState, useEffect } from 'react';
import { Loader2, Sparkles, ExternalLink } from 'lucide-react';
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
}

interface Theme {
  tag: string;
  count: number;
}

interface InsightsData {
  top_insights: Insight[];
  themes: Theme[];
  platform_counts: Record<string, number>;
  total_items: number;
  analyzed_count: number;
}

interface SocialInsightsPanelProps {
  onViewAll?: () => void;
}

const platformIcons: Record<string, string> = {
  twitter: '𝕏',
  instagram: '📷',
  youtube: '▶',
};

function relevanceBadge(score: number) {
  if (score >= 0.8) return <Badge variant="default" className="bg-emerald-600 text-[10px]">High</Badge>;
  if (score >= 0.5) return <Badge variant="secondary" className="text-[10px]">Medium</Badge>;
  return <Badge variant="outline" className="text-[10px]">Low</Badge>;
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

  if (!data || data.top_insights.length === 0) {
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
        {/* Platform counts */}
        {Object.keys(data.platform_counts).length > 0 && (
          <div className="flex gap-2">
            {Object.entries(data.platform_counts).map(([platform, count]) => (
              <Badge key={platform} variant="outline" className="text-[11px]">
                {platformIcons[platform] || platform} {count}
              </Badge>
            ))}
          </div>
        )}

        {/* Top insights */}
        <div className="space-y-3">
          {visibleInsights.map((insight) => (
            <div
              key={insight.id}
              className="rounded-md border border-border/70 bg-muted/20 px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{platformIcons[insight.platform] || insight.platform}</span>
                  <span className="truncate max-w-[150px]">{insight.source_name}</span>
                </div>
                {relevanceBadge(insight.relevance)}
              </div>
              <p className="text-[12px] text-foreground leading-relaxed">{insight.summary}</p>
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
