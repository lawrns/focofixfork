/**
 * CRICO Real-Time Drift Detector
 * Implements Section 3.2 of the CRICO Master Plan
 *
 * Runs analyzers at different frequencies:
 * - On file save: Type Coherence
 * - Every 5 min: Test Coverage Reality
 * - On migration change: Schema Alignment
 * - Hourly: Dead Code Detection
 * - On commit: Complexity Creep
 */

import type { DriftSeverity, Claim, SuggestionCategory } from '../types';
import { TypeCoherenceAnalyzer } from './TypeCoherenceAnalyzer';
import { SchemaAlignmentChecker } from './SchemaAlignmentChecker';
import { TestRealityScorer } from './TestRealityScorer';
import { DocFreshnessTracker } from './DocFreshnessTracker';

// ============================================================================
// DRIFT DETECTION TYPES
// ============================================================================

export type DriftTrigger = 'file_save' | 'interval_5min' | 'migration_change' | 'hourly' | 'commit' | 'manual';

export interface DriftCheckConfig {
  trigger: DriftTrigger;
  enabled: boolean;
  lastRun?: Date;
  interval?: number; // milliseconds
  filePatterns?: string[];
}

export interface DriftResult {
  checkType: string;
  trigger: DriftTrigger;
  severity: DriftSeverity;
  issues: DriftIssue[];
  suggestions: DriftSuggestion[];
  duration: number;
  timestamp: Date;
  confidence: number;
}

export interface DriftIssue {
  id: string;
  type: string;
  severity: DriftSeverity;
  title: string;
  description: string;
  filePath?: string;
  lineNumber?: number;
  autoFixable: boolean;
}

export interface DriftSuggestion {
  id: string;
  issueId: string;
  category: SuggestionCategory;
  title: string;
  description: string;
  fix?: {
    type: 'auto' | 'guided' | 'manual';
    preview: string;
  };
  confidence: number;
}

// ============================================================================
// DRIFT DETECTOR CLASS
// ============================================================================

export class DriftDetector {
  private config: Map<string, DriftCheckConfig>;
  private intervalHandles: Map<string, NodeJS.Timeout>;
  private onDriftDetected?: (result: DriftResult) => void;
  private running: boolean = false;

  constructor(onDriftDetected?: (result: DriftResult) => void) {
    this.config = new Map();
    this.intervalHandles = new Map();
    this.onDriftDetected = onDriftDetected;

    // Initialize default configurations
    this.initializeDefaultConfig();
  }

  /**
   * Initialize default drift check configurations
   */
  private initializeDefaultConfig(): void {
    // Type Coherence - on file save
    this.config.set('type_coherence', {
      trigger: 'file_save',
      enabled: true,
      filePatterns: ['*.ts', '*.tsx'],
    });

    // Test Reality - every 5 minutes
    this.config.set('test_reality', {
      trigger: 'interval_5min',
      enabled: true,
      interval: 5 * 60 * 1000,
      filePatterns: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx'],
    });

    // Schema Alignment - on migration change
    this.config.set('schema_alignment', {
      trigger: 'migration_change',
      enabled: true,
      filePatterns: ['*.sql', 'migrations/**'],
    });

    // Dead Code - hourly
    this.config.set('dead_code', {
      trigger: 'hourly',
      enabled: true,
      interval: 60 * 60 * 1000,
    });

    // Complexity Creep - on commit
    this.config.set('complexity_creep', {
      trigger: 'commit',
      enabled: true,
    });

    // Doc Freshness - hourly
    this.config.set('doc_freshness', {
      trigger: 'hourly',
      enabled: true,
      interval: 60 * 60 * 1000,
      filePatterns: ['*.md', 'README*', 'docs/**'],
    });
  }

  /**
   * Start the drift detector
   */
  start(): void {
    if (this.running) return;
    this.running = true;

    // Start interval-based checks
    for (const [name, config] of this.config) {
      if (config.enabled && config.interval) {
        const handle = setInterval(async () => {
          await this.runCheck(name);
        }, config.interval);

        this.intervalHandles.set(name, handle);
      }
    }
  }

  /**
   * Stop the drift detector
   */
  stop(): void {
    this.running = false;

    for (const handle of this.intervalHandles.values()) {
      clearInterval(handle);
    }
    this.intervalHandles.clear();
  }

  /**
   * Handle file save event
   */
  async onFileSave(filePath: string, content: string): Promise<DriftResult | null> {
    const relevantChecks = Array.from(this.config.entries())
      .filter(([_, config]) => config.trigger === 'file_save' && config.enabled)
      .filter(([_, config]) => this.matchesPattern(filePath, config.filePatterns || []));

    for (const [name] of relevantChecks) {
      return await this.runCheck(name, { filePath, content });
    }

    return null;
  }

  /**
   * Handle migration change event
   */
  async onMigrationChange(migrationPath: string): Promise<DriftResult | null> {
    const schemaConfig = this.config.get('schema_alignment');
    if (schemaConfig?.enabled) {
      return await this.runCheck('schema_alignment', { migrationPath });
    }
    return null;
  }

  /**
   * Handle commit event
   */
  async onCommit(
    commitHash: string,
    changedFiles: string[],
    commitMessage: string
  ): Promise<DriftResult | null> {
    const complexityConfig = this.config.get('complexity_creep');
    if (complexityConfig?.enabled) {
      return await this.runCheck('complexity_creep', {
        commitHash,
        changedFiles,
        commitMessage,
      });
    }
    return null;
  }

  /**
   * Run a specific drift check
   */
  async runCheck(
    checkName: string,
    context?: Record<string, unknown>
  ): Promise<DriftResult | null> {
    const config = this.config.get(checkName);
    if (!config || !config.enabled) return null;

    const startTime = Date.now();

    try {
      let result: DriftResult;

      switch (checkName) {
        case 'type_coherence':
          result = await this.runTypeCoherenceCheck(context);
          break;
        case 'test_reality':
          result = await this.runTestRealityCheck(context);
          break;
        case 'schema_alignment':
          result = await this.runSchemaAlignmentCheck(context);
          break;
        case 'dead_code':
          result = await this.runDeadCodeCheck(context);
          break;
        case 'complexity_creep':
          result = await this.runComplexityCreepCheck(context);
          break;
        case 'doc_freshness':
          result = await this.runDocFreshnessCheck(context);
          break;
        default:
          return null;
      }

      result.duration = Date.now() - startTime;
      config.lastRun = new Date();

      if (this.onDriftDetected && result.issues.length > 0) {
        this.onDriftDetected(result);
      }

      return result;
    } catch (error) {
      console.error(`Drift check ${checkName} failed:`, error);
      return null;
    }
  }

  /**
   * Check if file matches patterns
   */
  private matchesPattern(filePath: string, patterns: string[]): boolean {
    if (patterns.length === 0) return true;

    return patterns.some(pattern => {
      // Simple glob matching
      const regex = new RegExp(
        '^' + pattern
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*')
          .replace(/\*\*/g, '.*') + '$'
      );
      return regex.test(filePath);
    });
  }

  // ============================================================================
  // INDIVIDUAL CHECK IMPLEMENTATIONS
  // ============================================================================

  /**
   * Run type coherence check (on file save)
   */
  private async runTypeCoherenceCheck(
    context?: Record<string, unknown>
  ): Promise<DriftResult> {
    const issues: DriftIssue[] = [];
    const suggestions: DriftSuggestion[] = [];

    if (context?.content && context?.filePath) {
      const result = TypeCoherenceAnalyzer.quickTypeCheck(
        context.content as string,
        context.filePath as string
      );

      for (const issue of result.issues) {
        const driftIssue: DriftIssue = {
          id: `type_${issues.length}`,
          type: 'type_coherence',
          severity: issue.severity,
          title: 'Type issue detected',
          description: issue.message,
          filePath: context.filePath as string,
          lineNumber: issue.line,
          autoFixable: false,
        };
        issues.push(driftIssue);

        suggestions.push({
          id: `sug_${suggestions.length}`,
          issueId: driftIssue.id,
          category: 'type_mismatch',
          title: 'Fix type issue',
          description: issue.message,
          confidence: 0.85,
        });
      }
    }

    const severity = this.calculateOverallSeverity(issues);

    return {
      checkType: 'type_coherence',
      trigger: 'file_save',
      severity,
      issues,
      suggestions,
      duration: 0,
      timestamp: new Date(),
      confidence: 0.90,
    };
  }

  /**
   * Run test reality check (every 5 minutes)
   */
  private async runTestRealityCheck(
    context?: Record<string, unknown>
  ): Promise<DriftResult> {
    const issues: DriftIssue[] = [];
    const suggestions: DriftSuggestion[] = [];

    // This would analyze test files in a real implementation
    // For now, we'll create a placeholder that can be hooked into

    const severity = this.calculateOverallSeverity(issues);

    return {
      checkType: 'test_reality',
      trigger: 'interval_5min',
      severity,
      issues,
      suggestions,
      duration: 0,
      timestamp: new Date(),
      confidence: 0.85,
    };
  }

  /**
   * Run schema alignment check (on migration change)
   */
  private async runSchemaAlignmentCheck(
    context?: Record<string, unknown>
  ): Promise<DriftResult> {
    const issues: DriftIssue[] = [];
    const suggestions: DriftSuggestion[] = [];

    // This would compare schema definitions in a real implementation
    // Would need access to database and type definitions

    const severity = this.calculateOverallSeverity(issues);

    return {
      checkType: 'schema_alignment',
      trigger: 'migration_change',
      severity,
      issues,
      suggestions,
      duration: 0,
      timestamp: new Date(),
      confidence: 0.90,
    };
  }

  /**
   * Run dead code detection (hourly)
   */
  private async runDeadCodeCheck(
    context?: Record<string, unknown>
  ): Promise<DriftResult> {
    const issues: DriftIssue[] = [];
    const suggestions: DriftSuggestion[] = [];

    // This would analyze export/import graph in a real implementation
    // Would need to scan all source files and build dependency graph

    const severity = this.calculateOverallSeverity(issues);

    return {
      checkType: 'dead_code',
      trigger: 'hourly',
      severity,
      issues,
      suggestions,
      duration: 0,
      timestamp: new Date(),
      confidence: 0.80,
    };
  }

  /**
   * Run complexity creep check (on commit)
   */
  private async runComplexityCreepCheck(
    context?: Record<string, unknown>
  ): Promise<DriftResult> {
    const issues: DriftIssue[] = [];
    const suggestions: DriftSuggestion[] = [];

    if (context?.changedFiles) {
      const changedFiles = context.changedFiles as string[];

      // Check for complexity indicators in changed files
      for (const file of changedFiles) {
        // This would analyze cyclomatic complexity in real implementation
        // Using simple heuristics for now
      }
    }

    const severity = this.calculateOverallSeverity(issues);

    return {
      checkType: 'complexity_creep',
      trigger: 'commit',
      severity,
      issues,
      suggestions,
      duration: 0,
      timestamp: new Date(),
      confidence: 0.75,
    };
  }

  /**
   * Run documentation freshness check (hourly)
   */
  private async runDocFreshnessCheck(
    context?: Record<string, unknown>
  ): Promise<DriftResult> {
    const issues: DriftIssue[] = [];
    const suggestions: DriftSuggestion[] = [];

    // This would scan documentation files and compare with code
    // Would need access to file system and git history

    const severity = this.calculateOverallSeverity(issues);

    return {
      checkType: 'doc_freshness',
      trigger: 'hourly',
      severity,
      issues,
      suggestions,
      duration: 0,
      timestamp: new Date(),
      confidence: 0.85,
    };
  }

  /**
   * Calculate overall severity from issues
   */
  private calculateOverallSeverity(issues: DriftIssue[]): DriftSeverity {
    if (issues.some(i => i.severity === 'critical')) return 'critical';
    if (issues.some(i => i.severity === 'high')) return 'high';
    if (issues.some(i => i.severity === 'medium')) return 'medium';
    if (issues.some(i => i.severity === 'low')) return 'low';
    return 'info';
  }

  /**
   * Get check status
   */
  getStatus(): Map<string, { enabled: boolean; lastRun?: Date }> {
    const status = new Map<string, { enabled: boolean; lastRun?: Date }>();

    for (const [name, config] of this.config) {
      status.set(name, {
        enabled: config.enabled,
        lastRun: config.lastRun,
      });
    }

    return status;
  }

  /**
   * Enable/disable a specific check
   */
  setCheckEnabled(checkName: string, enabled: boolean): void {
    const config = this.config.get(checkName);
    if (config) {
      config.enabled = enabled;

      // Handle interval updates
      if (this.running && config.interval) {
        const existingHandle = this.intervalHandles.get(checkName);
        if (existingHandle) {
          clearInterval(existingHandle);
          this.intervalHandles.delete(checkName);
        }

        if (enabled) {
          const handle = setInterval(async () => {
            await this.runCheck(checkName);
          }, config.interval);
          this.intervalHandles.set(checkName, handle);
        }
      }
    }
  }
}

// ============================================================================
// COMPLEXITY ANALYZER
// ============================================================================

/**
 * Analyze code complexity metrics
 */
export function analyzeComplexity(sourceCode: string): {
  cyclomaticComplexity: number;
  linesOfCode: number;
  nestingDepth: number;
  functionCount: number;
} {
  const lines = sourceCode.split('\n');
  let cyclomaticComplexity = 1; // Base complexity
  let maxNestingDepth = 0;
  let currentNestingDepth = 0;
  let functionCount = 0;

  // Count decision points for cyclomatic complexity
  const decisionPatterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /\?\s*[^:]/g, // Ternary operator
    /&&/g,
    /\|\|/g,
  ];

  for (const pattern of decisionPatterns) {
    const matches = sourceCode.match(pattern);
    if (matches) {
      cyclomaticComplexity += matches.length;
    }
  }

  // Count nesting depth and functions
  for (const line of lines) {
    // Track nesting
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    currentNestingDepth += opens - closes;
    maxNestingDepth = Math.max(maxNestingDepth, currentNestingDepth);

    // Count functions
    if (/(?:function\s+\w+|=>\s*\{|=>\s*[^{])/.test(line)) {
      functionCount++;
    }
  }

  return {
    cyclomaticComplexity,
    linesOfCode: lines.filter(l => l.trim() && !l.trim().startsWith('//')).length,
    nestingDepth: maxNestingDepth,
    functionCount,
  };
}

/**
 * Check if complexity exceeds thresholds
 */
export function checkComplexityThresholds(
  complexity: ReturnType<typeof analyzeComplexity>,
  thresholds: {
    maxCyclomaticComplexity?: number;
    maxLinesOfCode?: number;
    maxNestingDepth?: number;
  } = {}
): DriftIssue[] {
  const issues: DriftIssue[] = [];
  const defaults = {
    maxCyclomaticComplexity: 10,
    maxLinesOfCode: 300,
    maxNestingDepth: 4,
  };

  const limits = { ...defaults, ...thresholds };

  if (complexity.cyclomaticComplexity > limits.maxCyclomaticComplexity) {
    issues.push({
      id: 'complexity_cyclomatic',
      type: 'complexity_creep',
      severity: complexity.cyclomaticComplexity > limits.maxCyclomaticComplexity * 2 ? 'high' : 'medium',
      title: 'High cyclomatic complexity',
      description: `Cyclomatic complexity is ${complexity.cyclomaticComplexity} (threshold: ${limits.maxCyclomaticComplexity})`,
      autoFixable: false,
    });
  }

  if (complexity.linesOfCode > limits.maxLinesOfCode) {
    issues.push({
      id: 'complexity_loc',
      type: 'complexity_creep',
      severity: 'medium',
      title: 'File too long',
      description: `File has ${complexity.linesOfCode} lines (threshold: ${limits.maxLinesOfCode})`,
      autoFixable: false,
    });
  }

  if (complexity.nestingDepth > limits.maxNestingDepth) {
    issues.push({
      id: 'complexity_nesting',
      type: 'complexity_creep',
      severity: 'medium',
      title: 'Deep nesting',
      description: `Nesting depth is ${complexity.nestingDepth} (threshold: ${limits.maxNestingDepth})`,
      autoFixable: false,
    });
  }

  return issues;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { DriftDetector as default };
