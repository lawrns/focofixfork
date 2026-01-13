/**
 * CRICO Trust Calibration System
 * Per-user confidence thresholds and learning
 */

import { supabase } from '@/lib/supabase/client';
import type {
  UserTrust,
  SuggestionCategory,
} from '../types';

// ============================================================================
// DEFAULT TRUST CONFIGURATION
// ============================================================================

const DEFAULT_TRUST: Omit<UserTrust, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  trustLevel: 'new',
  minConfidenceAuto: 0.90,
  minConfidenceSuggest: 0.70,
  minConfidenceShow: 0.40,
  categoryAdjustments: {} as Record<SuggestionCategory, number>,
  suggestionsShown: 0,
  suggestionsAccepted: 0,
  suggestionsDismissed: 0,
  suggestionsDisagreed: 0,
  autoApplyEnabled: false,
  autoApplyCategories: [],
};

// Trust level thresholds
const TRUST_THRESHOLDS = {
  learning: 5,      // Minimum interactions to move from 'new' to 'learning'
  calibrated: 20,   // Minimum interactions to move to 'calibrated'
  highAcceptanceRate: 0.7, // Rate needed for full calibration
};

// ============================================================================
// USER TRUST MANAGEMENT
// ============================================================================

/**
 * Get or create user trust profile
 */
export async function getUserTrust(userId: string): Promise<UserTrust> {
  const { data, error } = await (supabase as any)
    .from('crico_user_trust')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    // Create new trust profile
    return createUserTrust(userId);
  }

  return mapDbTrust(data);
}

/**
 * Create a new user trust profile
 */
async function createUserTrust(userId: string): Promise<UserTrust> {
  const now = new Date();
  
  const trust: UserTrust = {
    id: crypto.randomUUID(),
    userId,
    ...DEFAULT_TRUST,
    createdAt: now,
    updatedAt: now,
  };

  await (supabase as any)
    .from('crico_user_trust')
    .insert({
      id: trust.id,
      user_id: trust.userId,
      trust_level: trust.trustLevel,
      min_confidence_auto: trust.minConfidenceAuto,
      min_confidence_suggest: trust.minConfidenceSuggest,
      min_confidence_show: trust.minConfidenceShow,
      category_adjustments: trust.categoryAdjustments,
      suggestions_shown: trust.suggestionsShown,
      suggestions_accepted: trust.suggestionsAccepted,
      suggestions_dismissed: trust.suggestionsDismissed,
      suggestions_disagreed: trust.suggestionsDisagreed,
      auto_apply_enabled: trust.autoApplyEnabled,
      auto_apply_categories: trust.autoApplyCategories,
      created_at: trust.createdAt.toISOString(),
      updated_at: trust.updatedAt.toISOString(),
    });

  return trust;
}

/**
 * Update user trust profile
 */
export async function updateUserTrust(
  userId: string,
  updates: Partial<Omit<UserTrust, 'id' | 'userId' | 'createdAt'>>
): Promise<UserTrust> {
  const now = new Date();
  
  const dbUpdates: Record<string, unknown> = {
    updated_at: now.toISOString(),
    last_active_at: now.toISOString(),
  };

  if (updates.trustLevel !== undefined) dbUpdates.trust_level = updates.trustLevel;
  if (updates.minConfidenceAuto !== undefined) dbUpdates.min_confidence_auto = updates.minConfidenceAuto;
  if (updates.minConfidenceSuggest !== undefined) dbUpdates.min_confidence_suggest = updates.minConfidenceSuggest;
  if (updates.minConfidenceShow !== undefined) dbUpdates.min_confidence_show = updates.minConfidenceShow;
  if (updates.categoryAdjustments !== undefined) dbUpdates.category_adjustments = updates.categoryAdjustments;
  if (updates.suggestionsShown !== undefined) dbUpdates.suggestions_shown = updates.suggestionsShown;
  if (updates.suggestionsAccepted !== undefined) dbUpdates.suggestions_accepted = updates.suggestionsAccepted;
  if (updates.suggestionsDismissed !== undefined) dbUpdates.suggestions_dismissed = updates.suggestionsDismissed;
  if (updates.suggestionsDisagreed !== undefined) dbUpdates.suggestions_disagreed = updates.suggestionsDisagreed;
  if (updates.autoApplyEnabled !== undefined) dbUpdates.auto_apply_enabled = updates.autoApplyEnabled;
  if (updates.autoApplyCategories !== undefined) dbUpdates.auto_apply_categories = updates.autoApplyCategories;

  const { data, error } = await (supabase as any)
    .from('crico_user_trust')
    .update(dbUpdates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update user trust:', error);
    return getUserTrust(userId);
  }

  return mapDbTrust(data);
}

// ============================================================================
// TRUST CALIBRATION LOGIC
// ============================================================================

/**
 * Record a suggestion being shown to user
 */
export async function recordSuggestionShown(userId: string): Promise<void> {
  const trust = await getUserTrust(userId);
  await updateUserTrust(userId, {
    suggestionsShown: trust.suggestionsShown + 1,
  });
}

/**
 * Record user action on a suggestion and recalibrate trust
 */
export async function recordSuggestionAction(
  userId: string,
  action: 'accepted' | 'dismissed' | 'disagreed',
  category: SuggestionCategory
): Promise<UserTrust> {
  const trust = await getUserTrust(userId);
  
  const updates: Partial<UserTrust> = {};
  
  // Update counters
  if (action === 'accepted') {
    updates.suggestionsAccepted = trust.suggestionsAccepted + 1;
  } else if (action === 'dismissed') {
    updates.suggestionsDismissed = trust.suggestionsDismissed + 1;
  } else if (action === 'disagreed') {
    updates.suggestionsDisagreed = trust.suggestionsDisagreed + 1;
    
    // Adjust category confidence down
    const adjustments = { ...trust.categoryAdjustments };
    adjustments[category] = (adjustments[category] ?? 0) - 0.05;
    updates.categoryAdjustments = adjustments;
  }

  // Recalculate trust level
  const totalInteractions = 
    (updates.suggestionsAccepted ?? trust.suggestionsAccepted) +
    (updates.suggestionsDismissed ?? trust.suggestionsDismissed) +
    (updates.suggestionsDisagreed ?? trust.suggestionsDisagreed);

  const acceptanceRate = totalInteractions > 0
    ? (updates.suggestionsAccepted ?? trust.suggestionsAccepted) / totalInteractions
    : 0;

  if (totalInteractions >= TRUST_THRESHOLDS.calibrated && 
      acceptanceRate >= TRUST_THRESHOLDS.highAcceptanceRate) {
    updates.trustLevel = 'calibrated';
  } else if (totalInteractions >= TRUST_THRESHOLDS.learning) {
    updates.trustLevel = 'learning';
  }

  // Adjust confidence thresholds based on trust level
  if (updates.trustLevel === 'calibrated') {
    // Lower thresholds for calibrated users
    updates.minConfidenceAuto = Math.max(0.80, trust.minConfidenceAuto - 0.02);
    updates.minConfidenceSuggest = Math.max(0.60, trust.minConfidenceSuggest - 0.02);
  } else if (updates.trustLevel === 'learning' && action === 'disagreed') {
    // Raise thresholds if user disagrees often
    updates.minConfidenceAuto = Math.min(0.95, trust.minConfidenceAuto + 0.02);
    updates.minConfidenceSuggest = Math.min(0.85, trust.minConfidenceSuggest + 0.02);
  }

  return updateUserTrust(userId, updates);
}

/**
 * Get effective confidence threshold for a category
 */
export async function getEffectiveConfidence(
  userId: string,
  category: SuggestionCategory,
  baseConfidence: number
): Promise<number> {
  const trust = await getUserTrust(userId);
  
  // Apply category adjustment
  const adjustment = trust.categoryAdjustments[category] ?? 0;
  
  return Math.max(0, Math.min(1, baseConfidence + adjustment));
}

/**
 * Check if a suggestion should be shown to user
 */
export async function shouldShowSuggestion(
  userId: string,
  confidence: number,
  category: SuggestionCategory
): Promise<{ show: boolean; mode: 'auto' | 'review' | 'suppress' }> {
  const trust = await getUserTrust(userId);
  
  // Get effective confidence with category adjustment
  const effectiveConfidence = await getEffectiveConfidence(userId, category, confidence);
  
  // Check against thresholds
  if (effectiveConfidence >= trust.minConfidenceAuto) {
    // Check if auto-apply is enabled for this category
    if (trust.autoApplyEnabled && trust.autoApplyCategories.includes(category)) {
      return { show: true, mode: 'auto' };
    }
    return { show: true, mode: 'review' };
  }
  
  if (effectiveConfidence >= trust.minConfidenceSuggest) {
    return { show: true, mode: 'review' };
  }
  
  if (effectiveConfidence >= trust.minConfidenceShow) {
    return { show: true, mode: 'review' };
  }
  
  return { show: false, mode: 'suppress' };
}

// ============================================================================
// AUTO-APPLY MANAGEMENT
// ============================================================================

/**
 * Enable auto-apply for a category
 */
export async function enableAutoApply(
  userId: string,
  category: SuggestionCategory
): Promise<void> {
  const trust = await getUserTrust(userId);
  
  if (!trust.autoApplyCategories.includes(category)) {
    await updateUserTrust(userId, {
      autoApplyEnabled: true,
      autoApplyCategories: [...trust.autoApplyCategories, category],
    });
  }
}

/**
 * Disable auto-apply for a category
 */
export async function disableAutoApply(
  userId: string,
  category: SuggestionCategory
): Promise<void> {
  const trust = await getUserTrust(userId);
  
  const categories = trust.autoApplyCategories.filter(c => c !== category);
  
  await updateUserTrust(userId, {
    autoApplyEnabled: categories.length > 0,
    autoApplyCategories: categories,
  });
}

/**
 * Disable all auto-apply
 */
export async function disableAllAutoApply(userId: string): Promise<void> {
  await updateUserTrust(userId, {
    autoApplyEnabled: false,
    autoApplyCategories: [],
  });
}

// ============================================================================
// TRUST RESET & DECAY
// ============================================================================

/**
 * Reset user trust to defaults
 */
export async function resetUserTrust(userId: string): Promise<UserTrust> {
  return updateUserTrust(userId, {
    ...DEFAULT_TRUST,
    suggestionsShown: 0,
    suggestionsAccepted: 0,
    suggestionsDismissed: 0,
    suggestionsDisagreed: 0,
  });
}

/**
 * Apply decay to category adjustments (call periodically)
 * Adjustments slowly return to neutral over time
 */
export async function applyTrustDecay(userId: string): Promise<void> {
  const trust = await getUserTrust(userId);
  
  const decayRate = 0.01; // 1% decay per call
  const adjustments = { ...trust.categoryAdjustments };
  let changed = false;
  
  for (const category of Object.keys(adjustments) as SuggestionCategory[]) {
    const current = adjustments[category];
    if (current !== 0) {
      // Decay toward zero
      const decayed = current > 0 
        ? Math.max(0, current - decayRate)
        : Math.min(0, current + decayRate);
      
      if (Math.abs(decayed) < 0.01) {
        delete adjustments[category];
      } else {
        adjustments[category] = decayed;
      }
      changed = true;
    }
  }
  
  if (changed) {
    await updateUserTrust(userId, { categoryAdjustments: adjustments });
  }
}

// ============================================================================
// TRUST STATISTICS
// ============================================================================

export interface TrustStats {
  userId: string;
  trustLevel: UserTrust['trustLevel'];
  totalInteractions: number;
  acceptanceRate: number;
  disagreementRate: number;
  autoApplyEnabled: boolean;
  autoApplyCategories: SuggestionCategory[];
  thresholds: {
    auto: number;
    suggest: number;
    show: number;
  };
  categoryAdjustments: Record<SuggestionCategory, number>;
}

/**
 * Get trust statistics for a user
 */
export async function getTrustStats(userId: string): Promise<TrustStats> {
  const trust = await getUserTrust(userId);
  
  const totalInteractions = 
    trust.suggestionsAccepted + 
    trust.suggestionsDismissed + 
    trust.suggestionsDisagreed;

  return {
    userId,
    trustLevel: trust.trustLevel,
    totalInteractions,
    acceptanceRate: totalInteractions > 0 
      ? trust.suggestionsAccepted / totalInteractions 
      : 0,
    disagreementRate: totalInteractions > 0 
      ? trust.suggestionsDisagreed / totalInteractions 
      : 0,
    autoApplyEnabled: trust.autoApplyEnabled,
    autoApplyCategories: trust.autoApplyCategories,
    thresholds: {
      auto: trust.minConfidenceAuto,
      suggest: trust.minConfidenceSuggest,
      show: trust.minConfidenceShow,
    },
    categoryAdjustments: trust.categoryAdjustments,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapDbTrust(row: any): UserTrust {
  return {
    id: row.id,
    userId: row.user_id,
    trustLevel: row.trust_level,
    minConfidenceAuto: row.min_confidence_auto,
    minConfidenceSuggest: row.min_confidence_suggest,
    minConfidenceShow: row.min_confidence_show,
    categoryAdjustments: row.category_adjustments ?? {},
    suggestionsShown: row.suggestions_shown,
    suggestionsAccepted: row.suggestions_accepted,
    suggestionsDismissed: row.suggestions_dismissed,
    suggestionsDisagreed: row.suggestions_disagreed,
    autoApplyEnabled: row.auto_apply_enabled,
    autoApplyCategories: row.auto_apply_categories ?? [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    lastActiveAt: row.last_active_at ? new Date(row.last_active_at) : undefined,
  };
}
