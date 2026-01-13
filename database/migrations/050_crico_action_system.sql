-- ============================================================================
-- CRICO: Action & Voice Control Plane Database Schema
-- Migration: 050_crico_action_system.sql
-- Description: Core tables for Crico's action execution, audit, and voice control
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECTION 1: CORE ACTION SYSTEM
-- ============================================================================

-- Action source types
CREATE TYPE crico_action_source AS ENUM (
  'voice',
  'ide', 
  'ui',
  'api',
  'agent',
  'scheduled'
);

-- Authority levels (from least to most powerful)
CREATE TYPE crico_authority_level AS ENUM (
  'read',
  'write',
  'structural',
  'destructive'
);

-- Action scopes
CREATE TYPE crico_action_scope AS ENUM (
  'code',
  'db',
  'tasks',
  'deploy',
  'config',
  'system'
);

-- Action status lifecycle
CREATE TYPE crico_action_status AS ENUM (
  'pending',
  'approved',
  'executing',
  'completed',
  'failed',
  'rolled_back',
  'cancelled'
);

-- Approval levels
CREATE TYPE crico_approval_level AS ENUM (
  'none',
  'user',
  'admin',
  'system'
);

-- Environment types
CREATE TYPE crico_environment AS ENUM (
  'development',
  'staging',
  'production'
);

-- ============================================================================
-- CRICO ACTIONS TABLE
-- The canonical action interface - every action flows through this
-- ============================================================================

CREATE TABLE IF NOT EXISTS crico_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Source & Intent
  source crico_action_source NOT NULL,
  intent TEXT NOT NULL,
  intent_parsed JSONB,  -- Structured intent from parsing
  
  -- Authority Classification
  authority_level crico_authority_level NOT NULL DEFAULT 'read',
  scope crico_action_scope NOT NULL,
  
  -- Execution Plan
  steps JSONB NOT NULL DEFAULT '[]',  -- Array of ActionStep objects
  dependencies UUID[] DEFAULT '{}',   -- Other action IDs that must complete first
  
  -- Safety Metadata
  reversible BOOLEAN NOT NULL DEFAULT true,
  rollback_plan JSONB,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  approval_level crico_approval_level NOT NULL DEFAULT 'none',
  
  -- Confidence & Risk
  confidence DECIMAL(5,4) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  risk_score DECIMAL(5,4) NOT NULL DEFAULT 0.5 CHECK (risk_score >= 0 AND risk_score <= 1),
  
  -- Status & Timing
  status crico_action_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  executed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Context
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  environment crico_environment NOT NULL DEFAULT 'development',
  
  -- Result
  result JSONB,
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes for common queries
CREATE INDEX idx_crico_actions_user ON crico_actions(user_id);
CREATE INDEX idx_crico_actions_status ON crico_actions(status);
CREATE INDEX idx_crico_actions_source ON crico_actions(source);
CREATE INDEX idx_crico_actions_created ON crico_actions(created_at DESC);
CREATE INDEX idx_crico_actions_scope ON crico_actions(scope);

-- ============================================================================
-- CRICO ACTION STEPS TABLE
-- Individual steps within an action for granular tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS crico_action_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_id UUID NOT NULL REFERENCES crico_actions(id) ON DELETE CASCADE,
  
  -- Step details
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL,  -- 'query', 'mutation', 'file_write', 'api_call', 'notification'
  target TEXT NOT NULL,
  payload JSONB,
  
  -- Validation
  validation_rules JSONB DEFAULT '[]',
  
  -- Execution
  timeout_ms INTEGER DEFAULT 30000,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Status
  status crico_action_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Result
  result JSONB,
  error_message TEXT,
  
  UNIQUE(action_id, step_order)
);

CREATE INDEX idx_crico_action_steps_action ON crico_action_steps(action_id);

-- ============================================================================
-- SECTION 2: VOICE CONTROL SYSTEM
-- ============================================================================

-- Voice command status
CREATE TYPE crico_voice_status AS ENUM (
  'captured',
  'parsed',
  'validating',
  'awaiting_confirmation',
  'confirmed',
  'executing',
  'completed',
  'failed',
  'cancelled'
);

-- Voice commands table
CREATE TABLE IF NOT EXISTS crico_voice_commands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Transcript
  transcript_id TEXT UNIQUE,
  raw_transcript TEXT NOT NULL,
  stt_confidence DECIMAL(5,4) CHECK (stt_confidence >= 0 AND stt_confidence <= 1),
  
  -- Parsed intent
  parsed_intent JSONB,
  intent_confidence DECIMAL(5,4) CHECK (intent_confidence >= 0 AND intent_confidence <= 1),
  
  -- Confirmation
  confirmation_required BOOLEAN NOT NULL DEFAULT true,
  confirmation_received BOOLEAN DEFAULT false,
  confirmation_transcript TEXT,
  confirmation_at TIMESTAMPTZ,
  
  -- Clarification
  clarification_needed BOOLEAN DEFAULT false,
  clarification_prompt TEXT,
  clarification_response TEXT,
  
  -- Associated action
  action_id UUID REFERENCES crico_actions(id),
  
  -- Status
  status crico_voice_status NOT NULL DEFAULT 'captured',
  
  -- Context
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  
  -- Audio (optional - hash only for privacy)
  audio_hash TEXT,  -- SHA-256 of audio if retained
  audio_duration_ms INTEGER,
  
  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_crico_voice_commands_user ON crico_voice_commands(user_id);
CREATE INDEX idx_crico_voice_commands_status ON crico_voice_commands(status);
CREATE INDEX idx_crico_voice_commands_created ON crico_voice_commands(created_at DESC);

-- ============================================================================
-- SECTION 3: AUDIT TRAIL (APPEND-ONLY)
-- ============================================================================

-- Audit event types
CREATE TYPE crico_audit_event_type AS ENUM (
  'action_created',
  'action_approved',
  'action_rejected',
  'action_executed',
  'action_completed',
  'action_failed',
  'action_rolled_back',
  'voice_captured',
  'voice_parsed',
  'voice_confirmed',
  'voice_rejected',
  'agent_invoked',
  'agent_completed',
  'suggestion_created',
  'suggestion_accepted',
  'suggestion_dismissed',
  'alignment_check',
  'drift_detected',
  'safety_violation'
);

-- Immutable audit log
CREATE TABLE IF NOT EXISTS crico_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Event
  event_type crico_audit_event_type NOT NULL,
  event_data JSONB NOT NULL,
  
  -- References
  action_id UUID REFERENCES crico_actions(id),
  voice_command_id UUID REFERENCES crico_voice_commands(id),
  
  -- Context
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  environment crico_environment NOT NULL,
  
  -- Location
  ip_address INET,
  user_agent TEXT,
  
  -- Timing (immutable)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Integrity
  checksum TEXT NOT NULL  -- SHA-256 of event_data for tamper detection
);

-- Append-only trigger - prevent updates and deletes
CREATE OR REPLACE FUNCTION crico_audit_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Audit log is immutable. Updates and deletes are not allowed.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crico_audit_immutable_trigger
  BEFORE UPDATE OR DELETE ON crico_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION crico_audit_immutable();

-- Indexes for audit queries
CREATE INDEX idx_crico_audit_log_action ON crico_audit_log(action_id);
CREATE INDEX idx_crico_audit_log_user ON crico_audit_log(user_id);
CREATE INDEX idx_crico_audit_log_type ON crico_audit_log(event_type);
CREATE INDEX idx_crico_audit_log_created ON crico_audit_log(created_at DESC);

-- ============================================================================
-- SECTION 4: AGENT SYSTEM
-- ============================================================================

-- Agent types
CREATE TYPE crico_agent_type AS ENUM (
  'conductor',
  'planner',
  'code_auditor',
  'test_architect',
  'schema_integrity',
  'ux_coherence',
  'risk_regression',
  'documentation',
  'memory'
);

-- Agent status
CREATE TYPE crico_agent_status AS ENUM (
  'idle',
  'analyzing',
  'suggesting',
  'executing',
  'waiting',
  'error'
);

-- Agent registry
CREATE TABLE IF NOT EXISTS crico_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identity
  agent_type crico_agent_type NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',
  
  -- Configuration
  config JSONB DEFAULT '{}',
  triggers JSONB DEFAULT '[]',  -- What triggers this agent
  
  -- Status
  status crico_agent_status NOT NULL DEFAULT 'idle',
  last_run_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  
  -- Metrics
  total_runs INTEGER DEFAULT 0,
  successful_runs INTEGER DEFAULT 0,
  average_confidence DECIMAL(5,4) DEFAULT 0.5,
  
  -- Enabled
  enabled BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent invocations (runs)
CREATE TABLE IF NOT EXISTS crico_agent_invocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Agent reference
  agent_id UUID NOT NULL REFERENCES crico_agents(id),
  agent_type crico_agent_type NOT NULL,
  
  -- Trigger
  trigger_type TEXT NOT NULL,  -- 'file_save', 'commit', 'schedule', 'manual', 'voice'
  trigger_context JSONB,
  
  -- Input
  input_data JSONB,
  
  -- Execution
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Output
  output_data JSONB,
  claims JSONB DEFAULT '[]',  -- Array of claims with confidence
  suggestions JSONB DEFAULT '[]',
  
  -- Confidence
  overall_confidence DECIMAL(5,4),
  methodology TEXT,
  
  -- Status
  status crico_agent_status NOT NULL DEFAULT 'analyzing',
  error_message TEXT,
  
  -- Context
  user_id UUID REFERENCES auth.users(id),
  action_id UUID REFERENCES crico_actions(id)
);

CREATE INDEX idx_crico_agent_invocations_agent ON crico_agent_invocations(agent_id);
CREATE INDEX idx_crico_agent_invocations_type ON crico_agent_invocations(agent_type);
CREATE INDEX idx_crico_agent_invocations_started ON crico_agent_invocations(started_at DESC);

-- ============================================================================
-- SECTION 5: SUGGESTIONS SYSTEM
-- ============================================================================

-- Suggestion priority
CREATE TYPE crico_suggestion_priority AS ENUM (
  'p0',  -- Critical - Fix now
  'p1',  -- High - This sprint
  'p2',  -- Medium - Backlog
  'p3'   -- Low - Someday
);

-- Suggestion category
CREATE TYPE crico_suggestion_category AS ENUM (
  'architectural_simplification',
  'test_gap',
  'performance_risk',
  'ux_inconsistency',
  'over_engineering',
  'under_engineering',
  'dead_code',
  'naming_drift',
  'concept_duplication',
  'schema_drift',
  'type_mismatch',
  'security_risk',
  'doc_stale'
);

-- Suggestion status
CREATE TYPE crico_suggestion_status AS ENUM (
  'pending',
  'viewed',
  'accepted',
  'dismissed',
  'dismissed_type',  -- Dismissed all of this type
  'expired',
  'auto_fixed'
);

-- Suggestions table
CREATE TABLE IF NOT EXISTS crico_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Classification
  category crico_suggestion_category NOT NULL,
  priority crico_suggestion_priority NOT NULL DEFAULT 'p2',
  
  -- Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  rationale TEXT,
  
  -- Location
  file_path TEXT,
  line_start INTEGER,
  line_end INTEGER,
  symbol_name TEXT,
  
  -- Fix
  fix_type TEXT,  -- 'auto', 'guided', 'manual'
  fix_preview TEXT,
  fix_changes JSONB,
  
  -- Confidence & Impact
  confidence DECIMAL(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  impact_score DECIMAL(5,4) DEFAULT 0.5,
  effort_score DECIMAL(5,4) DEFAULT 0.5,
  
  -- Status
  status crico_suggestion_status NOT NULL DEFAULT 'pending',
  
  -- User interaction
  viewed_at TIMESTAMPTZ,
  actioned_at TIMESTAMPTZ,
  user_feedback TEXT,
  
  -- Source
  agent_id UUID REFERENCES crico_agents(id),
  agent_invocation_id UUID REFERENCES crico_agent_invocations(id),
  
  -- Lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  suppressed_until TIMESTAMPTZ,
  
  -- Context
  user_id UUID REFERENCES auth.users(id),
  project_id UUID,  -- Reference to project if applicable
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  related_suggestions UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_crico_suggestions_user ON crico_suggestions(user_id);
CREATE INDEX idx_crico_suggestions_status ON crico_suggestions(status);
CREATE INDEX idx_crico_suggestions_priority ON crico_suggestions(priority);
CREATE INDEX idx_crico_suggestions_category ON crico_suggestions(category);
CREATE INDEX idx_crico_suggestions_file ON crico_suggestions(file_path);
CREATE INDEX idx_crico_suggestions_created ON crico_suggestions(created_at DESC);

-- ============================================================================
-- SECTION 6: ALIGNMENT & DRIFT DETECTION
-- ============================================================================

-- Alignment axis types
CREATE TYPE crico_alignment_axis AS ENUM (
  'ui_api_db',
  'spec_implementation',
  'test_behavior',
  'docs_reality'
);

-- Drift severity
CREATE TYPE crico_drift_severity AS ENUM (
  'info',
  'low',
  'medium',
  'high',
  'critical'
);

-- Alignment checks table
CREATE TABLE IF NOT EXISTS crico_alignment_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- What was checked
  axis crico_alignment_axis NOT NULL,
  scope TEXT NOT NULL,  -- e.g., 'users table', 'auth module'
  
  -- Check details
  check_type TEXT NOT NULL,
  source_artifact TEXT,  -- e.g., 'migrations/001.sql'
  target_artifact TEXT,  -- e.g., 'types/user.ts'
  
  -- Result
  aligned BOOLEAN NOT NULL,
  drift_severity crico_drift_severity,
  
  -- Details
  mismatches JSONB DEFAULT '[]',  -- Array of specific mismatches
  recommendations JSONB DEFAULT '[]',
  
  -- Confidence
  confidence DECIMAL(5,4) NOT NULL,
  
  -- Timing
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Context
  user_id UUID REFERENCES auth.users(id),
  agent_invocation_id UUID REFERENCES crico_agent_invocations(id)
);

CREATE INDEX idx_crico_alignment_checks_axis ON crico_alignment_checks(axis);
CREATE INDEX idx_crico_alignment_checks_aligned ON crico_alignment_checks(aligned);
CREATE INDEX idx_crico_alignment_checks_severity ON crico_alignment_checks(drift_severity);
CREATE INDEX idx_crico_alignment_checks_checked ON crico_alignment_checks(checked_at DESC);

-- ============================================================================
-- SECTION 7: TRUST & CONFIDENCE CALIBRATION
-- ============================================================================

-- User trust profile
CREATE TABLE IF NOT EXISTS crico_user_trust (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  
  -- Overall trust level
  trust_level TEXT NOT NULL DEFAULT 'new',  -- 'new', 'learning', 'calibrated'
  
  -- Confidence thresholds (personalized)
  min_confidence_auto DECIMAL(5,4) DEFAULT 0.90,
  min_confidence_suggest DECIMAL(5,4) DEFAULT 0.70,
  min_confidence_show DECIMAL(5,4) DEFAULT 0.40,
  
  -- Category-specific adjustments
  category_adjustments JSONB DEFAULT '{}',  -- category -> adjustment factor
  
  -- Statistics
  suggestions_shown INTEGER DEFAULT 0,
  suggestions_accepted INTEGER DEFAULT 0,
  suggestions_dismissed INTEGER DEFAULT 0,
  suggestions_disagreed INTEGER DEFAULT 0,
  
  -- Auto-apply preferences
  auto_apply_enabled BOOLEAN DEFAULT false,
  auto_apply_categories TEXT[] DEFAULT '{}',
  
  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ
);

CREATE INDEX idx_crico_user_trust_user ON crico_user_trust(user_id);

-- ============================================================================
-- SECTION 8: DB WRITE POLICIES
-- ============================================================================

-- Database write policies per environment
CREATE TABLE IF NOT EXISTS crico_db_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Environment
  environment crico_environment NOT NULL UNIQUE,
  
  -- Allowed modes
  allowed_modes TEXT[] NOT NULL DEFAULT ARRAY['observe'],
  
  -- Voice control
  voice_allowed BOOLEAN NOT NULL DEFAULT false,
  
  -- Approval requirements
  requires_confirmation BOOLEAN NOT NULL DEFAULT true,
  requires_2fa BOOLEAN NOT NULL DEFAULT false,
  
  -- Audit level
  audit_level TEXT NOT NULL DEFAULT 'basic',  -- 'basic', 'detailed', 'forensic'
  
  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default policies
INSERT INTO crico_db_policies (environment, allowed_modes, voice_allowed, requires_confirmation, requires_2fa, audit_level)
VALUES 
  ('development', ARRAY['observe', 'propose', 'apply'], true, false, false, 'basic'),
  ('staging', ARRAY['observe', 'propose', 'apply'], true, true, false, 'detailed'),
  ('production', ARRAY['observe', 'propose'], false, true, true, 'forensic')
ON CONFLICT (environment) DO NOTHING;

-- ============================================================================
-- SECTION 9: SAFETY INVARIANTS
-- ============================================================================

-- Safety invariants configuration
CREATE TABLE IF NOT EXISTS crico_safety_invariants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Invariant definition
  invariant_key TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Enforcement
  enforcement_level TEXT NOT NULL DEFAULT 'block',  -- 'warn', 'block', 'audit'
  
  -- Exceptions (if any)
  exceptions JSONB DEFAULT '[]',
  
  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default safety invariants
INSERT INTO crico_safety_invariants (invariant_key, description, enabled, enforcement_level)
VALUES 
  ('no_direct_prod_mutation', 'All prod changes go through staging first', true, 'block'),
  ('no_voice_prod_deploy', 'Voice cannot trigger production deployments', true, 'block'),
  ('no_data_deletion_without_backup', 'Backup required before any data deletion', true, 'block'),
  ('no_schema_change_without_migration', 'All schema changes must use migrations', true, 'block'),
  ('no_action_without_audit', 'Every action must be logged to audit trail', true, 'block'),
  ('no_audit_modification', 'Audit log is append-only', true, 'block'),
  ('no_override_of_human_decision', 'Human rejection is final', true, 'block'),
  ('always_allow_cancel', 'User can always cancel any operation', true, 'block'),
  ('no_low_confidence_execution', 'Block actions with <60% confidence', true, 'block'),
  ('no_ambiguous_destructive_action', 'Require confirmation for unclear destructive actions', true, 'block')
ON CONFLICT (invariant_key) DO NOTHING;

-- ============================================================================
-- SECTION 10: HELPER FUNCTIONS
-- ============================================================================

-- Function to create an audit log entry with checksum
CREATE OR REPLACE FUNCTION crico_create_audit_entry(
  p_event_type crico_audit_event_type,
  p_event_data JSONB,
  p_action_id UUID DEFAULT NULL,
  p_voice_command_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_environment crico_environment DEFAULT 'development',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_checksum TEXT;
BEGIN
  -- Generate checksum for integrity
  v_checksum := encode(digest(p_event_data::TEXT, 'sha256'), 'hex');
  
  INSERT INTO crico_audit_log (
    event_type, event_data, action_id, voice_command_id,
    user_id, session_id, environment, ip_address, user_agent, checksum
  ) VALUES (
    p_event_type, p_event_data, p_action_id, p_voice_command_id,
    p_user_id, p_session_id, p_environment, p_ip_address, p_user_agent, v_checksum
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if an action passes authority gates
CREATE OR REPLACE FUNCTION crico_check_authority_gates(
  p_action_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_action RECORD;
  v_policy RECORD;
  v_result JSONB;
  v_gates JSONB := '[]'::JSONB;
  v_passed BOOLEAN := true;
BEGIN
  -- Get action
  SELECT * INTO v_action FROM crico_actions WHERE id = p_action_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('passed', false, 'error', 'Action not found');
  END IF;
  
  -- Get policy for environment
  SELECT * INTO v_policy FROM crico_db_policies WHERE environment = v_action.environment;
  
  -- Gate 1: Source verification (simplified - would check auth in real impl)
  v_gates := v_gates || jsonb_build_object(
    'gate', 'source_verification',
    'passed', v_action.user_id IS NOT NULL,
    'reason', CASE WHEN v_action.user_id IS NULL THEN 'No authenticated user' ELSE 'User authenticated' END
  );
  IF v_action.user_id IS NULL THEN v_passed := false; END IF;
  
  -- Gate 2: Intent validation
  v_gates := v_gates || jsonb_build_object(
    'gate', 'intent_validation',
    'passed', v_action.confidence >= 0.6,
    'reason', CASE WHEN v_action.confidence < 0.6 THEN 'Confidence too low' ELSE 'Intent confidence acceptable' END
  );
  IF v_action.confidence < 0.6 THEN v_passed := false; END IF;
  
  -- Gate 3: Risk assessment
  v_gates := v_gates || jsonb_build_object(
    'gate', 'risk_assessment',
    'passed', v_action.risk_score < 0.8 OR v_action.reversible,
    'reason', CASE WHEN v_action.risk_score >= 0.8 AND NOT v_action.reversible 
              THEN 'High risk non-reversible action' ELSE 'Risk acceptable' END
  );
  IF v_action.risk_score >= 0.8 AND NOT v_action.reversible THEN v_passed := false; END IF;
  
  -- Gate 4: Approval check
  v_gates := v_gates || jsonb_build_object(
    'gate', 'approval',
    'passed', NOT v_action.requires_approval OR v_action.approved_at IS NOT NULL,
    'reason', CASE WHEN v_action.requires_approval AND v_action.approved_at IS NULL 
              THEN 'Approval required' ELSE 'Approval not needed or granted' END
  );
  IF v_action.requires_approval AND v_action.approved_at IS NULL THEN v_passed := false; END IF;
  
  -- Gate 5: Execution safety (check environment policy)
  v_gates := v_gates || jsonb_build_object(
    'gate', 'execution_safety',
    'passed', v_action.source != 'voice' OR COALESCE(v_policy.voice_allowed, false),
    'reason', CASE WHEN v_action.source = 'voice' AND NOT COALESCE(v_policy.voice_allowed, false)
              THEN 'Voice not allowed in this environment' ELSE 'Execution conditions met' END
  );
  IF v_action.source = 'voice' AND NOT COALESCE(v_policy.voice_allowed, false) THEN v_passed := false; END IF;
  
  RETURN jsonb_build_object(
    'passed', v_passed,
    'gates', v_gates,
    'action_id', p_action_id
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 11: ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all Crico tables
ALTER TABLE crico_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crico_action_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE crico_voice_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE crico_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE crico_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE crico_agent_invocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crico_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crico_alignment_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crico_user_trust ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crico_actions
CREATE POLICY "Users can view their own actions"
  ON crico_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create actions"
  ON crico_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their pending actions"
  ON crico_actions FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('pending', 'approved'));

-- RLS Policies for crico_suggestions
CREATE POLICY "Users can view their suggestions"
  ON crico_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their suggestion status"
  ON crico_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for crico_user_trust
CREATE POLICY "Users can view their trust profile"
  ON crico_user_trust FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their trust profile"
  ON crico_user_trust FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for crico_audit_log (read-only for users)
CREATE POLICY "Users can view their audit entries"
  ON crico_audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for crico_voice_commands
CREATE POLICY "Users can view their voice commands"
  ON crico_voice_commands FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create voice commands"
  ON crico_voice_commands FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Agents are readable by all authenticated users
CREATE POLICY "Authenticated users can view agents"
  ON crico_agents FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Agent invocations viewable by user
CREATE POLICY "Users can view their agent invocations"
  ON crico_agent_invocations FOR SELECT
  USING (auth.uid() = user_id);

-- Alignment checks viewable by user
CREATE POLICY "Users can view their alignment checks"
  ON crico_alignment_checks FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- SECTION 12: INSERT DEFAULT AGENTS
-- ============================================================================

INSERT INTO crico_agents (agent_type, name, description, config, triggers)
VALUES 
  ('conductor', 'Conductor Agent', 'Routes tasks to specialists, resolves disagreements, synthesizes recommendations', 
   '{"priority": 1}', '["manual", "complex_task"]'),
  ('planner', 'Planner Agent', 'Breaks complex tasks into verifiable steps',
   '{"max_steps": 20}', '["new_feature", "refactor_request"]'),
  ('code_auditor', 'Code Auditor Agent', 'Continuous code quality and pattern enforcement',
   '{"patterns": []}', '["file_save", "commit", "pr"]'),
  ('test_architect', 'Test Architect Agent', 'Ensures test coverage matches risk',
   '{"min_coverage": 0.7}', '["code_change", "pre_merge"]'),
  ('schema_integrity', 'Schema Integrity Agent', 'Maintains database-code alignment',
   '{"check_types": true}', '["migration_change", "type_error"]'),
  ('ux_coherence', 'UX Coherence Agent', 'Detects UI-backend misalignment',
   '{"check_forms": true}', '["frontend_change", "api_change"]'),
  ('risk_regression', 'Risk & Regression Agent', 'Predicts what might break',
   '{"history_window": 30}', '["commit", "pre_deploy"]'),
  ('documentation', 'Documentation Agent', 'Maintains institutional knowledge',
   '{"freshness_days": 30}', '["code_change", "schedule"]'),
  ('memory', 'Memory Agent', 'Long-term context and learning',
   '{"retention_days": 365}', '["session_end", "project_milestone"]')
ON CONFLICT (agent_type) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE crico_actions IS 'Core action table - every action in Crico flows through this';
COMMENT ON TABLE crico_voice_commands IS 'Voice command capture and processing';
COMMENT ON TABLE crico_audit_log IS 'Immutable audit trail for all Crico operations';
COMMENT ON TABLE crico_agents IS 'Registry of Crico AI agents';
COMMENT ON TABLE crico_suggestions IS 'Proactive improvement suggestions from agents';
COMMENT ON TABLE crico_alignment_checks IS 'UI/API/DB alignment verification results';
COMMENT ON TABLE crico_user_trust IS 'Per-user trust calibration and preferences';
COMMENT ON TABLE crico_db_policies IS 'Database write policies per environment';
COMMENT ON TABLE crico_safety_invariants IS 'Safety rules that are never violated';
