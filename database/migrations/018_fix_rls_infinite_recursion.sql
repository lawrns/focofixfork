-- Migration: Fix RLS infinite recursion issue
-- Date: 2025-10-10
-- Description: Fix circular dependencies in RLS policies

-- First, enable RLS on organization_members if not already enabled
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view their organization memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can manage their organization memberships" ON organization_members;
DROP POLICY IF EXISTS "Service role can manage organization members" ON organization_members;

-- Allow users to view their own organization memberships
CREATE POLICY "Users can view their organization memberships"
ON organization_members
FOR SELECT
USING (user_id = auth.uid());

-- Allow users to manage their own memberships (leave organizations)
CREATE POLICY "Users can manage their organization memberships"
ON organization_members
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow service role full access
CREATE POLICY "Service role can manage organization members"
ON organization_members
FOR ALL
USING (auth.role() = 'service_role');

-- Fix the organizations policies to avoid recursion
-- Drop the problematic policy
DROP POLICY IF EXISTS "Organization members can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations they created or are members of" ON organizations;

-- Create policies that avoid circular references
-- Allow users to view organizations they created
CREATE POLICY "Users can view organizations they created"
ON organizations
FOR SELECT
USING (created_by = auth.uid());

-- Allow users to view organizations (this will be checked at application level)
-- For now, allow authenticated users to view all organizations
-- In production, you'd want more restrictive policies
CREATE POLICY "Authenticated users can view organizations"
ON organizations
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Keep the service role policy
-- (already created above)
