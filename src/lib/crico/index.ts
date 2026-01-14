/**
 * CRICO - Cognitive Operating System for Builders
 * Main entry point and unified API
 */

// Types
export * from './types';

// Agent Framework
export { BaseAgent, AgentRegistry, type AnalysisContext, type VerificationResult } from './agents/base-agent';

// Action Execution
export {
  createAction,
  executeAction,
  approveAction,
  cancelAction,
  checkAuthorityGates,
  type CreateActionInput,
  type ExecutionResult,
} from './actions/action-executor';

// Voice Control
export {
  processVoiceCommand,
  confirmVoiceCommand,
  cancelVoiceCommand,
  parseVoiceIntent,
  type ProcessVoiceResult,
} from './voice/voice-controller';

// Alignment Engine
export {
  checkUIAPIDBAlignment,
  saveAlignmentCheck,
  getRecentAlignmentChecks,
  calculateAlignmentScore,
  startAlignmentMonitor,
  extractDatabaseSchema,
  compareSchemas,
} from './alignment/alignment-engine';

// Suggestion Engine
export {
  createSuggestion,
  getSuggestions,
  getPendingSuggestionsForUser,
  getSuggestionsByPriority,
  markSuggestionViewed,
  acceptSuggestion,
  dismissSuggestion,
  disagreeSuggestion,
  markSuggestionAutoFixed,
  getSuggestionStats,
  calculatePriorityScore,
  huntDeadCode,
  huntNamingDrift,
  huntTestGaps,
  type CreateSuggestionInput,
  type SuggestionFilter,
  type HuntResult,
} from './suggestions/suggestion-engine';

// Audit Service
export {
  createAuditEntry,
  auditAction,
  auditVoiceCommand,
  getAuditEntries,
  getActionAuditTrail,
  getSessionAuditTrail,
  verifyAuditEntry,
  verifyAuditEntries,
  runIntegrityCheck,
  getAuditStats,
  logSafetyViolation,
  getRecentSafetyViolations,
  exportAuditLog,
  type AuditEventType,
  type CreateAuditEntryInput,
  type AuditFilter,
  type AuditEntry,
  type SafetyViolation,
  type AuditExport,
} from './audit/audit-service';

// Trust Calibration
export {
  getUserTrust,
  updateUserTrust,
  recordSuggestionShown,
  recordSuggestionAction,
  getEffectiveConfidence,
  shouldShowSuggestion,
  enableAutoApply,
  disableAutoApply,
  disableAllAutoApply,
  resetUserTrust,
  applyTrustDecay,
  getTrustStats,
  type TrustStats,
} from './audit/trust-calibration';

// ============================================================================
// NEW CRICO ALIGNMENT ENGINE COMPONENTS
// ============================================================================

// Schema Alignment Checker
export {
  SchemaAlignmentChecker,
  type SchemaField,
  type SchemaDefinition,
  type AlignmentCheckResult,
  type SchemaAlignmentConfig,
} from './alignment/SchemaAlignmentChecker';

// Type Coherence Analyzer
export {
  TypeCoherenceAnalyzer,
  type TypeDefinition,
  type TypeProperty,
  type TypeReference,
  type CoherenceCheckResult,
  type TypeMismatch,
  type TypeWarning,
} from './alignment/TypeCoherenceAnalyzer';

// Test Reality Scorer
export {
  TestRealityScorer,
  type TestFile,
  type FileCoverage,
  type MockAnalysis,
  type AssertionAnalysis,
  type BehaviorCoverage,
  type TestRealityScore,
  type TestWarning,
} from './alignment/TestRealityScorer';

// Doc Freshness Tracker
export {
  DocFreshnessTracker,
  type DocumentationFile,
  type CodeFile,
  type APIElement,
  type DocFreshnessResult,
  type DriftDetail,
  type OverallFreshnessScore,
} from './alignment/DocFreshnessTracker';

// Spec Implementation Mapper
export {
  SpecImplementationMapper,
  type Specification,
  type AcceptanceCriterion,
  type Requirement,
  type CodeReference,
  type SpecImplementationMapping,
  type MappingIssue,
} from './alignment/SpecImplementationMapper';

// Alignment Graph
export {
  AlignmentGraphBuilder,
  AlignmentCalculator,
  detectDrift,
  generateAlignmentClaims,
  type Intent,
  type Implementation as AlignmentImplementation,
  type RuntimeBehavior,
  type TypeDefinitionNode,
  type TestCoverageNode,
  type DocumentationNode,
  type AlignmentGraph,
  type AlignmentEdge,
  type AlignmentLayer,
  type AlignmentScore,
  type DriftWarning,
  type SuggestedFix,
} from './alignment/AlignmentGraph';

// Drift Detector
export {
  DriftDetector,
  analyzeComplexity,
  checkComplexityThresholds,
  type DriftTrigger,
  type DriftCheckConfig,
  type DriftResult,
  type DriftIssue,
  type DriftSuggestion,
} from './alignment/DriftDetector';

// VSCode Integration
export {
  VSCodeIntegration,
  DEFAULT_DECORATION_CONFIG,
  type InlineIndicator,
  type QuickFix,
  type TextEdit,
  type Command,
  type HoverContent,
  type SidebarPanelData,
  type WarningItem,
  type ActionItem,
  type ActivityItem,
  type FileConfidence,
  type VSCodeMessage,
  type DecorationConfig,
  type DecorationStyle,
  type StatusBarItem,
} from './ide/VSCodeIntegration';

// Suggestion Hunter
export {
  SuggestionHuntingOrchestrator,
  ArchitecturalSimplificationHunter,
  TestGapHunter,
  PerformanceRiskHunter,
  DeadCodeHunter,
  NamingDriftHunter,
  BaseHunter,
  type HuntConfig,
  type HuntSession,
  type HuntResult as SuggestionHuntResult,
  type SuggestionCandidate,
  type FileChange,
} from './suggestions/SuggestionHunter';

// Agent Orchestra
export {
  AgentOrchestra,
  ConductorAgent,
  PlannerAgent,
  CodeAuditorAgent,
  TestArchitectAgent,
  SchemaIntegrityAgent,
  RiskRegressionAgent,
  type TaskRequest,
  type TaskResult,
  type OrchestraState,
} from './agents/AgentOrchestra';

// Confidence Scoring
export {
  ConfidenceCalculator,
  DEFAULT_CONFIDENCE_CONFIG,
  aggregateConfidence,
  getConfidenceColor,
  getConfidenceLabel,
  getSourceIcon,
  formatConfidence,
  type ConfidenceSource,
  type ConfidenceRange,
  type ConfidenceConfig,
  type ConfidenceScore,
  type ConfidenceFactor,
  type ConfidenceFlag,
} from './confidence/ConfidenceScoring';

// ============================================================================
// CRICO SINGLETON
// ============================================================================

import { AgentRegistry } from './agents/base-agent';
import type { Environment, CricoAction, VoiceCommand, Suggestion, AlignmentCheck } from './types';

export interface CricoConfig {
  environment: Environment;
  userId?: string;
  sessionId?: string;
  enableVoice?: boolean;
  enableAutoApply?: boolean;
}

export interface CricoInstance {
  config: CricoConfig;
  registry: AgentRegistry;
  
  // High-level operations
  executeVoiceCommand(transcript: string, sttConfidence: number): Promise<{
    command: VoiceCommand;
    feedback: { message: string; speakable: string };
    action?: { id: string };
  }>;
  
  getPendingSuggestions(): Promise<Suggestion[]>;
  getAlignmentScore(): Promise<{ score: number; breakdown: Record<string, number> }>;
  runAlignmentCheck(scope: string): Promise<AlignmentCheck | null>;
}

/**
 * Initialize Crico instance
 */
export function initCrico(config: CricoConfig): CricoInstance {
  const registry = AgentRegistry.getInstance();

  return {
    config,
    registry,

    async executeVoiceCommand(transcript: string, sttConfidence: number) {
      const { processVoiceCommand } = await import('./voice/voice-controller');
      const result = await processVoiceCommand(
        transcript,
        sttConfidence,
        config.userId,
        config.sessionId,
        config.environment
      );
      return {
        command: result.command,
        feedback: {
          message: result.feedback.message,
          speakable: result.feedback.speakable,
        },
        action: result.action,
      };
    },

    async getPendingSuggestions() {
      if (!config.userId) return [];
      const { getPendingSuggestionsForUser } = await import('./suggestions/suggestion-engine');
      return getPendingSuggestionsForUser(config.userId);
    },

    async getAlignmentScore() {
      const { calculateAlignmentScore } = await import('./alignment/alignment-engine');
      return calculateAlignmentScore();
    },

    async runAlignmentCheck(scope: string) {
      const { checkUIAPIDBAlignment, saveAlignmentCheck } = await import('./alignment/alignment-engine');
      const result = await checkUIAPIDBAlignment(scope, scope);
      if (result) {
        await saveAlignmentCheck('ui_api_db', scope, result, config.userId);
      }
      return null;
    },
  };
}

// ============================================================================
// SAFETY INVARIANTS (Hardcoded, never overridable)
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

/**
 * Check if a safety invariant would be violated
 */
export function checkSafetyInvariant(
  invariant: keyof typeof SAFETY_INVARIANTS,
  context: Record<string, unknown>
): { allowed: boolean; reason?: string } {
  switch (invariant) {
    case 'noDirectProdMutation':
      if (context.environment === 'production' && context.action === 'mutation') {
        return { allowed: false, reason: 'Direct production mutations are not allowed' };
      }
      break;
      
    case 'noVoiceProdDeploy':
      if (context.source === 'voice' && context.environment === 'production' && context.scope === 'deploy') {
        return { allowed: false, reason: 'Voice commands cannot trigger production deployments' };
      }
      break;
      
    case 'noLowConfidenceExecution':
      if (typeof context.confidence === 'number' && context.confidence < 0.6) {
        return { allowed: false, reason: 'Confidence too low for execution' };
      }
      break;
      
    case 'noAmbiguousDestructiveAction':
      if (context.authorityLevel === 'destructive' && context.confirmationReceived !== true) {
        return { allowed: false, reason: 'Destructive actions require explicit confirmation' };
      }
      break;
  }
  
  return { allowed: true };
}

/**
 * Check all safety invariants for an action
 */
export function checkAllSafetyInvariants(
  action: Partial<CricoAction>
): { allowed: boolean; violations: string[] } {
  const violations: string[] = [];
  const context = {
    environment: action.environment,
    source: action.source,
    scope: action.scope,
    authorityLevel: action.authorityLevel,
    confidence: action.confidence,
    action: action.steps?.[0]?.type,
  };

  for (const invariant of Object.keys(SAFETY_INVARIANTS) as (keyof typeof SAFETY_INVARIANTS)[]) {
    const result = checkSafetyInvariant(invariant, context);
    if (!result.allowed && result.reason) {
      violations.push(result.reason);
    }
  }

  return {
    allowed: violations.length === 0,
    violations,
  };
}
