export interface WorkflowGovernanceInput {
  ownerAgent?: string
  riskTier?: 'low' | 'medium' | 'high'
  hasExternalMessaging?: boolean
  hasFinancialAction?: boolean
  forceActivate?: boolean
}

export interface GovernanceDecision {
  allowed: boolean
  reason?: string
}

/**
 * Phase-1 policy:
 * - AI-created workflows must remain draft (`active=false`) on create/update.
 * - Activation is allowed only through explicit activate endpoint.
 */
export function canCreateOrUpdateWorkflow(input: WorkflowGovernanceInput): GovernanceDecision {
  if (input.forceActivate) {
    return {
      allowed: false,
      reason: 'Workflow activation is not allowed on create/update. Use activate endpoint.',
    }
  }

  return { allowed: true }
}

/**
 * Phase-1 conservative activation policy.
 * High-risk categories are blocked pending explicit human gate implementation.
 */
export function canActivateWorkflow(input: WorkflowGovernanceInput): GovernanceDecision {
  if (input.riskTier === 'high' || input.hasFinancialAction || input.hasExternalMessaging) {
    return {
      allowed: false,
      reason: 'Activation blocked: workflow requires higher approval gate (high-risk).',
    }
  }

  return { allowed: true }
}

