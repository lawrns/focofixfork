-- Migration: Create Cursos Platform Tables
-- Creates the database schema for the Fyves internal education platform

-- ====================
-- PART 1: Create cursos_courses table
-- ====================
CREATE TABLE IF NOT EXISTS cursos_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  duration_minutes int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

-- ====================
-- PART 2: Create cursos_sections table
-- ====================
CREATE TABLE IF NOT EXISTS cursos_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES cursos_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('video', 'markdown', 'exercise', 'checkpoint')),
  content_url text,
  content text,
  sort_order int NOT NULL DEFAULT 0,
  duration_minutes int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ====================
-- PART 3: Create cursos_progress table
-- ====================
CREATE TABLE IF NOT EXISTS cursos_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES cursos_courses(id) ON DELETE CASCADE,
  completed_section_ids uuid[] NOT NULL DEFAULT '{}',
  last_position int NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, course_id)
);

-- ====================
-- PART 4: Create cursos_checkpoint_attempts table (P1 feature)
-- ====================
CREATE TABLE IF NOT EXISTS cursos_checkpoint_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES cursos_sections(id) ON DELETE CASCADE,
  answer jsonb,
  is_correct boolean NOT NULL DEFAULT false,
  attempts int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- ====================
-- PART 5: Create cursos_certifications table
-- ====================
CREATE TABLE IF NOT EXISTS cursos_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES cursos_courses(id) ON DELETE CASCADE,
  certification_level text NOT NULL DEFAULT 'Nivel 1',
  certified_at timestamptz DEFAULT now(),
  UNIQUE (user_id, course_id)
);

-- ====================
-- PART 6: Add indexes
-- ====================
CREATE INDEX IF NOT EXISTS cursos_courses_workspace_id_idx ON cursos_courses (workspace_id);
CREATE INDEX IF NOT EXISTS cursos_courses_is_published_idx ON cursos_courses (is_published);
CREATE INDEX IF NOT EXISTS cursos_courses_sort_order_idx ON cursos_courses (sort_order);

CREATE INDEX IF NOT EXISTS cursos_sections_course_id_idx ON cursos_sections (course_id);
CREATE INDEX IF NOT EXISTS cursos_sections_content_type_idx ON cursos_sections (content_type);
CREATE INDEX IF NOT EXISTS cursos_sections_sort_order_idx ON cursos_sections (sort_order);

CREATE INDEX IF NOT EXISTS cursos_progress_user_id_idx ON cursos_progress (user_id);
CREATE INDEX IF NOT EXISTS cursos_progress_course_id_idx ON cursos_progress (course_id);
CREATE INDEX IF NOT EXISTS cursos_progress_is_completed_idx ON cursos_progress (is_completed);

CREATE INDEX IF NOT EXISTS cursos_checkpoint_attempts_user_id_idx ON cursos_checkpoint_attempts (user_id);
CREATE INDEX IF NOT EXISTS cursos_checkpoint_attempts_section_id_idx ON cursos_checkpoint_attempts (section_id);

CREATE INDEX IF NOT EXISTS cursos_certifications_user_id_idx ON cursos_certifications (user_id);
CREATE INDEX IF NOT EXISTS cursos_certifications_course_id_idx ON cursos_certifications (course_id);

-- ====================
-- PART 7: Enable RLS
-- ====================
ALTER TABLE cursos_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos_checkpoint_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos_certifications ENABLE ROW LEVEL SECURITY;

-- ====================
-- PART 8: RLS Policies
-- ====================

-- Courses policies - workspace members can view published courses
DROP POLICY IF EXISTS "Workspace members can view published courses" ON cursos_courses;
CREATE POLICY "Workspace members can view published courses"
  ON cursos_courses
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
    )
    AND is_published = true
  );

DROP POLICY IF EXISTS "Workspace admins can manage courses" ON cursos_courses;
CREATE POLICY "Workspace admins can manage courses"
  ON cursos_courses
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- Sections policies - inherit from course access
DROP POLICY IF EXISTS "Users can view sections of accessible courses" ON cursos_sections;
CREATE POLICY "Users can view sections of accessible courses"
  ON cursos_sections
  FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM cursos_courses
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
      )
      AND is_published = true
    )
  );

DROP POLICY IF EXISTS "Workspace admins can manage sections" ON cursos_sections;
CREATE POLICY "Workspace admins can manage sections"
  ON cursos_sections
  FOR ALL
  USING (
    course_id IN (
      SELECT id FROM cursos_courses
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'owner')
      )
    )
  );

-- Progress policies - users manage their own progress
DROP POLICY IF EXISTS "Users can manage their own progress" ON cursos_progress;
CREATE POLICY "Users can manage their own progress"
  ON cursos_progress
  FOR ALL
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view progress of workspace members" ON cursos_progress;
CREATE POLICY "Users can view progress of workspace members"
  ON cursos_progress
  FOR SELECT
  USING (
    user_id IN (
      SELECT user_id
      FROM workspace_members
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'owner')
      )
    )
  );

-- Checkpoint attempts policies - users manage their own attempts
DROP POLICY IF EXISTS "Users can manage their own checkpoint attempts" ON cursos_checkpoint_attempts;
CREATE POLICY "Users can manage their own checkpoint attempts"
  ON cursos_checkpoint_attempts
  FOR ALL
  USING (user_id = auth.uid());

-- Certifications policies - public read, user write
DROP POLICY IF EXISTS "Anyone can view certifications" ON cursos_certifications;
CREATE POLICY "Anyone can view certifications"
  ON cursos_certifications
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can view their own certifications" ON cursos_certifications;
CREATE POLICY "Users can view their own certifications"
  ON cursos_certifications
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create certifications" ON cursos_certifications;
CREATE POLICY "Users can earn their own certifications"
  ON cursos_certifications
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM cursos_progress
      WHERE user_id = auth.uid()
        AND course_id = cursos_certifications.course_id
        AND is_completed = true
    )
  );

-- ====================
-- PART 9: Helper functions
-- ====================

-- Function to update progress completion status
CREATE OR REPLACE FUNCTION cursos_update_progress_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if all sections are completed
  IF ARRAY_LENGTH(NEW.completed_section_ids, 1) IS NOT NULL THEN
    SELECT COUNT(*) = ARRAY_LENGTH(NEW.completed_section_ids, 1)
    INTO NEW.is_completed
    FROM cursos_sections
    WHERE course_id = NEW.course_id;

    -- Update completed_at timestamp
    IF NEW.is_completed = true AND (OLD.is_completed = false OR OLD.is_completed IS NULL) THEN
      NEW.completed_at = now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update completion status
DROP TRIGGER IF EXISTS cursos_progress_completion_trigger ON cursos_progress;
CREATE TRIGGER cursos_progress_completion_trigger
  BEFORE UPDATE ON cursos_progress
  FOR EACH ROW
  EXECUTE FUNCTION cursos_update_progress_completion();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION cursos_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS cursos_courses_updated_at ON cursos_courses;
CREATE TRIGGER cursos_courses_updated_at
  BEFORE UPDATE ON cursos_courses
  FOR EACH ROW
  EXECUTE FUNCTION cursos_update_updated_at();

DROP TRIGGER IF EXISTS cursos_sections_updated_at ON cursos_sections;
CREATE TRIGGER cursos_sections_updated_at
  BEFORE UPDATE ON cursos_sections
  FOR EACH ROW
  EXECUTE FUNCTION cursos_update_updated_at();

DROP TRIGGER IF EXISTS cursos_progress_updated_at ON cursos_progress;
CREATE TRIGGER cursos_progress_updated_at
  BEFORE UPDATE ON cursos_progress
  FOR EACH ROW
  EXECUTE FUNCTION cursos_update_updated_at();

-- Migration complete!
-- Summary:
-- - Created cursos_courses table for course definitions
-- - Created cursos_sections table for course content
-- - Created cursos_progress table for user progress tracking
-- - Created cursos_checkpoint_attempts table for exercise attempts
-- - Created cursos_certifications table for completed courses
-- - Added indexes for performance
-- - Set up RLS policies for workspace-based access control
-- - Added triggers for automatic completion and timestamp updates
