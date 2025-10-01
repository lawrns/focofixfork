-- Migration: Drop unused organization_invites table
-- Date: 2025-10-01
-- Description: The application uses organization_invitations table, not organization_invites.
--              This removes the duplicate/unused table to avoid confusion.

-- Drop the unused table
DROP TABLE IF EXISTS public.organization_invites CASCADE;

-- Comment explaining the decision
COMMENT ON TABLE public.organization_invitations IS 'Organization invitations table - primary invitation system used by the application';
