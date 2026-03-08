export type ContentSourceType = 'rss' | 'api' | 'webhook' | 'scrape' | 'apify';

export interface ContentSource {
  id: string;
  project_id: string;
  name: string;
  url: string;
  type: ContentSourceType;
  poll_interval_minutes: number;
  headers: Record<string, unknown>;
  provider_config?: Record<string, unknown>;
  webhook_secret?: string;
  status: 'active' | 'paused' | 'error';
  last_checked_at?: string;
  last_error?: string;
  error_count: number;
  created_at: string;
  updated_at: string;
  platform?: string;
}

export interface ContentItem {
  id: string;
  source_id: string;
  external_id: string;
  title?: string;
  raw_content: string;
  content_type?: string;
  caption_text?: string;
  transcript_text?: string;
  analysis_text?: string;
  post_url?: string;
  video_url?: string;
  media_urls?: string[];
  thumbnail_url?: string;
  author_name?: string;
  engagement?: Record<string, unknown>;
  provider_payload?: Record<string, unknown>;
  download_status?: 'pending' | 'complete' | 'failed' | 'not_applicable';
  transcript_status?: 'pending' | 'complete' | 'failed' | 'not_applicable';
  analysis_status?: 'pending' | 'processing' | 'complete' | 'failed';
  analysis_error?: string;
  analysis_run_id?: string;
  signal_type?: string;
  signal_confidence?: number;
  signal_urgency?: 'monitor' | 'active' | 'urgent';
  upgrade_implication?: string;
  evidence_excerpt?: string;
  signal_payload?: UpgradeSignal;
  ai_summary?: string;
  ai_tags?: string[];
  relevance_score: number;
  status: 'unread' | 'read' | 'archived' | 'actioned';
  published_at?: string;
  analyzed_at?: string;
  created_at: string;
  content_sources?: {
    id?: string;
    name?: string;
    platform?: string;
    url?: string;
  } | null;
}

export interface RawContentItem {
  external_id: string;
  title?: string;
  content: string;
  published_at?: string;
  content_type?: string;
  caption_text?: string;
  transcript_text?: string;
  analysis_text?: string;
  post_url?: string;
  video_url?: string;
  media_urls?: string[];
  thumbnail_url?: string;
  author_name?: string;
  engagement?: Record<string, unknown>;
  provider_payload?: Record<string, unknown>;
  download_status?: 'pending' | 'complete' | 'failed' | 'not_applicable';
  transcript_status?: 'pending' | 'complete' | 'failed' | 'not_applicable';
}

export interface PollResult {
  success: boolean;
  itemsProcessed: number;
  itemsNew: number;
  videoItemsDetected?: number;
  videosDownloaded?: number;
  transcriptsCompleted?: number;
  transcriptsFailed?: number;
  warnings?: string[];
  error?: string;
}

export interface AnalysisResult {
  summary: string;
  tags: string[];
  relevanceScore: number;
  signalType?: string;
  confidence?: number;
  urgency?: 'monitor' | 'active' | 'urgent';
  upgradeImplication?: string;
  evidenceExcerpt?: string;
  themes?: string[];
  affectedArea?: string;
  payload?: UpgradeSignal;
}

export interface UpgradeSignal {
  summary: string;
  signal_type: string;
  confidence: number;
  urgency: 'monitor' | 'active' | 'urgent';
  affected_area: string;
  upgrade_implication: string;
  evidence_excerpt: string;
  themes: string[];
  tags: string[];
}
