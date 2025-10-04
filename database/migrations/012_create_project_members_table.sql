-- Create project_members table for tracking project team assignments
-- This table is used by analytics.service.ts to get accessible projects

CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON project_members(role);

-- Enable RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view project members for their projects" ON project_members;
CREATE POLICY "Users can view project members for their projects"
    ON project_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = project_members.project_id
            AND pm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Project owners can manage members" ON project_members;
CREATE POLICY "Project owners can manage members"
    ON project_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = project_members.project_id
            AND pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'admin')
        )
    );

-- Migrate existing data from project_team_assignments if it exists
INSERT INTO project_members (project_id, user_id, role, joined_at, created_at, updated_at)
SELECT 
    project_id, 
    user_id, 
    COALESCE(role, 'member') as role,
    COALESCE(created_at, NOW()) as joined_at,
    COALESCE(created_at, NOW()) as created_at,
    COALESCE(updated_at, NOW()) as updated_at
FROM project_team_assignments
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_team_assignments')
ON CONFLICT (project_id, user_id) DO NOTHING;

COMMENT ON TABLE project_members IS 'Tracks which users are members of which projects and their roles';
