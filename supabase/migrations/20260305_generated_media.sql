-- Migration: Generated Media Assets for Nano Banana Media Module
-- Created: 2026-03-05
-- Description: Storage bucket and table for AI-generated images and Mermaid diagram exports

-- ============================================
-- STORAGE BUCKET SETUP
-- ============================================

-- Create storage bucket for media assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media-assets', 'media-assets', true) 
ON CONFLICT (id) DO NOTHING;

-- Public read access for media assets
CREATE POLICY IF NOT EXISTS media_assets_public ON storage.objects
  FOR SELECT USING (bucket_id = 'media-assets');

-- Owner-based write access (folder structure: /{user_id}/{filename})
CREATE POLICY IF NOT EXISTS media_assets_owner ON storage.objects
  FOR ALL USING (
    bucket_id = 'media-assets' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- GENERATED MEDIA ASSETS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS generated_media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES foco_projects(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('thumbnail', 'diagram_export', 'generated_image', 'mermaid_png')),
  prompt text,
  storage_path text NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'media-assets',
  public_url text,
  gemini_model text,
  tokens_used integer,
  cost_usd decimal(10,6),
  metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_media_assets_project ON generated_media_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_type ON generated_media_assets(type);
CREATE INDEX IF NOT EXISTS idx_media_assets_created ON generated_media_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_by ON generated_media_assets(created_by);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE generated_media_assets ENABLE ROW LEVEL SECURITY;

-- Select: Anyone can view (assets may be shared)
CREATE POLICY IF NOT EXISTS media_assets_select ON generated_media_assets 
  FOR SELECT USING (true);

-- Insert: Only authenticated users can create their own assets
CREATE POLICY IF NOT EXISTS media_assets_insert ON generated_media_assets 
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
  );

-- Delete: Creator or project owner can delete
CREATE POLICY IF NOT EXISTS media_assets_delete ON generated_media_assets 
  FOR DELETE USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM foco_projects p 
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );

-- Update: Only creator can update metadata
CREATE POLICY IF NOT EXISTS media_assets_update ON generated_media_assets 
  FOR UPDATE USING (
    created_by = auth.uid()
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE generated_media_assets IS 'Stores metadata for AI-generated images and diagram exports from Gemini and Mermaid';
COMMENT ON COLUMN generated_media_assets.type IS 'Asset type: thumbnail, diagram_export, generated_image, mermaid_png';
COMMENT ON COLUMN generated_media_assets.prompt IS 'The prompt used for AI image generation';
COMMENT ON COLUMN generated_media_assets.storage_path IS 'Path within the storage bucket';
COMMENT ON COLUMN generated_media_assets.cost_usd IS 'Estimated cost in USD for generation (approx $0.03 per image for Gemini)';
COMMENT ON COLUMN generated_media_assets.metadata IS 'Additional metadata like dimensions, format, source diagram ID, etc.';

-- ============================================
-- NOTIFICATION TRIGGER (Optional)
-- ============================================

-- Optional: Create notification when asset is generated
CREATE OR REPLACE FUNCTION notify_media_asset_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification for the user
  INSERT INTO inbox_items (
    user_id,
    type,
    title,
    content,
    metadata
  ) VALUES (
    NEW.created_by,
    'info',
    CASE 
      WHEN NEW.type = 'generated_image' THEN 'Image Generated'
      WHEN NEW.type = 'mermaid_png' THEN 'Diagram Exported'
      ELSE 'Media Asset Created'
    END,
    'Your ' || NEW.type || ' has been successfully created and is ready for download.',
    jsonb_build_object(
      'asset_id', NEW.id,
      'asset_type', NEW.type,
      'public_url', NEW.public_url
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Uncomment to enable automatic notifications
-- CREATE TRIGGER media_asset_created_notification
--   AFTER INSERT ON generated_media_assets
--   FOR EACH ROW
--   EXECUTE FUNCTION notify_media_asset_created();
