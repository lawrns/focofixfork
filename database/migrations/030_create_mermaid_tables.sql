-- Create mermaid_diagrams table
CREATE TABLE IF NOT EXISTS mermaid_diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  mermaid_code TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

-- Create indexes for mermaid_diagrams
CREATE INDEX IF NOT EXISTS idx_mermaid_user ON mermaid_diagrams(created_by);
CREATE INDEX IF NOT EXISTS idx_mermaid_org ON mermaid_diagrams(organization_id);
CREATE INDEX IF NOT EXISTS idx_mermaid_public ON mermaid_diagrams(is_public, share_token);
CREATE INDEX IF NOT EXISTS idx_mermaid_share_token ON mermaid_diagrams(share_token);

-- Create mermaid_diagram_versions table for version history
CREATE TABLE IF NOT EXISTS mermaid_diagram_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id UUID REFERENCES mermaid_diagrams(id) ON DELETE CASCADE,
  mermaid_code TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  change_description TEXT
);

-- Create indexes for mermaid_diagram_versions
CREATE INDEX IF NOT EXISTS idx_versions_diagram ON mermaid_diagram_versions(diagram_id);
CREATE INDEX IF NOT EXISTS idx_versions_diagram_version ON mermaid_diagram_versions(diagram_id, version_number);

-- Create mermaid_diagram_shares table for sharing permissions
CREATE TABLE IF NOT EXISTS mermaid_diagram_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id UUID REFERENCES mermaid_diagrams(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')),
  shared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(diagram_id, shared_with_user_id)
);

-- Create indexes for mermaid_diagram_shares
CREATE INDEX IF NOT EXISTS idx_shares_diagram ON mermaid_diagram_shares(diagram_id);
CREATE INDEX IF NOT EXISTS idx_shares_user ON mermaid_diagram_shares(shared_with_user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mermaid_diagrams_updated_at 
    BEFORE UPDATE ON mermaid_diagrams 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
