-- Migration: Create Goals Tables
-- Description: Creates tables for goals, goal milestones, and goal-project links
-- Author: Claude Code
-- Date: 2025-10-03

-- =====================================================
-- Goals Table
-- =====================================================
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('organization', 'project', 'personal')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

    -- Progress tracking
    target_value NUMERIC,
    current_value NUMERIC DEFAULT 0,
    unit TEXT, -- %, hours, count, etc.
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

    -- Ownership and organization
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    -- Dates
    start_date DATE,
    end_date DATE,
    completed_at TIMESTAMPTZ,

    -- Metadata
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_date_range CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
    CONSTRAINT valid_progress CHECK (
        (current_value IS NULL AND target_value IS NULL) OR
        (current_value IS NOT NULL AND target_value IS NOT NULL)
    )
);

-- =====================================================
-- Goal Milestones Table
-- =====================================================
CREATE TABLE IF NOT EXISTS goal_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),

    -- Progress
    weight INTEGER DEFAULT 1 CHECK (weight > 0), -- Weight for progress calculation
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

    -- Dates
    due_date DATE,
    completed_at TIMESTAMPTZ,

    -- Order
    sort_order INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Goal Project Links Table
-- =====================================================
CREATE TABLE IF NOT EXISTS goal_project_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Contribution tracking
    contribution_percentage INTEGER DEFAULT 0 CHECK (contribution_percentage >= 0 AND contribution_percentage <= 100),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint
    CONSTRAINT unique_goal_project UNIQUE (goal_id, project_id)
);

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_goals_organization_id ON goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_goals_project_id ON goals(project_id);
CREATE INDEX IF NOT EXISTS idx_goals_owner_id ON goals(owner_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_type ON goals(type);
CREATE INDEX IF NOT EXISTS idx_goals_end_date ON goals(end_date);

CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id ON goal_milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_status ON goal_milestones(status);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_due_date ON goal_milestones(due_date);

CREATE INDEX IF NOT EXISTS idx_goal_project_links_goal_id ON goal_project_links(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_project_links_project_id ON goal_project_links(project_id);

-- =====================================================
-- Triggers for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER goals_updated_at_trigger
    BEFORE UPDATE ON goals
    FOR EACH ROW
    EXECUTE FUNCTION update_goals_updated_at();

CREATE TRIGGER goal_milestones_updated_at_trigger
    BEFORE UPDATE ON goal_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_goals_updated_at();

CREATE TRIGGER goal_project_links_updated_at_trigger
    BEFORE UPDATE ON goal_project_links
    FOR EACH ROW
    EXECUTE FUNCTION update_goals_updated_at();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_project_links ENABLE ROW LEVEL SECURITY;

-- Goals policies
CREATE POLICY "Users can view goals in their organization"
    ON goals FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create goals in their organization"
    ON goals FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Goal owners and admins can update goals"
    ON goals FOR UPDATE
    USING (
        owner_id = auth.uid() OR
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Goal owners and admins can delete goals"
    ON goals FOR DELETE
    USING (
        owner_id = auth.uid() OR
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Goal milestones policies
CREATE POLICY "Users can view milestones for accessible goals"
    ON goal_milestones FOR SELECT
    USING (
        goal_id IN (SELECT id FROM goals)
    );

CREATE POLICY "Users can create milestones for accessible goals"
    ON goal_milestones FOR INSERT
    WITH CHECK (
        goal_id IN (SELECT id FROM goals)
    );

CREATE POLICY "Users can update milestones for accessible goals"
    ON goal_milestones FOR UPDATE
    USING (
        goal_id IN (SELECT id FROM goals)
    );

CREATE POLICY "Users can delete milestones for accessible goals"
    ON goal_milestones FOR DELETE
    USING (
        goal_id IN (SELECT id FROM goals)
    );

-- Goal project links policies
CREATE POLICY "Users can view goal-project links for accessible goals"
    ON goal_project_links FOR SELECT
    USING (
        goal_id IN (SELECT id FROM goals)
    );

CREATE POLICY "Users can create goal-project links"
    ON goal_project_links FOR INSERT
    WITH CHECK (
        goal_id IN (SELECT id FROM goals) AND
        project_id IN (
            SELECT p.id FROM projects p
            JOIN team_members tm ON tm.project_id = p.id
            WHERE tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete goal-project links"
    ON goal_project_links FOR DELETE
    USING (
        goal_id IN (SELECT id FROM goals)
    );

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE goals IS 'Goals for organizations, projects, or individuals';
COMMENT ON TABLE goal_milestones IS 'Milestones for tracking goal progress';
COMMENT ON TABLE goal_project_links IS 'Links between goals and projects';
