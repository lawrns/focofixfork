const { Client } = require('pg');

const migrationSQL = `CREATE TABLE IF NOT EXISTS cursos_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES foco_workspaces(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS cursos_checkpoint_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES cursos_sections(id) ON DELETE CASCADE,
  answer jsonb,
  is_correct boolean NOT NULL DEFAULT false,
  attempts int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cursos_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES cursos_courses(id) ON DELETE CASCADE,
  certification_level text NOT NULL DEFAULT 'Nivel 1',
  certified_at timestamptz DEFAULT now(),
  UNIQUE (user_id, course_id)
);

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

ALTER TABLE cursos_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos_checkpoint_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos_certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view published courses" ON cursos_courses;
CREATE POLICY "Workspace members can view published courses"
  ON cursos_courses
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM foco_workspace_members
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
      FROM foco_workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Users can view sections of accessible courses" ON cursos_sections;
CREATE POLICY "Users can view sections of accessible courses"
  ON cursos_sections
  FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM cursos_courses
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM foco_workspace_members
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
        FROM foco_workspace_members
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'owner')
      )
    )
  );

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
      FROM foco_workspace_members
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM foco_workspace_members
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'owner')
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage their own checkpoint attempts" ON cursos_checkpoint_attempts;
CREATE POLICY "Users can manage their own checkpoint attempts"
  ON cursos_checkpoint_attempts
  FOR ALL
  USING (user_id = auth.uid());

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
CREATE POLICY "System can create certifications"
  ON cursos_certifications
  FOR INSERT
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION cursos_update_progress_completion()
RETURNS TRIGGER AS \$\$
BEGIN
  IF ARRAY_LENGTH(NEW.completed_section_ids, 1) IS NOT NULL THEN
    SELECT COUNT(*) = ARRAY_LENGTH(NEW.completed_section_ids, 1)
    INTO NEW.is_completed
    FROM cursos_sections
    WHERE course_id = NEW.course_id;

    IF NEW.is_completed = true AND (OLD.is_completed = false OR OLD.is_completed IS NULL) THEN
      NEW.completed_at = now();
    END IF;
  END IF;

  RETURN NEW;
END;
\$\$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cursos_progress_completion_trigger ON cursos_progress;
CREATE TRIGGER cursos_progress_completion_trigger
  BEFORE UPDATE ON cursos_progress
  FOR EACH ROW
  EXECUTE FUNCTION cursos_update_progress_completion();

CREATE OR REPLACE FUNCTION cursos_update_updated_at()
RETURNS TRIGGER AS \$\$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
\$\$ LANGUAGE plpgsql;

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
  EXECUTE FUNCTION cursos_update_updated_at();`;

const dns = require('dns').promises;

async function applyMigration() {
  let ipv4;
  try {
    const addresses = await dns.resolve4('db.ouvqnyfqipgnrjnuqsqq.supabase.co');
    ipv4 = addresses[0];
    console.log('Resolved IPv4:', ipv4);
  } catch (err) {
    console.error('Could not resolve IPv4, trying direct connection...');
    ipv4 = 'db.ouvqnyfqipgnrjnuqsqq.supabase.co';
  }

  const client = new Client({
    host: ipv4,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'tqe.cgb0wkv9fmt7XRV',
    family: 4,
    connectionTimeoutMillis: 30000,
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL');
    
    await client.query(migrationSQL);
    console.log('Migration applied successfully!');
    
    const result = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'cursos_%' ORDER BY table_name;`);
    
    console.log('Created tables:', result.rows.map(r => r.table_name).join(', '));
    
  } catch (error) {
    console.error('Error applying migration:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
