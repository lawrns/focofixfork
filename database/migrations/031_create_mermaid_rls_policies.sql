-- Enable RLS on mermaid tables
ALTER TABLE mermaid_diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE mermaid_diagram_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mermaid_diagram_shares ENABLE ROW LEVEL SECURITY;

-- Policies for mermaid_diagrams
-- Users can view their own diagrams
CREATE POLICY "Users can view own diagrams" ON mermaid_diagrams
    FOR SELECT USING (auth.uid() = created_by);

-- Users can view diagrams in their organizations
CREATE POLICY "Users can view organization diagrams" ON mermaid_diagrams
    FOR SELECT USING (
        organization_id IN (
            SELECT id FROM organizations 
            WHERE id = organization_id 
            AND created_by = auth.uid()
        )
    );

-- Users can view public diagrams
CREATE POLICY "Users can view public diagrams" ON mermaid_diagrams
    FOR SELECT USING (is_public = true);

-- Users can view diagrams shared with them
CREATE POLICY "Users can view shared diagrams" ON mermaid_diagrams
    FOR SELECT USING (
        id IN (
            SELECT diagram_id FROM mermaid_diagram_shares 
            WHERE shared_with_user_id = auth.uid()
        )
    );

-- Users can insert diagrams (for their own or organization)
CREATE POLICY "Users can create diagrams" ON mermaid_diagrams
    FOR INSERT WITH CHECK (
        auth.uid() = created_by OR
        (organization_id IS NOT NULL AND 
         organization_id IN (
             SELECT id FROM organizations 
             WHERE id = organization_id 
             AND created_by = auth.uid()
         ))
    );

-- Users can update their own diagrams
CREATE POLICY "Users can update own diagrams" ON mermaid_diagrams
    FOR UPDATE USING (auth.uid() = created_by);

-- Users can update organization diagrams if they're org members
CREATE POLICY "Users can update organization diagrams" ON mermaid_diagrams
    FOR UPDATE USING (
        organization_id IN (
            SELECT id FROM organizations 
            WHERE id = organization_id 
            AND created_by = auth.uid()
        )
    );

-- Users can update diagrams shared with them with edit permission
CREATE POLICY "Users can update shared diagrams" ON mermaid_diagrams
    FOR UPDATE USING (
        id IN (
            SELECT diagram_id FROM mermaid_diagram_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND permission = 'edit'
        )
    );

-- Users can delete their own diagrams
CREATE POLICY "Users can delete own diagrams" ON mermaid_diagrams
    FOR DELETE USING (auth.uid() = created_by);

-- Users can delete organization diagrams if they're org owners
CREATE POLICY "Users can delete organization diagrams" ON mermaid_diagrams
    FOR DELETE USING (
        organization_id IN (
            SELECT id FROM organizations 
            WHERE id = organization_id 
            AND created_by = auth.uid()
        )
    );

-- Policies for mermaid_diagram_versions
-- Users can view versions of diagrams they can access
CREATE POLICY "Users can view diagram versions" ON mermaid_diagram_versions
    FOR SELECT USING (
        diagram_id IN (
            SELECT id FROM mermaid_diagrams
            WHERE 
                auth.uid() = created_by OR
                is_public = true OR
                organization_id IN (
                    SELECT id FROM organizations 
                    WHERE id = organization_id 
                    AND created_by = auth.uid()
                ) OR
                id IN (
                    SELECT diagram_id FROM mermaid_diagram_shares 
                    WHERE shared_with_user_id = auth.uid()
                )
        )
    );

-- Users can create versions for diagrams they can edit
CREATE POLICY "Users can create diagram versions" ON mermaid_diagram_versions
    FOR INSERT WITH CHECK (
        diagram_id IN (
            SELECT id FROM mermaid_diagrams
            WHERE 
                auth.uid() = created_by OR
                organization_id IN (
                    SELECT id FROM organizations 
                    WHERE id = organization_id 
                    AND created_by = auth.uid()
                ) OR
                id IN (
                    SELECT diagram_id FROM mermaid_diagram_shares 
                    WHERE shared_with_user_id = auth.uid() 
                    AND permission = 'edit'
                )
        )
    );

-- Policies for mermaid_diagram_shares
-- Users can view shares for diagrams they own
CREATE POLICY "Users can view own diagram shares" ON mermaid_diagram_shares
    FOR SELECT USING (
        diagram_id IN (
            SELECT id FROM mermaid_diagrams 
            WHERE auth.uid() = created_by
        )
    );

-- Users can view shares shared with them
CREATE POLICY "Users can view shares shared with them" ON mermaid_diagram_shares
    FOR SELECT USING (shared_with_user_id = auth.uid());

-- Users can create shares for diagrams they own
CREATE POLICY "Users can create shares" ON mermaid_diagram_shares
    FOR INSERT WITH CHECK (
        diagram_id IN (
            SELECT id FROM mermaid_diagrams 
            WHERE auth.uid() = created_by
        )
    );

-- Users can delete shares for diagrams they own
CREATE POLICY "Users can delete shares" ON mermaid_diagram_shares
    FOR DELETE USING (
        diagram_id IN (
            SELECT id FROM mermaid_diagrams 
            WHERE auth.uid() = created_by
        )
    );

-- Allow anonymous access to public diagrams via API
-- This will be handled in the API layer with proper checks
