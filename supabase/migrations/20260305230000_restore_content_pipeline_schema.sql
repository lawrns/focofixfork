-- Restore content pipeline schema when migration history is ahead of actual schema.
-- This is idempotent and safe to apply to environments where the tables already exist.

CREATE TABLE IF NOT EXISTS public.content_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.foco_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  type text NOT NULL,
  poll_interval_minutes integer NOT NULL DEFAULT 60,
  headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  last_checked_at timestamptz,
  last_error text,
  error_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  provider_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  webhook_secret text,
  platform text
);

ALTER TABLE public.content_sources
  DROP CONSTRAINT IF EXISTS content_sources_type_check;

ALTER TABLE public.content_sources
  DROP CONSTRAINT IF EXISTS content_sources_status_check;

ALTER TABLE public.content_sources
  ADD CONSTRAINT content_sources_type_check
  CHECK (type IN ('rss', 'api', 'webhook', 'scrape', 'apify'));

ALTER TABLE public.content_sources
  ADD CONSTRAINT content_sources_status_check
  CHECK (status IN ('active', 'paused', 'error'));

ALTER TABLE public.content_sources
  ADD COLUMN IF NOT EXISTS provider_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS webhook_secret text,
  ADD COLUMN IF NOT EXISTS platform text;

CREATE TABLE IF NOT EXISTS public.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.content_sources(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  title text,
  raw_content text NOT NULL,
  ai_summary text,
  ai_tags text[],
  relevance_score double precision DEFAULT 0,
  status text NOT NULL DEFAULT 'unread',
  published_at timestamptz,
  analyzed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_items_source_external_id_key UNIQUE (source_id, external_id)
);

ALTER TABLE public.content_items
  DROP CONSTRAINT IF EXISTS content_items_relevance_score_check;

ALTER TABLE public.content_items
  DROP CONSTRAINT IF EXISTS content_items_status_check;

ALTER TABLE public.content_items
  ADD CONSTRAINT content_items_relevance_score_check
  CHECK (relevance_score >= 0 AND relevance_score <= 1);

ALTER TABLE public.content_items
  ADD CONSTRAINT content_items_status_check
  CHECK (status IN ('unread', 'read', 'archived', 'actioned'));

CREATE TABLE IF NOT EXISTS public.apify_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.content_sources(id) ON DELETE CASCADE,
  external_run_id text NOT NULL,
  dataset_id text,
  status text NOT NULL DEFAULT 'running',
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT apify_runs_source_external_run_key UNIQUE (source_id, external_run_id)
);

ALTER TABLE public.apify_runs
  DROP CONSTRAINT IF EXISTS apify_runs_status_check;

ALTER TABLE public.apify_runs
  ADD CONSTRAINT apify_runs_status_check
  CHECK (status IN ('running', 'succeeded', 'failed', 'aborted', 'timed_out'));

CREATE INDEX IF NOT EXISTS idx_content_sources_project ON public.content_sources(project_id);
CREATE INDEX IF NOT EXISTS idx_content_sources_status ON public.content_sources(status);
CREATE INDEX IF NOT EXISTS idx_content_sources_platform ON public.content_sources(platform) WHERE platform IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_items_source ON public.content_items(source_id);
CREATE INDEX IF NOT EXISTS idx_content_items_status ON public.content_items(status);
CREATE INDEX IF NOT EXISTS idx_content_items_published ON public.content_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_apify_runs_source_id ON public.apify_runs(source_id);
CREATE INDEX IF NOT EXISTS idx_apify_runs_status ON public.apify_runs(status);
CREATE INDEX IF NOT EXISTS idx_apify_runs_created_at ON public.apify_runs(created_at DESC);

ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apify_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_sources_owner ON public.content_sources;
CREATE POLICY content_sources_owner ON public.content_sources FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM public.foco_projects p
    WHERE p.id = project_id
      AND p.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS content_items_owner ON public.content_items;
CREATE POLICY content_items_owner ON public.content_items FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM public.content_sources s
    JOIN public.foco_projects p ON p.id = s.project_id
    WHERE s.id = source_id
      AND p.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS apify_runs_owner ON public.apify_runs;
CREATE POLICY apify_runs_owner ON public.apify_runs FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM public.content_sources s
    JOIN public.foco_projects p ON p.id = s.project_id
    WHERE s.id = apify_runs.source_id
      AND p.owner_id = auth.uid()
  )
);
