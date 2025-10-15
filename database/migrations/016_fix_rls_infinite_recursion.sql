-- Migration 016: Fix RLS infinite recursion between projects and project_members
-- This fixes the circular dependency that causes "infinite recursion detected in policy" errors

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Users can view projects where they are members" ON projects;
DROP POLICY IF EXISTS "Users can view organization projects" ON projects;
DROP POLICY IF EXISTS "Users can view tasks in accessible projects" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in accessible projects" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks in accessible projects" ON tasks;

-- Create security definer functions to break the circular dependency

-- Function to check if user can access a project
CREATE OR REPLACE FUNCTION public.user_can_access_project(project_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- User is the project owner
  IF EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_id_param
    AND created_by = user_id_param
  ) THEN
    RETURN true;
  END IF;

  -- User is a project member
  IF EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = project_id_param
    AND user_id = user_id_param
  ) THEN
    RETURN true;
  END IF;

  -- User is assigned via team
  IF EXISTS (
    SELECT 1 FROM project_team_assignments
    WHERE project_id = project_id_param
    AND user_id = user_id_param
  ) THEN
    RETURN true;
  END IF;

  -- User is in the organization
  IF EXISTS (
    SELECT 1
    FROM projects p
    JOIN organization_members om ON p.organization_id = om.organization_id
    WHERE p.id = project_id_param
    AND om.user_id = user_id_param
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Recreate policies using the security definer function

-- Projects policies (keep the existing "Users can view their own projects" policy)
-- Add new policy for accessible projects
CREATE POLICY "Users can view accessible projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (user_can_access_project(id, auth.uid()));

-- Project members policies
CREATE POLICY "Users can view project members"
  ON project_members
  FOR SELECT
  TO authenticated
  USING (user_can_access_project(project_id, auth.uid()));

-- Tasks policies
CREATE POLICY "Users can view tasks in accessible projects"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (user_can_access_project(project_id, auth.uid()));

CREATE POLICY "Users can create tasks in accessible projects"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (user_can_access_project(project_id, auth.uid()));

CREATE POLICY "Users can update tasks in accessible projects"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (user_can_access_project(project_id, auth.uid()));

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.user_can_access_project(uuid, uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.user_can_access_project IS 'Check if a user has access to a project (owner, member, team assignment, or organization member)';
