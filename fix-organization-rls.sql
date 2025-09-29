-- Fix RLS policies for organizations table
-- This script sets up proper Row Level Security policies for organization management

-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Organization directors can update organizations" ON organizations;
DROP POLICY IF EXISTS "Organization directors can delete organizations" ON organizations;

DROP POLICY IF EXISTS "Users can view organization members they belong to" ON organization_members;
DROP POLICY IF EXISTS "Users can insert themselves as organization members" ON organization_members;
DROP POLICY IF EXISTS "Organization directors can manage members" ON organization_members;

DROP POLICY IF EXISTS "Organization directors can manage invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Users can validate invitations sent to them" ON organization_invitations;
DROP POLICY IF EXISTS "Users can accept invitations" ON organization_invitations;

-- Ensure RLS is enabled on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Organizations table policies
-- Allow anyone to create organizations (we'll check membership after creation)
CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view organizations they created or belong to
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization directors can update organizations" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'director'
    )
  );

CREATE POLICY "Organization directors can delete organizations" ON organizations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'director'
    )
  );

-- Organization members table policies
-- Allow users to view members of organizations they belong to
CREATE POLICY "Users can view organization members" ON organization_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Allow users to join organizations (for invitations and creation)
CREATE POLICY "Users can join organizations" ON organization_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow organization directors to manage members
CREATE POLICY "Organization directors can manage members" ON organization_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'director'
    )
  );

CREATE POLICY "Organization directors can remove members" ON organization_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'director'
    )
  );

-- Organization invitations table policies
CREATE POLICY "Organization directors can manage invitations" ON organization_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_invitations.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'director'
    )
  );

CREATE POLICY "Users can validate invitations sent to them" ON organization_invitations
  FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can accept invitations" ON organization_invitations
  FOR UPDATE USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'pending'
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON organization_members TO authenticated;
GRANT ALL ON organization_invitations TO authenticated;