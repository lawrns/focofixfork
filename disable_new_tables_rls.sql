-- Disable RLS on newer tables to match core table security model
-- This ensures consistent application-layer security across all tables

-- Goals tables
ALTER TABLE goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones DISABLE ROW LEVEL SECURITY;
ALTER TABLE goal_project_links DISABLE ROW LEVEL SECURITY;

-- Time tracking tables
ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE file_storage_quotas DISABLE ROW LEVEL SECURITY;
ALTER TABLE conflicts DISABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users (matching core table pattern)
GRANT ALL ON goals TO authenticated;
GRANT ALL ON goal_milestones TO authenticated;
GRANT ALL ON goal_project_links TO authenticated;
GRANT ALL ON time_entries TO authenticated;
GRANT ALL ON file_storage_quotas TO authenticated;
GRANT ALL ON conflicts TO authenticated;

GRANT USAGE ON SCHEMA public TO authenticated;
