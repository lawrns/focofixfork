-- WhatsApp Integration Database Migration
-- Creates tables and indexes for WhatsApp phone linking and message handling

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- WhatsApp User Links Table
-- Stores phone number to user account linkage with verification
CREATE TABLE IF NOT EXISTS public.whatsapp_user_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL UNIQUE,
  verified BOOLEAN NOT NULL DEFAULT false,
  verification_code TEXT,
  verification_code_expires_at TIMESTAMPTZ,
  linked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_user_links_user_id ON public.whatsapp_user_links(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_user_links_phone ON public.whatsapp_user_links(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_user_links_verified ON public.whatsapp_user_links(verified) WHERE verified = true;

-- Unique constraint: one phone per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_user_links_user_id_unique ON public.whatsapp_user_links(user_id);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_whatsapp_user_links_updated_at ON public.whatsapp_user_links;
CREATE TRIGGER update_whatsapp_user_links_updated_at
  BEFORE UPDATE ON public.whatsapp_user_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE public.whatsapp_user_links ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own WhatsApp link
DROP POLICY IF EXISTS "Users can view their own WhatsApp link" ON public.whatsapp_user_links;
CREATE POLICY "Users can view their own WhatsApp link"
  ON public.whatsapp_user_links
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own WhatsApp link
DROP POLICY IF EXISTS "Users can create their own WhatsApp link" ON public.whatsapp_user_links;
CREATE POLICY "Users can create their own WhatsApp link"
  ON public.whatsapp_user_links
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own WhatsApp link
DROP POLICY IF EXISTS "Users can update their own WhatsApp link" ON public.whatsapp_user_links;
CREATE POLICY "Users can update their own WhatsApp link"
  ON public.whatsapp_user_links
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own WhatsApp link
DROP POLICY IF EXISTS "Users can delete their own WhatsApp link" ON public.whatsapp_user_links;
CREATE POLICY "Users can delete their own WhatsApp link"
  ON public.whatsapp_user_links
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass (for API endpoints using service role key)
DROP POLICY IF EXISTS "Service role can manage all WhatsApp links" ON public.whatsapp_user_links;
CREATE POLICY "Service role can manage all WhatsApp links"
  ON public.whatsapp_user_links
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Comments for documentation
COMMENT ON TABLE public.whatsapp_user_links IS 'Links WhatsApp phone numbers to user accounts with verification';
COMMENT ON COLUMN public.whatsapp_user_links.phone IS 'Phone number in E.164 format (e.g., +1234567890)';
COMMENT ON COLUMN public.whatsapp_user_links.verified IS 'Whether the phone number has been verified via code';
COMMENT ON COLUMN public.whatsapp_user_links.verification_code IS 'Temporary 6-digit verification code, cleared after verification';
COMMENT ON COLUMN public.whatsapp_user_links.verification_code_expires_at IS 'Expiration time for verification code (10 minutes from generation)';
COMMENT ON COLUMN public.whatsapp_user_links.linked_at IS 'Timestamp when phone was successfully verified and linked';

-- Grant permissions (adjust schema name if needed)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.whatsapp_user_links TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_user_links TO authenticated;
GRANT SELECT ON public.whatsapp_user_links TO anon;
