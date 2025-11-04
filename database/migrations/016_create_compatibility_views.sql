-- Compatibility Views for Voice Planning Migration
-- These views ensure existing applications continue working during the migration
-- Part of Phase 1: Backward Compatibility Layer

BEGIN;

-- Create a view that combines legacy projects with voice-generated projects
-- This maintains the original projects table structure while including voice data
CREATE OR REPLACE VIEW projects_compat AS
SELECT 
    -- Original project columns
    p.id,
    p.name,
    p.description,
    p.organization_id,
    p.status,
    p.priority,
    p.start_date,
    p.due_date,
    p.progress_percentage,
    p.created_at,
    p.updated_at,
    p.created_by,
    p.updated_by,
    
    -- Voice-related columns (as additional fields)
    COALESCE(p.voice_session_id, vs.id) as voice_session_id,
    COALESCE(p.voice_generated, false) as voice_generated,
    p.voice_confidence,
    p.voice_metadata,
    p.voice_commit_status,
    p.voice_committed_at,
    
    -- Voice session details for easy access
    vs.title as voice_session_title,
    vs.description as voice_session_description,
    vs.language as voice_session_language,
    vs.status as voice_session_status,
    vs.started_at as voice_session_started_at,
    vs.ended_at as voice_session_ended_at,
    vs.transcript as voice_session_transcript,
    vs.transcript_confidence as voice_session_transcript_confidence,
    vs.plan_status as voice_plan_status,
    vs.plan_confidence as voice_plan_confidence,
    vs.plan_generated_at as voice_plan_generated_at,
    
    -- Computed fields
    CASE 
        WHEN p.voice_generated THEN 'voice_generated'
        ELSE 'manual'
    END as creation_method,
    
    CASE 
        WHEN p.voice_commit_status = 'committed' THEN true
        ELSE false
    END as is_voice_committed,
    
    -- Voice quality metrics
    CASE 
        WHEN p.voice_confidence >= 0.9 THEN 'high'
        WHEN p.voice_confidence >= 0.7 THEN 'medium'
        WHEN p.voice_confidence >= 0.5 THEN 'low'
        ELSE 'very_low'
    END as voice_quality_rating

FROM projects p
LEFT JOIN voice_sessions vs ON p.voice_session_id = vs.id;

-- Create a view that combines legacy milestones with voice-generated milestones
-- This maintains the original milestones table structure while including voice data
CREATE OR REPLACE VIEW milestones_compat AS
SELECT 
    -- Original milestone columns
    m.id,
    m.name,
    m.description,
    m.project_id,
    m.status,
    m.progress_percentage,
    m.deadline,
    m.due_date,
    m.completion_date,
    m.created_at,
    m.updated_at,
    m.created_by,
    m.updated_by,
    
    -- Voice-related columns
    COALESCE(m.voice_session_id, vs.id) as voice_session_id,
    COALESCE(m.voice_generated, false) as voice_generated,
    m.voice_task_id,
    m.voice_confidence,
    m.voice_metadata,
    m.voice_commit_status,
    m.voice_committed_at,
    
    -- Voice session details
    vs.title as voice_session_title,
    vs.language as voice_session_language,
    vs.started_at as voice_session_started_at,
    vs.transcript as voice_session_transcript,
    vs.plan_confidence as voice_plan_confidence,
    
    -- Plan JSON reference (extract milestone from plan if voice-generated)
    CASE 
        WHEN m.voice_generated AND vs.plan_json IS NOT NULL THEN
            (vs.plan_json->'milestones')::jsonb 
            -> (SELECT idx FROM generate_series(0, 100) idx 
                WHERE (vs.plan_json->'milestones')::jsonb->idx->>'id' = m.voice_task_id LIMIT 1)
        ELSE NULL
    END as voice_plan_milestone,
    
    -- Computed fields
    CASE 
        WHEN m.voice_generated THEN 'voice_generated'
        ELSE 'manual'
    END as creation_method,
    
    CASE 
        WHEN m.voice_commit_status = 'committed' THEN true
        ELSE false
    END as is_voice_committed,

FROM milestones m
LEFT JOIN voice_sessions vs ON m.voice_session_id = vs.id;

-- Create a view that combines legacy tasks with voice-generated tasks
-- This maintains the original tasks table structure while including voice data
CREATE OR REPLACE VIEW tasks_compat AS
SELECT 
    -- Original task columns
    t.id,
    t.title,
    t.description,
    t.project_id,
    t.milestone_id,
    t.status,
    t.priority,
    t.assignee_id,
    t.estimated_hours,
    t.actual_hours,
    t.due_date,
    t.created_at,
    t.updated_at,
    t.created_by,
    t.updated_by,
    
    -- Voice-related columns
    COALESCE(t.voice_session_id, vs.id) as voice_session_id,
    COALESCE(t.voice_generated, false) as voice_generated,
    t.voice_task_id,
    t.voice_milestone_id,
    t.voice_confidence,
    t.voice_metadata,
    t.voice_dependencies,
    t.voice_commit_status,
    t.voice_committed_at,
    
    -- Voice session details
    vs.title as voice_session_title,
    vs.language as voice_session_language,
    vs.started_at as voice_session_started_at,
    vs.transcript as voice_session_transcript,
    vs.plan_confidence as voice_plan_confidence,
    
    -- Plan JSON reference (extract task from plan if voice-generated)
    CASE 
        WHEN t.voice_generated AND vs.plan_json IS NOT NULL THEN
            (vs.plan_json->'tasks')::jsonb 
            -> (SELECT idx FROM generate_series(0, 1000) idx 
                WHERE (vs.plan_json->'tasks')::jsonb->idx->>'id' = t.voice_task_id LIMIT 1)
        ELSE NULL
    END as voice_plan_task,
    
    -- Voice dependency resolution (convert voice task IDs to actual task IDs)
    CASE 
        WHEN t.voice_generated AND t.voice_dependencies IS NOT NULL THEN
            (SELECT jsonb_agg(
                CASE 
                    WHEN vt.id IS NOT NULL THEN vt.id::text
                    ELSE dep_task_id
                END
            ) 
            FROM jsonb_array_elements_text(t.voice_dependencies) as dep_task_id
            LEFT JOIN tasks vt ON vt.voice_task_id = dep_task_id AND vt.voice_session_id = t.voice_session_id)
        ELSE NULL
    END as resolved_dependencies,
    
    -- Computed fields
    CASE 
        WHEN t.voice_generated THEN 'voice_generated'
        ELSE 'manual'
    END as creation_method,
    
    CASE 
        WHEN t.voice_commit_status = 'committed' THEN true
        ELSE false
    END as is_voice_committed,
    
    -- Voice quality metrics
    CASE 
        WHEN t.voice_confidence >= 0.9 THEN 'high'
        WHEN t.voice_confidence >= 0.7 THEN 'medium'
        WHEN t.voice_confidence >= 0.5 THEN 'low'
        ELSE 'very_low'
    END as voice_quality_rating,
    
    -- Dependency count
    CASE 
        WHEN t.voice_dependencies IS NOT NULL THEN jsonb_array_length(t.voice_dependencies)
        ELSE 0
    END as voice_dependency_count

FROM tasks t
LEFT JOIN voice_sessions vs ON t.voice_session_id = vs.id;

-- Create a comprehensive view for voice sessions with all related data
-- This provides a unified view of voice sessions and their generated content
CREATE OR REPLACE VIEW voice_sessions_with_content AS
SELECT 
    -- Voice session columns
    vs.id,
    vs.organization_id,
    vs.user_id,
    vs.title,
    vs.description,
    vs.language,
    vs.status,
    vs.max_duration_seconds,
    vs.audio_format,
    vs.sample_rate,
    vs.noise_reduction_enabled,
    vs.started_at,
    vs.ended_at,
    vs.last_activity_at,
    vs.transcription_status,
    vs.transcript,
    vs.transcript_confidence,
    vs.transcribed_at,
    vs.transcription_model,
    vs.plan_status,
    vs.plan_json,
    vs.plan_confidence,
    vs.plan_generated_at,
    vs.plan_model,
    vs.commit_status,
    vs.commit_errors,
    vs.committed_at,
    vs.created_at,
    vs.updated_at,
    vs.created_by,
    vs.updated_by,
    vs.feature_flags,
    vs.experimental_settings,
    vs.metadata,
    
    -- Aggregated counts from plan JSON
    CASE 
        WHEN vs.plan_json IS NOT NULL THEN
            jsonb_array_length((vs.plan_json->'milestones')::jsonb)
        ELSE 0
    END as plan_milestone_count,
    
    CASE 
        WHEN vs.plan_json IS NOT NULL THEN
            jsonb_array_length((vs.plan_json->'tasks')::jsonb)
        ELSE 0
    END as plan_task_count,
    
    -- Committed content counts
    (SELECT COUNT(*) FROM projects p WHERE p.voice_session_id = vs.id AND p.voice_commit_status = 'committed') as committed_projects_count,
    (SELECT COUNT(*) FROM milestones m WHERE m.voice_session_id = vs.id AND m.voice_commit_status = 'committed') as committed_milestones_count,
    (SELECT COUNT(*) FROM tasks t WHERE t.voice_session_id = vs.id AND t.voice_commit_status = 'committed') as committed_tasks_count,
    
    -- Audio chunks count and total duration
    (SELECT COUNT(*) FROM voice_audio_chunks vac WHERE vac.session_id = vs.id) as audio_chunks_count,
    (SELECT COALESCE(SUM(vac.duration_ms), 0) FROM voice_audio_chunks vac WHERE vac.session_id = vs.id) as total_audio_duration_ms,
    
    -- Dependencies count
    (SELECT COUNT(*) FROM voice_plan_dependencies vpd WHERE vpd.session_id = vs.id) as plan_dependencies_count,
    
    -- Audit trail count
    (SELECT COUNT(*) FROM voice_plan_audit vpa WHERE vpa.session_id = vs.id) as audit_entries_count,
    
    -- Session duration
    CASE 
        WHEN vs.ended_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (vs.ended_at - vs.started_at))::integer
        ELSE
            EXTRACT(EPOCH FROM (NOW() - vs.started_at))::integer
    END as session_duration_seconds,
    
    -- Processing times
    CASE 
        WHEN vs.transcribed_at IS NOT NULL AND vs.started_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (vs.transcribed_at - vs.started_at))::integer
        ELSE NULL
    END as transcription_time_seconds,
    
    CASE 
        WHEN vs.plan_generated_at IS NOT NULL AND vs.started_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (vs.plan_generated_at - vs.started_at))::integer
        ELSE NULL
    END as plan_generation_time_seconds,
    
    CASE 
        WHEN vs.committed_at IS NOT NULL AND vs.plan_generated_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (vs.committed_at - vs.plan_generated_at))::integer
        ELSE NULL
    END as commit_time_seconds,
    
    -- Overall session quality
    CASE 
        WHEN vs.plan_confidence >= 0.9 AND vs.transcript_confidence >= 0.9 THEN 'excellent'
        WHEN vs.plan_confidence >= 0.8 AND vs.transcript_confidence >= 0.8 THEN 'good'
        WHEN vs.plan_confidence >= 0.6 AND vs.transcript_confidence >= 0.6 THEN 'fair'
        WHEN vs.plan_confidence >= 0.4 AND vs.transcript_confidence >= 0.4 THEN 'poor'
        ELSE 'very_poor'
    END as overall_quality_rating

FROM voice_sessions vs;

-- Create a view for voice plan dependencies with resolved task references
-- This helps with dependency validation and visualization
CREATE OR REPLACE VIEW voice_plan_dependencies_resolved AS
SELECT 
    -- Original dependency columns
    vpd.id,
    vpd.session_id,
    vpd.depends_on_task_id,
    vpd.dependent_task_id,
    vpd.dependency_type,
    vpd.is_valid,
    vpd.validation_errors,
    vpd.created_at,
    vpd.updated_at,
    
    -- Resolved task references
    dep_task.id as depends_on_task_real_id,
    dep_task.title as depends_on_task_title,
    dep_task.status as depends_on_task_status,
    dep_task.due_date as depends_on_task_due_date,
    
    dep_task_actual.id as dependent_task_real_id,
    dep_task_actual.title as dependent_task_title,
    dep_task_actual.status as dependent_task_status,
    dep_task_actual.due_date as dependent_task_due_date,
    
    -- Session details
    vs.title as session_title,
    vs.status as session_status,
    vs.plan_confidence as session_plan_confidence,
    
    -- Dependency validation
    CASE 
        WHEN dep_task.id IS NULL OR dep_task_actual.id IS NULL THEN false
        WHEN vpd.dependency_type = 'finish_to_start' AND 
             dep_task.due_date > dep_task_actual.due_date THEN false
        ELSE vpd.is_valid
    END as computed_is_valid,
    
    -- Validation error details
    CASE 
        WHEN dep_task.id IS NULL THEN 
            jsonb_build_object('error', 'depends_on_task_not_found', 'task_id', vpd.depends_on_task_id)
        WHEN dep_task_actual.id IS NULL THEN 
            jsonb_build_object('error', 'dependent_task_not_found', 'task_id', vpd.dependent_task_id)
        WHEN vpd.dependency_type = 'finish_to_start' AND 
             dep_task.due_date > dep_task_actual.due_date THEN 
            jsonb_build_object('error', 'date_conflict', 'depends_on_due', dep_task.due_date, 'dependent_due', dep_task_actual.due_date)
        ELSE vpd.validation_errors
    END as computed_validation_errors

FROM voice_plan_dependencies vpd
LEFT JOIN voice_sessions vs ON vpd.session_id = vs.id
LEFT JOIN tasks dep_task ON dep_task.voice_task_id = vpd.depends_on_task_id AND dep_task.voice_session_id = vpd.session_id
LEFT JOIN tasks dep_task_actual ON dep_task_actual.voice_task_id = vpd.dependent_task_id AND dep_task_actual.voice_session_id = vpd.session_id;

-- Create a view for voice audit trail with enhanced details
-- This provides comprehensive audit information for monitoring and debugging
CREATE OR REPLACE VIEW voice_audit_enhanced AS
SELECT 
    -- Original audit columns
    vpa.id,
    vpa.session_id,
    vpa.operation_type,
    vpa.operation_status,
    vpa.operation_data,
    vpa.previous_state,
    vpa.new_state,
    vpa.error_code,
    vpa.error_message,
    vpa.error_details,
    vpa.duration_ms,
    vpa.processing_steps,
    vpa.user_id,
    vpa.service_name,
    vpa.feature_flags,
    vpa.started_at,
    vpa.completed_at,
    vpa.metadata,
    
    -- Session details
    vs.title as session_title,
    vs.status as session_status,
    vs.language as session_language,
    vs.plan_confidence as session_plan_confidence,
    vs.transcript_confidence as session_transcript_confidence,
    
    -- User details
    auth_user.raw_user_meta_data->>'name' as user_name,
    auth_user.raw_user_meta_data->>'email' as user_email,
    
    -- Operation context
    CASE 
        WHEN vpa.operation_type = 'created' THEN 'Voice session created'
        WHEN vpa.operation_type = 'updated' THEN 'Voice session updated'
        WHEN vpa.operation_type = 'committed' THEN 'Plan committed to database'
        WHEN vpa.operation_type = 'rollback' THEN 'Changes rolled back'
        WHEN vpa.operation_type = 'validated' THEN 'Plan validated'
        WHEN vpa.operation_type = 'failed' THEN 'Operation failed'
        ELSE vpa.operation_type
    END as operation_description,
    
    -- Performance classification
    CASE 
        WHEN vpa.duration_ms <= 1000 THEN 'fast'
        WHEN vpa.duration_ms <= 5000 THEN 'normal'
        WHEN vpa.duration_ms <= 15000 THEN 'slow'
        ELSE 'very_slow'
    END as performance_category,
    
    -- Error severity
    CASE 
        WHEN vpa.error_code IS NULL THEN 'none'
        WHEN vpa.error_code LIKE '%TIMEOUT%' OR vpa.error_code LIKE '%FAILED%' THEN 'high'
        WHEN vpa.error_code LIKE '%ERROR%' THEN 'medium'
        ELSE 'low'
    END as error_severity

FROM voice_plan_audit vpa
LEFT JOIN voice_sessions vs ON vpa.session_id = vs.id
LEFT JOIN auth.users auth_user ON vpa.user_id = auth_user.id;

-- Set up permissions for compatibility views
-- These views should have the same permissions as the underlying tables

GRANT SELECT ON projects_compat TO authenticated;
GRANT SELECT ON milestones_compat TO authenticated;
GRANT SELECT ON tasks_compat TO authenticated;
GRANT SELECT ON voice_sessions_with_content TO authenticated;
GRANT SELECT ON voice_plan_dependencies_resolved TO authenticated;
GRANT SELECT ON voice_audit_enhanced TO authenticated;

-- Enable Row Level Security on compatibility views where appropriate
-- These inherit security from the underlying tables

ALTER TABLE projects_compat ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones_compat ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks_compat ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for compatibility views (inherited from base tables)
CREATE POLICY "Users can view compatible projects" ON projects_compat FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view compatible milestones" ON milestones_compat FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ))
);

CREATE POLICY "Users can view compatible tasks" ON tasks_compat FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ))
);

-- Create indexes for compatibility views to ensure good performance
-- These are essential since views will be heavily used during migration

CREATE INDEX IF NOT EXISTS idx_projects_compat_org_id ON projects_compat(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_compat_voice_session ON projects_compat(voice_session_id);
CREATE INDEX IF NOT EXISTS idx_projects_compat_creation_method ON projects_compat(creation_method);
CREATE INDEX IF NOT EXISTS idx_projects_compat_voice_quality ON projects_compat(voice_quality_rating);

CREATE INDEX IF NOT EXISTS idx_milestones_compat_project_id ON milestones_compat(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_compat_voice_session ON milestones_compat(voice_session_id);
CREATE INDEX IF NOT EXISTS idx_milestones_compat_creation_method ON milestones_compat(creation_method);

CREATE INDEX IF NOT EXISTS idx_tasks_compat_project_id ON tasks_compat(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_compat_milestone_id ON tasks_compat(milestone_id);
CREATE INDEX IF NOT EXISTS idx_tasks_compat_voice_session ON tasks_compat(voice_session_id);
CREATE INDEX IF NOT EXISTS idx_tasks_compat_creation_method ON tasks_compat(creation_method);
CREATE INDEX IF NOT EXISTS idx_tasks_compat_voice_deps_gin ON tasks_compat USING GIN(resolved_dependencies);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_content_org_id ON voice_sessions_with_content(organization_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_content_user_id ON voice_sessions_with_content(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_content_status ON voice_sessions_with_content(status);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_content_quality ON voice_sessions_with_content(overall_quality_rating);

CREATE INDEX IF NOT EXISTS idx_voice_deps_resolved_session_id ON voice_plan_dependencies_resolved(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_deps_resolved_depends_on ON voice_plan_dependencies_resolved(depends_on_task_real_id);
CREATE INDEX IF NOT EXISTS idx_voice_deps_resolved_dependent ON voice_plan_dependencies_resolved(dependent_task_real_id);
CREATE INDEX IF NOT EXISTS idx_voice_deps_resolved_valid ON voice_plan_dependencies_resolved(computed_is_valid);

CREATE INDEX IF NOT EXISTS idx_voice_audit_enhanced_session_id ON voice_audit_enhanced(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_audit_enhanced_operation ON voice_audit_enhanced(operation_type, operation_status);
CREATE INDEX IF NOT EXISTS idx_voice_audit_enhanced_performance ON voice_audit_enhanced(performance_category);
CREATE INDEX IF NOT EXISTS idx_voice_audit_enhanced_severity ON voice_audit_enhanced(error_severity);

COMMIT;
