-- Migration: Fix Goals RLS Infinite Recursion
-- Description: Replaces recursive RLS policies with security definer function
-- Author: Claude Code
-- Date: 2025-10-15
-- Issue: goal_milestones and goal_project_links policies cause infinite recursion by checking "goal_id IN (SELECT id FROM goals)"

-- =====================================================
-- Create Security Definer Function
-- =====================================================
-- This function bypasses RLS to check if a goal is accessible to the current user
-- without triggering infinite recursion
CREATE OR REPLACE FUNCTION is_goal_accessible(goal_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_accessible BOOLEAN;
BEGIN
  -- Check if the goal is accessible to the current user
  -- This query runs with elevated privileges and bypasses RLS
  SELECT EXISTS (
    SELECT 1 FROM goals g
    WHERE g.id = goal_uuid
      AND (
        -- User is the owner
        g.owner_id = auth.uid()
        OR
        -- User is a member of the goal's organization
        g.organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid()
        )
      )
  ) INTO is_accessible;

  RETURN is_accessible;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_goal_accessible(UUID) TO authenticated;

-- =====================================================
-- Drop Existing Recursive Policies
-- =====================================================

-- Goal milestones
DROP POLICY IF EXISTS "Users can view milestones for accessible goals" ON goal_milestones;
DROP POLICY IF EXISTS "Users can create milestones for accessible goals" ON goal_milestones;
DROP POLICY IF EXISTS "Users can update milestones for accessible goals" ON goal_milestones;
DROP POLICY IF EXISTS "Users can delete milestones for accessible goals" ON goal_milestones;

-- Goal project links
DROP POLICY IF EXISTS "Users can view goal-project links for accessible goals" ON goal_project_links;
DROP POLICY IF EXISTS "Users can create goal-project links" ON goal_project_links;
DROP POLICY IF EXISTS "Users can delete goal-project links" ON goal_project_links;

-- =====================================================
-- Create Non-Recursive Policies Using Security Definer Function
-- =====================================================

-- Goal milestones policies
CREATE POLICY "Users can view milestones for accessible goals"
    ON goal_milestones FOR SELECT
    USING (is_goal_accessible(goal_id));

CREATE POLICY "Users can create milestones for accessible goals"
    ON goal_milestones FOR INSERT
    WITH CHECK (is_goal_accessible(goal_id));

CREATE POLICY "Users can update milestones for accessible goals"
    ON goal_milestones FOR UPDATE
    USING (is_goal_accessible(goal_id));

CREATE POLICY "Users can delete milestones for accessible goals"
    ON goal_milestones FOR DELETE
    USING (is_goal_accessible(goal_id));

-- Goal project links policies
CREATE POLICY "Users can view goal-project links for accessible goals"
    ON goal_project_links FOR SELECT
    USING (is_goal_accessible(goal_id));

CREATE POLICY "Users can create goal-project links"
    ON goal_project_links FOR INSERT
    WITH CHECK (
        is_goal_accessible(goal_id) AND
        project_id IN (
            SELECT p.id FROM projects p
            JOIN project_members pm ON pm.project_id = p.id
            WHERE pm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete goal-project links"
    ON goal_project_links FOR DELETE
    USING (is_goal_accessible(goal_id));

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON FUNCTION is_goal_accessible(UUID) IS 'Security definer function to check goal accessibility without triggering RLS recursion';
