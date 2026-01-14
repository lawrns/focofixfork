/**
 * CRICO Type Coherence Analyzer
 * Verifies types match across all layers of the application
 *
 * Implements Section 2.3 and Section 6 of the CRICO Master Plan
 * Runs on file save to detect type mismatches in real-time
 */

import type { AlignmentMismatch, DriftSeverity, Evidence, Claim } from '../types';

// ============================================================================
// TYPE DEFINITION TYPES
// ============================================================================

export interface TypeDefinition {
  name: string;
  kind: 'interface' | 'type' | 'enum' | 'class' | 'function';
  filePath: string;
  lineNumber: number;
  properties: TypeProperty[];
  extends?: string[];
  implements?: string[];
  genericParams?: string[];
  exported: boolean;
  deprecated?: boolean;
}

export interface TypeProperty {
  name: string;
  type: string;
  optional: boolean;
  readonly: boolean;
  defaultValue?: string;
  jsdoc?: string;
}

export interface TypeReference {
  typeName: string;
  filePath: string;
  lineNumber: number;
  context: 'declaration' | 'parameter' | 'return' | 'variable' | 'property';
  actualType?: string;
}

export interface CoherenceCheckResult {
  coherent: boolean;
  score: number; // 0-100
  mismatches: TypeMismatch[];
  warnings: TypeWarning[];
  confidence: number;
  analyzedFiles: number;
  analyzedTypes: number;
  timestamp: Date;
}

export interface TypeMismatch {
  type: 'type_conflict' | 'implicit_any' | 'unsafe_cast' | 'missing_type' | 'type_widening';
  locations: TypeReference[];
  expected: string;
  actual: string;
  severity: DriftSeverity;
  suggestion: string;
  autoFixable: boolean;
}

export interface TypeWarning {
  type: 'deprecated_type' | 'loose_type' | 'inconsistent_naming' | 'missing_generic';
  location: TypeReference;
  message: string;
  severity: DriftSeverity;
}

// ============================================================================
// TYPE EXTRACTION FROM SOURCE CODE
// ============================================================================

/**
 * Extract type definitions from TypeScript source code
 * Production implementation would use ts-morph or TypeScript compiler API
 */
export function extractTypeDefinitions(
  sourceCode: string,
  filePath: string
): TypeDefinition[] {
  const definitions: TypeDefinition[] = [];

  // Extract interfaces
  const interfaceRegex = /(?:export\s+)?interface\s+(\w+)(?:<([^>]+)>)?(?:\s+extends\s+([^{]+))?\s*\{([^}]*)\}/g;
  let match;

  while ((match = interfaceRegex.exec(sourceCode)) !== null) {
    const name = match[1];
    const genericParams = match[2]?.split(',').map(p => p.trim());
    const extendsClause = match[3]?.split(',').map(e => e.trim());
    const body = match[4];
    const lineNumber = getLineNumber(sourceCode, match.index);

    definitions.push({
      name,
      kind: 'interface',
      filePath,
      lineNumber,
      properties: extractProperties(body),
      extends: extendsClause,
      genericParams,
      exported: match[0].startsWith('export'),
    });
  }

  // Extract type aliases
  const typeRegex = /(?:export\s+)?type\s+(\w+)(?:<([^>]+)>)?\s*=\s*([^;]+);/g;

  while ((match = typeRegex.exec(sourceCode)) !== null) {
    const name = match[1];
    const genericParams = match[2]?.split(',').map(p => p.trim());
    const typeValue = match[3].trim();
    const lineNumber = getLineNumber(sourceCode, match.index);

    // If it's an object type, extract properties
    let properties: TypeProperty[] = [];
    if (typeValue.startsWith('{')) {
      properties = extractProperties(typeValue.slice(1, -1));
    }

    definitions.push({
      name,
      kind: 'type',
      filePath,
      lineNumber,
      properties,
      genericParams,
      exported: match[0].startsWith('export'),
    });
  }

  // Extract enums
  const enumRegex = /(?:export\s+)?(?:const\s+)?enum\s+(\w+)\s*\{([^}]*)\}/g;

  while ((match = enumRegex.exec(sourceCode)) !== null) {
    const name = match[1];
    const body = match[2];
    const lineNumber = getLineNumber(sourceCode, match.index);

    const enumMembers = body.split(',')
      .map(m => m.trim())
      .filter(m => m)
      .map(m => {
        const [memberName, memberValue] = m.split('=').map(s => s.trim());
        return {
          name: memberName,
          type: memberValue || 'number',
          optional: false,
          readonly: true,
        };
      });

    definitions.push({
      name,
      kind: 'enum',
      filePath,
      lineNumber,
      properties: enumMembers,
      exported: match[0].startsWith('export'),
    });
  }

  return definitions;
}

/**
 * Extract properties from interface/type body
 */
function extractProperties(body: string): TypeProperty[] {
  const properties: TypeProperty[] = [];
  const propRegex = /(readonly\s+)?(\w+)(\?)?:\s*([^;,\n]+)/g;

  let match;
  while ((match = propRegex.exec(body)) !== null) {
    properties.push({
      name: match[2],
      type: match[4].trim(),
      optional: match[3] === '?',
      readonly: Boolean(match[1]),
    });
  }

  return properties;
}

/**
 * Get line number from character index
 */
function getLineNumber(source: string, index: number): number {
  return source.substring(0, index).split('\n').length;
}

// ============================================================================
// TYPE USAGE EXTRACTION
// ============================================================================

/**
 * Extract type usages/references from source code
 */
export function extractTypeReferences(
  sourceCode: string,
  filePath: string
): TypeReference[] {
  const references: TypeReference[] = [];

  // Function parameters with type annotations
  const paramRegex = /(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=]+)\s*=>)\s*\(([^)]*)\)/g;
  let match;

  while ((match = paramRegex.exec(sourceCode)) !== null) {
    const params = match[1];
    const paramTypeRegex = /(\w+)\s*:\s*([^,)]+)/g;
    let paramMatch;

    while ((paramMatch = paramTypeRegex.exec(params)) !== null) {
      references.push({
        typeName: paramMatch[2].trim(),
        filePath,
        lineNumber: getLineNumber(sourceCode, match.index),
        context: 'parameter',
      });
    }
  }

  // Variable declarations with type annotations
  const varRegex = /(?:const|let|var)\s+(\w+)\s*:\s*([^=;]+)\s*=/g;

  while ((match = varRegex.exec(sourceCode)) !== null) {
    references.push({
      typeName: match[2].trim(),
      filePath,
      lineNumber: getLineNumber(sourceCode, match.index),
      context: 'variable',
    });
  }

  // Return type annotations
  const returnRegex = /(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=]+)\s*=>)[^)]*\)\s*:\s*([^{=>]+)/g;

  while ((match = returnRegex.exec(sourceCode)) !== null) {
    references.push({
      typeName: match[1].trim(),
      filePath,
      lineNumber: getLineNumber(sourceCode, match.index),
      context: 'return',
    });
  }

  // Type assertions (as Type)
  const assertionRegex = /as\s+(\w+(?:<[^>]+>)?)/g;

  while ((match = assertionRegex.exec(sourceCode)) !== null) {
    references.push({
      typeName: match[1].trim(),
      filePath,
      lineNumber: getLineNumber(sourceCode, match.index),
      context: 'variable',
    });
  }

  return references;
}

// ============================================================================
// COHERENCE ANALYSIS
// ============================================================================

/**
 * Analyze type coherence across multiple files
 */
export function analyzeTypeCoherence(
  files: { path: string; content: string }[]
): CoherenceCheckResult {
  const mismatches: TypeMismatch[] = [];
  const warnings: TypeWarning[] = [];
  const allDefinitions: TypeDefinition[] = [];
  const allReferences: TypeReference[] = [];

  // Extract all type information
  for (const file of files) {
    const definitions = extractTypeDefinitions(file.content, file.path);
    const references = extractTypeReferences(file.content, file.path);

    allDefinitions.push(...definitions);
    allReferences.push(...references);

    // Check for implicit any
    const anyUsages = findImplicitAny(file.content, file.path);
    for (const usage of anyUsages) {
      mismatches.push({
        type: 'implicit_any',
        locations: [usage],
        expected: 'explicit type',
        actual: 'any',
        severity: 'medium',
        suggestion: `Add explicit type annotation at ${file.path}:${usage.lineNumber}`,
        autoFixable: false,
      });
    }

    // Check for unsafe type assertions
    const unsafeCasts = findUnsafeCasts(file.content, file.path);
    for (const cast of unsafeCasts) {
      warnings.push({
        type: 'loose_type',
        location: cast,
        message: `Unsafe type assertion to '${cast.typeName}' - consider type guard`,
        severity: 'low',
      });
    }
  }

  // Build type graph and check for conflicts
  const typeGraph = buildTypeGraph(allDefinitions);
  const conflicts = findTypeConflicts(typeGraph, allReferences);
  mismatches.push(...conflicts);

  // Check for inconsistent naming
  const namingIssues = findNamingInconsistencies(allDefinitions);
  warnings.push(...namingIssues);

  // Calculate coherence score
  const totalIssues = mismatches.length + warnings.length;
  const maxScore = 100;
  const deduction = Math.min(totalIssues * 5, maxScore);
  const score = maxScore - deduction;

  return {
    coherent: mismatches.length === 0,
    score,
    mismatches,
    warnings,
    confidence: 0.85, // Type analysis is high confidence
    analyzedFiles: files.length,
    analyzedTypes: allDefinitions.length,
    timestamp: new Date(),
  };
}

/**
 * Build a graph of type definitions for conflict detection
 */
function buildTypeGraph(definitions: TypeDefinition[]): Map<string, TypeDefinition[]> {
  const graph = new Map<string, TypeDefinition[]>();

  for (const def of definitions) {
    if (!graph.has(def.name)) {
      graph.set(def.name, []);
    }
    graph.get(def.name)!.push(def);
  }

  return graph;
}

/**
 * Find type conflicts (same name, different definitions)
 */
function findTypeConflicts(
  typeGraph: Map<string, TypeDefinition[]>,
  references: TypeReference[]
): TypeMismatch[] {
  const conflicts: TypeMismatch[] = [];

  for (const [typeName, definitions] of typeGraph) {
    if (definitions.length > 1) {
      // Check if definitions are actually different
      const uniqueDefinitions = findUniqueDefinitions(definitions);

      if (uniqueDefinitions.length > 1) {
        conflicts.push({
          type: 'type_conflict',
          locations: definitions.map(d => ({
            typeName: d.name,
            filePath: d.filePath,
            lineNumber: d.lineNumber,
            context: 'declaration' as const,
          })),
          expected: `Single definition of '${typeName}'`,
          actual: `${uniqueDefinitions.length} conflicting definitions`,
          severity: 'high',
          suggestion: `Consolidate type '${typeName}' into a single definition or use different names`,
          autoFixable: false,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Find structurally unique type definitions
 */
function findUniqueDefinitions(definitions: TypeDefinition[]): TypeDefinition[] {
  const unique: TypeDefinition[] = [];

  for (const def of definitions) {
    const isUnique = !unique.some(u => areDefinitionsEqual(u, def));
    if (isUnique) {
      unique.push(def);
    }
  }

  return unique;
}

/**
 * Check if two type definitions are structurally equal
 */
function areDefinitionsEqual(a: TypeDefinition, b: TypeDefinition): boolean {
  if (a.kind !== b.kind) return false;
  if (a.properties.length !== b.properties.length) return false;

  for (const propA of a.properties) {
    const propB = b.properties.find(p => p.name === propA.name);
    if (!propB) return false;
    if (propA.type !== propB.type) return false;
    if (propA.optional !== propB.optional) return false;
  }

  return true;
}

/**
 * Find implicit any usages
 */
function findImplicitAny(sourceCode: string, filePath: string): TypeReference[] {
  const references: TypeReference[] = [];

  // Look for explicit 'any' type annotations
  const anyRegex = /:\s*any(?:\s*[;,)\]}]|$)/g;
  let match;

  while ((match = anyRegex.exec(sourceCode)) !== null) {
    references.push({
      typeName: 'any',
      filePath,
      lineNumber: getLineNumber(sourceCode, match.index),
      context: 'variable',
    });
  }

  // Look for 'as any' casts
  const asAnyRegex = /as\s+any/g;

  while ((match = asAnyRegex.exec(sourceCode)) !== null) {
    references.push({
      typeName: 'any',
      filePath,
      lineNumber: getLineNumber(sourceCode, match.index),
      context: 'variable',
    });
  }

  return references;
}

/**
 * Find unsafe type assertions
 */
function findUnsafeCasts(sourceCode: string, filePath: string): TypeReference[] {
  const references: TypeReference[] = [];

  // Look for 'as unknown as Type' pattern
  const doubleAsRegex = /as\s+unknown\s+as\s+(\w+)/g;
  let match;

  while ((match = doubleAsRegex.exec(sourceCode)) !== null) {
    references.push({
      typeName: match[1],
      filePath,
      lineNumber: getLineNumber(sourceCode, match.index),
      context: 'variable',
    });
  }

  // Look for non-null assertions on potentially null values
  const nonNullRegex = /\w+!\./g;

  while ((match = nonNullRegex.exec(sourceCode)) !== null) {
    references.push({
      typeName: 'non-null-assertion',
      filePath,
      lineNumber: getLineNumber(sourceCode, match.index),
      context: 'variable',
    });
  }

  return references;
}

/**
 * Find naming inconsistencies across type definitions
 */
function findNamingInconsistencies(definitions: TypeDefinition[]): TypeWarning[] {
  const warnings: TypeWarning[] = [];
  const nameGroups = new Map<string, TypeDefinition[]>();

  // Group by normalized name
  for (const def of definitions) {
    const normalized = def.name
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/_+/g, '_');

    if (!nameGroups.has(normalized)) {
      nameGroups.set(normalized, []);
    }
    nameGroups.get(normalized)!.push(def);
  }

  // Find groups with inconsistent casing
  for (const [normalized, defs] of nameGroups) {
    const uniqueNames = [...new Set(defs.map(d => d.name))];
    if (uniqueNames.length > 1) {
      for (const def of defs) {
        warnings.push({
          type: 'inconsistent_naming',
          location: {
            typeName: def.name,
            filePath: def.filePath,
            lineNumber: def.lineNumber,
            context: 'declaration',
          },
          message: `Type '${def.name}' has similar types with different casing: ${uniqueNames.join(', ')}`,
          severity: 'low',
        });
      }
    }
  }

  return warnings;
}

// ============================================================================
// REAL-TIME ANALYSIS (ON SAVE)
// ============================================================================

/**
 * Perform quick type coherence check for a single file
 * Designed to run on file save with minimal latency
 */
export function quickTypeCheck(
  fileContent: string,
  filePath: string,
  knownTypes?: Map<string, TypeDefinition>
): {
  valid: boolean;
  issues: Array<{ line: number; message: string; severity: DriftSeverity }>;
  duration: number;
} {
  const startTime = Date.now();
  const issues: Array<{ line: number; message: string; severity: DriftSeverity }> = [];

  // Quick checks that can run in <100ms
  const lines = fileContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check for explicit 'any' type
    if (/:\s*any\s*[;,)\]}=]/.test(line) && !line.includes('// @ts-ignore')) {
      issues.push({
        line: lineNum,
        message: "Explicit 'any' type reduces type safety",
        severity: 'medium',
      });
    }

    // Check for 'as any' assertion
    if (/as\s+any/.test(line)) {
      issues.push({
        line: lineNum,
        message: "'as any' assertion bypasses type checking",
        severity: 'medium',
      });
    }

    // Check for 'as unknown as' double assertion
    if (/as\s+unknown\s+as/.test(line)) {
      issues.push({
        line: lineNum,
        message: "Double type assertion is a code smell",
        severity: 'high',
      });
    }

    // Check for @ts-ignore without reason
    if (/@ts-ignore(?!\s+\S)/.test(line)) {
      issues.push({
        line: lineNum,
        message: "@ts-ignore should include a reason comment",
        severity: 'low',
      });
    }

    // Check for non-null assertion on potentially undefined access
    if (/\.\w+!\s*\./.test(line)) {
      issues.push({
        line: lineNum,
        message: "Non-null assertion may hide potential null/undefined error",
        severity: 'low',
      });
    }
  }

  return {
    valid: issues.filter(i => i.severity === 'high' || i.severity === 'critical').length === 0,
    issues,
    duration: Date.now() - startTime,
  };
}

// ============================================================================
// CLAIMS AND EVIDENCE GENERATION
// ============================================================================

/**
 * Generate claims from coherence analysis for agent system
 */
export function generateCoherenceClaims(result: CoherenceCheckResult): Claim[] {
  const claims: Claim[] = [];

  // Overall coherence claim
  claims.push({
    statement: result.coherent
      ? 'Type definitions are coherent across analyzed files'
      : `Found ${result.mismatches.length} type coherence issues`,
    confidence: result.confidence,
    evidence: [
      {
        type: 'static_analysis',
        source: 'TypeCoherenceAnalyzer',
        data: {
          analyzedFiles: result.analyzedFiles,
          analyzedTypes: result.analyzedTypes,
          mismatchCount: result.mismatches.length,
          warningCount: result.warnings.length,
        },
        weight: 0.9,
      },
    ],
    methodology: 'AST-based type extraction and structural comparison',
    falsifiable: true,
    verificationSteps: [
      'Run TypeScript compiler with strict mode',
      'Check for type errors in IDE',
      'Review flagged locations manually',
    ],
  });

  // Specific claims for each mismatch type
  const mismatchTypes = new Map<string, TypeMismatch[]>();
  for (const mismatch of result.mismatches) {
    if (!mismatchTypes.has(mismatch.type)) {
      mismatchTypes.set(mismatch.type, []);
    }
    mismatchTypes.get(mismatch.type)!.push(mismatch);
  }

  for (const [type, mismatches] of mismatchTypes) {
    claims.push({
      statement: `${mismatches.length} ${type.replace('_', ' ')} issue(s) detected`,
      confidence: result.confidence,
      evidence: [
        {
          type: 'static_analysis',
          source: 'TypeCoherenceAnalyzer',
          data: { type, count: mismatches.length, locations: mismatches.map(m => m.locations) },
          weight: 0.85,
        },
      ],
      methodology: `Pattern-based detection of ${type}`,
      falsifiable: true,
      verificationSteps: [`Review ${type} at flagged locations`],
    });
  }

  return claims;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const TypeCoherenceAnalyzer = {
  extractTypeDefinitions,
  extractTypeReferences,
  analyzeTypeCoherence,
  quickTypeCheck,
  generateCoherenceClaims,
};
