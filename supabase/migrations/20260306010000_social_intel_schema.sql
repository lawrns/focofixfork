-- Social Intelligence schema additions
-- Adds 'apify' to content_sources.type CHECK constraint and social-specific columns

-- 1. Drop existing CHECK constraint on type (if it exists) and recreate with 'apify'
DO $$
BEGIN
  -- Try to drop the existing constraint
  ALTER TABLE content_sources DROP CONSTRAINT IF EXISTS content_sources_type_check;

  -- Add updated constraint including 'apify'
  ALTER TABLE content_sources ADD CONSTRAINT content_sources_type_check
    CHECK (type IN ('rss', 'api', 'webhook', 'scrape', 'apify'));
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'content_sources table does not exist yet';
END $$;

-- 2. Add provider_config column if not exists
ALTER TABLE content_sources
  ADD COLUMN IF NOT EXISTS provider_config jsonb DEFAULT '{}';

-- 3. Add webhook_secret column if not exists
ALTER TABLE content_sources
  ADD COLUMN IF NOT EXISTS webhook_secret text;

-- 4. Add platform column for social sources
ALTER TABLE content_sources
  ADD COLUMN IF NOT EXISTS platform text;

-- 5. Partial index on platform for social source queries
CREATE INDEX IF NOT EXISTS idx_content_sources_platform
  ON content_sources (platform)
  WHERE platform IS NOT NULL;
