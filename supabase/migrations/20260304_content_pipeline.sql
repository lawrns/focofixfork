-- Content sources table
CREATE TABLE content_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES foco_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  type text NOT NULL CHECK (type IN ('rss', 'api', 'webhook', 'scrape')),
  poll_interval_minutes integer NOT NULL DEFAULT 60,
  headers jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  last_checked_at timestamptz,
  last_error text,
  error_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Content items table
CREATE TABLE content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  title text,
  raw_content text NOT NULL,
  ai_summary text,
  ai_tags text[],
  relevance_score float DEFAULT 0 CHECK (relevance_score >= 0 AND relevance_score <= 1),
  status text NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived', 'actioned')),
  published_at timestamptz,
  analyzed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(source_id, external_id)
);

-- Indexes
CREATE INDEX idx_content_sources_project ON content_sources(project_id);
CREATE INDEX idx_content_sources_status ON content_sources(status);
CREATE INDEX idx_content_items_source ON content_items(source_id);
CREATE INDEX idx_content_items_status ON content_items(status);
CREATE INDEX idx_content_items_published ON content_items(published_at DESC);

-- RLS policies
ALTER TABLE content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_sources_owner ON content_sources FOR ALL USING (
  EXISTS (SELECT 1 FROM foco_projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
);
CREATE POLICY content_items_owner ON content_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM content_sources s
    JOIN foco_projects p ON s.project_id = p.id
    WHERE s.id = source_id AND p.owner_id = auth.uid()
  )
);
