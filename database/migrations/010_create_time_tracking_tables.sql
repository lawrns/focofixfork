-- Migration: Create Time Tracking Tables
-- Description: Creates tables for time entries and storage quotas
-- Author: Claude Code
-- Date: 2025-10-03

-- =====================================================
-- Time Entries Table
-- =====================================================
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User and organization
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Task/Project association
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    -- Time tracking
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER, -- Calculated field

    -- Description
    description TEXT,
    notes TEXT,

    -- Billing/status
    is_billable BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    hourly_rate NUMERIC(10, 2),

    -- Tags for categorization
    tags TEXT[],

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_time_range CHECK (end_time IS NULL OR end_time > start_time),
    CONSTRAINT valid_duration CHECK (duration_minutes IS NULL OR duration_minutes > 0)
);

-- =====================================================
-- File Storage Quotas Table
-- =====================================================
CREATE TABLE IF NOT EXISTS file_storage_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User or organization
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Quota limits (in bytes)
    quota_limit BIGINT NOT NULL DEFAULT 5368709120, -- 5GB default
    used_storage BIGINT NOT NULL DEFAULT 0,

    -- Metadata
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Either user_id or organization_id must be set, but not both
    CONSTRAINT quota_owner CHECK (
        (user_id IS NOT NULL AND organization_id IS NULL) OR
        (user_id IS NULL AND organization_id IS NOT NULL)
    ),
    CONSTRAINT non_negative_storage CHECK (used_storage >= 0),
    CONSTRAINT positive_quota CHECK (quota_limit > 0)
);

-- =====================================================
-- Conflicts Table (for conflict resolution logging)
-- =====================================================
CREATE TABLE IF NOT EXISTS conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Entity information
    entity_type TEXT NOT NULL, -- 'project', 'task', 'milestone', etc.
    entity_id UUID NOT NULL,
    field_name TEXT NOT NULL,

    -- Conflict details
    server_value JSONB,
    client_value JSONB,
    resolved_value JSONB,

    -- Resolution
    resolution_strategy TEXT, -- 'server_wins', 'client_wins', 'manual', 'merge'
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,

    -- Users involved
    user_ids UUID[] NOT NULL,

    -- Timestamps
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- Indexes
-- =====================================================

-- Time entries indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_organization_id ON time_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries(start_time);
CREATE INDEX IF NOT EXISTS idx_time_entries_end_time ON time_entries(end_time);
CREATE INDEX IF NOT EXISTS idx_time_entries_is_billable ON time_entries(is_billable);

-- Storage quotas indexes
CREATE INDEX IF NOT EXISTS idx_storage_quotas_user_id ON file_storage_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_quotas_organization_id ON file_storage_quotas(organization_id);

-- Conflicts indexes
CREATE INDEX IF NOT EXISTS idx_conflicts_entity_type_id ON conflicts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_resolved_at ON conflicts(resolved_at);
CREATE INDEX IF NOT EXISTS idx_conflicts_occurred_at ON conflicts(occurred_at);

-- =====================================================
-- Triggers
-- =====================================================

-- Auto-calculate duration when end_time is set
CREATE OR REPLACE FUNCTION calculate_time_entry_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL THEN
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_entry_calculate_duration
    BEFORE INSERT OR UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION calculate_time_entry_duration();

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_time_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_entries_updated_at_trigger
    BEFORE UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_time_tracking_updated_at();

CREATE TRIGGER file_storage_quotas_updated_at_trigger
    BEFORE UPDATE ON file_storage_quotas
    FOR EACH ROW
    EXECUTE FUNCTION update_time_tracking_updated_at();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_storage_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflicts ENABLE ROW LEVEL SECURITY;

-- Time entries policies
CREATE POLICY "Users can view their own time entries"
    ON time_entries FOR SELECT
    USING (
        user_id = auth.uid() OR
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Users can create their own time entries"
    ON time_entries FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own time entries"
    ON time_entries FOR UPDATE
    USING (
        user_id = auth.uid() AND
        (is_approved = false OR auth.uid() IN (
            SELECT user_id FROM organization_members
            WHERE organization_id = time_entries.organization_id AND role IN ('admin', 'owner')
        ))
    );

CREATE POLICY "Users can delete their own time entries"
    ON time_entries FOR DELETE
    USING (
        user_id = auth.uid() OR
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- File storage quotas policies
CREATE POLICY "Users can view their own quota"
    ON file_storage_quotas FOR SELECT
    USING (
        user_id = auth.uid() OR
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Only admins can update quotas"
    ON file_storage_quotas FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Conflicts policies
CREATE POLICY "Users can view conflicts they're involved in"
    ON conflicts FOR SELECT
    USING (auth.uid() = ANY(user_ids));

CREATE POLICY "System can create conflicts"
    ON conflicts FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update conflicts to resolve them"
    ON conflicts FOR UPDATE
    USING (auth.uid() = ANY(user_ids));

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE time_entries IS 'Time tracking entries for tasks and projects';
COMMENT ON TABLE file_storage_quotas IS 'Storage quota tracking for users and organizations';
COMMENT ON TABLE conflicts IS 'Real-time collaboration conflict resolution log';
