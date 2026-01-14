/**
 * CRICO Test Reality Scorer
 * Calculates actual test coverage vs claimed coverage
 *
 * Implements Section 6.4 of the CRICO Master Plan
 * Addresses the "Test-Reality Gap" problem
 */

import type { Claim, Evidence, DriftSeverity } from '../types';

// ============================================================================
// TEST REALITY TYPES
// ============================================================================

export interface TestFile {
  path: string;
  testCount: number;
  passingTests: number;
  failingTests: number;
  skippedTests: number;
  coverage: FileCoverage;
  mockDepth: MockAnalysis;
  assertionQuality: AssertionAnalysis;
  lastRun?: Date;
}

export interface FileCoverage {
  lines: number;
  coveredLines: number;
  branches: number;
  coveredBranches: number;
  functions: number;
  coveredFunctions: number;
  statements: number;
  coveredStatements: number;
}

export interface MockAnalysis {
  totalDependencies: number;
  mockedDependencies: number;
  mockDepthRatio: number; // 0-1, lower is better (less mocking)
  deepMocks: string[]; // Dependencies that mock multiple levels
}

export interface AssertionAnalysis {
  totalAssertions: number;
  weakAssertions: number; // toBeDefined, toBeTruthy, etc.
  strongAssertions: number; // toEqual, toHaveBeenCalledWith, etc.
  qualityScore: number; // 0-100
}

export interface BehaviorCoverage {
  behavior: string;
  description: string;
  tested: boolean;
  testFile?: string;
  testName?: string;
  isCritical: boolean;
}

export interface TestRealityScore {
  overall: number; // 0-100
  lineCoverage: number;
  branchCoverage: number;
  behaviorCoverage: number;
  mockReality: number; // How much real code is tested vs mocked
  assertionQuality: number;
  confidence: number;
  breakdown: {
    category: string;
    score: number;
    weight: number;
    issues: string[];
  }[];
  warnings: TestWarning[];
  recommendations: string[];
  timestamp: Date;
}

export interface TestWarning {
  type: 'high_mock_ratio' | 'weak_assertions' | 'missing_edge_case' | 'flaky_test' | 'slow_test';
  severity: DriftSeverity;
  testFile: string;
  message: string;
  suggestion: string;
}

// ============================================================================
// ASSERTION CLASSIFICATION
// ============================================================================

const WEAK_ASSERTIONS = [
  'toBeDefined',
  'toBeUndefined',
  'toBeTruthy',
  'toBeFalsy',
  'toBeNull',
  'toBeNaN',
  'toBeGreaterThan',
  'toBeLessThan',
  'toBeGreaterThanOrEqual',
  'toBeLessThanOrEqual',
  'toHaveLength', // Weak when just checking > 0
  'toContain', // Weak when not checking specific value
  'toMatch', // Can be weak depending on regex
];

const STRONG_ASSERTIONS = [
  'toBe',
  'toEqual',
  'toStrictEqual',
  'toMatchObject',
  'toHaveBeenCalledWith',
  'toHaveBeenNthCalledWith',
  'toHaveBeenLastCalledWith',
  'toHaveProperty',
  'toMatchSnapshot',
  'toMatchInlineSnapshot',
  'toThrow',
  'toThrowError',
  'rejects.toThrow',
  'resolves.toEqual',
];

// ============================================================================
// TEST FILE ANALYSIS
// ============================================================================

/**
 * Analyze a test file for mock depth and assertion quality
 */
export function analyzeTestFile(
  testCode: string,
  filePath: string
): { mockAnalysis: MockAnalysis; assertionAnalysis: AssertionAnalysis } {
  // Analyze mocking
  const mockAnalysis = analyzeMocks(testCode);

  // Analyze assertions
  const assertionAnalysis = analyzeAssertions(testCode);

  return { mockAnalysis, assertionAnalysis };
}

/**
 * Analyze mock usage in test file
 */
function analyzeMocks(testCode: string): MockAnalysis {
  const mocks: string[] = [];
  const deepMocks: string[] = [];

  // Find jest.mock() calls
  const mockRegex = /jest\.mock\(['"]([^'"]+)['"]/g;
  let match;

  while ((match = mockRegex.exec(testCode)) !== null) {
    mocks.push(match[1]);
  }

  // Find vi.mock() calls (Vitest)
  const viMockRegex = /vi\.mock\(['"]([^'"]+)['"]/g;

  while ((match = viMockRegex.exec(testCode)) !== null) {
    mocks.push(match[1]);
  }

  // Find manual mocks (mockImplementation, mockReturnValue)
  const manualMockRegex = /\.mock(?:Implementation|ReturnValue|ResolvedValue|RejectedValue)/g;
  const manualMockCount = (testCode.match(manualMockRegex) || []).length;

  // Find deep mocks (mocking return values that are themselves mocked)
  const deepMockRegex = /mockReturnValue\(\s*\{[^}]*mock/g;

  while ((match = deepMockRegex.exec(testCode)) !== null) {
    deepMocks.push(`Line ${getLineNumber(testCode, match.index)}`);
  }

  // Estimate total dependencies from imports
  const importRegex = /import\s+(?:\{[^}]+\}|[^;]+)\s+from\s+['"]([^'"]+)['"]/g;
  const imports: string[] = [];

  while ((match = importRegex.exec(testCode)) !== null) {
    if (!match[1].startsWith('.') || match[1].includes('__mocks__')) {
      continue; // Skip relative imports unless they're mock imports
    }
    imports.push(match[1]);
  }

  const totalDependencies = Math.max(imports.length + manualMockCount, 1);
  const mockedDependencies = mocks.length + Math.floor(manualMockCount / 2);

  return {
    totalDependencies,
    mockedDependencies,
    mockDepthRatio: mockedDependencies / totalDependencies,
    deepMocks,
  };
}

/**
 * Analyze assertion quality in test file
 */
function analyzeAssertions(testCode: string): AssertionAnalysis {
  let weakCount = 0;
  let strongCount = 0;

  // Count weak assertions
  for (const assertion of WEAK_ASSERTIONS) {
    const regex = new RegExp(`\\.${assertion}\\(`, 'g');
    const matches = testCode.match(regex);
    if (matches) {
      weakCount += matches.length;
    }
  }

  // Count strong assertions
  for (const assertion of STRONG_ASSERTIONS) {
    const regex = new RegExp(`\\.${assertion}\\(`, 'g');
    const matches = testCode.match(regex);
    if (matches) {
      strongCount += matches.length;
    }
  }

  const totalAssertions = weakCount + strongCount;
  const qualityScore = totalAssertions > 0
    ? Math.round((strongCount / totalAssertions) * 100)
    : 0;

  return {
    totalAssertions,
    weakAssertions: weakCount,
    strongAssertions: strongCount,
    qualityScore,
  };
}

/**
 * Get line number from character index
 */
function getLineNumber(source: string, index: number): number {
  return source.substring(0, index).split('\n').length;
}

// ============================================================================
// BEHAVIOR COVERAGE ANALYSIS
// ============================================================================

/**
 * Extract expected behaviors from source code comments and function signatures
 */
export function extractExpectedBehaviors(
  sourceCode: string,
  filePath: string
): BehaviorCoverage[] {
  const behaviors: BehaviorCoverage[] = [];

  // Extract behaviors from JSDoc @example tags
  const exampleRegex = /@example\s+([^\n]+)/g;
  let match;

  while ((match = exampleRegex.exec(sourceCode)) !== null) {
    behaviors.push({
      behavior: match[1].trim(),
      description: 'JSDoc example',
      tested: false,
      isCritical: false,
    });
  }

  // Extract behaviors from function names and comments
  const functionRegex = /(?:\/\*\*\s*\n\s*\*\s*([^\n]+)\s*\n[^*]*\*\/\s*)?(export\s+)?(?:async\s+)?function\s+(\w+)/g;

  while ((match = functionRegex.exec(sourceCode)) !== null) {
    const description = match[1] || `Function: ${match[3]}`;
    const functionName = match[3];

    // Mark certain functions as critical
    const isCritical = isCriticalFunction(functionName, sourceCode);

    behaviors.push({
      behavior: `${functionName} happy path`,
      description,
      tested: false,
      isCritical,
    });

    // Add error case behavior for functions that can throw
    if (canThrow(sourceCode, match.index)) {
      behaviors.push({
        behavior: `${functionName} error handling`,
        description: `Error case for ${functionName}`,
        tested: false,
        isCritical,
      });
    }
  }

  return behaviors;
}

/**
 * Check if a function is critical (payment, auth, data mutation)
 */
function isCriticalFunction(functionName: string, sourceCode: string): boolean {
  const criticalPatterns = [
    /pay/i,
    /charge/i,
    /auth/i,
    /login/i,
    /logout/i,
    /password/i,
    /token/i,
    /delete/i,
    /remove/i,
    /update/i,
    /create/i,
    /save/i,
    /submit/i,
    /encrypt/i,
    /decrypt/i,
    /sign/i,
    /verify/i,
  ];

  return criticalPatterns.some(pattern => pattern.test(functionName));
}

/**
 * Check if a function can throw errors
 */
function canThrow(sourceCode: string, startIndex: number): boolean {
  // Look at the next 500 characters for throw statements
  const functionBody = sourceCode.substring(startIndex, startIndex + 500);
  return /throw\s+/.test(functionBody) || /\.catch\(/.test(functionBody);
}

/**
 * Map test file content to behaviors
 */
export function mapTestsToBehaviors(
  testCode: string,
  testFilePath: string,
  behaviors: BehaviorCoverage[]
): BehaviorCoverage[] {
  // Extract test names
  const testRegex = /(?:it|test)\s*\(\s*['"]([^'"]+)['"]/g;
  const testNames: string[] = [];
  let match;

  while ((match = testRegex.exec(testCode)) !== null) {
    testNames.push(match[1].toLowerCase());
  }

  // Map tests to behaviors
  return behaviors.map(behavior => {
    const behaviorLower = behavior.behavior.toLowerCase();

    // Check if any test covers this behavior
    const coveringTest = testNames.find(testName => {
      // Simple fuzzy matching
      const behaviorWords = behaviorLower.split(/\s+/);
      const testWords = testName.split(/\s+/);

      const matchingWords = behaviorWords.filter(word =>
        testWords.some(testWord => testWord.includes(word) || word.includes(testWord))
      );

      return matchingWords.length >= Math.min(2, behaviorWords.length);
    });

    if (coveringTest) {
      return {
        ...behavior,
        tested: true,
        testFile: testFilePath,
        testName: coveringTest,
      };
    }

    return behavior;
  });
}

// ============================================================================
// REALITY SCORE CALCULATION
// ============================================================================

/**
 * Calculate the overall test reality score
 */
export function calculateTestRealityScore(
  testFiles: TestFile[],
  behaviors: BehaviorCoverage[]
): TestRealityScore {
  const warnings: TestWarning[] = [];
  const recommendations: string[] = [];

  // Calculate component scores
  const lineCoverage = calculateAverageCoverage(testFiles, 'lines');
  const branchCoverage = calculateAverageCoverage(testFiles, 'branches');

  // Behavior coverage
  const testedBehaviors = behaviors.filter(b => b.tested).length;
  const criticalBehaviors = behaviors.filter(b => b.isCritical);
  const testedCritical = criticalBehaviors.filter(b => b.tested).length;
  const behaviorCoverage = behaviors.length > 0
    ? Math.round((testedBehaviors / behaviors.length) * 100)
    : 100;

  // Mock reality (inverse of mock ratio - less mocking is better)
  const avgMockRatio = testFiles.length > 0
    ? testFiles.reduce((sum, f) => sum + f.mockDepth.mockDepthRatio, 0) / testFiles.length
    : 0;
  const mockReality = Math.round((1 - avgMockRatio) * 100);

  // Assertion quality
  const assertionQuality = testFiles.length > 0
    ? Math.round(testFiles.reduce((sum, f) => sum + f.assertionQuality.qualityScore, 0) / testFiles.length)
    : 0;

  // Generate warnings
  for (const file of testFiles) {
    if (file.mockDepth.mockDepthRatio > 0.7) {
      warnings.push({
        type: 'high_mock_ratio',
        severity: 'medium',
        testFile: file.path,
        message: `Test file mocks ${Math.round(file.mockDepth.mockDepthRatio * 100)}% of dependencies`,
        suggestion: 'Consider integration tests with real dependencies',
      });
    }

    if (file.assertionQuality.qualityScore < 50) {
      warnings.push({
        type: 'weak_assertions',
        severity: 'medium',
        testFile: file.path,
        message: `${file.assertionQuality.weakAssertions} weak assertions out of ${file.assertionQuality.totalAssertions}`,
        suggestion: 'Use specific assertions like toEqual() instead of toBeDefined()',
      });
    }
  }

  // Generate recommendations
  if (behaviorCoverage < 70) {
    recommendations.push(`Behavior coverage is ${behaviorCoverage}%. Add tests for missing behaviors.`);
  }

  if (testedCritical < criticalBehaviors.length) {
    const untestedCritical = criticalBehaviors.filter(b => !b.tested);
    recommendations.push(
      `${untestedCritical.length} critical behaviors lack tests: ${untestedCritical.map(b => b.behavior).join(', ')}`
    );
  }

  if (mockReality < 50) {
    recommendations.push('High mock usage reduces test reality. Consider integration tests.');
  }

  if (assertionQuality < 60) {
    recommendations.push('Assertion quality is low. Replace weak assertions with specific value checks.');
  }

  // Calculate weighted overall score
  const breakdown = [
    { category: 'Line Coverage', score: lineCoverage, weight: 0.15, issues: [] as string[] },
    { category: 'Branch Coverage', score: branchCoverage, weight: 0.15, issues: [] as string[] },
    { category: 'Behavior Coverage', score: behaviorCoverage, weight: 0.30, issues: [] as string[] },
    { category: 'Mock Reality', score: mockReality, weight: 0.20, issues: [] as string[] },
    { category: 'Assertion Quality', score: assertionQuality, weight: 0.20, issues: [] as string[] },
  ];

  const overall = Math.round(
    breakdown.reduce((sum, b) => sum + b.score * b.weight, 0)
  );

  return {
    overall,
    lineCoverage,
    branchCoverage,
    behaviorCoverage,
    mockReality,
    assertionQuality,
    confidence: 0.85, // High confidence for test analysis
    breakdown,
    warnings,
    recommendations,
    timestamp: new Date(),
  };
}

/**
 * Calculate average coverage for a specific metric
 */
function calculateAverageCoverage(
  testFiles: TestFile[],
  metric: 'lines' | 'branches' | 'functions' | 'statements'
): number {
  if (testFiles.length === 0) return 0;

  const total = testFiles.reduce((sum, file) => {
    const covered = metric === 'lines' ? file.coverage.coveredLines :
      metric === 'branches' ? file.coverage.coveredBranches :
        metric === 'functions' ? file.coverage.coveredFunctions :
          file.coverage.coveredStatements;

    const all = metric === 'lines' ? file.coverage.lines :
      metric === 'branches' ? file.coverage.branches :
        metric === 'functions' ? file.coverage.functions :
          file.coverage.statements;

    return sum + (all > 0 ? covered / all : 0);
  }, 0);

  return Math.round((total / testFiles.length) * 100);
}

// ============================================================================
// CLAIMS GENERATION
// ============================================================================

/**
 * Generate claims from test reality analysis
 */
export function generateTestRealityClaims(score: TestRealityScore): Claim[] {
  const claims: Claim[] = [];

  // Overall reality claim
  claims.push({
    statement: score.overall >= 70
      ? `Test reality score is ${score.overall}% - tests reflect actual behavior`
      : `Test reality score is only ${score.overall}% - tests may not catch real issues`,
    confidence: score.confidence,
    evidence: [
      {
        type: 'static_analysis',
        source: 'TestRealityScorer',
        data: {
          overall: score.overall,
          breakdown: score.breakdown,
          warningCount: score.warnings.length,
        },
        weight: 0.9,
      },
    ],
    methodology: 'Mock analysis, assertion classification, and behavior mapping',
    falsifiable: true,
    verificationSteps: [
      'Run mutation testing to verify test effectiveness',
      'Review mock usage in flagged test files',
      'Check that critical paths have integration tests',
    ],
  });

  // Behavior coverage claim
  if (score.behaviorCoverage < 80) {
    claims.push({
      statement: `Only ${score.behaviorCoverage}% of expected behaviors are tested`,
      confidence: 0.75, // Lower confidence as behavior extraction is heuristic
      evidence: [
        {
          type: 'pattern_match',
          source: 'TestRealityScorer',
          data: { behaviorCoverage: score.behaviorCoverage },
          weight: 0.7,
        },
      ],
      methodology: 'JSDoc and function signature analysis for behavior extraction',
      falsifiable: true,
      verificationSteps: [
        'Review untested behaviors list',
        'Determine if behaviors are actually needed',
      ],
    });
  }

  // Mock reality claim
  if (score.mockReality < 50) {
    claims.push({
      statement: `High mock usage (${100 - score.mockReality}%) reduces test reliability`,
      confidence: 0.80,
      evidence: [
        {
          type: 'static_analysis',
          source: 'TestRealityScorer',
          data: { mockReality: score.mockReality },
          weight: 0.8,
        },
      ],
      methodology: 'Mock pattern detection and dependency analysis',
      falsifiable: true,
      verificationSteps: [
        'Review mock usage in test files',
        'Identify tests that could use real implementations',
      ],
    });
  }

  return claims;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const TestRealityScorer = {
  analyzeTestFile,
  extractExpectedBehaviors,
  mapTestsToBehaviors,
  calculateTestRealityScore,
  generateTestRealityClaims,
};
