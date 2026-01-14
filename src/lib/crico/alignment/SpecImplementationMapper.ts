/**
 * CRICO Spec Implementation Mapper
 * Links tickets/specs to code and tracks spec-implementation drift
 *
 * Implements Section 6.3 of the CRICO Master Plan
 * Addresses the "Spec ↔ Implementation" alignment axis
 */

import type { Claim, DriftSeverity } from '../types';

// ============================================================================
// SPEC TYPES
// ============================================================================

export interface Specification {
  id: string;
  title: string;
  description: string;
  source: 'ticket' | 'prd' | 'user_story' | 'acceptance_criteria' | 'design_doc';
  sourceUrl?: string;
  acceptanceCriteria: AcceptanceCriterion[];
  requirements: Requirement[];
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'approved' | 'implemented' | 'verified';
}

export interface AcceptanceCriterion {
  id: string;
  description: string;
  testable: boolean;
  verified: boolean;
  verificationMethod?: 'unit_test' | 'integration_test' | 'e2e_test' | 'manual';
  linkedTests: string[];
  linkedCode: string[];
}

export interface Requirement {
  id: string;
  type: 'functional' | 'non_functional' | 'constraint' | 'assumption';
  description: string;
  priority: 'must' | 'should' | 'could' | 'wont';
  status: 'pending' | 'implemented' | 'tested' | 'verified';
  linkedCode: CodeReference[];
}

export interface CodeReference {
  filePath: string;
  lineStart: number;
  lineEnd: number;
  symbolName?: string;
  confidence: number;
}

export interface Implementation {
  commitHash: string;
  commitMessage: string;
  filePaths: string[];
  addedLines: number;
  removedLines: number;
  author: string;
  timestamp: Date;
  linkedSpecs: string[];
}

export interface SpecImplementationMapping {
  specId: string;
  implementations: Implementation[];
  coverageScore: number; // 0-100
  driftScore: number; // 0-100, lower is better
  status: 'not_started' | 'in_progress' | 'implemented' | 'drifted';
  issues: MappingIssue[];
}

export interface MappingIssue {
  type: 'unimplemented_requirement' | 'untested_criterion' | 'implementation_exceeds_spec' | 'spec_outdated';
  severity: DriftSeverity;
  description: string;
  specElement?: string;
  codeElement?: string;
  suggestion: string;
}

// ============================================================================
// SPEC PARSING
// ============================================================================

/**
 * Parse acceptance criteria from ticket/spec text
 */
export function parseAcceptanceCriteria(specText: string): AcceptanceCriterion[] {
  const criteria: AcceptanceCriterion[] = [];

  // Common patterns for acceptance criteria
  const patterns = [
    // "Given X, When Y, Then Z" (Gherkin-style)
    /(?:Given|GIVEN)\s+(.+?)(?:,?\s*(?:When|WHEN)\s+(.+?))?(?:,?\s*(?:Then|THEN)\s+(.+))/gi,
    // "AC1: Description" or "Acceptance Criteria 1: Description"
    /(?:AC|Acceptance\s*Criteria?)\s*\d*[:.]\s*(.+)/gi,
    // Checkbox items "- [ ] Description" or "* [ ] Description"
    /[-*]\s*\[[\sx]\]\s*(.+)/gi,
    // Numbered items under "Acceptance Criteria" heading
    /^\d+\.\s*(.+)/gm,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(specText)) !== null) {
      const description = match[3]
        ? `Given ${match[1]}, When ${match[2]}, Then ${match[3]}`
        : match[1].trim();

      if (description && description.length > 10) {
        criteria.push({
          id: `ac_${criteria.length + 1}`,
          description,
          testable: isTestable(description),
          verified: false,
          linkedTests: [],
          linkedCode: [],
        });
      }
    }
  }

  return criteria;
}

/**
 * Determine if a criterion is testable
 */
function isTestable(description: string): boolean {
  const testableIndicators = [
    /should\s+(?:be|return|display|show|have|contain)/i,
    /must\s+(?:be|return|display|show|have|contain)/i,
    /will\s+(?:be|return|display|show|have|contain)/i,
    /returns?\s+\w+/i,
    /displays?\s+\w+/i,
    /shows?\s+\w+/i,
    /error\s+(?:message|when|if)/i,
    /valid(?:ates?|ation)/i,
    /(?:in)?correct/i,
  ];

  return testableIndicators.some(pattern => pattern.test(description));
}

/**
 * Parse requirements from spec text
 */
export function parseRequirements(specText: string): Requirement[] {
  const requirements: Requirement[] = [];

  // MoSCoW patterns
  const moscowPatterns = [
    { pattern: /(?:MUST|Must)\s+(.+)/g, priority: 'must' as const },
    { pattern: /(?:SHOULD|Should)\s+(.+)/g, priority: 'should' as const },
    { pattern: /(?:COULD|Could)\s+(.+)/g, priority: 'could' as const },
    { pattern: /(?:WON'T|Won't|WONT)\s+(.+)/g, priority: 'wont' as const },
  ];

  for (const { pattern, priority } of moscowPatterns) {
    let match;
    while ((match = pattern.exec(specText)) !== null) {
      requirements.push({
        id: `req_${requirements.length + 1}`,
        type: determineRequirementType(match[1]),
        description: match[1].trim(),
        priority,
        status: 'pending',
        linkedCode: [],
      });
    }
  }

  // Also look for numbered requirements
  const numberedPattern = /(?:REQ|Requirement|R)\s*[-_]?\s*(\d+)[:.]\s*(.+)/gi;
  let match;
  while ((match = numberedPattern.exec(specText)) !== null) {
    requirements.push({
      id: `req_${match[1]}`,
      type: determineRequirementType(match[2]),
      description: match[2].trim(),
      priority: 'must', // Default to must for explicit requirements
      status: 'pending',
      linkedCode: [],
    });
  }

  return requirements;
}

/**
 * Determine requirement type from description
 */
function determineRequirementType(description: string): Requirement['type'] {
  const nonFunctionalPatterns = [
    /performance/i,
    /scalab/i,
    /secur/i,
    /reliab/i,
    /availab/i,
    /maintain/i,
    /usab/i,
    /access/i,
    /compli/i,
    /latency/i,
    /throughput/i,
  ];

  const constraintPatterns = [
    /constraint/i,
    /limit/i,
    /restrict/i,
    /cannot/i,
    /must\s+not/i,
    /forbidden/i,
  ];

  const assumptionPatterns = [
    /assum/i,
    /expect/i,
    /presum/i,
    /given\s+that/i,
  ];

  if (constraintPatterns.some(p => p.test(description))) return 'constraint';
  if (assumptionPatterns.some(p => p.test(description))) return 'assumption';
  if (nonFunctionalPatterns.some(p => p.test(description))) return 'non_functional';
  return 'functional';
}

// ============================================================================
// IMPLEMENTATION LINKING
// ============================================================================

/**
 * Extract spec references from commit messages
 */
export function extractSpecReferences(commitMessage: string): string[] {
  const references: string[] = [];

  // Common patterns for ticket/spec references
  const patterns = [
    // JIRA-style: PROJECT-123
    /([A-Z]{2,10}-\d+)/g,
    // GitHub issues: #123, GH-123
    /(?:#|GH-)(\d+)/g,
    // Linear-style: ENG-123
    /([A-Z]{2,5}-\d+)/g,
    // Explicit refs: refs #123, fixes #123, closes #123
    /(?:refs?|fixes?|closes?|resolves?)\s*#?(\d+)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(commitMessage)) !== null) {
      const ref = match[1] || match[0];
      if (!references.includes(ref)) {
        references.push(ref);
      }
    }
  }

  return references;
}

/**
 * Link code to spec requirements using semantic matching
 */
export function linkCodeToRequirements(
  codeContent: string,
  filePath: string,
  requirements: Requirement[]
): Map<string, CodeReference[]> {
  const links = new Map<string, CodeReference[]>();

  // Extract function/class names from code
  const codeElements = extractCodeElements(codeContent);

  for (const requirement of requirements) {
    const matchingCode: CodeReference[] = [];

    // Extract keywords from requirement
    const reqKeywords = extractKeywords(requirement.description);

    for (const element of codeElements) {
      // Calculate semantic similarity
      const elementKeywords = extractKeywords(element.name);
      const similarity = calculateKeywordSimilarity(reqKeywords, elementKeywords);

      if (similarity > 0.3) {
        matchingCode.push({
          filePath,
          lineStart: element.lineStart,
          lineEnd: element.lineEnd,
          symbolName: element.name,
          confidence: similarity,
        });
      }
    }

    if (matchingCode.length > 0) {
      links.set(requirement.id, matchingCode);
    }
  }

  return links;
}

interface CodeElement {
  name: string;
  type: 'function' | 'class' | 'variable' | 'interface';
  lineStart: number;
  lineEnd: number;
}

/**
 * Extract code elements (functions, classes, etc.)
 */
function extractCodeElements(codeContent: string): CodeElement[] {
  const elements: CodeElement[] = [];
  const lines = codeContent.split('\n');

  // Function patterns
  const funcPattern = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/;
  const arrowFuncPattern = /(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\(/;
  const classPattern = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/;
  const interfacePattern = /(?:export\s+)?interface\s+(\w+)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;

    if ((match = funcPattern.exec(line))) {
      elements.push({
        name: match[1],
        type: 'function',
        lineStart: i + 1,
        lineEnd: findBlockEnd(lines, i),
      });
    } else if ((match = arrowFuncPattern.exec(line))) {
      elements.push({
        name: match[1],
        type: 'function',
        lineStart: i + 1,
        lineEnd: findBlockEnd(lines, i),
      });
    } else if ((match = classPattern.exec(line))) {
      elements.push({
        name: match[1],
        type: 'class',
        lineStart: i + 1,
        lineEnd: findBlockEnd(lines, i),
      });
    } else if ((match = interfacePattern.exec(line))) {
      elements.push({
        name: match[1],
        type: 'interface',
        lineStart: i + 1,
        lineEnd: findBlockEnd(lines, i),
      });
    }
  }

  return elements;
}

/**
 * Find the end of a code block (matching braces)
 */
function findBlockEnd(lines: string[], startLine: number): number {
  let braceCount = 0;
  let foundOpen = false;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];

    for (const char of line) {
      if (char === '{') {
        braceCount++;
        foundOpen = true;
      } else if (char === '}') {
        braceCount--;
      }
    }

    if (foundOpen && braceCount === 0) {
      return i + 1;
    }
  }

  return startLine + 1;
}

/**
 * Extract keywords from text for matching
 */
function extractKeywords(text: string): Set<string> {
  const keywords = new Set<string>();

  // Tokenize and normalize
  const tokens = text
    .replace(/([A-Z])/g, ' $1') // Split camelCase
    .toLowerCase()
    .split(/[\s_\-.,;:!?'"()[\]{}]+/)
    .filter(t => t.length > 2);

  // Filter out common stop words
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
    'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been',
    'will', 'with', 'this', 'that', 'from', 'they', 'would', 'there',
    'their', 'what', 'about', 'which', 'when', 'make', 'like', 'time',
    'just', 'know', 'take', 'into', 'year', 'your', 'good', 'some',
  ]);

  for (const token of tokens) {
    if (!stopWords.has(token)) {
      keywords.add(token);
    }
  }

  return keywords;
}

/**
 * Calculate similarity between two keyword sets
 */
function calculateKeywordSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 || set2.size === 0) return 0;

  let matches = 0;
  for (const word of set1) {
    for (const other of set2) {
      if (word === other || word.includes(other) || other.includes(word)) {
        matches++;
        break;
      }
    }
  }

  return matches / Math.max(set1.size, set2.size);
}

// ============================================================================
// DRIFT DETECTION
// ============================================================================

/**
 * Detect drift between spec and implementation
 */
export function detectSpecDrift(
  spec: Specification,
  implementations: Implementation[],
  testFiles: { path: string; content: string }[]
): SpecImplementationMapping {
  const issues: MappingIssue[] = [];

  // Check for unimplemented requirements
  for (const req of spec.requirements) {
    if (req.linkedCode.length === 0) {
      issues.push({
        type: 'unimplemented_requirement',
        severity: req.priority === 'must' ? 'high' : 'medium',
        description: `Requirement "${req.description.substring(0, 50)}..." has no linked implementation`,
        specElement: req.id,
        suggestion: `Implement requirement ${req.id} or link existing code`,
      });
    }
  }

  // Check for untested acceptance criteria
  for (const ac of spec.acceptanceCriteria) {
    if (ac.testable && !ac.verified && ac.linkedTests.length === 0) {
      issues.push({
        type: 'untested_criterion',
        severity: 'medium',
        description: `Acceptance criterion "${ac.description.substring(0, 50)}..." has no linked tests`,
        specElement: ac.id,
        suggestion: `Add test for acceptance criterion ${ac.id}`,
      });
    }
  }

  // Check for implementation that exceeds spec (might indicate scope creep)
  const specKeywords = new Set<string>();
  for (const req of spec.requirements) {
    extractKeywords(req.description).forEach(k => specKeywords.add(k));
  }
  for (const ac of spec.acceptanceCriteria) {
    extractKeywords(ac.description).forEach(k => specKeywords.add(k));
  }

  // Look for commits that don't match spec keywords
  for (const impl of implementations) {
    const commitKeywords = extractKeywords(impl.commitMessage);
    const matchRatio = calculateKeywordSimilarity(commitKeywords, specKeywords);

    if (matchRatio < 0.2 && impl.addedLines > 50) {
      issues.push({
        type: 'implementation_exceeds_spec',
        severity: 'low',
        description: `Commit "${impl.commitMessage.substring(0, 50)}..." may exceed spec scope`,
        codeElement: impl.commitHash,
        suggestion: 'Verify this change is within spec scope or update spec',
      });
    }
  }

  // Calculate coverage score
  const totalRequirements = spec.requirements.length;
  const implementedRequirements = spec.requirements.filter(r => r.linkedCode.length > 0).length;
  const coverageScore = totalRequirements > 0
    ? Math.round((implementedRequirements / totalRequirements) * 100)
    : 100;

  // Calculate drift score (based on issues)
  const criticalIssues = issues.filter(i => i.severity === 'critical').length;
  const highIssues = issues.filter(i => i.severity === 'high').length;
  const mediumIssues = issues.filter(i => i.severity === 'medium').length;

  const driftScore = Math.min(100, criticalIssues * 30 + highIssues * 15 + mediumIssues * 5);

  // Determine status
  let status: SpecImplementationMapping['status'] = 'not_started';
  if (coverageScore >= 90 && driftScore < 10) {
    status = 'implemented';
  } else if (coverageScore > 0) {
    status = driftScore > 30 ? 'drifted' : 'in_progress';
  }

  return {
    specId: spec.id,
    implementations,
    coverageScore,
    driftScore,
    status,
    issues,
  };
}

// ============================================================================
// CLAIMS GENERATION
// ============================================================================

/**
 * Generate claims from spec-implementation analysis
 */
export function generateSpecClaims(mapping: SpecImplementationMapping): Claim[] {
  const claims: Claim[] = [];

  // Coverage claim
  claims.push({
    statement: mapping.coverageScore >= 80
      ? `Spec ${mapping.specId} is ${mapping.coverageScore}% implemented`
      : `Spec ${mapping.specId} is only ${mapping.coverageScore}% implemented - missing requirements`,
    confidence: 0.75, // Lower confidence due to semantic matching
    evidence: [
      {
        type: 'pattern_match',
        source: 'SpecImplementationMapper',
        data: {
          coverageScore: mapping.coverageScore,
          implementationCount: mapping.implementations.length,
        },
        weight: 0.7,
      },
    ],
    methodology: 'Semantic keyword matching between spec and code',
    falsifiable: true,
    verificationSteps: [
      'Review linked code for each requirement',
      'Verify requirement-to-code mappings are accurate',
    ],
  });

  // Drift claim
  if (mapping.driftScore > 20) {
    claims.push({
      statement: `Spec ${mapping.specId} has ${mapping.driftScore}% drift - implementation may not match spec`,
      confidence: 0.70,
      evidence: [
        {
          type: 'pattern_match',
          source: 'SpecImplementationMapper',
          data: {
            driftScore: mapping.driftScore,
            issueCount: mapping.issues.length,
            issues: mapping.issues.map(i => i.type),
          },
          weight: 0.7,
        },
      ],
      methodology: 'Issue counting and severity weighting',
      falsifiable: true,
      verificationSteps: [
        'Review flagged issues',
        'Verify spec is up to date',
        'Check implementation against acceptance criteria',
      ],
    });
  }

  // Issue-specific claims
  const unimplementedCount = mapping.issues.filter(i => i.type === 'unimplemented_requirement').length;
  if (unimplementedCount > 0) {
    claims.push({
      statement: `${unimplementedCount} requirement(s) from spec ${mapping.specId} lack implementation`,
      confidence: 0.80,
      evidence: [
        {
          type: 'static_analysis',
          source: 'SpecImplementationMapper',
          data: {
            unimplementedRequirements: mapping.issues
              .filter(i => i.type === 'unimplemented_requirement')
              .map(i => i.specElement),
          },
          weight: 0.8,
        },
      ],
      methodology: 'Requirement-to-code linkage analysis',
      falsifiable: true,
      verificationSteps: ['Implement missing requirements or update links'],
    });
  }

  return claims;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const SpecImplementationMapper = {
  parseAcceptanceCriteria,
  parseRequirements,
  extractSpecReferences,
  linkCodeToRequirements,
  detectSpecDrift,
  generateSpecClaims,
};
