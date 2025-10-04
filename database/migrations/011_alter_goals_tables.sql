-- Migration: Alter Goals Tables to Match Application Schema
-- Description: Adds missing columns to existing goals tables
-- Author: Claude Code
-- Date: 2025-10-03

-- =====================================================
-- Alter Goals Table
-- =====================================================

-- Add title column (rename name to title)
ALTER TABLE goals RENAME COLUMN name TO title;

-- Add missing columns
ALTER TABLE goals ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'organization' CHECK (type IN ('organization', 'project', 'personal'));
ALTER TABLE goals ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold'));
ALTER TABLE goals ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
ALTER TABLE goals ADD COLUMN IF NOT EXISTS target_value NUMERIC;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS current_value NUMERIC DEFAULT 0;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
ALTER TABLE goals ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE goals ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Migrate data: set owner_id from created_by
UPDATE goals SET owner_id = created_by WHERE owner_id IS NULL;

-- Add foreign keys
ALTER TABLE goals ADD CONSTRAINT goals_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE goals ADD CONSTRAINT goals_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE goals ADD CONSTRAINT goals_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Add constraints
ALTER TABLE goals DROP CONSTRAINT IF EXISTS valid_date_range;
ALTER TABLE goals ADD CONSTRAINT valid_date_range CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date);

ALTER TABLE goals DROP CONSTRAINT IF EXISTS valid_progress;
ALTER TABLE goals ADD CONSTRAINT valid_progress CHECK (
    (current_value IS NULL AND target_value IS NULL) OR
    (current_value IS NOT NULL AND target_value IS NOT NULL)
);

-- Migrate target_date to end_date if not already migrated
UPDATE goals SET end_date = target_date WHERE end_date IS NULL AND target_date IS NOT NULL;

-- We can drop target_date and created_by columns later if needed
-- For now, keep them for backwards compatibility

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_goals_organization_id ON goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_goals_project_id ON goals(project_id);
CREATE INDEX IF NOT EXISTS idx_goals_owner_id ON goals(owner_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_type ON goals(type);
CREATE INDEX IF NOT EXISTS idx_goals_end_date ON goals(end_date);

-- =====================================================
-- Alter Goal Milestones Table
-- =====================================================
ALTER TABLE goal_milestones ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE goal_milestones ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE goal_milestones ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));
ALTER TABLE goal_milestones ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 1 CHECK (weight > 0);
ALTER TABLE goal_milestones ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
ALTER TABLE goal_milestones ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE goal_milestones ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE goal_milestones ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE goal_milestones ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE goal_milestones ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Migrate name to title if exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_milestones' AND column_name = 'name') THEN
        UPDATE goal_milestones SET title = name WHERE title IS NULL;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id ON goal_milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_status ON goal_milestones(status);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_due_date ON goal_milestones(due_date);

-- =====================================================
-- Alter Goal Project Links Table
-- =====================================================
ALTER TABLE goal_project_links ADD COLUMN IF NOT EXISTS contribution_percentage INTEGER DEFAULT 0 CHECK (contribution_percentage >= 0 AND contribution_percentage <= 100);
ALTER TABLE goal_project_links ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE goal_project_links ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Create unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'goal_project_links' AND constraint_name = 'unique_goal_project'
    ) THEN
        ALTER TABLE goal_project_links ADD CONSTRAINT unique_goal_project UNIQUE (goal_id, project_id);
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_goal_project_links_goal_id ON goal_project_links(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_project_links_project_id ON goal_project_links(project_id);

-- =====================================================
-- Update Triggers
-- =====================================================
DROP TRIGGER IF EXISTS goal_milestones_updated_at_trigger ON goal_milestones;
CREATE TRIGGER goal_milestones_updated_at_trigger
    BEFORE UPDATE ON goal_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_goals_updated_at();

DROP TRIGGER IF EXISTS goal_project_links_updated_at_trigger ON goal_project_links;
CREATE TRIGGER goal_project_links_updated_at_trigger
    BEFORE UPDATE ON goal_project_links
    FOR EACH ROW
    EXECUTE FUNCTION update_goals_updated_at();

-- =====================================================
-- Update RLS Policies
-- =====================================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can create goals" ON goals;
DROP POLICY IF EXISTS "Users can update own goals" ON goals;
DROP POLICY IF EXISTS "Users can view goals in their organizations" ON goals;
DROP POLICY IF EXISTS "goals_access" ON goals;

-- Recreate with proper schema
CREATE POLICY "Users can view goals in their organization"
    ON goals FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        ) OR owner_id = auth.uid()
    );

CREATE POLICY "Users can create goals in their organization"
    ON goals FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        ) OR owner_id = auth.uid()
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

-- Update milestone policies
DROP POLICY IF EXISTS "goal_milestones_access" ON goal_milestones;

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

-- Update goal-project links policies
DROP POLICY IF EXISTS "goal_project_links_access" ON goal_project_links;

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
