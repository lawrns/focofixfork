'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import {
  Plus,
  Loader2,
  RefreshCw,
  Antenna,
  Trash2,
  Zap,
  BarChart3,
  Twitter,
  Instagram,
  Youtube,
  Video,
  FileAudio2,
  AlertTriangle,
} from 'lucide-react';
import { PageShell } from '@/components/layout/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/hooks/use-auth';
import type { ContentItem } from '@/features/content-pipeline/types';
import { ContentFeed } from '@/features/content-pipeline/components/content-feed';
import { SocialSourceDialog } from '@/features/content-pipeline/components/social-source-dialog';
import { SocialInsightsPanel } from '@/features/content-pipeline/components/social-insights-panel';

interface SocialSource {
  id: string;
  name: string;
  url: string;
  platform: string;
  status: 'active' | 'paused' | 'error';
  poll_interval_minutes: number;
  last_checked_at?: string;
  last_error?: string;
  error_count: number;
  item_count: number;
  created_at: string;
  latest_run?: {
    status: 'running' | 'succeeded' | 'failed' | 'aborted' | 'timed_out';
    metrics?: {
      video_items_detected?: number;
      videos_downloaded?: number;
      transcripts_completed?: number;
      transcripts_failed?: number;
    };
    completed_at?: string;
    error?: string;
  } | null;
}

interface InsightsStats {
  total_items: number;
  analyzed_count: number;
  platform_counts: Record<string, number>;
  transcript_coverage?: {
    completed: number;
    failed: number;
    pending: number;
  };
}

const platformMeta: Record<string, { label: string; Icon: typeof Twitter }> = {
  twitter: { label: 'X', Icon: Twitter },
  instagram: { label: 'Instagram', Icon: Instagram },
  youtube: { label: 'YouTube', Icon: Youtube },
};

function HivePageContent() {
  const { user } = useAuth();
  const [tab, setTab] = useState('channels');
  const [sources, setSources] = useState<SocialSource[]>([]);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState<InsightsStats | null>(null);
  const [loadingSources, setLoadingSources] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    setLoadingSources(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/content-pipeline/social/sources');
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setSources(json.data || []);
    } catch {
      setLoadError('Failed to load channels');
    } finally {
      setLoadingSources(false);
    }
  }, []);

  const fetchInsightsStats = useCallback(async () => {
    try {
      const res = await fetch('/api/content-pipeline/social/insights');
      if (!res.ok) return;
      const json = await res.json();
      setStats(json.data);
    } catch {
      setLoadError((current) => current ?? 'Failed to load insights');
    }
  }, []);

  const fetchItems = useCallback(async () => {
    if (sources.length === 0) return;
    setLoadingItems(true);
    try {
      // Fetch items for all social sources
      const allItems: ContentItem[] = [];
      for (const source of sources) {
        const res = await fetch(`/api/content-pipeline/items?source_id=${source.id}&limit=50`);
        if (res.ok) {
          const json = await res.json();
          allItems.push(...(json.data || []));
        }
      }
      // Sort by created_at desc
      allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setItems(allItems);
    } catch {
      setLoadError((current) => current ?? 'Failed to load feed items');
    } finally {
      setLoadingItems(false);
    }
  }, [sources]);

  useEffect(() => {
    if (user) {
      fetchSources();
      fetchInsightsStats();
    }
  }, [user, fetchSources, fetchInsightsStats]);

  useEffect(() => {
    if (sources.length > 0) fetchItems();
  }, [sources, fetchItems]);

  const handleRefresh = () => {
    fetchSources();
    fetchItems();
    fetchInsightsStats();
  };

  const handlePoll = async (sourceId: string) => {
    setPollingId(sourceId);
    try {
      const res = await fetch(`/api/content-pipeline/apify/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: sourceId, wait_for_finish: true }),
      });
      if (res.ok) {
        // Refresh everything after poll
        fetchSources();
        fetchItems();
        fetchInsightsStats();
      }
    } catch {
      // silent
    } finally {
      setPollingId(null);
    }
  };

  const handleDelete = async (sourceId: string) => {
    try {
      const res = await fetch(`/api/content-pipeline/social/sources?id=${sourceId}`, {
        method: 'DELETE',
      });
      if (res.ok) fetchSources();
    } catch {
      // silent
    }
  };

  const activeSources = sources.filter((s) => s.status === 'active').length;
  const todayItems = stats?.total_items ?? 0;
  const analyzedItems = stats?.analyzed_count ?? 0;
  const transcriptCompleted = stats?.transcript_coverage?.completed ?? 0;
  const transcriptFailures = stats?.transcript_coverage?.failed ?? 0;

  return (
    <PageShell maxWidth="7xl">
      <PageHeader
        title="Social Intelligence"
        subtitle="Derive upgrade intelligence from social channels"
        primaryAction={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Channel
            </Button>
          </div>
        }
      />

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Active Sources" value={activeSources} icon={<Antenna className="h-4 w-4" />} />
        <StatCard label="Items (48h)" value={todayItems} icon={<BarChart3 className="h-4 w-4" />} />
        <StatCard label="AI Analyzed" value={analyzedItems} icon={<Zap className="h-4 w-4" />} />
        <StatCard
          label="Transcripts"
          value={transcriptCompleted}
          icon={<FileAudio2 className="h-4 w-4" />}
        />
      </div>

      {loadError && (
        <Card className="mb-6 border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-center gap-2 p-3 text-sm text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            <span>{loadError}</span>
            {transcriptFailures > 0 && <Badge variant="outline">{transcriptFailures} failed transcripts</Badge>}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="channels">
            Channels
            {sources.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                {sources.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="mt-4">
          {loadingSources ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading channels...
            </div>
          ) : sources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Antenna className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">No social channels yet</p>
              <p className="text-xs mt-1 mb-4">Add Twitter, Instagram, or YouTube channels to monitor</p>
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Channel
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sources.map((source) => (
                <Card key={source.id} className="relative">
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${
                      source.status === 'active'
                        ? 'bg-emerald-500'
                        : source.status === 'error'
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                    }`}
                  />
                  <CardContent className="p-4 pl-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <PlatformBadge platform={source.platform} />
                          <span className="text-sm font-medium truncate">{source.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{source.item_count} items</span>
                          <span>every {source.poll_interval_minutes}m</span>
                        </div>
                        {source.latest_run?.metrics && (
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                            <RunMetric icon={<Video className="h-3 w-3" />} value={source.latest_run.metrics.video_items_detected ?? 0} label="videos" />
                            <RunMetric icon={<FileAudio2 className="h-3 w-3" />} value={source.latest_run.metrics.transcripts_completed ?? 0} label="transcribed" />
                            {(source.latest_run.metrics.transcripts_failed ?? 0) > 0 && (
                              <RunMetric icon={<AlertTriangle className="h-3 w-3" />} value={source.latest_run.metrics.transcripts_failed ?? 0} label="failed" tone="danger" />
                            )}
                          </div>
                        )}
                        {source.last_error && (
                          <p className="text-[11px] text-rose-500 mt-1 truncate">{source.last_error}</p>
                        )}
                        {source.latest_run?.error && (
                          <p className="text-[11px] text-rose-500 mt-1 truncate">{source.latest_run.error}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handlePoll(source.id)}
                          disabled={pollingId === source.id}
                        >
                          {pollingId === source.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(source.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="feed" className="mt-4">
          <ContentFeed
            items={items}
            isLoading={loadingItems}
            onItemsChange={() => fetchItems()}
          />
        </TabsContent>

        <TabsContent value="insights" className="mt-4">
          <SocialInsightsPanel />
        </TabsContent>
      </Tabs>

      <SocialSourceDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onCreated={handleRefresh}
      />
    </PageShell>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <div className="text-lg font-semibold leading-tight">{value}</div>
          <div className="text-[11px] text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlatformBadge({ platform }: { platform?: string }) {
  const meta = platform ? platformMeta[platform] : null;
  const Icon = meta?.Icon ?? Antenna;

  return (
    <Badge variant="outline" className="gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wide">
      <Icon className="h-3 w-3" />
      {meta?.label ?? platform ?? 'Source'}
    </Badge>
  );
}

function RunMetric(
  { icon, value, label, tone = 'default' }:
  { icon: React.ReactNode; value: number; label: string; tone?: 'default' | 'danger' }
) {
  return (
    <span className={tone === 'danger' ? 'inline-flex items-center gap-1 text-rose-600' : 'inline-flex items-center gap-1'}>
      {icon}
      {value} {label}
    </span>
  );
}

export default function HivePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <HivePageContent />
    </Suspense>
  );
}
