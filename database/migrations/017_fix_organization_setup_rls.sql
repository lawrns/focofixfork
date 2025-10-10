-- Migration: Fix organization setup RLS policies and user profile handling
-- Date: 2025-10-10
-- Description: Updates RLS policies to allow organization setup to work properly

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Allow users to insert their own profile (for organization setup)
CREATE POLICY "Users can insert their own profile"
ON user_profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile (for organization setup)
CREATE POLICY "Users can update their own profile"
ON user_profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Also allow organization setup service role to manage profiles
CREATE POLICY "Service role can manage user profiles"
ON user_profiles
FOR ALL
USING (auth.role() = 'service_role');

-- Ensure organizations table allows proper access
DROP POLICY IF EXISTS "Organization members can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can update their organizations" ON organizations;

-- Allow organization members to view organizations
CREATE POLICY "Organization members can view their organizations"
ON organizations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = organizations.id
    AND organization_members.user_id = auth.uid()
  )
);

-- Allow organization creators to update their organizations
CREATE POLICY "Organization creators can update their organizations"
ON organizations
FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Allow service role full access to organizations
CREATE POLICY "Service role can manage organizations"
ON organizations
FOR ALL
USING (auth.role() = 'service_role');
