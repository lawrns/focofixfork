/**
 * CRICO VSCode Extension Integration
 * Provides IDE integration components for real-time alignment feedback
 *
 * Implements Section 7 of the CRICO Master Plan
 *
 * Components:
 * - Inline alignment indicators
 * - Sidebar alignment panel
 * - File-level confidence scores
 * - Real-time drift warnings
 * - One-click fix suggestions
 */

import type { DriftSeverity, Suggestion, SuggestionCategory } from '../types';
import type { AlignmentScore, DriftWarning, SuggestedFix } from '../alignment/AlignmentGraph';
import type { DriftResult } from '../alignment/DriftDetector';

// ============================================================================
// IDE INTEGRATION TYPES
// ============================================================================

export interface InlineIndicator {
  id: string;
  filePath: string;
  line: number;
  column?: number;
  type: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  severity: DriftSeverity;
  category: SuggestionCategory;
  quickFixes: QuickFix[];
  hoverContent: HoverContent;
}

export interface QuickFix {
  id: string;
  title: string;
  kind: 'quickfix' | 'refactor' | 'source';
  edit?: TextEdit[];
  command?: Command;
  isPreferred?: boolean;
}

export interface TextEdit {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  newText: string;
}

export interface Command {
  title: string;
  command: string;
  arguments?: unknown[];
}

export interface HoverContent {
  title: string;
  body: string;
  severity: DriftSeverity;
  confidence: number;
  relatedLinks?: { title: string; url: string }[];
  codeBlocks?: { language: string; code: string }[];
}

export interface SidebarPanelData {
  alignmentScore: number;
  breakdown: {
    axis: string;
    score: number;
    issues: number;
    icon: string;
  }[];
  activeWarnings: WarningItem[];
  suggestedActions: ActionItem[];
  recentActivity: ActivityItem[];
}

export interface WarningItem {
  id: string;
  title: string;
  description: string;
  severity: DriftSeverity;
  location?: { file: string; line: number };
  timestamp: Date;
  dismissable: boolean;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  command: Command;
}

export interface ActivityItem {
  id: string;
  type: 'check_run' | 'fix_applied' | 'warning_dismissed' | 'score_change';
  message: string;
  timestamp: Date;
  delta?: number;
}

export interface FileConfidence {
  filePath: string;
  overallScore: number;
  breakdown: {
    types: number;
    tests: number;
    docs: number;
    schema: number;
  };
  lastChecked: Date;
  issues: number;
}

// ============================================================================
// INDICATOR GENERATORS
// ============================================================================

/**
 * Generate inline indicators from drift results
 */
export function generateInlineIndicators(
  driftResult: DriftResult,
  filePath: string
): InlineIndicator[] {
  const indicators: InlineIndicator[] = [];

  for (const issue of driftResult.issues) {
    if (issue.filePath === filePath && issue.lineNumber) {
      const quickFixes: QuickFix[] = [];

      // Find matching suggestion
      const suggestion = driftResult.suggestions.find(s => s.issueId === issue.id);
      if (suggestion?.fix) {
        quickFixes.push({
          id: `fix_${issue.id}`,
          title: suggestion.title,
          kind: 'quickfix',
          isPreferred: true,
        });
      }

      indicators.push({
        id: issue.id,
        filePath,
        line: issue.lineNumber,
        type: severityToIndicatorType(issue.severity),
        message: issue.description,
        severity: issue.severity,
        category: mapIssueTypeToCategory(issue.type),
        quickFixes,
        hoverContent: {
          title: issue.title,
          body: issue.description,
          severity: issue.severity,
          confidence: driftResult.confidence,
        },
      });
    }
  }

  return indicators;
}

/**
 * Generate inline indicators from alignment warnings
 */
export function generateWarningIndicators(
  warnings: DriftWarning[],
  filePath: string
): InlineIndicator[] {
  const indicators: InlineIndicator[] = [];

  for (const warning of warnings) {
    // Only include warnings that might relate to this file
    // In a real implementation, warnings would have specific file locations
    indicators.push({
      id: warning.id,
      filePath,
      line: 1, // Would need actual line from warning
      type: severityToIndicatorType(warning.severity),
      message: warning.description,
      severity: warning.severity,
      category: 'schema_drift',
      quickFixes: warning.autoFixable ? [{
        id: `autofix_${warning.id}`,
        title: `Auto-fix: ${warning.title}`,
        kind: 'quickfix',
        isPreferred: true,
      }] : [],
      hoverContent: {
        title: warning.title,
        body: warning.description,
        severity: warning.severity,
        confidence: 0.8,
        relatedLinks: [
          { title: 'View in Alignment Panel', url: `crico://warnings/${warning.id}` },
        ],
      },
    });
  }

  return indicators;
}

/**
 * Map severity to indicator type
 */
function severityToIndicatorType(severity: DriftSeverity): InlineIndicator['type'] {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'info';
    default:
      return 'hint';
  }
}

/**
 * Map issue type to suggestion category
 */
function mapIssueTypeToCategory(issueType: string): SuggestionCategory {
  const mapping: Record<string, SuggestionCategory> = {
    'type_coherence': 'type_mismatch',
    'schema_alignment': 'schema_drift',
    'test_reality': 'test_gap',
    'dead_code': 'dead_code',
    'complexity_creep': 'over_engineering',
    'doc_freshness': 'doc_stale',
  };

  return mapping[issueType] || 'architectural_simplification';
}

// ============================================================================
// SIDEBAR PANEL DATA GENERATION
// ============================================================================

/**
 * Generate sidebar panel data from alignment score
 */
export function generateSidebarData(
  alignmentScore: AlignmentScore,
  recentDriftResults: DriftResult[]
): SidebarPanelData {
  // Generate breakdown with icons
  const breakdown = alignmentScore.breakdown.map(b => ({
    axis: formatAxisName(b.axis),
    score: b.score,
    issues: b.issues,
    icon: getAxisIcon(b.axis),
  }));

  // Convert warnings to warning items
  const activeWarnings: WarningItem[] = alignmentScore.driftWarnings
    .slice(0, 10)
    .map(w => ({
      id: w.id,
      title: w.title,
      description: w.description,
      severity: w.severity,
      timestamp: w.detectedAt,
      dismissable: w.severity !== 'critical',
    }));

  // Convert suggested fixes to action items
  const suggestedActions: ActionItem[] = alignmentScore.suggestedFixes
    .slice(0, 5)
    .map(f => ({
      id: f.id,
      title: f.description,
      description: `Confidence: ${Math.round(f.confidence * 100)}%`,
      effort: f.effort,
      impact: 'medium',
      command: {
        title: 'Apply Fix',
        command: 'crico.applyFix',
        arguments: [f.id],
      },
    }));

  // Generate recent activity from drift results
  const recentActivity: ActivityItem[] = recentDriftResults
    .slice(0, 10)
    .map((r, i) => ({
      id: `activity_${i}`,
      type: 'check_run' as const,
      message: `${r.checkType} check: ${r.issues.length} issues found`,
      timestamp: r.timestamp,
    }));

  return {
    alignmentScore: alignmentScore.overall,
    breakdown,
    activeWarnings,
    suggestedActions,
    recentActivity,
  };
}

/**
 * Format axis name for display
 */
function formatAxisName(axis: string): string {
  const names: Record<string, string> = {
    'ui_api_db': 'Schema Alignment',
    'spec_implementation': 'Spec Coverage',
    'test_behavior': 'Test Reality',
    'docs_reality': 'Doc Freshness',
  };
  return names[axis] || axis.replace(/_/g, ' ');
}

/**
 * Get icon for axis
 */
function getAxisIcon(axis: string): string {
  const icons: Record<string, string> = {
    'ui_api_db': 'database',
    'spec_implementation': 'checklist',
    'test_behavior': 'beaker',
    'docs_reality': 'book',
  };
  return icons[axis] || 'circle';
}

// ============================================================================
// FILE CONFIDENCE CALCULATION
// ============================================================================

/**
 * Calculate confidence score for a single file
 */
export function calculateFileConfidence(
  filePath: string,
  driftResults: DriftResult[]
): FileConfidence {
  const fileResults = driftResults.filter(r =>
    r.issues.some(i => i.filePath === filePath)
  );

  // Calculate per-category scores
  const typeIssues = fileResults
    .filter(r => r.checkType === 'type_coherence')
    .reduce((sum, r) => sum + r.issues.length, 0);

  const testIssues = fileResults
    .filter(r => r.checkType === 'test_reality')
    .reduce((sum, r) => sum + r.issues.length, 0);

  const docIssues = fileResults
    .filter(r => r.checkType === 'doc_freshness')
    .reduce((sum, r) => sum + r.issues.length, 0);

  const schemaIssues = fileResults
    .filter(r => r.checkType === 'schema_alignment')
    .reduce((sum, r) => sum + r.issues.length, 0);

  // Calculate scores (100 minus penalty per issue)
  const calculateScore = (issues: number) => Math.max(0, 100 - issues * 10);

  const breakdown = {
    types: calculateScore(typeIssues),
    tests: calculateScore(testIssues),
    docs: calculateScore(docIssues),
    schema: calculateScore(schemaIssues),
  };

  const overallScore = Math.round(
    (breakdown.types + breakdown.tests + breakdown.docs + breakdown.schema) / 4
  );

  const totalIssues = typeIssues + testIssues + docIssues + schemaIssues;

  return {
    filePath,
    overallScore,
    breakdown,
    lastChecked: new Date(),
    issues: totalIssues,
  };
}

// ============================================================================
// VSCODE EXTENSION MESSAGE PROTOCOL
// ============================================================================

export type VSCodeMessage =
  | { type: 'updateIndicators'; indicators: InlineIndicator[] }
  | { type: 'updateSidebar'; data: SidebarPanelData }
  | { type: 'updateFileConfidence'; confidence: FileConfidence }
  | { type: 'showNotification'; severity: DriftSeverity; message: string }
  | { type: 'applyFix'; fixId: string }
  | { type: 'dismissWarning'; warningId: string }
  | { type: 'runCheck'; checkType: string }
  | { type: 'refreshAll' };

/**
 * Create a message for updating inline indicators
 */
export function createIndicatorMessage(
  indicators: InlineIndicator[]
): VSCodeMessage {
  return { type: 'updateIndicators', indicators };
}

/**
 * Create a message for updating sidebar
 */
export function createSidebarMessage(data: SidebarPanelData): VSCodeMessage {
  return { type: 'updateSidebar', data };
}

/**
 * Create a message for updating file confidence
 */
export function createFileConfidenceMessage(
  confidence: FileConfidence
): VSCodeMessage {
  return { type: 'updateFileConfidence', confidence };
}

/**
 * Create a notification message
 */
export function createNotificationMessage(
  severity: DriftSeverity,
  message: string
): VSCodeMessage {
  return { type: 'showNotification', severity, message };
}

// ============================================================================
// DECORATION CONFIGURATION
// ============================================================================

export interface DecorationConfig {
  critical: DecorationStyle;
  high: DecorationStyle;
  medium: DecorationStyle;
  low: DecorationStyle;
  info: DecorationStyle;
}

export interface DecorationStyle {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  gutterIcon: string;
  overviewRulerColor: string;
}

/**
 * Default decoration configuration
 */
export const DEFAULT_DECORATION_CONFIG: DecorationConfig = {
  critical: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)', // red-500
    borderColor: '#ef4444',
    textColor: '#fecaca',
    gutterIcon: 'error',
    overviewRulerColor: '#ef4444',
  },
  high: {
    backgroundColor: 'rgba(249, 115, 22, 0.2)', // orange-500
    borderColor: '#f97316',
    textColor: '#fed7aa',
    gutterIcon: 'warning',
    overviewRulerColor: '#f97316',
  },
  medium: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)', // yellow-500
    borderColor: '#eab308',
    textColor: '#fef08a',
    gutterIcon: 'warning',
    overviewRulerColor: '#eab308',
  },
  low: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)', // blue-500
    borderColor: '#3b82f6',
    textColor: '#93c5fd',
    gutterIcon: 'info',
    overviewRulerColor: '#3b82f6',
  },
  info: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)', // gray-500
    borderColor: '#6b7280',
    textColor: '#d1d5db',
    gutterIcon: 'lightbulb',
    overviewRulerColor: '#6b7280',
  },
};

/**
 * Get decoration style for severity
 */
export function getDecorationForSeverity(
  severity: DriftSeverity,
  config: DecorationConfig = DEFAULT_DECORATION_CONFIG
): DecorationStyle {
  return config[severity] || config.info;
}

// ============================================================================
// STATUS BAR INTEGRATION
// ============================================================================

export interface StatusBarItem {
  text: string;
  tooltip: string;
  color?: string;
  backgroundColor?: string;
  command?: string;
  priority?: number;
}

/**
 * Generate status bar item from alignment score
 */
export function generateStatusBarItem(
  alignmentScore: AlignmentScore
): StatusBarItem {
  const score = alignmentScore.overall;
  let emoji: string;
  let color: string;

  if (score >= 90) {
    emoji = '$(check)';
    color = '#22c55e'; // green
  } else if (score >= 70) {
    emoji = '$(warning)';
    color = '#eab308'; // yellow
  } else if (score >= 50) {
    emoji = '$(alert)';
    color = '#f97316'; // orange
  } else {
    emoji = '$(error)';
    color = '#ef4444'; // red
  }

  const warningCount = alignmentScore.driftWarnings.length;
  const warningText = warningCount > 0 ? ` (${warningCount})` : '';

  return {
    text: `${emoji} CRICO: ${score}%${warningText}`,
    tooltip: `Alignment Score: ${score}%\nWarnings: ${warningCount}\nClick to open CRICO panel`,
    color,
    command: 'crico.openPanel',
    priority: 100,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const VSCodeIntegration = {
  generateInlineIndicators,
  generateWarningIndicators,
  generateSidebarData,
  calculateFileConfidence,
  createIndicatorMessage,
  createSidebarMessage,
  createFileConfidenceMessage,
  createNotificationMessage,
  getDecorationForSeverity,
  generateStatusBarItem,
  DEFAULT_DECORATION_CONFIG,
};
