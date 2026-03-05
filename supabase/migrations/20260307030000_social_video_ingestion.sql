-- Social video ingestion support for Instagram and Twitter/X

DO $$
BEGIN
  ALTER TABLE public.content_sources DROP CONSTRAINT IF EXISTS content_sources_type_check;
  ALTER TABLE public.content_sources
    ADD CONSTRAINT content_sources_type_check
    CHECK (type IN ('rss', 'api', 'webhook', 'scrape', 'apify'));
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'content_sources table does not exist yet';
END $$;

ALTER TABLE public.content_sources
  ADD COLUMN IF NOT EXISTS provider_config jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.content_sources
  ADD COLUMN IF NOT EXISTS webhook_secret text;

ALTER TABLE public.content_sources
  ADD COLUMN IF NOT EXISTS platform text;

CREATE INDEX IF NOT EXISTS idx_content_sources_platform
  ON public.content_sources (platform)
  WHERE platform IS NOT NULL;

ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS content_type text,
  ADD COLUMN IF NOT EXISTS caption_text text,
  ADD COLUMN IF NOT EXISTS transcript_text text,
  ADD COLUMN IF NOT EXISTS analysis_text text,
  ADD COLUMN IF NOT EXISTS post_url text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS media_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS author_name text,
  ADD COLUMN IF NOT EXISTS engagement jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS download_status text NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS transcript_status text NOT NULL DEFAULT 'not_applicable';

ALTER TABLE public.content_items
  DROP CONSTRAINT IF EXISTS content_items_download_status_check;

ALTER TABLE public.content_items
  ADD CONSTRAINT content_items_download_status_check
  CHECK (download_status IN ('pending', 'complete', 'failed', 'not_applicable'));

ALTER TABLE public.content_items
  DROP CONSTRAINT IF EXISTS content_items_transcript_status_check;

ALTER TABLE public.content_items
  ADD CONSTRAINT content_items_transcript_status_check
  CHECK (transcript_status IN ('pending', 'complete', 'failed', 'not_applicable'));

CREATE INDEX IF NOT EXISTS idx_content_items_video_url
  ON public.content_items (video_url)
  WHERE video_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_items_transcript_status
  ON public.content_items (transcript_status);
