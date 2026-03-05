export type ContentSourceType = 'rss' | 'api' | 'webhook' | 'scrape' | 'apify';

export interface ContentSource {
  id: string;
  project_id: string;
  name: string;
  url: string;
  type: ContentSourceType;
  poll_interval_minutes: number;
  headers: Record<string, string>;
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
  ai_summary?: string;
  ai_tags?: string[];
  relevance_score: number;
  status: 'unread' | 'read' | 'archived' | 'actioned';
  published_at?: string;
  analyzed_at?: string;
  created_at: string;
}

export interface RawContentItem {
  external_id: string;
  title?: string;
  content: string;
  published_at?: string;
}

export interface PollResult {
  success: boolean;
  itemsProcessed: number;
  itemsNew: number;
  error?: string;
}

export interface AnalysisResult {
  summary: string;
  tags: string[];
  relevanceScore: number;
}
