-- Migration: Add missing tables for inbox, work items, workspace members, and foco projects
-- These tables are required by the API routes but were missing from the schema

-- 1. Create inbox_items table for notifications
CREATE TABLE IF NOT EXISTS public.inbox_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'notification',
    title TEXT NOT NULL,
    body TEXT,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    work_item_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    priority TEXT DEFAULT 'normal',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create work_items table for tasks and work tracking
CREATE TABLE IF NOT EXISTS public.work_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    workspace_id UUID,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    estimated_hours DECIMAL(10,2),
    actual_hours DECIMAL(10,2),
    tags TEXT[],
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create workspace_members table
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    permissions JSONB,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- 4. Create foco_projects table (separate from regular projects for Foco-specific features)
CREATE TABLE IF NOT EXISTS public.foco_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID,
    status TEXT NOT NULL DEFAULT 'active',
    visibility TEXT NOT NULL DEFAULT 'private',
    color TEXT DEFAULT '#3B82F6',
    icon TEXT,
    settings JSONB,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create foco_project_members table
CREATE TABLE IF NOT EXISTS public.foco_project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.foco_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    permissions JSONB,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Add foreign key from work_items to inbox_items
ALTER TABLE public.inbox_items
ADD CONSTRAINT inbox_items_work_item_id_fkey
FOREIGN KEY (work_item_id) REFERENCES public.work_items(id) ON DELETE CASCADE;

-- Add foreign key from work_items to organizations (workspace)
ALTER TABLE public.work_items
ADD CONSTRAINT work_items_workspace_id_fkey
FOREIGN KEY (workspace_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add foreign key from workspace_members to organizations
ALTER TABLE public.workspace_members
ADD CONSTRAINT workspace_members_workspace_id_fkey
FOREIGN KEY (workspace_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add foreign key from foco_projects to organizations
ALTER TABLE public.foco_projects
ADD CONSTRAINT foco_projects_workspace_id_fkey
FOREIGN KEY (workspace_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inbox_items_user_id ON public.inbox_items(user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_items_is_read ON public.inbox_items(is_read);
CREATE INDEX IF NOT EXISTS idx_inbox_items_created_at ON public.inbox_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_items_project_id ON public.work_items(project_id);
CREATE INDEX IF NOT EXISTS idx_work_items_assigned_to ON public.work_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_items_status ON public.work_items(status);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_foco_projects_owner_id ON public.foco_projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_foco_projects_slug ON public.foco_projects(slug);
CREATE INDEX IF NOT EXISTS idx_foco_project_members_project_id ON public.foco_project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_foco_project_members_user_id ON public.foco_project_members(user_id);

-- Enable RLS on all new tables
ALTER TABLE public.inbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foco_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foco_project_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inbox_items
CREATE POLICY "Users can view their own inbox items"
    ON public.inbox_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own inbox items"
    ON public.inbox_items FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inbox items"
    ON public.inbox_items FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert inbox items"
    ON public.inbox_items FOR INSERT
    WITH CHECK (true);

-- RLS Policies for work_items
CREATE POLICY "Users can view work items they're assigned to or created"
    ON public.work_items FOR SELECT
    USING (
        auth.uid() = assigned_to
        OR auth.uid() = created_by
        OR EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = work_items.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert work items"
    ON public.work_items FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update work items they created or are assigned to"
    ON public.work_items FOR UPDATE
    USING (auth.uid() = assigned_to OR auth.uid() = created_by);

CREATE POLICY "Users can delete work items they created"
    ON public.work_items FOR DELETE
    USING (auth.uid() = created_by);

-- RLS Policies for workspace_members
CREATE POLICY "Users can view workspace members of their workspaces"
    ON public.workspace_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm2
            WHERE wm2.workspace_id = workspace_members.workspace_id
            AND wm2.user_id = auth.uid()
        )
    );

CREATE POLICY "Workspace admins can manage members"
    ON public.workspace_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
    );

-- RLS Policies for foco_projects
CREATE POLICY "Users can view their own foco projects"
    ON public.foco_projects FOR SELECT
    USING (
        auth.uid() = owner_id
        OR visibility = 'public'
        OR EXISTS (
            SELECT 1 FROM public.foco_project_members fpm
            WHERE fpm.project_id = foco_projects.id
            AND fpm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create foco projects"
    ON public.foco_projects FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Project owners can update their projects"
    ON public.foco_projects FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Project owners can delete their projects"
    ON public.foco_projects FOR DELETE
    USING (auth.uid() = owner_id);

-- RLS Policies for foco_project_members
CREATE POLICY "Users can view project members"
    ON public.foco_project_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.foco_projects fp
            WHERE fp.id = foco_project_members.project_id
            AND (fp.owner_id = auth.uid() OR fp.visibility = 'public')
        )
        OR auth.uid() = user_id
    );

CREATE POLICY "Project owners can manage members"
    ON public.foco_project_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.foco_projects fp
            WHERE fp.id = foco_project_members.project_id
            AND fp.owner_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON public.inbox_items TO authenticated;
GRANT ALL ON public.work_items TO authenticated;
GRANT ALL ON public.workspace_members TO authenticated;
GRANT ALL ON public.foco_projects TO authenticated;
GRANT ALL ON public.foco_project_members TO authenticated;
