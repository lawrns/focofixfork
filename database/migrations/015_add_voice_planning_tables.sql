-- Migration 015: Add voice planning tables and columns
-- This migration is additive and maintains backward compatibility
-- Part of Phase 1: Voice Planning Infrastructure

BEGIN;

-- Create voice_sessions table for managing voice capture sessions
CREATE TABLE IF NOT EXISTS voice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Session metadata
    title VARCHAR(500),
    description TEXT,
    language VARCHAR(10) DEFAULT 'en',
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
    
    -- Audio capture settings
    max_duration_seconds INTEGER DEFAULT 300,
    audio_format VARCHAR(20) DEFAULT 'webm',
    sample_rate INTEGER DEFAULT 16000,
    noise_reduction_enabled BOOLEAN DEFAULT false,
    
    -- Session state
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Transcription state
    transcription_status VARCHAR(50) DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
    transcript TEXT,
    transcript_confidence DECIMAL(3,2),
    transcribed_at TIMESTAMP WITH TIME ZONE,
    transcription_model VARCHAR(100),
    
    -- Plan generation state
    plan_status VARCHAR(50) DEFAULT 'pending' CHECK (plan_status IN ('pending', 'processing', 'completed', 'failed')),
    plan_json JSONB,
    plan_confidence DECIMAL(3,2),
    plan_generated_at TIMESTAMP WITH TIME ZONE,
    plan_model VARCHAR(100),
    
    -- Commit state
    commit_status VARCHAR(50) DEFAULT 'pending' CHECK (commit_status IN ('pending', 'processing', 'completed', 'failed')),
    commit_errors JSONB,
    committed_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit and tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Feature flags and experimental settings
    feature_flags JSONB DEFAULT '{}',
    experimental_settings JSONB DEFAULT '{}',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT voice_sessions_duration_check CHECK (max_duration_seconds > 0 AND max_duration_seconds <= 3600),
    CONSTRAINT voice_sessions_confidence_check CHECK (transcript_confidence IS NULL OR (transcript_confidence >= 0 AND transcript_confidence <= 1)),
    CONSTRAINT voice_sessions_plan_confidence_check CHECK (plan_confidence IS NULL OR (plan_confidence >= 0 AND plan_confidence <= 1))
);

-- Create voice_audio_chunks table for storing audio segments
CREATE TABLE IF NOT EXISTS voice_audio_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
    
    -- Chunk metadata
    sequence_number INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    size_bytes INTEGER NOT NULL,
    format VARCHAR(20) NOT NULL,
    sample_rate INTEGER NOT NULL,
    
    -- Storage
    storage_path VARCHAR(1000),
    storage_provider VARCHAR(50) DEFAULT 'local',
    encryption_enabled BOOLEAN DEFAULT false,
    
    -- Processing state
    transcription_status VARCHAR(50) DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
    transcript TEXT,
    transcript_confidence DECIMAL(3,2),
    transcribed_at TIMESTAMP WITH TIME ZONE,
    
    -- Timing
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT voice_audio_chunks_duration_check CHECK (duration_ms > 0 AND duration_ms <= 60000),
    CONSTRAINT voice_audio_chunks_size_check CHECK (size_bytes > 0 AND size_bytes <= 10485760), -- 10MB max
    CONSTRAINT voice_audio_chunks_confidence_check CHECK (transcript_confidence IS NULL OR (transcript_confidence >= 0 AND transcript_confidence <= 1)),
    
    -- Unique constraint per session
    UNIQUE(session_id, sequence_number)
);

-- Create voice_plan_dependencies table for tracking task dependencies in voice-generated plans
CREATE TABLE IF NOT EXISTS voice_plan_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
    
    -- Dependency relationship
    depends_on_task_id VARCHAR(100) NOT NULL, -- Reference to task in plan_json
    dependent_task_id VARCHAR(100) NOT NULL, -- Reference to task in plan_json
    dependency_type VARCHAR(50) DEFAULT 'finish_to_start' CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
    
    -- Validation state
    is_valid BOOLEAN DEFAULT true,
    validation_errors JSONB,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT voice_plan_dependencies_no_self_reference CHECK (depends_on_task_id != dependent_task_id),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(session_id, depends_on_task_id, dependent_task_id)
);

-- Create voice_plan_audit table for tracking all plan operations
CREATE TABLE IF NOT EXISTS voice_plan_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
    
    -- Operation details
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('created', 'updated', 'committed', 'rollback', 'validated', 'failed')),
    operation_status VARCHAR(50) NOT NULL CHECK (operation_status IN ('pending', 'processing', 'completed', 'failed')),
    
    -- Operation data
    operation_data JSONB,
    previous_state JSONB,
    new_state JSONB,
    
    -- Error tracking
    error_code VARCHAR(100),
    error_message TEXT,
    error_details JSONB,
    
    -- Performance metrics
    duration_ms INTEGER,
    processing_steps JSONB,
    
    -- User and system context
    user_id UUID REFERENCES auth.users(id),
    service_name VARCHAR(100),
    feature_flags JSONB DEFAULT '{}',
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT voice_plan_audit_duration_check CHECK (duration_ms IS NULL OR duration_ms >= 0)
);

-- Add voice-related columns to existing projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS voice_session_id UUID REFERENCES voice_sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS voice_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS voice_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS voice_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS voice_commit_status VARCHAR(50) DEFAULT 'none' CHECK (voice_commit_status IN ('none', 'pending', 'committed', 'failed')),
ADD COLUMN IF NOT EXISTS voice_committed_at TIMESTAMP WITH TIME ZONE;

-- Add voice-related columns to existing milestones table  
ALTER TABLE milestones
ADD COLUMN IF NOT EXISTS voice_session_id UUID REFERENCES voice_sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS voice_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS voice_task_id VARCHAR(100), -- Reference to task in plan_json
ADD COLUMN IF NOT EXISTS voice_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS voice_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS voice_commit_status VARCHAR(50) DEFAULT 'none' CHECK (voice_commit_status IN ('none', 'pending', 'committed', 'failed')),
ADD COLUMN IF NOT EXISTS voice_committed_at TIMESTAMP WITH TIME ZONE;

-- Add voice-related columns to existing tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS voice_session_id UUID REFERENCES voice_sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS voice_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS voice_task_id VARCHAR(100), -- Reference to task in plan_json
ADD COLUMN IF NOT EXISTS voice_milestone_id VARCHAR(100), -- Reference to milestone in plan_json
ADD COLUMN IF NOT EXISTS voice_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS voice_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS voice_dependencies JSONB DEFAULT '[]', -- Array of task IDs this task depends on
ADD COLUMN IF NOT EXISTS voice_commit_status VARCHAR(50) DEFAULT 'none' CHECK (voice_commit_status IN ('none', 'pending', 'committed', 'failed')),
ADD COLUMN IF NOT EXISTS voice_committed_at TIMESTAMP WITH TIME ZONE;

-- Add constraints for new columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'projects_voice_confidence_check'
  ) THEN
    ALTER TABLE projects
    ADD CONSTRAINT projects_voice_confidence_check
    CHECK (voice_confidence IS NULL OR (voice_confidence >= 0 AND voice_confidence <= 1));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'milestones_voice_confidence_check'
  ) THEN
    ALTER TABLE milestones
    ADD CONSTRAINT milestones_voice_confidence_check
    CHECK (voice_confidence IS NULL OR (voice_confidence >= 0 AND voice_confidence <= 1));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_voice_confidence_check'
  ) THEN
    ALTER TABLE tasks
    ADD CONSTRAINT tasks_voice_confidence_check
    CHECK (voice_confidence IS NULL OR (voice_confidence >= 0 AND voice_confidence <= 1));
  END IF;
END $$;

-- Create indexes for performance

-- Voice sessions indexes
CREATE INDEX IF NOT EXISTS idx_voice_sessions_org_id ON voice_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_user_id ON voice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_status ON voice_sessions(status);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_created_at ON voice_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_plan_status ON voice_sessions(plan_status);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_commit_status ON voice_sessions(commit_status);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_plan_json_gin ON voice_sessions USING GIN(plan_json);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_metadata_gin ON voice_sessions USING GIN(metadata);

-- Voice audio chunks indexes
CREATE INDEX IF NOT EXISTS idx_voice_audio_chunks_session_id ON voice_audio_chunks(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_audio_chunks_sequence ON voice_audio_chunks(session_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_voice_audio_chunks_status ON voice_audio_chunks(transcription_status);
CREATE INDEX IF NOT EXISTS idx_voice_audio_chunks_recorded_at ON voice_audio_chunks(recorded_at);

-- Voice plan dependencies indexes
CREATE INDEX IF NOT EXISTS idx_voice_plan_dependencies_session_id ON voice_plan_dependencies(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_plan_dependencies_task_id ON voice_plan_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_voice_plan_dependencies_dependent ON voice_plan_dependencies(dependent_task_id);

-- Voice audit indexes
CREATE INDEX IF NOT EXISTS idx_voice_plan_audit_session_id ON voice_plan_audit(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_plan_audit_operation ON voice_plan_audit(operation_type, operation_status);
CREATE INDEX IF NOT EXISTS idx_voice_plan_audit_created_at ON voice_plan_audit(started_at);
CREATE INDEX IF NOT EXISTS idx_voice_plan_audit_user_id ON voice_plan_audit(user_id);

-- Projects voice columns indexes
CREATE INDEX IF NOT EXISTS idx_projects_voice_session_id ON projects(voice_session_id);
CREATE INDEX IF NOT EXISTS idx_projects_voice_generated ON projects(voice_generated);
CREATE INDEX IF NOT EXISTS idx_projects_voice_commit_status ON projects(voice_commit_status);

-- Milestones voice columns indexes
CREATE INDEX IF NOT EXISTS idx_milestones_voice_session_id ON milestones(voice_session_id);
CREATE INDEX IF NOT EXISTS idx_milestones_voice_generated ON milestones(voice_generated);
CREATE INDEX IF NOT EXISTS idx_milestones_voice_task_id ON milestones(voice_task_id);
CREATE INDEX IF NOT EXISTS idx_milestones_voice_commit_status ON milestones(voice_commit_status);

-- Tasks voice columns indexes
CREATE INDEX IF NOT EXISTS idx_tasks_voice_session_id ON tasks(voice_session_id);
CREATE INDEX IF NOT EXISTS idx_tasks_voice_generated ON tasks(voice_generated);
CREATE INDEX IF NOT EXISTS idx_tasks_voice_task_id ON tasks(voice_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_voice_milestone_id ON tasks(voice_milestone_id);
CREATE INDEX IF NOT EXISTS idx_tasks_voice_dependencies_gin ON tasks USING GIN(voice_dependencies);
CREATE INDEX IF NOT EXISTS idx_tasks_voice_commit_status ON tasks(voice_commit_status);

-- Create updated_at trigger function for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER voice_sessions_updated_at BEFORE UPDATE ON voice_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER voice_audio_chunks_updated_at BEFORE UPDATE ON voice_audio_chunks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER voice_plan_dependencies_updated_at BEFORE UPDATE ON voice_plan_dependencies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for last_activity_at on voice_sessions
CREATE OR REPLACE FUNCTION update_voice_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER voice_sessions_activity_updated BEFORE UPDATE ON voice_sessions FOR EACH ROW EXECUTE FUNCTION update_voice_session_activity();

-- Row Level Security (RLS) for new tables

-- Enable RLS on voice_sessions
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;

-- Voice sessions RLS policies
CREATE POLICY "Users can view their own voice sessions" ON voice_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own voice sessions" ON voice_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own voice sessions" ON voice_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own voice sessions" ON voice_sessions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Organization members can view org voice sessions" ON voice_sessions FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
);

-- Enable RLS on voice_audio_chunks
ALTER TABLE voice_audio_chunks ENABLE ROW LEVEL SECURITY;

-- Voice audio chunks RLS policies (inherited from session)
CREATE POLICY "Users can view chunks from their sessions" ON voice_audio_chunks FOR SELECT USING (
    EXISTS (SELECT 1 FROM voice_sessions WHERE id = session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert chunks for their sessions" ON voice_audio_chunks FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM voice_sessions WHERE id = session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update chunks for their sessions" ON voice_audio_chunks FOR UPDATE USING (
    EXISTS (SELECT 1 FROM voice_sessions WHERE id = session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete chunks for their sessions" ON voice_audio_chunks FOR DELETE USING (
    EXISTS (SELECT 1 FROM voice_sessions WHERE id = session_id AND user_id = auth.uid())
);

-- Enable RLS on voice_plan_dependencies
ALTER TABLE voice_plan_dependencies ENABLE ROW LEVEL SECURITY;

-- Voice plan dependencies RLS policies (inherited from session)
CREATE POLICY "Users can view dependencies from their sessions" ON voice_plan_dependencies FOR SELECT USING (
    EXISTS (SELECT 1 FROM voice_sessions WHERE id = session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert dependencies for their sessions" ON voice_plan_dependencies FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM voice_sessions WHERE id = session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update dependencies for their sessions" ON voice_plan_dependencies FOR UPDATE USING (
    EXISTS (SELECT 1 FROM voice_sessions WHERE id = session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete dependencies for their sessions" ON voice_plan_dependencies FOR DELETE USING (
    EXISTS (SELECT 1 FROM voice_sessions WHERE id = session_id AND user_id = auth.uid())
);

-- Enable RLS on voice_plan_audit
ALTER TABLE voice_plan_audit ENABLE ROW LEVEL SECURITY;

-- Voice audit RLS policies (inherited from session)
CREATE POLICY "Users can view audit from their sessions" ON voice_plan_audit FOR SELECT USING (
    EXISTS (SELECT 1 FROM voice_sessions WHERE id = session_id AND user_id = auth.uid())
);
CREATE POLICY "Service accounts can insert audit records" ON voice_plan_audit FOR INSERT WITH CHECK (
    -- Allow service accounts to insert audit records
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'service')
);

-- Grant permissions
GRANT ALL ON voice_sessions TO authenticated;
GRANT ALL ON voice_audio_chunks TO authenticated;
GRANT ALL ON voice_plan_dependencies TO authenticated;
GRANT SELECT, INSERT ON voice_plan_audit TO authenticated;

-- Grant sequence usage for generated IDs
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMIT;
