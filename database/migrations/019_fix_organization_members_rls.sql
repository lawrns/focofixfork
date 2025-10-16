-- Migration: Add RLS policies for organization_members table
-- Date: 2025-10-16
-- Description: Adds missing RLS policies so users can view their organization memberships

-- Enable RLS on organization_members if not already enabled
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can view all members" ON organization_members;
DROP POLICY IF EXISTS "Service role can manage organization members" ON organization_members;

-- Allow users to SELECT their own memberships
-- This is critical for getUserOrganizations() to work
CREATE POLICY "Users can view their own memberships"
ON organization_members
FOR SELECT
USING (user_id = auth.uid());

-- Allow organization admins to view all members in their organization
CREATE POLICY "Organization admins can view all members"
ON organization_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members AS om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role = 'admin'
  )
);

-- Allow service role full access (for backend operations)
CREATE POLICY "Service role can manage organization members"
ON organization_members
FOR ALL
USING (auth.role() = 'service_role');

-- Allow authenticated users to INSERT themselves as members (for accepting invitations)
CREATE POLICY "Users can accept invitations"
ON organization_members
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Allow admins to UPDATE member roles
CREATE POLICY "Admins can update member roles"
ON organization_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_members AS om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role = 'admin'
  )
);

-- Allow admins to DELETE members (but not the last admin)
CREATE POLICY "Admins can remove members"
ON organization_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM organization_members AS om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role = 'admin'
  )
);
