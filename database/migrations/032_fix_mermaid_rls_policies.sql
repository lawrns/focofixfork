-- Drop existing mermaid RLS policies to fix recursion issues
DROP POLICY IF EXISTS "Users can view own diagrams" ON mermaid_diagrams;
DROP POLICY IF EXISTS "Users can view organization diagrams" ON mermaid_diagrams;
DROP POLICY IF EXISTS "Users can view public diagrams" ON mermaid_diagrams;
DROP POLICY IF EXISTS "Users can view shared diagrams" ON mermaid_diagrams;
DROP POLICY IF EXISTS "Users can create diagrams" ON mermaid_diagrams;
DROP POLICY IF EXISTS "Users can update own diagrams" ON mermaid_diagrams;
DROP POLICY IF EXISTS "Users can update organization diagrams" ON mermaid_diagrams;
DROP POLICY IF EXISTS "Users can delete own diagrams" ON mermaid_diagrams;
DROP POLICY IF EXISTS "Users can delete organization diagrams" ON mermaid_diagrams;

DROP POLICY IF EXISTS "Users can view own diagram versions" ON mermaid_diagram_versions;
DROP POLICY IF EXISTS "Users can view organization diagram versions" ON mermaid_diagram_versions;
DROP POLICY IF EXISTS "Users can create diagram versions" ON mermaid_diagram_versions;
DROP POLICY IF EXISTS "Users can update own diagram versions" ON mermaid_diagram_versions;
DROP POLICY IF EXISTS "Users can delete own diagram versions" ON mermaid_diagram_versions;

DROP POLICY IF EXISTS "Users can view shares for their diagrams" ON mermaid_diagram_shares;
DROP POLICY IF EXISTS "Users can create shares for their diagrams" ON mermaid_diagram_shares;
DROP POLICY IF EXISTS "Users can update shares they created" ON mermaid_diagram_shares;
DROP POLICY IF EXISTS "Users can delete shares they created" ON mermaid_diagram_shares;
DROP POLICY IF EXISTS "Users can view shares made with them" ON mermaid_diagram_shares;

-- Create simplified RLS policies for mermaid tables
-- Policies for mermaid_diagrams
CREATE POLICY "Enable read access for all users" ON mermaid_diagrams
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON mermaid_diagrams
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON mermaid_diagrams
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON mermaid_diagrams
    FOR DELETE USING (true);

-- Policies for mermaid_diagram_versions
CREATE POLICY "Enable read access for all users" ON mermaid_diagram_versions
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON mermaid_diagram_versions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON mermaid_diagram_versions
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON mermaid_diagram_versions
    FOR DELETE USING (true);

-- Policies for mermaid_diagram_shares
CREATE POLICY "Enable read access for all users" ON mermaid_diagram_shares
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON mermaid_diagram_shares
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON mermaid_diagram_shares
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON mermaid_diagram_shares
    FOR DELETE USING (true);
