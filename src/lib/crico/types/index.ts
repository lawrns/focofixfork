/**
 * CRICO Type Definitions
 * Core types for the Crico action, agent, and voice control systems
 */

// ============================================================================
// ACTION TYPES
// ============================================================================

export type ActionSource = 'voice' | 'ide' | 'ui' | 'api' | 'agent' | 'scheduled';
export type AuthorityLevel = 'read' | 'write' | 'structural' | 'destructive';
export type ActionScope = 'code' | 'db' | 'tasks' | 'deploy' | 'config' | 'system';
export type ActionStatus = 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'rolled_back' | 'cancelled';
export type ApprovalLevel = 'none' | 'user' | 'admin' | 'system';
export type Environment = 'development' | 'staging' | 'production';

export interface ValidationRule {
  type: string;
  params?: Record<string, unknown>;
  message: string;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
}

export interface RollbackPlan {
  steps: ActionStep[];
  automatic: boolean;
  timeout: number;
}

export interface ActionStep {
  id: string;
  type: 'query' | 'mutation' | 'file_write' | 'api_call' | 'notification';
  target: string;
  payload: unknown;
  validation: ValidationRule[];
  timeout: number;
  retryPolicy: RetryPolicy;
}

export interface AuditRecord {
  id: string;
  timestamp: Date;
  eventType: string;
  eventData: Record<string, unknown>;
  userId?: string;
  checksum: string;
}

export interface CricoAction {
  id: string;
  source: ActionSource;
  intent: string;
  intentParsed?: Record<string, unknown>;
  
  authorityLevel: AuthorityLevel;
  scope: ActionScope;
  
  steps: ActionStep[];
  dependencies: string[];
  
  reversible: boolean;
  rollbackPlan?: RollbackPlan;
  requiresApproval: boolean;
  approvalLevel: ApprovalLevel;
  
  confidence: number;
  riskScore: number;
  
  status: ActionStatus;
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  executedAt?: Date;
  completedAt?: Date;
  
  userId?: string;
  sessionId?: string;
  environment: Environment;
  
  result?: unknown;
  errorMessage?: string;
  
  metadata: Record<string, unknown>;
}

// ============================================================================
// VOICE TYPES
// ============================================================================

export type VoiceStatus = 
  | 'captured' 
  | 'parsed' 
  | 'validating' 
  | 'awaiting_confirmation'
  | 'confirmed' 
  | 'executing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface Intent {
  domain: 'task' | 'project' | 'schema' | 'code' | 'deploy' | 'config' | 'system';
  action: string;
  entities: Record<string, unknown>;
  confidence: number;
}

export interface VoiceCommand {
  id: string;
  transcriptId?: string;
  rawTranscript: string;
  sttConfidence: number;
  
  parsedIntent?: Intent;
  intentConfidence?: number;
  
  confirmationRequired: boolean;
  confirmationReceived: boolean;
  confirmationTranscript?: string;
  confirmationAt?: Date;
  
  clarificationNeeded: boolean;
  clarificationPrompt?: string;
  clarificationResponse?: string;
  
  actionId?: string;
  status: VoiceStatus;
  
  userId?: string;
  sessionId?: string;
  
  audioHash?: string;
  audioDurationMs?: number;
  
  createdAt: Date;
  processedAt?: Date;
  
  metadata: Record<string, unknown>;
}

export interface VoiceFeedback {
  type: 'confirmation' | 'progress' | 'completion' | 'error' | 'clarification';
  message: string;
  speakable: string;
  visualData?: unknown;
  
  awaitingResponse: boolean;
  expectedResponses?: string[];
  timeout: number;
}

export const VOICE_RULES = {
  alwaysConfirmDestructive: true,
  requireHighConfidence: 0.85,
  maxScopeWithoutConfirm: 'write' as AuthorityLevel,
  speakBackBeforeExecute: true,
  allowInterrupt: true,
  logAllTranscripts: true,
} as const;

// ============================================================================
// AGENT TYPES
// ============================================================================

export type AgentType = 
  | 'conductor'
  | 'planner'
  | 'code_auditor'
  | 'test_architect'
  | 'schema_integrity'
  | 'ux_coherence'
  | 'risk_regression'
  | 'documentation'
  | 'memory';

export type AgentStatus = 'idle' | 'analyzing' | 'suggesting' | 'executing' | 'waiting' | 'error';

export interface Claim {
  statement: string;
  confidence: number;
  evidence: Evidence[];
  methodology: string;
  falsifiable: boolean;
  verificationSteps?: string[];
}

export interface Evidence {
  type: 'static_analysis' | 'pattern_match' | 'llm_inference' | 'runtime_data' | 'historical';
  source: string;
  data: unknown;
  weight: number;
}

export interface AgentOutput {
  agentType: AgentType;
  claims: Claim[];
  suggestions: Suggestion[];
  confidence: number;
  methodology: string;
  duration: number;
  metadata: Record<string, unknown>;
}

export interface AgentConfig {
  enabled: boolean;
  triggers: string[];
  config: Record<string, unknown>;
}

export interface Agent {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  version: string;
  
  config: AgentConfig;
  status: AgentStatus;
  
  lastRunAt?: Date;
  lastSuccessAt?: Date;
  
  totalRuns: number;
  successfulRuns: number;
  averageConfidence: number;
}

export interface AgentInvocation {
  id: string;
  agentId: string;
  agentType: AgentType;
  
  triggerType: string;
  triggerContext?: Record<string, unknown>;
  
  inputData?: unknown;
  
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  
  outputData?: unknown;
  claims: Claim[];
  suggestions: Suggestion[];
  
  overallConfidence?: number;
  methodology?: string;
  
  status: AgentStatus;
  errorMessage?: string;
  
  userId?: string;
  actionId?: string;
}

// ============================================================================
// SUGGESTION TYPES
// ============================================================================

export type SuggestionPriority = 'p0' | 'p1' | 'p2' | 'p3';

export type SuggestionCategory =
  | 'architectural_simplification'
  | 'test_gap'
  | 'performance_risk'
  | 'ux_inconsistency'
  | 'over_engineering'
  | 'under_engineering'
  | 'dead_code'
  | 'naming_drift'
  | 'concept_duplication'
  | 'schema_drift'
  | 'type_mismatch'
  | 'security_risk'
  | 'doc_stale';

export type SuggestionStatus = 
  | 'pending' 
  | 'viewed' 
  | 'accepted' 
  | 'dismissed' 
  | 'dismissed_type'
  | 'expired' 
  | 'auto_fixed';

export interface SuggestionFix {
  type: 'auto' | 'guided' | 'manual';
  changes: FileChange[];
  preview: string;
}

export interface FileChange {
  filePath: string;
  lineStart: number;
  lineEnd: number;
  oldContent: string;
  newContent: string;
}

export interface Suggestion {
  id: string;
  category: SuggestionCategory;
  priority: SuggestionPriority;
  
  title: string;
  description: string;
  rationale?: string;
  
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  symbolName?: string;
  
  fix?: SuggestionFix;
  
  confidence: number;
  impactScore: number;
  effortScore: number;
  
  status: SuggestionStatus;
  
  viewedAt?: Date;
  actionedAt?: Date;
  userFeedback?: string;
  
  agentId?: string;
  agentInvocationId?: string;
  
  createdAt: Date;
  expiresAt?: Date;
  suppressedUntil?: Date;
  
  userId?: string;
  projectId?: string;
  
  tags: string[];
  relatedSuggestions: string[];
  metadata: Record<string, unknown>;
}

// ============================================================================
// ALIGNMENT TYPES
// ============================================================================

export type AlignmentAxis = 'ui_api_db' | 'spec_implementation' | 'test_behavior' | 'docs_reality';
export type DriftSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface AlignmentMismatch {
  type: string;
  source: string;
  target: string;
  expected: unknown;
  actual: unknown;
  severity: DriftSeverity;
  suggestion?: string;
}

export interface AlignmentCheck {
  id: string;
  axis: AlignmentAxis;
  scope: string;
  
  checkType: string;
  sourceArtifact?: string;
  targetArtifact?: string;
  
  aligned: boolean;
  driftSeverity?: DriftSeverity;
  
  mismatches: AlignmentMismatch[];
  recommendations: string[];
  
  confidence: number;
  
  checkedAt: Date;
  
  userId?: string;
  agentInvocationId?: string;
}

// ============================================================================
// TRUST & POLICY TYPES
// ============================================================================

export interface UserTrust {
  id: string;
  userId: string;
  
  trustLevel: 'new' | 'learning' | 'calibrated';
  
  minConfidenceAuto: number;
  minConfidenceSuggest: number;
  minConfidenceShow: number;
  
  categoryAdjustments: Record<SuggestionCategory, number>;
  
  suggestionsShown: number;
  suggestionsAccepted: number;
  suggestionsDismissed: number;
  suggestionsDisagreed: number;
  
  autoApplyEnabled: boolean;
  autoApplyCategories: SuggestionCategory[];
  
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
}

export interface DBWritePolicy {
  id: string;
  environment: Environment;
  
  allowedModes: ('observe' | 'propose' | 'apply')[];
  
  voiceAllowed: boolean;
  requiresConfirmation: boolean;
  requires2FA: boolean;
  
  auditLevel: 'basic' | 'detailed' | 'forensic';
}

export interface SafetyInvariant {
  id: string;
  invariantKey: string;
  description: string;
  enabled: boolean;
  enforcementLevel: 'warn' | 'block' | 'audit';
  exceptions: unknown[];
}

// ============================================================================
// SAFETY INVARIANTS
// ============================================================================

export const SAFETY_INVARIANTS = {
  noDirectProdMutation: true,
  noVoiceProdDeploy: true,
  noDataDeletionWithoutBackup: true,
  noSchemaChangeWithoutMigration: true,
  noActionWithoutAudit: true,
  noAuditModification: true,
  noOverrideOfHumanDecision: true,
  alwaysAllowCancel: true,
  noLowConfidenceExecution: true,
  noAmbiguousDestructiveAction: true,
} as const;

// ============================================================================
// AUTHORITY GATE TYPES
// ============================================================================

export interface GateResult {
  gate: string;
  passed: boolean;
  reason: string;
}

export interface AuthorityGateResult {
  passed: boolean;
  gates: GateResult[];
  actionId: string;
  blockedBy?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface CricoApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
