-- Fix the INSERT policy for projects - it needs to validate created_by field

-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "Users can create projects" ON projects;

-- Create a proper INSERT policy that validates the created_by field
CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());
