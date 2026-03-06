-- Hive upgrade-signal persistence and analysis lifecycle

ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS analysis_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS analysis_error text,
  ADD COLUMN IF NOT EXISTS analysis_run_id text,
  ADD COLUMN IF NOT EXISTS signal_type text,
  ADD COLUMN IF NOT EXISTS signal_confidence double precision,
  ADD COLUMN IF NOT EXISTS signal_urgency text,
  ADD COLUMN IF NOT EXISTS upgrade_implication text,
  ADD COLUMN IF NOT EXISTS evidence_excerpt text,
  ADD COLUMN IF NOT EXISTS signal_payload jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.content_items
  DROP CONSTRAINT IF EXISTS content_items_analysis_status_check;

ALTER TABLE public.content_items
  ADD CONSTRAINT content_items_analysis_status_check
  CHECK (analysis_status IN ('pending', 'processing', 'complete', 'failed'));

ALTER TABLE public.content_items
  DROP CONSTRAINT IF EXISTS content_items_signal_confidence_check;

ALTER TABLE public.content_items
  ADD CONSTRAINT content_items_signal_confidence_check
  CHECK (signal_confidence IS NULL OR (signal_confidence >= 0 AND signal_confidence <= 1));

CREATE INDEX IF NOT EXISTS idx_content_items_analysis_status
  ON public.content_items (analysis_status);

CREATE INDEX IF NOT EXISTS idx_content_items_signal_type
  ON public.content_items (signal_type)
  WHERE signal_type IS NOT NULL;
