-- Migration: 033_secure_mermaid_rls_policies.sql
-- Purpose: Replace overly permissive RLS policies with proper user/org access control
-- Previous migration (032) allowed USING (true) which gave all users access to all diagrams
-- This migration implements proper row-level security based on ownership and organization membership

-- ============================================================================
-- STEP 1: Drop all insecure policies
-- ============================================================================

-- Drop insecure policies on mermaid_diagrams
DROP POLICY IF EXISTS "Enable read access for all users" ON mermaid_diagrams;
DROP POLICY IF EXISTS "Enable insert for all users" ON mermaid_diagrams;
DROP POLICY IF EXISTS "Enable update for all users" ON mermaid_diagrams;
DROP POLICY IF EXISTS "Enable delete for all users" ON mermaid_diagrams;

-- Drop insecure policies on mermaid_diagram_versions
DROP POLICY IF EXISTS "Enable read access for all users" ON mermaid_diagram_versions;
DROP POLICY IF EXISTS "Enable insert for all users" ON mermaid_diagram_versions;
DROP POLICY IF EXISTS "Enable update for all users" ON mermaid_diagram_versions;
DROP POLICY IF EXISTS "Enable delete for all users" ON mermaid_diagram_versions;

-- Drop insecure policies on mermaid_diagram_shares
DROP POLICY IF EXISTS "Enable read access for all users" ON mermaid_diagram_shares;
DROP POLICY IF EXISTS "Enable insert for all users" ON mermaid_diagram_shares;
DROP POLICY IF EXISTS "Enable update for all users" ON mermaid_diagram_shares;
DROP POLICY IF EXISTS "Enable delete for all users" ON mermaid_diagram_shares;

-- ============================================================================
-- STEP 2: Create secure policies for mermaid_diagrams
-- ============================================================================

-- SELECT policies: Users can view their own diagrams, org diagrams, public diagrams, and shared diagrams
CREATE POLICY "Users can view own diagrams"
  ON mermaid_diagrams
  FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can view organization diagrams"
  ON mermaid_diagrams
  FOR SELECT
  USING (
    organization_id IS NOT NULL AND
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can view public diagrams"
  ON mermaid_diagrams
  FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view shared diagrams"
  ON mermaid_diagrams
  FOR SELECT
  USING (
    id IN (
      SELECT diagram_id
      FROM mermaid_diagram_shares
      WHERE shared_with_user_id = auth.uid()
    )
  );

-- INSERT policy: Users can only create diagrams they own
CREATE POLICY "Users can create own diagrams"
  ON mermaid_diagrams
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- UPDATE policies: Users can update their own diagrams OR org admins can update org diagrams
CREATE POLICY "Users can update own diagrams"
  ON mermaid_diagrams
  FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Org admins can update org diagrams"
  ON mermaid_diagrams
  FOR UPDATE
  USING (
    organization_id IS NOT NULL AND
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
  );

-- DELETE policy: Only owners can delete their diagrams
CREATE POLICY "Users can delete own diagrams"
  ON mermaid_diagrams
  FOR DELETE
  USING (auth.uid() = created_by);

-- ============================================================================
-- STEP 3: Create secure policies for mermaid_diagram_versions
-- ============================================================================

-- SELECT policy: Users can view versions of accessible diagrams
CREATE POLICY "Users can view versions of accessible diagrams"
  ON mermaid_diagram_versions
  FOR SELECT
  USING (
    diagram_id IN (
      SELECT id FROM mermaid_diagrams
      WHERE created_by = auth.uid()
         OR is_public = true
         OR (
           organization_id IS NOT NULL AND
           organization_id IN (
             SELECT organization_id FROM organization_members
             WHERE user_id = auth.uid() AND is_active = true
           )
         )
         OR id IN (
           SELECT diagram_id FROM mermaid_diagram_shares
           WHERE shared_with_user_id = auth.uid()
         )
    )
  );

-- INSERT policy: Users can create versions for their own diagrams
CREATE POLICY "Users can create versions for own diagrams"
  ON mermaid_diagram_versions
  FOR INSERT
  WITH CHECK (
    diagram_id IN (
      SELECT id FROM mermaid_diagrams
      WHERE created_by = auth.uid()
    )
  );

-- UPDATE policy: Users can update versions of their own diagrams
CREATE POLICY "Users can update versions of own diagrams"
  ON mermaid_diagram_versions
  FOR UPDATE
  USING (
    diagram_id IN (
      SELECT id FROM mermaid_diagrams
      WHERE created_by = auth.uid()
    )
  );

-- DELETE policy: Users can delete versions of their own diagrams
CREATE POLICY "Users can delete versions of own diagrams"
  ON mermaid_diagram_versions
  FOR DELETE
  USING (
    diagram_id IN (
      SELECT id FROM mermaid_diagrams
      WHERE created_by = auth.uid()
    )
  );

-- ============================================================================
-- STEP 4: Create secure policies for mermaid_diagram_shares
-- ============================================================================

-- SELECT policies: Users can view shares they created or shares made with them
CREATE POLICY "Users can view shares for own diagrams"
  ON mermaid_diagram_shares
  FOR SELECT
  USING (
    diagram_id IN (
      SELECT id FROM mermaid_diagrams
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view shares made with them"
  ON mermaid_diagram_shares
  FOR SELECT
  USING (shared_with_user_id = auth.uid());

-- INSERT policy: Users can create shares for their own diagrams
CREATE POLICY "Users can create shares for own diagrams"
  ON mermaid_diagram_shares
  FOR INSERT
  WITH CHECK (
    diagram_id IN (
      SELECT id FROM mermaid_diagrams
      WHERE created_by = auth.uid()
    )
  );

-- UPDATE policy: Users can update shares for their own diagrams
CREATE POLICY "Users can update shares for own diagrams"
  ON mermaid_diagram_shares
  FOR UPDATE
  USING (
    diagram_id IN (
      SELECT id FROM mermaid_diagrams
      WHERE created_by = auth.uid()
    )
  );

-- DELETE policy: Users can delete shares for their own diagrams
CREATE POLICY "Users can delete shares for own diagrams"
  ON mermaid_diagram_shares
  FOR DELETE
  USING (
    diagram_id IN (
      SELECT id FROM mermaid_diagrams
      WHERE created_by = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify policies are in place
DO $$
BEGIN
  RAISE NOTICE 'RLS policies updated successfully';
  RAISE NOTICE 'Mermaid diagrams: % policies', (SELECT count(*) FROM pg_policies WHERE tablename = 'mermaid_diagrams');
  RAISE NOTICE 'Diagram versions: % policies', (SELECT count(*) FROM pg_policies WHERE tablename = 'mermaid_diagram_versions');
  RAISE NOTICE 'Diagram shares: % policies', (SELECT count(*) FROM pg_policies WHERE tablename = 'mermaid_diagram_shares');
END $$;
