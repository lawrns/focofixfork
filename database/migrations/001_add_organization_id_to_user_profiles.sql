-- Migration: Add organization_id to user_profiles table
-- This migration adds the organization_id field to track which organization a user belongs to

-- Add organization_id column to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Add index for performance
CREATE INDEX idx_user_profiles_organization_id ON user_profiles(organization_id);

-- Update existing records (if any) to have a default organization_id
-- This should be run after organizations exist in the database
