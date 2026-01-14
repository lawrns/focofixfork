/**
 * CRICO Alignment Graph
 * The continuous mental model from Section 2.2 of the CRICO Master Plan
 *
 * Maintains a living graph of:
 * - Spec (Intent)
 * - Code (Expression)
 * - Runtime (Reality)
 * - Types
 * - Tests
 * - Docs
 *
 * Cross-layer verification and drift detection
 */

import type { AlignmentAxis, AlignmentMismatch, DriftSeverity, Claim } from '../types';
import { SchemaAlignmentChecker, type AlignmentCheckResult } from './SchemaAlignmentChecker';
import { TypeCoherenceAnalyzer, type CoherenceCheckResult } from './TypeCoherenceAnalyzer';
import { TestRealityScorer, type TestRealityScore } from './TestRealityScorer';
import { DocFreshnessTracker, type OverallFreshnessScore } from './DocFreshnessTracker';
import { SpecImplementationMapper, type SpecImplementationMapping } from './SpecImplementationMapper';

// ============================================================================
// ALIGNMENT GRAPH TYPES
// ============================================================================

export interface Intent {
  id: string;
  source: 'ticket' | 'prd' | 'user_story' | 'comment' | 'conversation';
  description: string;
  requirements: string[];
  acceptanceCriteria: string[];
  linkedImplementations: string[];
  confidence: number;
}

export interface Implementation {
  id: string;
  filePath: string;
  symbolName: string;
  type: 'function' | 'class' | 'module' | 'component';
  linkedIntents: string[];
  linkedTypes: string[];
  linkedTests: string[];
  lastModified: Date;
  complexity: number;
}

export interface RuntimeBehavior {
  id: string;
  endpoint?: string;
  eventType?: string;
  observedAt: Date;
  responseShape?: Record<string, unknown>;
  errorPatterns: string[];
  performanceMetrics: {
    p50: number;
    p95: number;
    p99: number;
  };
}

export interface TypeDefinitionNode {
  id: string;
  name: string;
  filePath: string;
  properties: string[];
  linkedImplementations: string[];
  linkedRuntime: string[];
}

export interface TestCoverageNode {
  id: string;
  testFilePath: string;
  coveredImplementations: string[];
  assertionCount: number;
  mockCount: number;
  realityScore: number;
}

export interface DocumentationNode {
  id: string;
  docFilePath: string;
  linkedCode: string[];
  freshnessScore: number;
  lastUpdated: Date;
}

export interface AlignmentGraph {
  spec: Intent[];
  code: Implementation[];
  runtime: RuntimeBehavior[];
  types: TypeDefinitionNode[];
  tests: TestCoverageNode[];
  docs: DocumentationNode[];

  // Cross-layer edges
  edges: AlignmentEdge[];

  // Metadata
  lastUpdated: Date;
  version: string;
}

export interface AlignmentEdge {
  from: { layer: AlignmentLayer; id: string };
  to: { layer: AlignmentLayer; id: string };
  type: 'implements' | 'tests' | 'documents' | 'types' | 'observes';
  strength: number; // 0-1, how strong the relationship is
  verified: boolean;
}

export type AlignmentLayer = 'spec' | 'code' | 'runtime' | 'types' | 'tests' | 'docs';

// ============================================================================
// ALIGNMENT SCORE
// ============================================================================

export interface AlignmentScore {
  overall: number; // 0-100
  breakdown: {
    axis: AlignmentAxis;
    score: number;
    weight: number;
    issues: number;
  }[];
  driftWarnings: DriftWarning[];
  suggestedFixes: SuggestedFix[];
  confidence: number;
  timestamp: Date;
}

export interface DriftWarning {
  id: string;
  axis: AlignmentAxis;
  severity: DriftSeverity;
  title: string;
  description: string;
  affectedLayers: AlignmentLayer[];
  detectedAt: Date;
  autoFixable: boolean;
}

export interface SuggestedFix {
  id: string;
  warningId: string;
  type: 'generate' | 'update' | 'delete' | 'refactor';
  description: string;
  targetFile?: string;
  changes?: string;
  confidence: number;
  effort: 'low' | 'medium' | 'high';
}

// ============================================================================
// ALIGNMENT GRAPH BUILDER
// ============================================================================

export class AlignmentGraphBuilder {
  private graph: AlignmentGraph;

  constructor() {
    this.graph = {
      spec: [],
      code: [],
      runtime: [],
      types: [],
      tests: [],
      docs: [],
      edges: [],
      lastUpdated: new Date(),
      version: '1.0.0',
    };
  }

  /**
   * Add an intent/spec node
   */
  addIntent(intent: Intent): this {
    this.graph.spec.push(intent);
    return this;
  }

  /**
   * Add an implementation node
   */
  addImplementation(impl: Implementation): this {
    this.graph.code.push(impl);
    return this;
  }

  /**
   * Add a runtime behavior node
   */
  addRuntimeBehavior(behavior: RuntimeBehavior): this {
    this.graph.runtime.push(behavior);
    return this;
  }

  /**
   * Add a type definition node
   */
  addTypeDefinition(typeDef: TypeDefinitionNode): this {
    this.graph.types.push(typeDef);
    return this;
  }

  /**
   * Add a test coverage node
   */
  addTestCoverage(test: TestCoverageNode): this {
    this.graph.tests.push(test);
    return this;
  }

  /**
   * Add a documentation node
   */
  addDocumentation(doc: DocumentationNode): this {
    this.graph.docs.push(doc);
    return this;
  }

  /**
   * Add an edge between nodes
   */
  addEdge(edge: AlignmentEdge): this {
    this.graph.edges.push(edge);
    return this;
  }

  /**
   * Build and return the graph
   */
  build(): AlignmentGraph {
    this.graph.lastUpdated = new Date();
    return this.graph;
  }
}

// ============================================================================
// ALIGNMENT CALCULATOR
// ============================================================================

export class AlignmentCalculator {
  private schemaResult?: AlignmentCheckResult;
  private typeResult?: CoherenceCheckResult;
  private testResult?: TestRealityScore;
  private docResult?: OverallFreshnessScore;
  private specMappings: SpecImplementationMapping[] = [];

  /**
   * Set schema alignment result
   */
  withSchemaAlignment(result: AlignmentCheckResult): this {
    this.schemaResult = result;
    return this;
  }

  /**
   * Set type coherence result
   */
  withTypeCoherence(result: CoherenceCheckResult): this {
    this.typeResult = result;
    return this;
  }

  /**
   * Set test reality result
   */
  withTestReality(result: TestRealityScore): this {
    this.testResult = result;
    return this;
  }

  /**
   * Set documentation freshness result
   */
  withDocFreshness(result: OverallFreshnessScore): this {
    this.docResult = result;
    return this;
  }

  /**
   * Add spec-implementation mapping
   */
  withSpecMapping(mapping: SpecImplementationMapping): this {
    this.specMappings.push(mapping);
    return this;
  }

  /**
   * Calculate overall alignment score
   */
  calculateAlignment(): AlignmentScore {
    const breakdown: AlignmentScore['breakdown'] = [];
    const driftWarnings: DriftWarning[] = [];
    const suggestedFixes: SuggestedFix[] = [];

    // UI ↔ API ↔ DB alignment (weight: 30%)
    if (this.schemaResult) {
      const score = this.schemaResult.aligned ? 100 : Math.max(0, 100 - this.schemaResult.mismatches.length * 10);
      breakdown.push({
        axis: 'ui_api_db',
        score,
        weight: 0.30,
        issues: this.schemaResult.mismatches.length,
      });

      // Generate warnings from mismatches
      for (const mismatch of this.schemaResult.mismatches) {
        driftWarnings.push({
          id: `schema_${driftWarnings.length}`,
          axis: 'ui_api_db',
          severity: mismatch.severity,
          title: `Schema mismatch: ${mismatch.type}`,
          description: mismatch.suggestion || `${mismatch.source} → ${mismatch.target} mismatch`,
          affectedLayers: ['code', 'types'],
          detectedAt: new Date(),
          autoFixable: mismatch.type === 'type_mismatch',
        });
      }
    }

    // Spec ↔ Implementation alignment (weight: 25%)
    if (this.specMappings.length > 0) {
      const avgCoverage = this.specMappings.reduce((sum, m) => sum + m.coverageScore, 0) / this.specMappings.length;
      const avgDrift = this.specMappings.reduce((sum, m) => sum + m.driftScore, 0) / this.specMappings.length;
      const score = Math.round(avgCoverage * (1 - avgDrift / 100));

      breakdown.push({
        axis: 'spec_implementation',
        score,
        weight: 0.25,
        issues: this.specMappings.reduce((sum, m) => sum + m.issues.length, 0),
      });

      // Generate warnings from spec issues
      for (const mapping of this.specMappings) {
        for (const issue of mapping.issues) {
          driftWarnings.push({
            id: `spec_${driftWarnings.length}`,
            axis: 'spec_implementation',
            severity: issue.severity,
            title: issue.type.replace(/_/g, ' '),
            description: issue.description,
            affectedLayers: ['spec', 'code'],
            detectedAt: new Date(),
            autoFixable: false,
          });
        }
      }
    }

    // Test ↔ Behavior alignment (weight: 25%)
    if (this.testResult) {
      breakdown.push({
        axis: 'test_behavior',
        score: this.testResult.overall,
        weight: 0.25,
        issues: this.testResult.warnings.length,
      });

      // Generate warnings from test issues
      for (const warning of this.testResult.warnings) {
        driftWarnings.push({
          id: `test_${driftWarnings.length}`,
          axis: 'test_behavior',
          severity: warning.severity,
          title: warning.type.replace(/_/g, ' '),
          description: warning.message,
          affectedLayers: ['tests', 'code'],
          detectedAt: new Date(),
          autoFixable: false,
        });
      }
    }

    // Docs ↔ Reality alignment (weight: 20%)
    if (this.docResult) {
      breakdown.push({
        axis: 'docs_reality',
        score: this.docResult.score,
        weight: 0.20,
        issues: this.docResult.staleDocs,
      });

      // Generate warnings from doc issues
      for (const doc of this.docResult.worstOffenders) {
        driftWarnings.push({
          id: `doc_${driftWarnings.length}`,
          axis: 'docs_reality',
          severity: doc.severity,
          title: `Stale documentation: ${doc.file}`,
          description: doc.recommendations.join('; '),
          affectedLayers: ['docs', 'code'],
          detectedAt: new Date(),
          autoFixable: false,
        });
      }
    }

    // Calculate weighted overall score
    const totalWeight = breakdown.reduce((sum, b) => sum + b.weight, 0);
    const overall = totalWeight > 0
      ? Math.round(breakdown.reduce((sum, b) => sum + b.score * b.weight, 0) / totalWeight)
      : 100;

    // Generate suggested fixes for auto-fixable warnings
    for (const warning of driftWarnings.filter(w => w.autoFixable)) {
      suggestedFixes.push({
        id: `fix_${suggestedFixes.length}`,
        warningId: warning.id,
        type: 'update',
        description: `Auto-fix ${warning.title}`,
        confidence: 0.8,
        effort: 'low',
      });
    }

    // Calculate confidence based on available data
    const dataPoints = [
      this.schemaResult ? 1 : 0,
      this.typeResult ? 1 : 0,
      this.testResult ? 1 : 0,
      this.docResult ? 1 : 0,
      this.specMappings.length > 0 ? 1 : 0,
    ];
    const confidence = dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length;

    return {
      overall,
      breakdown,
      driftWarnings,
      suggestedFixes,
      confidence,
      timestamp: new Date(),
    };
  }
}

// ============================================================================
// DRIFT DETECTION
// ============================================================================

/**
 * Detect drift across all alignment axes
 */
export async function detectDrift(
  graph: AlignmentGraph
): Promise<DriftWarning[]> {
  const warnings: DriftWarning[] = [];

  // Check for orphaned implementations (no linked specs)
  for (const impl of graph.code) {
    if (impl.linkedIntents.length === 0) {
      warnings.push({
        id: `orphan_impl_${impl.id}`,
        axis: 'spec_implementation',
        severity: 'low',
        title: 'Orphaned implementation',
        description: `${impl.symbolName} in ${impl.filePath} has no linked spec`,
        affectedLayers: ['code', 'spec'],
        detectedAt: new Date(),
        autoFixable: false,
      });
    }
  }

  // Check for untested implementations
  for (const impl of graph.code) {
    if (impl.linkedTests.length === 0 && impl.complexity > 10) {
      warnings.push({
        id: `untested_impl_${impl.id}`,
        axis: 'test_behavior',
        severity: 'medium',
        title: 'Untested complex code',
        description: `${impl.symbolName} has complexity ${impl.complexity} but no tests`,
        affectedLayers: ['code', 'tests'],
        detectedAt: new Date(),
        autoFixable: false,
      });
    }
  }

  // Check for stale documentation
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const doc of graph.docs) {
    if (doc.lastUpdated < thirtyDaysAgo && doc.freshnessScore < 50) {
      warnings.push({
        id: `stale_doc_${doc.id}`,
        axis: 'docs_reality',
        severity: 'medium',
        title: 'Stale documentation',
        description: `${doc.docFilePath} hasn't been updated in 30+ days`,
        affectedLayers: ['docs'],
        detectedAt: new Date(),
        autoFixable: false,
      });
    }
  }

  // Check for type-implementation misalignment
  for (const typeDef of graph.types) {
    if (typeDef.linkedImplementations.length === 0) {
      warnings.push({
        id: `unused_type_${typeDef.id}`,
        axis: 'ui_api_db',
        severity: 'low',
        title: 'Unused type definition',
        description: `Type ${typeDef.name} is not used by any implementation`,
        affectedLayers: ['types', 'code'],
        detectedAt: new Date(),
        autoFixable: false,
      });
    }
  }

  // Check for weak edges (low strength relationships)
  const weakEdges = graph.edges.filter(e => e.strength < 0.3 && !e.verified);
  for (const edge of weakEdges) {
    warnings.push({
      id: `weak_edge_${edge.from.id}_${edge.to.id}`,
      axis: 'spec_implementation',
      severity: 'low',
      title: 'Weak relationship',
      description: `${edge.type} relationship between ${edge.from.layer}:${edge.from.id} and ${edge.to.layer}:${edge.to.id} is weak`,
      affectedLayers: [edge.from.layer, edge.to.layer],
      detectedAt: new Date(),
      autoFixable: false,
    });
  }

  return warnings;
}

// ============================================================================
// CLAIMS GENERATION
// ============================================================================

/**
 * Generate claims from alignment analysis
 */
export function generateAlignmentClaims(score: AlignmentScore): Claim[] {
  const claims: Claim[] = [];

  // Overall alignment claim
  claims.push({
    statement: score.overall >= 80
      ? `System alignment is ${score.overall}% - code matches intent across layers`
      : `System alignment is only ${score.overall}% - significant drift detected`,
    confidence: score.confidence,
    evidence: [
      {
        type: 'static_analysis',
        source: 'AlignmentGraph',
        data: {
          overall: score.overall,
          breakdown: score.breakdown,
          warningCount: score.driftWarnings.length,
        },
        weight: score.confidence,
      },
    ],
    methodology: 'Cross-layer alignment analysis using schema, type, test, and doc checkers',
    falsifiable: true,
    verificationSteps: [
      'Review drift warnings',
      'Verify suggested fixes address root causes',
      'Run individual axis checks for details',
    ],
  });

  // Per-axis claims
  for (const axis of score.breakdown) {
    if (axis.score < 70) {
      claims.push({
        statement: `${axis.axis.replace(/_/g, ' ')} alignment is ${axis.score}% with ${axis.issues} issues`,
        confidence: score.confidence * 0.9,
        evidence: [
          {
            type: 'static_analysis',
            source: 'AlignmentGraph',
            data: { axis: axis.axis, score: axis.score, issues: axis.issues },
            weight: axis.weight,
          },
        ],
        methodology: `${axis.axis} specific analysis`,
        falsifiable: true,
        verificationSteps: [`Run ${axis.axis} alignment check for details`],
      });
    }
  }

  return claims;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  SchemaAlignmentChecker,
  TypeCoherenceAnalyzer,
  TestRealityScorer,
  DocFreshnessTracker,
  SpecImplementationMapper,
};
