/**
 * CRICO Suggestion Engine
 * Proactive improvement suggestion hunting and management
 */

import { supabase } from '@/lib/supabase/client';
import type {
  Suggestion,
  SuggestionCategory,
  SuggestionPriority,
  SuggestionStatus,
  SuggestionFix,
  FileChange,
  UserTrust,
} from '../types';

// ============================================================================
// SUGGESTION PRIORITY CALCULATION
// ============================================================================

interface PriorityFactors {
  impact: number;      // 1-10: How much improvement if fixed
  confidence: number;  // 0-1: How sure we are this is correct
  freshness: number;   // 0-1: Recency of code (newer = lower priority)
  effort: number;      // 1-10: Estimated fix complexity
}

/**
 * Calculate suggestion priority score
 * PRIORITY = (IMPACT × CONFIDENCE × FRESHNESS) / EFFORT
 */
export function calculatePriorityScore(factors: PriorityFactors): number {
  const { impact, confidence, freshness, effort } = factors;
  
  // Normalize factors
  const normalizedImpact = impact / 10;
  const normalizedEffort = Math.max(effort, 1) / 10;
  
  // Invert freshness (newer code = lower priority to change)
  const freshnessWeight = 1 - (freshness * 0.3); // Max 30% reduction for new code
  
  return (normalizedImpact * confidence * freshnessWeight) / normalizedEffort;
}

/**
 * Map priority score to priority level
 */
export function scoreToPriority(score: number, severity?: 'security' | 'data_loss'): SuggestionPriority {
  // P0: Critical issues regardless of score
  if (severity === 'security' || severity === 'data_loss') return 'p0';
  
  // Score-based mapping
  if (score >= 0.7) return 'p1';
  if (score >= 0.4) return 'p2';
  return 'p3';
}

// ============================================================================
// SUGGESTION CREATION
// ============================================================================

export interface CreateSuggestionInput {
  category: SuggestionCategory;
  title: string;
  description: string;
  rationale?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  symbolName?: string;
  fix?: SuggestionFix;
  confidence: number;
  impactScore?: number;
  effortScore?: number;
  agentId?: string;
  agentInvocationId?: string;
  userId?: string;
  projectId?: string;
  tags?: string[];
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Create a new suggestion
 */
export async function createSuggestion(input: CreateSuggestionInput): Promise<Suggestion> {
  const id = crypto.randomUUID();
  
  // Calculate priority
  const priorityScore = calculatePriorityScore({
    impact: (input.impactScore ?? 5) * 10,
    confidence: input.confidence,
    freshness: 0.5, // Default, would calculate from git history
    effort: (input.effortScore ?? 5) * 10,
  });
  
  const priority = scoreToPriority(priorityScore, getCategorySeverity(input.category));
  
  const suggestion: Suggestion = {
    id,
    category: input.category,
    priority,
    title: input.title,
    description: input.description,
    rationale: input.rationale,
    filePath: input.filePath,
    lineStart: input.lineStart,
    lineEnd: input.lineEnd,
    symbolName: input.symbolName,
    fix: input.fix,
    confidence: input.confidence,
    impactScore: input.impactScore ?? 0.5,
    effortScore: input.effortScore ?? 0.5,
    status: 'pending',
    agentId: input.agentId,
    agentInvocationId: input.agentInvocationId,
    createdAt: new Date(),
    expiresAt: input.expiresAt,
    userId: input.userId,
    projectId: input.projectId,
    tags: input.tags ?? [],
    relatedSuggestions: [],
    metadata: input.metadata ?? {},
  };

  // Save to database
  await (supabase as any)
    .from('crico_suggestions')
    .insert({
      id: suggestion.id,
      category: suggestion.category,
      priority: suggestion.priority,
      title: suggestion.title,
      description: suggestion.description,
      rationale: suggestion.rationale,
      file_path: suggestion.filePath,
      line_start: suggestion.lineStart,
      line_end: suggestion.lineEnd,
      symbol_name: suggestion.symbolName,
      fix_type: suggestion.fix?.type,
      fix_preview: suggestion.fix?.preview,
      fix_changes: suggestion.fix?.changes,
      confidence: suggestion.confidence,
      impact_score: suggestion.impactScore,
      effort_score: suggestion.effortScore,
      status: suggestion.status,
      agent_id: suggestion.agentId,
      agent_invocation_id: suggestion.agentInvocationId,
      created_at: suggestion.createdAt.toISOString(),
      expires_at: suggestion.expiresAt?.toISOString(),
      user_id: suggestion.userId,
      project_id: suggestion.projectId,
      tags: suggestion.tags,
      related_suggestions: suggestion.relatedSuggestions,
      metadata: suggestion.metadata,
    });

  return suggestion;
}

/**
 * Get category severity for priority calculation
 */
function getCategorySeverity(category: SuggestionCategory): 'security' | 'data_loss' | undefined {
  if (category === 'security_risk') return 'security';
  return undefined;
}

// ============================================================================
// SUGGESTION RETRIEVAL
// ============================================================================

export interface SuggestionFilter {
  userId?: string;
  projectId?: string;
  status?: SuggestionStatus[];
  priority?: SuggestionPriority[];
  category?: SuggestionCategory[];
  filePath?: string;
  minConfidence?: number;
  limit?: number;
  offset?: number;
}

/**
 * Get suggestions with filters
 */
export async function getSuggestions(filter: SuggestionFilter): Promise<Suggestion[]> {
  let query = (supabase as any)
    .from('crico_suggestions')
    .select('*')
    .order('priority', { ascending: true })
    .order('confidence', { ascending: false })
    .order('created_at', { ascending: false });

  if (filter.userId) {
    query = query.eq('user_id', filter.userId);
  }
  if (filter.projectId) {
    query = query.eq('project_id', filter.projectId);
  }
  if (filter.status && filter.status.length > 0) {
    query = query.in('status', filter.status);
  }
  if (filter.priority && filter.priority.length > 0) {
    query = query.in('priority', filter.priority);
  }
  if (filter.category && filter.category.length > 0) {
    query = query.in('category', filter.category);
  }
  if (filter.filePath) {
    query = query.eq('file_path', filter.filePath);
  }
  if (filter.minConfidence !== undefined) {
    query = query.gte('confidence', filter.minConfidence);
  }
  if (filter.limit) {
    query = query.limit(filter.limit);
  }
  if (filter.offset) {
    query = query.range(filter.offset, filter.offset + (filter.limit ?? 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get suggestions:', error);
    return [];
  }

  return (data ?? []).map(mapDbSuggestion);
}

/**
 * Get pending suggestions for a user, respecting trust thresholds
 */
export async function getPendingSuggestionsForUser(
  userId: string,
  limit: number = 20
): Promise<Suggestion[]> {
  // Get user trust profile
  const trust = await getUserTrust(userId);
  
  // Filter by user's confidence threshold
  const suggestions = await getSuggestions({
    userId,
    status: ['pending'],
    minConfidence: trust?.minConfidenceShow ?? 0.4,
    limit,
  });

  return suggestions;
}

/**
 * Get suggestions grouped by priority
 */
export async function getSuggestionsByPriority(
  userId: string
): Promise<Record<SuggestionPriority, Suggestion[]>> {
  const suggestions = await getSuggestions({
    userId,
    status: ['pending'],
    limit: 100,
  });

  return {
    p0: suggestions.filter(s => s.priority === 'p0'),
    p1: suggestions.filter(s => s.priority === 'p1'),
    p2: suggestions.filter(s => s.priority === 'p2'),
    p3: suggestions.filter(s => s.priority === 'p3'),
  };
}

// ============================================================================
// SUGGESTION ACTIONS
// ============================================================================

/**
 * Mark suggestion as viewed
 */
export async function markSuggestionViewed(suggestionId: string): Promise<void> {
  await (supabase as any)
    .from('crico_suggestions')
    .update({
      status: 'viewed',
      viewed_at: new Date().toISOString(),
    })
    .eq('id', suggestionId)
    .eq('status', 'pending');
}

/**
 * Accept a suggestion
 */
export async function acceptSuggestion(
  suggestionId: string,
  feedback?: string
): Promise<void> {
  await (supabase as any)
    .from('crico_suggestions')
    .update({
      status: 'accepted',
      actioned_at: new Date().toISOString(),
      user_feedback: feedback,
    })
    .eq('id', suggestionId);

  // Update user trust (increase acceptance rate)
  const { data } = await (supabase as any)
    .from('crico_suggestions')
    .select('user_id')
    .eq('id', suggestionId)
    .single();

  if (data?.user_id) {
    await updateTrustFromAction(data.user_id, 'accepted');
  }
}

/**
 * Dismiss a suggestion
 */
export async function dismissSuggestion(
  suggestionId: string,
  dismissType: 'instance' | 'type' = 'instance',
  feedback?: string
): Promise<void> {
  const status: SuggestionStatus = dismissType === 'type' ? 'dismissed_type' : 'dismissed';
  
  await (supabase as any)
    .from('crico_suggestions')
    .update({
      status,
      actioned_at: new Date().toISOString(),
      user_feedback: feedback,
    })
    .eq('id', suggestionId);

  // Update user trust
  const { data } = await (supabase as any)
    .from('crico_suggestions')
    .select('user_id, category')
    .eq('id', suggestionId)
    .single();

  if (data?.user_id) {
    await updateTrustFromAction(data.user_id, 'dismissed', data.category);
  }

  // If dismissing type, suppress future similar suggestions
  if (dismissType === 'type' && data?.category) {
    await suppressCategoryForUser(data.user_id, data.category);
  }
}

/**
 * Mark suggestion as auto-fixed
 */
export async function markSuggestionAutoFixed(suggestionId: string): Promise<void> {
  await (supabase as any)
    .from('crico_suggestions')
    .update({
      status: 'auto_fixed',
      actioned_at: new Date().toISOString(),
    })
    .eq('id', suggestionId);
}

/**
 * Disagree with a suggestion (negative feedback)
 */
export async function disagreeSuggestion(
  suggestionId: string,
  reason: string
): Promise<void> {
  await (supabase as any)
    .from('crico_suggestions')
    .update({
      status: 'dismissed',
      actioned_at: new Date().toISOString(),
      user_feedback: `DISAGREED: ${reason}`,
    })
    .eq('id', suggestionId);

  // Update user trust (disagreement reduces confidence for similar)
  const { data } = await (supabase as any)
    .from('crico_suggestions')
    .select('user_id, category')
    .eq('id', suggestionId)
    .single();

  if (data?.user_id) {
    await updateTrustFromAction(data.user_id, 'disagreed', data.category);
  }
}

// ============================================================================
// TRUST INTEGRATION
// ============================================================================

async function getUserTrust(userId: string): Promise<UserTrust | null> {
  const { data, error } = await (supabase as any)
    .from('crico_user_trust')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    trustLevel: data.trust_level,
    minConfidenceAuto: data.min_confidence_auto,
    minConfidenceSuggest: data.min_confidence_suggest,
    minConfidenceShow: data.min_confidence_show,
    categoryAdjustments: data.category_adjustments ?? {},
    suggestionsShown: data.suggestions_shown,
    suggestionsAccepted: data.suggestions_accepted,
    suggestionsDismissed: data.suggestions_dismissed,
    suggestionsDisagreed: data.suggestions_disagreed,
    autoApplyEnabled: data.auto_apply_enabled,
    autoApplyCategories: data.auto_apply_categories ?? [],
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    lastActiveAt: data.last_active_at ? new Date(data.last_active_at) : undefined,
  };
}

async function updateTrustFromAction(
  userId: string,
  action: 'accepted' | 'dismissed' | 'disagreed',
  category?: SuggestionCategory
): Promise<void> {
  const trust = await getUserTrust(userId);
  
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    last_active_at: new Date().toISOString(),
  };

  if (action === 'accepted') {
    updates.suggestions_accepted = (trust?.suggestionsAccepted ?? 0) + 1;
  } else if (action === 'dismissed') {
    updates.suggestions_dismissed = (trust?.suggestionsDismissed ?? 0) + 1;
  } else if (action === 'disagreed') {
    updates.suggestions_disagreed = (trust?.suggestionsDisagreed ?? 0) + 1;
    
    // Lower confidence for this category
    if (category) {
      const adjustments: Record<string, number> = trust?.categoryAdjustments ?? {};
      adjustments[category] = (adjustments[category] ?? 0) - 0.05;
      updates.category_adjustments = adjustments;
    }
  }

  // Update trust level based on acceptance rate
  const total = (trust?.suggestionsAccepted ?? 0) + 
                (trust?.suggestionsDismissed ?? 0) + 
                (trust?.suggestionsDisagreed ?? 0) + 1;
  const acceptRate = ((trust?.suggestionsAccepted ?? 0) + (action === 'accepted' ? 1 : 0)) / total;

  if (total >= 20) {
    updates.trust_level = acceptRate >= 0.7 ? 'calibrated' : 'learning';
  } else if (total >= 5) {
    updates.trust_level = 'learning';
  }

  await (supabase as any)
    .from('crico_user_trust')
    .upsert({
      user_id: userId,
      ...updates,
    }, { onConflict: 'user_id' });
}

async function suppressCategoryForUser(
  userId: string,
  category: SuggestionCategory
): Promise<void> {
  const trust = await getUserTrust(userId);
  const adjustments: Record<string, number> = trust?.categoryAdjustments ?? {};

  // Significantly reduce confidence for this category
  adjustments[category] = (adjustments[category] ?? 0) - 0.3;

  await (supabase as any)
    .from('crico_user_trust')
    .upsert({
      user_id: userId,
      category_adjustments: adjustments,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
}

// ============================================================================
// SUGGESTION STATISTICS
// ============================================================================

export interface SuggestionStats {
  total: number;
  pending: number;
  accepted: number;
  dismissed: number;
  autoFixed: number;
  byCategory: Record<SuggestionCategory, number>;
  byPriority: Record<SuggestionPriority, number>;
  acceptanceRate: number;
  averageConfidence: number;
}

/**
 * Get suggestion statistics for a user
 */
export async function getSuggestionStats(userId: string): Promise<SuggestionStats> {
  const { data, error } = await (supabase as any)
    .from('crico_suggestions')
    .select('status, category, priority, confidence')
    .eq('user_id', userId);

  if (error || !data) {
    return {
      total: 0,
      pending: 0,
      accepted: 0,
      dismissed: 0,
      autoFixed: 0,
      byCategory: {} as Record<SuggestionCategory, number>,
      byPriority: { p0: 0, p1: 0, p2: 0, p3: 0 },
      acceptanceRate: 0,
      averageConfidence: 0,
    };
  }

  const stats: SuggestionStats = {
    total: data.length,
    pending: data.filter((s: any) => s.status === 'pending' || s.status === 'viewed').length,
    accepted: data.filter((s: any) => s.status === 'accepted').length,
    dismissed: data.filter((s: any) => s.status === 'dismissed' || s.status === 'dismissed_type').length,
    autoFixed: data.filter((s: any) => s.status === 'auto_fixed').length,
    byCategory: {} as Record<SuggestionCategory, number>,
    byPriority: { p0: 0, p1: 0, p2: 0, p3: 0 },
    acceptanceRate: 0,
    averageConfidence: 0,
  };

  // Count by category
  for (const s of data) {
    stats.byCategory[s.category as SuggestionCategory] = 
      (stats.byCategory[s.category as SuggestionCategory] ?? 0) + 1;
    stats.byPriority[s.priority as SuggestionPriority]++;
  }

  // Calculate rates
  const actioned = stats.accepted + stats.dismissed + stats.autoFixed;
  stats.acceptanceRate = actioned > 0 ? (stats.accepted + stats.autoFixed) / actioned : 0;
  stats.averageConfidence = data.length > 0 
    ? data.reduce((sum: number, s: any) => sum + s.confidence, 0) / data.length 
    : 0;

  return stats;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapDbSuggestion(row: any): Suggestion {
  return {
    id: row.id,
    category: row.category,
    priority: row.priority,
    title: row.title,
    description: row.description,
    rationale: row.rationale,
    filePath: row.file_path,
    lineStart: row.line_start,
    lineEnd: row.line_end,
    symbolName: row.symbol_name,
    fix: row.fix_type ? {
      type: row.fix_type,
      preview: row.fix_preview,
      changes: row.fix_changes ?? [],
    } : undefined,
    confidence: row.confidence,
    impactScore: row.impact_score,
    effortScore: row.effort_score,
    status: row.status,
    viewedAt: row.viewed_at ? new Date(row.viewed_at) : undefined,
    actionedAt: row.actioned_at ? new Date(row.actioned_at) : undefined,
    userFeedback: row.user_feedback,
    agentId: row.agent_id,
    agentInvocationId: row.agent_invocation_id,
    createdAt: new Date(row.created_at),
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    suppressedUntil: row.suppressed_until ? new Date(row.suppressed_until) : undefined,
    userId: row.user_id,
    projectId: row.project_id,
    tags: row.tags ?? [],
    relatedSuggestions: row.related_suggestions ?? [],
    metadata: row.metadata ?? {},
  };
}

// ============================================================================
// SUGGESTION HUNTERS (Category-specific detection)
// ============================================================================

export interface HuntResult {
  suggestions: CreateSuggestionInput[];
  scanned: number;
  duration: number;
}

/**
 * Hunt for dead code
 */
export async function huntDeadCode(
  filePaths: string[],
  exportGraph: Map<string, Set<string>>
): Promise<HuntResult> {
  const startTime = Date.now();
  const suggestions: CreateSuggestionInput[] = [];

  for (const [exportPath, usages] of exportGraph) {
    if (usages.size === 0) {
      suggestions.push({
        category: 'dead_code',
        title: `Unused export: ${exportPath}`,
        description: `This export is never imported elsewhere in the codebase.`,
        rationale: 'Dead code increases bundle size and maintenance burden.',
        filePath: exportPath.split(':')[0],
        confidence: 0.9, // High confidence for static analysis
        impactScore: 0.3,
        effortScore: 0.1,
        tags: ['cleanup', 'dead-code'],
      });
    }
  }

  return {
    suggestions,
    scanned: filePaths.length,
    duration: Date.now() - startTime,
  };
}

/**
 * Hunt for naming drift
 */
export async function huntNamingDrift(
  identifiers: Map<string, string[]>
): Promise<HuntResult> {
  const startTime = Date.now();
  const suggestions: CreateSuggestionInput[] = [];

  // Group similar identifiers
  const conceptGroups = new Map<string, string[]>();
  
  for (const [identifier, locations] of identifiers) {
    // Normalize to base concept (e.g., userId, user_id, UserId -> user_id)
    const normalized = identifier
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/_+/g, '_');
    
    if (!conceptGroups.has(normalized)) {
      conceptGroups.set(normalized, []);
    }
    conceptGroups.get(normalized)!.push(identifier);
  }

  // Find groups with multiple naming conventions
  for (const [concept, variants] of conceptGroups) {
    const uniqueVariants = [...new Set(variants)];
    if (uniqueVariants.length > 1) {
      suggestions.push({
        category: 'naming_drift',
        title: `Inconsistent naming: ${uniqueVariants.join(', ')}`,
        description: `The same concept is named differently across the codebase.`,
        rationale: 'Consistent naming improves readability and reduces bugs.',
        confidence: 0.85,
        impactScore: 0.4,
        effortScore: 0.3,
        tags: ['consistency', 'naming'],
        metadata: { variants: uniqueVariants, concept },
      });
    }
  }

  return {
    suggestions,
    scanned: identifiers.size,
    duration: Date.now() - startTime,
  };
}

/**
 * Hunt for test gaps
 */
export async function huntTestGaps(
  coverageData: { file: string; lines: number; covered: number; critical: boolean }[]
): Promise<HuntResult> {
  const startTime = Date.now();
  const suggestions: CreateSuggestionInput[] = [];

  for (const file of coverageData) {
    const coverage = file.lines > 0 ? file.covered / file.lines : 0;
    
    // Flag critical files with low coverage
    if (file.critical && coverage < 0.7) {
      suggestions.push({
        category: 'test_gap',
        title: `Low test coverage: ${file.file}`,
        description: `Critical file has only ${(coverage * 100).toFixed(0)}% test coverage.`,
        rationale: 'Critical paths need high test coverage to prevent production issues.',
        filePath: file.file,
        confidence: 0.95,
        impactScore: 0.8,
        effortScore: 0.6,
        tags: ['testing', 'coverage', 'critical'],
      });
    }
    // Flag any file with very low coverage
    else if (coverage < 0.3 && file.lines > 50) {
      suggestions.push({
        category: 'test_gap',
        title: `Minimal test coverage: ${file.file}`,
        description: `File has only ${(coverage * 100).toFixed(0)}% test coverage.`,
        rationale: 'Low test coverage increases risk of undetected bugs.',
        filePath: file.file,
        confidence: 0.9,
        impactScore: 0.5,
        effortScore: 0.5,
        tags: ['testing', 'coverage'],
      });
    }
  }

  return {
    suggestions,
    scanned: coverageData.length,
    duration: Date.now() - startTime,
  };
}
