/**
 * CRICO Confidence Scoring System
 * Implements trust calibration from Section 6.1 of the CRICO Master Plan
 *
 * Confidence Tiers:
 * - Static analysis: 90-100% confidence
 * - Pattern matching: 70-90% confidence
 * - LLM inference: 40-70% confidence (requires verification)
 * - Heuristic guess: 20-40% (low confidence flag)
 */

import type { Evidence, Claim, SuggestionCategory } from '../types';

// ============================================================================
// CONFIDENCE TYPES
// ============================================================================

export type ConfidenceSource =
  | 'static_analysis'
  | 'pattern_match'
  | 'llm_inference'
  | 'heuristic_guess'
  | 'runtime_data'
  | 'historical'
  | 'user_feedback';

export interface ConfidenceRange {
  min: number;
  max: number;
  typical: number;
}

export interface ConfidenceConfig {
  sourceRanges: Record<ConfidenceSource, ConfidenceRange>;
  categoryModifiers: Partial<Record<SuggestionCategory, number>>;
  minimumForAction: number;
  minimumForSuggestion: number;
  minimumForDisplay: number;
  decayRate: number; // Per day
}

export interface ConfidenceScore {
  raw: number;
  adjusted: number;
  source: ConfidenceSource;
  factors: ConfidenceFactor[];
  requiresVerification: boolean;
  flags: ConfidenceFlag[];
}

export interface ConfidenceFactor {
  name: string;
  value: number;
  weight: number;
  description: string;
}

export interface ConfidenceFlag {
  type: 'low_confidence' | 'needs_verification' | 'high_uncertainty' | 'stale_data';
  message: string;
  severity: 'info' | 'warning' | 'error';
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_CONFIDENCE_CONFIG: ConfidenceConfig = {
  sourceRanges: {
    static_analysis: { min: 0.90, max: 1.00, typical: 0.95 },
    runtime_data: { min: 0.85, max: 0.98, typical: 0.90 },
    pattern_match: { min: 0.70, max: 0.90, typical: 0.80 },
    historical: { min: 0.65, max: 0.85, typical: 0.75 },
    llm_inference: { min: 0.40, max: 0.70, typical: 0.55 },
    heuristic_guess: { min: 0.20, max: 0.40, typical: 0.30 },
    user_feedback: { min: 0.80, max: 1.00, typical: 0.90 },
  },
  categoryModifiers: {
    security_risk: 1.2, // Increase scrutiny for security
    schema_drift: 1.1,
    type_mismatch: 1.0,
    test_gap: 0.95,
    dead_code: 0.9,
    naming_drift: 0.85,
    doc_stale: 0.8,
  },
  minimumForAction: 0.80, // Auto-apply threshold
  minimumForSuggestion: 0.50, // Show suggestion threshold
  minimumForDisplay: 0.30, // Show in UI at all threshold
  decayRate: 0.02, // 2% per day
};

// ============================================================================
// CONFIDENCE CALCULATOR
// ============================================================================

export class ConfidenceCalculator {
  private config: ConfidenceConfig;

  constructor(config: Partial<ConfidenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIDENCE_CONFIG, ...config };
  }

  /**
   * Calculate confidence score for evidence
   */
  calculateForEvidence(evidence: Evidence[]): ConfidenceScore {
    if (evidence.length === 0) {
      return this.createLowConfidenceScore(0, 'heuristic_guess');
    }

    // Weight evidence by type reliability
    const factors: ConfidenceFactor[] = [];
    let weightedSum = 0;
    let totalWeight = 0;
    let primarySource: ConfidenceSource = 'heuristic_guess';
    let maxWeight = 0;

    for (const e of evidence) {
      const source = e.type as ConfidenceSource;
      const range = this.config.sourceRanges[source] || this.config.sourceRanges.heuristic_guess;
      const sourceWeight = this.getSourceWeight(source);

      // Clamp evidence weight to source range
      const clampedWeight = Math.max(range.min, Math.min(range.max, e.weight));

      factors.push({
        name: source,
        value: clampedWeight,
        weight: sourceWeight,
        description: `Evidence from ${source}: ${(clampedWeight * 100).toFixed(0)}%`,
      });

      weightedSum += clampedWeight * sourceWeight;
      totalWeight += sourceWeight;

      if (sourceWeight > maxWeight) {
        maxWeight = sourceWeight;
        primarySource = source;
      }
    }

    const raw = totalWeight > 0 ? weightedSum / totalWeight : 0;

    return this.createConfidenceScore(raw, primarySource, factors);
  }

  /**
   * Calculate confidence score for a claim
   */
  calculateForClaim(claim: Claim): ConfidenceScore {
    const evidenceScore = this.calculateForEvidence(claim.evidence);

    // Apply claim-level modifiers
    const factors = [...evidenceScore.factors];

    // Falsifiability bonus
    if (claim.falsifiable && claim.verificationSteps && claim.verificationSteps.length > 0) {
      factors.push({
        name: 'falsifiability',
        value: 0.05,
        weight: 1,
        description: 'Claim is falsifiable with verification steps',
      });
    }

    // Methodology penalty for vague methods
    if (!claim.methodology || claim.methodology.length < 10) {
      factors.push({
        name: 'methodology',
        value: -0.1,
        weight: 1,
        description: 'Unclear methodology reduces confidence',
      });
    }

    // Recalculate with modifiers
    const adjustment = factors
      .filter(f => f.name !== evidenceScore.source)
      .reduce((sum, f) => sum + f.value * f.weight, 0);

    const adjusted = Math.max(0, Math.min(1, evidenceScore.raw + adjustment));

    return {
      ...evidenceScore,
      adjusted,
      factors,
    };
  }

  /**
   * Calculate confidence for a category
   */
  calculateWithCategory(
    baseConfidence: number,
    category: SuggestionCategory,
    source: ConfidenceSource
  ): ConfidenceScore {
    const modifier = this.config.categoryModifiers[category] || 1.0;
    const range = this.config.sourceRanges[source];

    // Apply category modifier (but stay within source range)
    const modified = baseConfidence * modifier;
    const clamped = Math.max(range.min, Math.min(range.max, modified));

    return this.createConfidenceScore(clamped, source, [
      {
        name: 'base',
        value: baseConfidence,
        weight: 1,
        description: `Base confidence: ${(baseConfidence * 100).toFixed(0)}%`,
      },
      {
        name: 'category_modifier',
        value: modifier,
        weight: 0.5,
        description: `Category modifier for ${category}: ${modifier}`,
      },
    ]);
  }

  /**
   * Apply time-based decay to confidence
   */
  applyDecay(score: ConfidenceScore, daysSinceCalculation: number): ConfidenceScore {
    const decayFactor = Math.pow(1 - this.config.decayRate, daysSinceCalculation);
    const decayed = score.adjusted * decayFactor;

    const factors = [
      ...score.factors,
      {
        name: 'time_decay',
        value: decayFactor,
        weight: 1,
        description: `Decay over ${daysSinceCalculation} days: ${(decayFactor * 100).toFixed(0)}%`,
      },
    ];

    const flags = [...score.flags];
    if (daysSinceCalculation > 7) {
      flags.push({
        type: 'stale_data',
        message: `Confidence based on data from ${daysSinceCalculation} days ago`,
        severity: 'warning',
      });
    }

    return {
      ...score,
      adjusted: decayed,
      factors,
      flags,
    };
  }

  /**
   * Determine if confidence meets action threshold
   */
  meetsActionThreshold(score: ConfidenceScore): boolean {
    return score.adjusted >= this.config.minimumForAction && !score.requiresVerification;
  }

  /**
   * Determine if confidence meets suggestion threshold
   */
  meetsSuggestionThreshold(score: ConfidenceScore): boolean {
    return score.adjusted >= this.config.minimumForSuggestion;
  }

  /**
   * Determine if confidence meets display threshold
   */
  meetsDisplayThreshold(score: ConfidenceScore): boolean {
    return score.adjusted >= this.config.minimumForDisplay;
  }

  /**
   * Get weight for evidence source
   */
  private getSourceWeight(source: ConfidenceSource): number {
    const weights: Record<ConfidenceSource, number> = {
      static_analysis: 1.0,
      runtime_data: 0.95,
      pattern_match: 0.8,
      historical: 0.75,
      llm_inference: 0.6,
      heuristic_guess: 0.4,
      user_feedback: 0.9,
    };

    return weights[source] || 0.5;
  }

  /**
   * Create a confidence score object
   */
  private createConfidenceScore(
    raw: number,
    source: ConfidenceSource,
    factors: ConfidenceFactor[]
  ): ConfidenceScore {
    const flags: ConfidenceFlag[] = [];
    let requiresVerification = false;

    // Check for low confidence
    if (raw < this.config.minimumForSuggestion) {
      flags.push({
        type: 'low_confidence',
        message: `Confidence ${(raw * 100).toFixed(0)}% is below suggestion threshold`,
        severity: 'warning',
      });
    }

    // LLM inference always requires verification
    if (source === 'llm_inference' || source === 'heuristic_guess') {
      requiresVerification = true;
      flags.push({
        type: 'needs_verification',
        message: `${source} source requires human verification`,
        severity: 'info',
      });
    }

    // High uncertainty check
    const range = this.config.sourceRanges[source];
    if (raw < range.min + 0.1) {
      flags.push({
        type: 'high_uncertainty',
        message: 'Confidence near lower bound for this source type',
        severity: 'warning',
      });
    }

    return {
      raw,
      adjusted: raw, // Will be modified by additional factors
      source,
      factors,
      requiresVerification,
      flags,
    };
  }

  /**
   * Create a low confidence score
   */
  private createLowConfidenceScore(
    raw: number,
    source: ConfidenceSource
  ): ConfidenceScore {
    return {
      raw,
      adjusted: raw,
      source,
      factors: [
        {
          name: 'no_evidence',
          value: 0,
          weight: 1,
          description: 'No evidence provided',
        },
      ],
      requiresVerification: true,
      flags: [
        {
          type: 'low_confidence',
          message: 'No evidence to calculate confidence',
          severity: 'error',
        },
      ],
    };
  }
}

// ============================================================================
// CONFIDENCE AGGREGATOR
// ============================================================================

/**
 * Aggregate multiple confidence scores
 */
export function aggregateConfidence(
  scores: ConfidenceScore[],
  method: 'average' | 'minimum' | 'weighted' | 'bayesian' = 'weighted'
): ConfidenceScore {
  if (scores.length === 0) {
    return {
      raw: 0,
      adjusted: 0,
      source: 'heuristic_guess',
      factors: [],
      requiresVerification: true,
      flags: [{ type: 'low_confidence', message: 'No scores to aggregate', severity: 'error' }],
    };
  }

  if (scores.length === 1) {
    return scores[0];
  }

  let aggregated: number;
  const allFactors: ConfidenceFactor[] = [];
  const allFlags: ConfidenceFlag[] = [];

  switch (method) {
    case 'average':
      aggregated = scores.reduce((sum, s) => sum + s.adjusted, 0) / scores.length;
      break;

    case 'minimum':
      aggregated = Math.min(...scores.map(s => s.adjusted));
      break;

    case 'weighted': {
      const weights = scores.map(s => getSourceWeight(s.source));
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      aggregated = scores.reduce((sum, s, i) =>
        sum + s.adjusted * weights[i], 0) / totalWeight;
      break;
    }

    case 'bayesian': {
      // Bayesian combination: P(A and B) = P(A) * P(B|A)
      // Simplified: multiply probabilities and normalize
      aggregated = scores.reduce((prod, s) => prod * s.adjusted, 1);
      aggregated = Math.pow(aggregated, 1 / scores.length); // Geometric mean
      break;
    }
  }

  // Collect all factors and flags
  for (const score of scores) {
    allFactors.push(...score.factors);
    allFlags.push(...score.flags);
  }

  // Determine primary source (highest weight)
  const sourceCounts = new Map<ConfidenceSource, number>();
  for (const score of scores) {
    sourceCounts.set(score.source, (sourceCounts.get(score.source) || 0) + 1);
  }
  const primarySource = Array.from(sourceCounts.entries())
    .sort((a, b) => b[1] - a[1])[0][0];

  // Determine if verification required
  const requiresVerification = scores.some(s => s.requiresVerification);

  return {
    raw: aggregated,
    adjusted: aggregated,
    source: primarySource,
    factors: allFactors,
    requiresVerification,
    flags: deduplicateFlags(allFlags),
  };
}

/**
 * Get weight for a source
 */
function getSourceWeight(source: ConfidenceSource): number {
  const weights: Record<ConfidenceSource, number> = {
    static_analysis: 1.0,
    runtime_data: 0.95,
    pattern_match: 0.8,
    historical: 0.75,
    llm_inference: 0.6,
    heuristic_guess: 0.4,
    user_feedback: 0.9,
  };
  return weights[source] || 0.5;
}

/**
 * Deduplicate flags
 */
function deduplicateFlags(flags: ConfidenceFlag[]): ConfidenceFlag[] {
  const seen = new Set<string>();
  return flags.filter(flag => {
    const key = `${flag.type}:${flag.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================================================
// CONFIDENCE DISPLAY UTILITIES
// ============================================================================

/**
 * Get display color for confidence score
 */
export function getConfidenceColor(score: number): string {
  if (score >= 0.9) return '#22c55e'; // green-500
  if (score >= 0.7) return '#84cc16'; // lime-500
  if (score >= 0.5) return '#eab308'; // yellow-500
  if (score >= 0.3) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

/**
 * Get display label for confidence score
 */
export function getConfidenceLabel(score: number): string {
  if (score >= 0.9) return 'Very High';
  if (score >= 0.7) return 'High';
  if (score >= 0.5) return 'Medium';
  if (score >= 0.3) return 'Low';
  return 'Very Low';
}

/**
 * Get display icon for confidence source
 */
export function getSourceIcon(source: ConfidenceSource): string {
  const icons: Record<ConfidenceSource, string> = {
    static_analysis: 'verified',
    runtime_data: 'pulse',
    pattern_match: 'search',
    historical: 'history',
    llm_inference: 'sparkles',
    heuristic_guess: 'question',
    user_feedback: 'user',
  };
  return icons[source] || 'circle';
}

/**
 * Format confidence for display
 */
export function formatConfidence(score: ConfidenceScore): {
  percentage: string;
  label: string;
  color: string;
  icon: string;
  tooltip: string;
} {
  const percentage = `${Math.round(score.adjusted * 100)}%`;
  const label = getConfidenceLabel(score.adjusted);
  const color = getConfidenceColor(score.adjusted);
  const icon = getSourceIcon(score.source);

  const flagSummary = score.flags.length > 0
    ? `\nFlags: ${score.flags.map(f => f.message).join(', ')}`
    : '';

  const tooltip = `${label} confidence (${percentage})\nSource: ${score.source}${flagSummary}`;

  return { percentage, label, color, icon, tooltip };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { ConfidenceCalculator as default };
