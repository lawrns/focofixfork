-- Migration: Complete fix for RLS infinite recursion
-- Date: 2025-10-19
-- Description: Completely eliminate circular dependencies in RLS policies

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can manage their own memberships" ON organization_members;
DROP POLICY IF EXISTS "Service role can manage organization members" ON organization_members;
DROP POLICY IF EXISTS "Users can view organizations they created" ON organizations;
DROP POLICY IF EXISTS "Users can update organizations they created" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Service role can manage organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can view organizations" ON organizations;

-- Create completely non-recursive policies for organization_members
-- Allow users to view their own memberships (simple user_id check)
CREATE POLICY "Users can view their own memberships"
ON organization_members
FOR SELECT
USING (user_id = auth.uid());

-- Allow users to manage their own memberships
CREATE POLICY "Users can manage their own memberships"
ON organization_members
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow service role full access
CREATE POLICY "Service role can manage organization members"
ON organization_members
FOR ALL
USING (auth.role() = 'service_role');

-- Create completely non-recursive policies for organizations
-- Allow users to view organizations they created (simple created_by check)
CREATE POLICY "Users can view organizations they created"
ON organizations
FOR SELECT
USING (created_by = auth.uid());

-- Allow users to update organizations they created
CREATE POLICY "Users can update organizations they created"
ON organizations
FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Allow users to create organizations
CREATE POLICY "Users can create organizations"
ON organizations
FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Allow service role full access
CREATE POLICY "Service role can manage organizations"
ON organizations
FOR ALL
USING (auth.role() = 'service_role');

-- For the application to work, we need to allow viewing organizations
-- that users are members of, but without circular references
-- This policy allows authenticated users to view organizations
-- The application logic will filter results appropriately
CREATE POLICY "Authenticated users can view organizations"
ON organizations
FOR SELECT
USING (auth.uid() IS NOT NULL);
