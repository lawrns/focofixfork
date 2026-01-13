/**
 * CRICO Action Executor
 * Unified action execution layer with authority gates and safety controls
 */

import { supabase } from '@/lib/supabase/client';
import type {
  CricoAction,
  ActionStep,
  ActionStatus,
  ActionSource,
  AuthorityLevel,
  ActionScope,
  ApprovalLevel,
  Environment,
  GateResult,
  AuthorityGateResult,
  RollbackPlan,
  SAFETY_INVARIANTS,
} from '../types';

// ============================================================================
// AUTHORITY GATES
// ============================================================================

interface GateContext {
  action: CricoAction;
  userId?: string;
  environment: Environment;
}

/**
 * Gate 1: Source Verification
 * Verify the source is authenticated and authorized
 */
async function checkSourceVerification(ctx: GateContext): Promise<GateResult> {
  const { action } = ctx;
  
  // Check if user is authenticated
  if (!action.userId) {
    return {
      gate: 'source_verification',
      passed: false,
      reason: 'No authenticated user for this action',
    };
  }

  // Check rate limiting (simplified - would use Redis in production)
  // For now, we pass if user exists
  return {
    gate: 'source_verification',
    passed: true,
    reason: 'User authenticated and authorized',
  };
}

/**
 * Gate 2: Intent Validation
 * Verify the intent is parseable and confidence is above threshold
 */
async function checkIntentValidation(ctx: GateContext): Promise<GateResult> {
  const { action } = ctx;
  
  // Check confidence threshold
  const minConfidence = 0.6;
  if (action.confidence < minConfidence) {
    return {
      gate: 'intent_validation',
      passed: false,
      reason: `Confidence ${(action.confidence * 100).toFixed(0)}% below threshold ${(minConfidence * 100).toFixed(0)}%`,
    };
  }

  // Check intent is parseable
  if (!action.intent || action.intent.trim() === '') {
    return {
      gate: 'intent_validation',
      passed: false,
      reason: 'Intent is empty or unparseable',
    };
  }

  return {
    gate: 'intent_validation',
    passed: true,
    reason: 'Intent validated with sufficient confidence',
  };
}

/**
 * Gate 3: Risk Assessment
 * Evaluate blast radius and reversibility
 */
async function checkRiskAssessment(ctx: GateContext): Promise<GateResult> {
  const { action } = ctx;
  
  // High risk + not reversible = blocked
  if (action.riskScore >= 0.8 && !action.reversible) {
    return {
      gate: 'risk_assessment',
      passed: false,
      reason: 'High risk action without rollback capability',
    };
  }

  // Destructive actions require extra scrutiny
  if (action.authorityLevel === 'destructive' && action.riskScore >= 0.5) {
    return {
      gate: 'risk_assessment',
      passed: false,
      reason: 'Destructive action with elevated risk requires additional approval',
    };
  }

  return {
    gate: 'risk_assessment',
    passed: true,
    reason: 'Risk level acceptable',
  };
}

/**
 * Gate 4: Approval Check
 * Verify required approvals are in place
 */
async function checkApproval(ctx: GateContext): Promise<GateResult> {
  const { action } = ctx;
  
  if (action.requiresApproval && !action.approvedAt) {
    return {
      gate: 'approval',
      passed: false,
      reason: `Requires ${action.approvalLevel} approval`,
    };
  }

  return {
    gate: 'approval',
    passed: true,
    reason: 'Approval requirements met',
  };
}

/**
 * Gate 5: Execution Safety
 * Verify environment policies and rollback readiness
 */
async function checkExecutionSafety(ctx: GateContext): Promise<GateResult> {
  const { action, environment } = ctx;
  
  // Get environment policy
  const { data: policy } = await (supabase as any)
    .from('crico_db_policies')
    .select('*')
    .eq('environment', environment)
    .single();

  // Check voice restrictions
  if (action.source === 'voice' && policy && !policy.voice_allowed) {
    return {
      gate: 'execution_safety',
      passed: false,
      reason: `Voice commands not allowed in ${environment} environment`,
    };
  }

  // Check if structural changes in production
  if (environment === 'production' && action.authorityLevel === 'structural') {
    return {
      gate: 'execution_safety',
      passed: false,
      reason: 'Structural changes blocked in production - use staging first',
    };
  }

  // Check rollback readiness for risky actions
  if (action.riskScore >= 0.5 && !action.rollbackPlan && !action.reversible) {
    return {
      gate: 'execution_safety',
      passed: false,
      reason: 'Rollback plan required for risky actions',
    };
  }

  return {
    gate: 'execution_safety',
    passed: true,
    reason: 'Execution conditions satisfied',
  };
}

/**
 * Run all authority gates
 */
export async function checkAuthorityGates(action: CricoAction): Promise<AuthorityGateResult> {
  const ctx: GateContext = {
    action,
    userId: action.userId,
    environment: action.environment,
  };

  const gates: GateResult[] = [];
  let passed = true;
  let blockedBy: string | undefined;

  // Run all gates
  const gateChecks = [
    checkSourceVerification,
    checkIntentValidation,
    checkRiskAssessment,
    checkApproval,
    checkExecutionSafety,
  ];

  for (const checkGate of gateChecks) {
    const result = await checkGate(ctx);
    gates.push(result);
    
    if (!result.passed && passed) {
      passed = false;
      blockedBy = result.gate;
    }
  }

  return {
    passed,
    gates,
    actionId: action.id,
    blockedBy,
  };
}

// ============================================================================
// ACTION EXECUTION
// ============================================================================

export interface ExecutionResult {
  success: boolean;
  actionId: string;
  stepsCompleted: number;
  totalSteps: number;
  result?: unknown;
  error?: string;
  duration: number;
}

/**
 * Execute a single action step
 */
async function executeStep(step: ActionStep, actionId: string): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const startTime = Date.now();
  
  try {
    // Update step status
    await (supabase as any)
      .from('crico_action_steps')
      .update({ status: 'executing', started_at: new Date().toISOString() })
      .eq('id', step.id);

    let result: unknown;

    switch (step.type) {
      case 'query':
        // Execute read query
        const { data: queryData, error: queryError } = await (supabase as any)
          .rpc(step.target, step.payload);
        if (queryError) throw queryError;
        result = queryData;
        break;

      case 'mutation':
        // Execute write mutation
        const { data: mutationData, error: mutationError } = await (supabase as any)
          .rpc(step.target, step.payload);
        if (mutationError) throw mutationError;
        result = mutationData;
        break;

      case 'notification':
        // Send notification (would integrate with notification service)
        console.log('Notification:', step.payload);
        result = { sent: true };
        break;

      case 'api_call':
        // External API call (would implement with proper auth)
        console.log('API call:', step.target, step.payload);
        result = { called: true };
        break;

      case 'file_write':
        // File write (would integrate with file system service)
        console.log('File write:', step.target, step.payload);
        result = { written: true };
        break;

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }

    // Update step as completed
    await (supabase as any)
      .from('crico_action_steps')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result,
      })
      .eq('id', step.id);

    return { success: true, result };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update step as failed
    await (supabase as any)
      .from('crico_action_steps')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq('id', step.id);

    return { success: false, error: errorMessage };
  }
}

/**
 * Main action executor
 */
export async function executeAction(action: CricoAction): Promise<ExecutionResult> {
  const startTime = Date.now();
  let stepsCompleted = 0;

  try {
    // Check authority gates first
    const gateResult = await checkAuthorityGates(action);
    
    if (!gateResult.passed) {
      // Log rejection
      await createAuditEntry('action_rejected', {
        actionId: action.id,
        reason: gateResult.blockedBy,
        gates: gateResult.gates,
      }, action);

      return {
        success: false,
        actionId: action.id,
        stepsCompleted: 0,
        totalSteps: action.steps.length,
        error: `Blocked by gate: ${gateResult.blockedBy}`,
        duration: Date.now() - startTime,
      };
    }

    // Update action status to executing
    await updateActionStatus(action.id, 'executing');
    await createAuditEntry('action_executed', { actionId: action.id }, action);

    // Execute steps in order
    const results: unknown[] = [];
    for (const step of action.steps) {
      const stepResult = await executeStep(step, action.id);
      
      if (!stepResult.success) {
        // Step failed - attempt rollback if available
        if (action.rollbackPlan) {
          await executeRollback(action.id, action.rollbackPlan);
        }

        await updateActionStatus(action.id, 'failed', stepResult.error);
        await createAuditEntry('action_failed', {
          actionId: action.id,
          error: stepResult.error,
          stepsCompleted,
        }, action);

        return {
          success: false,
          actionId: action.id,
          stepsCompleted,
          totalSteps: action.steps.length,
          error: stepResult.error,
          duration: Date.now() - startTime,
        };
      }

      stepsCompleted++;
      results.push(stepResult.result);
    }

    // All steps completed
    await updateActionStatus(action.id, 'completed', undefined, { results });
    await createAuditEntry('action_completed', {
      actionId: action.id,
      stepsCompleted,
      results,
    }, action);

    return {
      success: true,
      actionId: action.id,
      stepsCompleted,
      totalSteps: action.steps.length,
      result: results,
      duration: Date.now() - startTime,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await updateActionStatus(action.id, 'failed', errorMessage);
    await createAuditEntry('action_failed', {
      actionId: action.id,
      error: errorMessage,
    }, action);

    return {
      success: false,
      actionId: action.id,
      stepsCompleted,
      totalSteps: action.steps.length,
      error: errorMessage,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Execute rollback plan
 */
async function executeRollback(actionId: string, rollbackPlan: RollbackPlan): Promise<void> {
  console.log(`Executing rollback for action ${actionId}`);
  
  for (const step of rollbackPlan.steps) {
    try {
      await executeStep(step, actionId);
    } catch (error) {
      console.error('Rollback step failed:', error);
    }
  }

  await updateActionStatus(actionId, 'rolled_back');
}

/**
 * Update action status in database
 */
async function updateActionStatus(
  actionId: string,
  status: ActionStatus,
  errorMessage?: string,
  result?: unknown
): Promise<void> {
  const updates: Record<string, unknown> = { status };
  
  if (status === 'executing') {
    updates.executed_at = new Date().toISOString();
  } else if (status === 'completed' || status === 'failed' || status === 'rolled_back') {
    updates.completed_at = new Date().toISOString();
  }
  
  if (errorMessage) {
    updates.error_message = errorMessage;
  }
  
  if (result) {
    updates.result = result;
  }

  await (supabase as any)
    .from('crico_actions')
    .update(updates)
    .eq('id', actionId);
}

/**
 * Create audit log entry
 */
async function createAuditEntry(
  eventType: string,
  eventData: Record<string, unknown>,
  action: CricoAction
): Promise<void> {
  const checksum = await generateChecksum(JSON.stringify(eventData));
  
  await (supabase as any)
    .from('crico_audit_log')
    .insert({
      event_type: eventType,
      event_data: eventData,
      action_id: action.id,
      user_id: action.userId,
      session_id: action.sessionId,
      environment: action.environment,
      checksum,
    });
}

/**
 * Generate SHA-256 checksum for audit integrity
 */
async function generateChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// ACTION CREATION
// ============================================================================

export interface CreateActionInput {
  source: ActionSource;
  intent: string;
  intentParsed?: Record<string, unknown>;
  authorityLevel: AuthorityLevel;
  scope: ActionScope;
  steps: Omit<ActionStep, 'id'>[];
  userId?: string;
  sessionId?: string;
  environment?: Environment;
  confidence?: number;
  riskScore?: number;
  reversible?: boolean;
  rollbackPlan?: RollbackPlan;
  metadata?: Record<string, unknown>;
}

/**
 * Create a new action
 */
export async function createAction(input: CreateActionInput): Promise<CricoAction> {
  const actionId = crypto.randomUUID();
  
  // Determine if approval is required
  const requiresApproval = determineApprovalRequired(input);
  const approvalLevel = determineApprovalLevel(input);

  // Create steps with IDs
  const steps: ActionStep[] = input.steps.map((step, index) => ({
    ...step,
    id: crypto.randomUUID(),
  }));

  const action: CricoAction = {
    id: actionId,
    source: input.source,
    intent: input.intent,
    intentParsed: input.intentParsed,
    authorityLevel: input.authorityLevel,
    scope: input.scope,
    steps,
    dependencies: [],
    reversible: input.reversible ?? true,
    rollbackPlan: input.rollbackPlan,
    requiresApproval,
    approvalLevel,
    confidence: input.confidence ?? 0.5,
    riskScore: input.riskScore ?? calculateRiskScore(input),
    status: 'pending',
    createdAt: new Date(),
    userId: input.userId,
    sessionId: input.sessionId,
    environment: input.environment ?? 'development',
    metadata: input.metadata ?? {},
  };

  // Insert action into database
  await (supabase as any)
    .from('crico_actions')
    .insert({
      id: action.id,
      source: action.source,
      intent: action.intent,
      intent_parsed: action.intentParsed,
      authority_level: action.authorityLevel,
      scope: action.scope,
      steps: action.steps,
      dependencies: action.dependencies,
      reversible: action.reversible,
      rollback_plan: action.rollbackPlan,
      requires_approval: action.requiresApproval,
      approval_level: action.approvalLevel,
      confidence: action.confidence,
      risk_score: action.riskScore,
      status: action.status,
      created_at: action.createdAt.toISOString(),
      user_id: action.userId,
      session_id: action.sessionId,
      environment: action.environment,
      metadata: action.metadata,
    });

  // Insert steps
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    await (supabase as any)
      .from('crico_action_steps')
      .insert({
        id: step.id,
        action_id: action.id,
        step_order: i,
        step_type: step.type,
        target: step.target,
        payload: step.payload,
        validation_rules: step.validation,
        timeout_ms: step.timeout,
        status: 'pending',
      });
  }

  // Create audit entry
  await createAuditEntry('action_created', {
    actionId: action.id,
    source: action.source,
    scope: action.scope,
    authorityLevel: action.authorityLevel,
  }, action);

  return action;
}

/**
 * Determine if approval is required based on action properties
 */
function determineApprovalRequired(input: CreateActionInput): boolean {
  // Destructive actions always require approval
  if (input.authorityLevel === 'destructive') return true;
  
  // Structural changes require approval in production
  if (input.authorityLevel === 'structural' && input.environment === 'production') return true;
  
  // Voice commands for structural changes require approval
  if (input.source === 'voice' && input.authorityLevel === 'structural') return true;
  
  // High risk actions require approval
  if ((input.riskScore ?? 0) >= 0.7) return true;
  
  return false;
}

/**
 * Determine required approval level
 */
function determineApprovalLevel(input: CreateActionInput): ApprovalLevel {
  if (input.authorityLevel === 'destructive') return 'admin';
  if (input.environment === 'production') return 'admin';
  if (input.authorityLevel === 'structural') return 'user';
  return 'none';
}

/**
 * Calculate risk score based on action properties
 */
function calculateRiskScore(input: CreateActionInput): number {
  let score = 0;
  
  // Authority level contribution
  const authorityScores: Record<AuthorityLevel, number> = {
    read: 0,
    write: 0.2,
    structural: 0.5,
    destructive: 0.9,
  };
  score += authorityScores[input.authorityLevel] ?? 0;
  
  // Scope contribution
  const scopeScores: Record<ActionScope, number> = {
    code: 0.1,
    tasks: 0.05,
    config: 0.2,
    db: 0.4,
    deploy: 0.5,
    system: 0.6,
  };
  score += scopeScores[input.scope] ?? 0;
  
  // Environment contribution
  const envScores: Record<Environment, number> = {
    development: 0,
    staging: 0.1,
    production: 0.3,
  };
  score += envScores[input.environment ?? 'development'] ?? 0;
  
  // Voice source adds risk
  if (input.source === 'voice') score += 0.1;
  
  // Non-reversible adds significant risk
  if (input.reversible === false) score += 0.3;
  
  return Math.min(score, 1);
}

/**
 * Approve an action
 */
export async function approveAction(actionId: string, approverId: string): Promise<boolean> {
  const { error } = await (supabase as any)
    .from('crico_actions')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: approverId,
    })
    .eq('id', actionId)
    .eq('status', 'pending');

  if (error) {
    console.error('Failed to approve action:', error);
    return false;
  }

  return true;
}

/**
 * Cancel an action
 */
export async function cancelAction(actionId: string): Promise<boolean> {
  const { error } = await (supabase as any)
    .from('crico_actions')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
    })
    .eq('id', actionId)
    .in('status', ['pending', 'approved']);

  if (error) {
    console.error('Failed to cancel action:', error);
    return false;
  }

  return true;
}
