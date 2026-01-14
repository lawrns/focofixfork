/**
 * CRICO Suggestion Hunter
 * Proactive suggestion hunting system from Section 5 of the CRICO Master Plan
 *
 * Implements "Suggestion Hunting Mode" for:
 * - Architectural simplifications
 * - Test gaps
 * - Performance risks
 * - UX inconsistencies
 * - Dead code
 * - Naming drift
 */

import type {
  Suggestion,
  SuggestionCategory,
  SuggestionPriority,
  Claim,
  Evidence,
} from '../types';

// ============================================================================
// HUNTER TYPES
// ============================================================================

export interface HuntConfig {
  categories: SuggestionCategory[];
  minConfidence: number;
  maxSuggestions: number;
  includeAutoFixable: boolean;
  scope: 'file' | 'directory' | 'project';
  targetPaths?: string[];
}

export interface HuntSession {
  id: string;
  config: HuntConfig;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    currentPhase: string;
  };
  results: HuntResult[];
}

export interface HuntResult {
  hunter: string;
  duration: number;
  suggestions: SuggestionCandidate[];
  scannedItems: number;
  timestamp: Date;
}

export interface SuggestionCandidate {
  category: SuggestionCategory;
  title: string;
  description: string;
  rationale: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  symbolName?: string;
  confidence: number;
  impact: number; // 0-1
  effort: number; // 0-1
  autoFixable: boolean;
  fix?: {
    type: 'auto' | 'guided' | 'manual';
    preview: string;
    changes?: FileChange[];
  };
  evidence: Evidence[];
  relatedPatterns?: string[];
}

export interface FileChange {
  filePath: string;
  lineStart: number;
  lineEnd: number;
  oldContent: string;
  newContent: string;
}

// ============================================================================
// BASE HUNTER CLASS
// ============================================================================

export abstract class BaseHunter {
  protected name: string;
  protected category: SuggestionCategory;

  constructor(name: string, category: SuggestionCategory) {
    this.name = name;
    this.category = category;
  }

  abstract hunt(
    files: { path: string; content: string }[],
    config: HuntConfig
  ): Promise<HuntResult>;

  /**
   * Create a suggestion candidate
   */
  protected createCandidate(
    partial: Omit<SuggestionCandidate, 'category'>
  ): SuggestionCandidate {
    return {
      category: this.category,
      ...partial,
    };
  }

  /**
   * Create evidence for a suggestion
   */
  protected createEvidence(
    type: Evidence['type'],
    source: string,
    data: unknown,
    weight: number = 0.8
  ): Evidence {
    return { type, source, data, weight };
  }
}

// ============================================================================
// ARCHITECTURAL SIMPLIFICATION HUNTER
// ============================================================================

export class ArchitecturalSimplificationHunter extends BaseHunter {
  constructor() {
    super('ArchitecturalSimplification', 'architectural_simplification');
  }

  async hunt(
    files: { path: string; content: string }[],
    config: HuntConfig
  ): Promise<HuntResult> {
    const startTime = Date.now();
    const suggestions: SuggestionCandidate[] = [];

    for (const file of files) {
      // Detect over-abstraction
      const overAbstractionIssues = this.detectOverAbstraction(file);
      suggestions.push(...overAbstractionIssues);

      // Detect unnecessary indirection
      const indirectionIssues = this.detectUnnecessaryIndirection(file);
      suggestions.push(...indirectionIssues);

      // Detect god objects/files
      const godObjectIssues = this.detectGodObjects(file);
      suggestions.push(...godObjectIssues);

      // Detect circular dependencies (simplified)
      const circularIssues = this.detectCircularDependencies(file, files);
      suggestions.push(...circularIssues);
    }

    return {
      hunter: this.name,
      duration: Date.now() - startTime,
      suggestions: suggestions.filter(s => s.confidence >= config.minConfidence),
      scannedItems: files.length,
      timestamp: new Date(),
    };
  }

  private detectOverAbstraction(
    file: { path: string; content: string }
  ): SuggestionCandidate[] {
    const suggestions: SuggestionCandidate[] = [];

    // Pattern: Too many abstraction layers (interfaces with single implementation)
    const interfaceRegex = /interface\s+(\w+)/g;
    const classRegex = /class\s+(\w+)\s+implements\s+(\w+)/g;

    const interfaces = new Set<string>();
    const implementations = new Map<string, string[]>();

    let match;
    while ((match = interfaceRegex.exec(file.content)) !== null) {
      interfaces.add(match[1]);
    }

    while ((match = classRegex.exec(file.content)) !== null) {
      const interfaceName = match[2];
      if (!implementations.has(interfaceName)) {
        implementations.set(interfaceName, []);
      }
      implementations.get(interfaceName)!.push(match[1]);
    }

    // Flag interfaces with single implementation that aren't for testing
    for (const [iface, impls] of implementations) {
      if (impls.length === 1 && !iface.includes('Test') && !iface.includes('Mock')) {
        suggestions.push(this.createCandidate({
          title: `Single-implementation interface: ${iface}`,
          description: `Interface '${iface}' has only one implementation '${impls[0]}'. Consider simplifying.`,
          rationale: 'Interfaces with single implementations add unnecessary abstraction unless used for testing/mocking.',
          filePath: file.path,
          confidence: 0.7,
          impact: 0.3,
          effort: 0.2,
          autoFixable: false,
          evidence: [this.createEvidence('pattern_match', this.name, { interface: iface, implementations: impls })],
        }));
      }
    }

    return suggestions;
  }

  private detectUnnecessaryIndirection(
    file: { path: string; content: string }
  ): SuggestionCandidate[] {
    const suggestions: SuggestionCandidate[] = [];

    // Pattern: Functions that just call another function
    const passThruPattern = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{\s*(?:return\s+)?(\w+)\s*\(/g;

    let match;
    while ((match = passThruPattern.exec(file.content)) !== null) {
      const wrapperName = match[1];
      const wrappedName = match[2];

      if (wrapperName !== wrappedName) {
        suggestions.push(this.createCandidate({
          title: `Pass-through function: ${wrapperName}`,
          description: `Function '${wrapperName}' appears to just wrap '${wrappedName}' without adding value.`,
          rationale: 'Unnecessary wrapper functions add indirection and maintenance burden.',
          filePath: file.path,
          lineStart: this.getLineNumber(file.content, match.index),
          confidence: 0.6,
          impact: 0.2,
          effort: 0.1,
          autoFixable: true,
          evidence: [this.createEvidence('pattern_match', this.name, { wrapper: wrapperName, wrapped: wrappedName })],
        }));
      }
    }

    return suggestions;
  }

  private detectGodObjects(
    file: { path: string; content: string }
  ): SuggestionCandidate[] {
    const suggestions: SuggestionCandidate[] = [];

    // Count exports
    const exportCount = (file.content.match(/export\s+(?:const|function|class|interface|type)/g) || []).length;

    // Count lines
    const lineCount = file.content.split('\n').length;

    // Flag large files with many exports
    if (exportCount > 15 && lineCount > 500) {
      suggestions.push(this.createCandidate({
        title: `Large file with many exports: ${file.path}`,
        description: `File has ${exportCount} exports and ${lineCount} lines. Consider splitting into smaller modules.`,
        rationale: 'Large files with many exports indicate a "god object" that does too much.',
        filePath: file.path,
        confidence: 0.8,
        impact: 0.5,
        effort: 0.6,
        autoFixable: false,
        evidence: [this.createEvidence('static_analysis', this.name, { exportCount, lineCount })],
      }));
    }

    return suggestions;
  }

  private detectCircularDependencies(
    file: { path: string; content: string },
    allFiles: { path: string; content: string }[]
  ): SuggestionCandidate[] {
    // Simplified circular dependency detection
    // A full implementation would build an import graph
    return [];
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }
}

// ============================================================================
// TEST GAP HUNTER
// ============================================================================

export class TestGapHunter extends BaseHunter {
  constructor() {
    super('TestGap', 'test_gap');
  }

  async hunt(
    files: { path: string; content: string }[],
    config: HuntConfig
  ): Promise<HuntResult> {
    const startTime = Date.now();
    const suggestions: SuggestionCandidate[] = [];

    // Separate source and test files
    const sourceFiles = files.filter(f => !this.isTestFile(f.path));
    const testFiles = files.filter(f => this.isTestFile(f.path));

    for (const sourceFile of sourceFiles) {
      // Find corresponding test file
      const testFile = this.findTestFile(sourceFile.path, testFiles);

      if (!testFile) {
        suggestions.push(this.createCandidate({
          title: `No test file for ${this.getFileName(sourceFile.path)}`,
          description: `Source file '${sourceFile.path}' has no corresponding test file.`,
          rationale: 'All source files should have tests to ensure reliability.',
          filePath: sourceFile.path,
          confidence: 0.9,
          impact: 0.6,
          effort: 0.5,
          autoFixable: false,
          evidence: [this.createEvidence('static_analysis', this.name, { sourceFile: sourceFile.path })],
        }));
        continue;
      }

      // Check for untested exports
      const untestedExports = this.findUntestedExports(sourceFile, testFile);
      for (const exportName of untestedExports) {
        suggestions.push(this.createCandidate({
          title: `Untested export: ${exportName}`,
          description: `Export '${exportName}' in ${sourceFile.path} is not referenced in tests.`,
          rationale: 'Exported functions/classes should have test coverage.',
          filePath: sourceFile.path,
          symbolName: exportName,
          confidence: 0.75,
          impact: 0.4,
          effort: 0.3,
          autoFixable: false,
          evidence: [this.createEvidence('pattern_match', this.name, { export: exportName, sourceFile: sourceFile.path })],
        }));
      }
    }

    return {
      hunter: this.name,
      duration: Date.now() - startTime,
      suggestions: suggestions.filter(s => s.confidence >= config.minConfidence),
      scannedItems: files.length,
      timestamp: new Date(),
    };
  }

  private isTestFile(path: string): boolean {
    return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(path) ||
           path.includes('__tests__');
  }

  private findTestFile(
    sourcePath: string,
    testFiles: { path: string; content: string }[]
  ): { path: string; content: string } | undefined {
    const baseName = this.getFileName(sourcePath).replace(/\.(ts|tsx|js|jsx)$/, '');

    return testFiles.find(t => {
      const testBaseName = this.getFileName(t.path)
        .replace(/\.(test|spec)\.(ts|tsx|js|jsx)$/, '');
      return testBaseName === baseName;
    });
  }

  private getFileName(path: string): string {
    return path.split('/').pop() || path;
  }

  private findUntestedExports(
    sourceFile: { path: string; content: string },
    testFile: { path: string; content: string }
  ): string[] {
    const untested: string[] = [];

    // Find exports in source
    const exportRegex = /export\s+(?:const|function|class)\s+(\w+)/g;
    let match;

    while ((match = exportRegex.exec(sourceFile.content)) !== null) {
      const exportName = match[1];

      // Check if mentioned in test file
      if (!testFile.content.includes(exportName)) {
        untested.push(exportName);
      }
    }

    return untested;
  }
}

// ============================================================================
// PERFORMANCE RISK HUNTER
// ============================================================================

export class PerformanceRiskHunter extends BaseHunter {
  constructor() {
    super('PerformanceRisk', 'performance_risk');
  }

  async hunt(
    files: { path: string; content: string }[],
    config: HuntConfig
  ): Promise<HuntResult> {
    const startTime = Date.now();
    const suggestions: SuggestionCandidate[] = [];

    for (const file of files) {
      // Detect N+1 query patterns
      const n1Issues = this.detectN1Patterns(file);
      suggestions.push(...n1Issues);

      // Detect missing memoization
      const memoIssues = this.detectMissingMemoization(file);
      suggestions.push(...memoIssues);

      // Detect expensive operations in loops
      const loopIssues = this.detectExpensiveLoops(file);
      suggestions.push(...loopIssues);

      // Detect unbounded data fetching
      const fetchIssues = this.detectUnboundedFetching(file);
      suggestions.push(...fetchIssues);
    }

    return {
      hunter: this.name,
      duration: Date.now() - startTime,
      suggestions: suggestions.filter(s => s.confidence >= config.minConfidence),
      scannedItems: files.length,
      timestamp: new Date(),
    };
  }

  private detectN1Patterns(
    file: { path: string; content: string }
  ): SuggestionCandidate[] {
    const suggestions: SuggestionCandidate[] = [];

    // Pattern: await inside map/forEach
    const n1Pattern = /\.(map|forEach)\s*\(\s*async\s*\([^)]*\)\s*=>\s*\{[^}]*await/g;

    let match;
    while ((match = n1Pattern.exec(file.content)) !== null) {
      suggestions.push(this.createCandidate({
        title: 'Potential N+1 query pattern',
        description: 'Async operation inside loop may cause N+1 queries.',
        rationale: 'Sequential async operations in loops are inefficient. Use Promise.all or batch operations.',
        filePath: file.path,
        lineStart: this.getLineNumber(file.content, match.index),
        confidence: 0.8,
        impact: 0.7,
        effort: 0.4,
        autoFixable: false,
        evidence: [this.createEvidence('pattern_match', this.name, { pattern: 'async_in_loop' })],
      }));
    }

    return suggestions;
  }

  private detectMissingMemoization(
    file: { path: string; content: string }
  ): SuggestionCandidate[] {
    const suggestions: SuggestionCandidate[] = [];

    // React components with expensive computations
    if (file.path.endsWith('.tsx') || file.path.endsWith('.jsx')) {
      // Look for expensive operations that could be memoized
      const expensivePatterns = [
        /\.filter\([^)]+\)\.map\(/g, // filter then map
        /\.sort\(/g, // sorting
        /\.reduce\([^)]+\)(?!.*useMemo)/g, // reduce without useMemo
      ];

      for (const pattern of expensivePatterns) {
        let match;
        while ((match = pattern.exec(file.content)) !== null) {
          // Check if inside useMemo
          const context = file.content.substring(Math.max(0, match.index - 100), match.index);
          if (!context.includes('useMemo')) {
            suggestions.push(this.createCandidate({
              title: 'Missing memoization',
              description: 'Expensive operation may benefit from useMemo.',
              rationale: 'Expensive computations in React components should be memoized to prevent unnecessary recalculations.',
              filePath: file.path,
              lineStart: this.getLineNumber(file.content, match.index),
              confidence: 0.6,
              impact: 0.5,
              effort: 0.2,
              autoFixable: true,
              evidence: [this.createEvidence('pattern_match', this.name, { pattern: 'expensive_computation' })],
            }));
          }
        }
      }
    }

    return suggestions;
  }

  private detectExpensiveLoops(
    file: { path: string; content: string }
  ): SuggestionCandidate[] {
    const suggestions: SuggestionCandidate[] = [];

    // Nested loops
    const nestedLoopPattern = /for\s*\([^)]+\)\s*\{[^}]*for\s*\([^)]+\)/g;

    let match;
    while ((match = nestedLoopPattern.exec(file.content)) !== null) {
      suggestions.push(this.createCandidate({
        title: 'Nested loops detected',
        description: 'Nested loops may have O(n^2) or worse complexity.',
        rationale: 'Consider using Set/Map for O(1) lookups instead of nested iterations.',
        filePath: file.path,
        lineStart: this.getLineNumber(file.content, match.index),
        confidence: 0.7,
        impact: 0.6,
        effort: 0.4,
        autoFixable: false,
        evidence: [this.createEvidence('pattern_match', this.name, { pattern: 'nested_loops' })],
      }));
    }

    return suggestions;
  }

  private detectUnboundedFetching(
    file: { path: string; content: string }
  ): SuggestionCandidate[] {
    const suggestions: SuggestionCandidate[] = [];

    // Look for fetch/query without limit
    const fetchPatterns = [
      /\.select\s*\(\s*['"][^'"]*['"]\s*\)(?![^;]*\.limit)/g,
      /fetch\s*\([^)]+\)(?![^;]*limit)/g,
    ];

    for (const pattern of fetchPatterns) {
      let match;
      while ((match = pattern.exec(file.content)) !== null) {
        const context = file.content.substring(match.index, match.index + 200);
        if (!context.includes('.limit') && !context.includes('LIMIT')) {
          suggestions.push(this.createCandidate({
            title: 'Potentially unbounded data fetch',
            description: 'Query may fetch unlimited records.',
            rationale: 'Always use LIMIT to prevent fetching excessive data.',
            filePath: file.path,
            lineStart: this.getLineNumber(file.content, match.index),
            confidence: 0.65,
            impact: 0.6,
            effort: 0.1,
            autoFixable: true,
            evidence: [this.createEvidence('pattern_match', this.name, { pattern: 'unbounded_fetch' })],
          }));
        }
      }
    }

    return suggestions;
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }
}

// ============================================================================
// DEAD CODE HUNTER
// ============================================================================

export class DeadCodeHunter extends BaseHunter {
  constructor() {
    super('DeadCode', 'dead_code');
  }

  async hunt(
    files: { path: string; content: string }[],
    config: HuntConfig
  ): Promise<HuntResult> {
    const startTime = Date.now();
    const suggestions: SuggestionCandidate[] = [];

    // Build export/import graph
    const exportGraph = this.buildExportGraph(files);
    const importGraph = this.buildImportGraph(files);

    // Find unused exports
    for (const [exportPath, exportNames] of exportGraph) {
      for (const exportName of exportNames) {
        const isUsed = this.isExportUsed(exportPath, exportName, importGraph);

        if (!isUsed) {
          suggestions.push(this.createCandidate({
            title: `Unused export: ${exportName}`,
            description: `Export '${exportName}' in ${exportPath} is never imported.`,
            rationale: 'Dead code increases bundle size and maintenance burden.',
            filePath: exportPath,
            symbolName: exportName,
            confidence: 0.85,
            impact: 0.3,
            effort: 0.1,
            autoFixable: true,
            evidence: [this.createEvidence('static_analysis', this.name, { export: exportName, file: exportPath })],
          }));
        }
      }
    }

    return {
      hunter: this.name,
      duration: Date.now() - startTime,
      suggestions: suggestions.filter(s => s.confidence >= config.minConfidence),
      scannedItems: files.length,
      timestamp: new Date(),
    };
  }

  private buildExportGraph(
    files: { path: string; content: string }[]
  ): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    for (const file of files) {
      const exports = new Set<string>();

      // Named exports
      const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g;
      let match;
      while ((match = namedExportRegex.exec(file.content)) !== null) {
        exports.add(match[1]);
      }

      // Export { name }
      const exportBraceRegex = /export\s*\{([^}]+)\}/g;
      while ((match = exportBraceRegex.exec(file.content)) !== null) {
        const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim());
        names.forEach(n => exports.add(n));
      }

      if (exports.size > 0) {
        graph.set(file.path, exports);
      }
    }

    return graph;
  }

  private buildImportGraph(
    files: { path: string; content: string }[]
  ): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    for (const file of files) {
      const imports = new Set<string>();

      // Named imports
      const importRegex = /import\s*\{([^}]+)\}\s*from/g;
      let match;
      while ((match = importRegex.exec(file.content)) !== null) {
        const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim());
        names.forEach(n => imports.add(n));
      }

      // Default imports
      const defaultImportRegex = /import\s+(\w+)\s+from/g;
      while ((match = defaultImportRegex.exec(file.content)) !== null) {
        imports.add(match[1]);
      }

      if (imports.size > 0) {
        graph.set(file.path, imports);
      }
    }

    return graph;
  }

  private isExportUsed(
    exportPath: string,
    exportName: string,
    importGraph: Map<string, Set<string>>
  ): boolean {
    // Skip index files and common entry points
    if (exportPath.includes('index.ts') || exportPath.includes('index.tsx')) {
      return true;
    }

    // Check if any file imports this export
    for (const [filePath, imports] of importGraph) {
      if (filePath !== exportPath && imports.has(exportName)) {
        return true;
      }
    }

    return false;
  }
}

// ============================================================================
// NAMING DRIFT HUNTER
// ============================================================================

export class NamingDriftHunter extends BaseHunter {
  constructor() {
    super('NamingDrift', 'naming_drift');
  }

  async hunt(
    files: { path: string; content: string }[],
    config: HuntConfig
  ): Promise<HuntResult> {
    const startTime = Date.now();
    const suggestions: SuggestionCandidate[] = [];

    // Collect all identifiers
    const identifiers = new Map<string, { file: string; line: number }[]>();

    for (const file of files) {
      this.collectIdentifiers(file, identifiers);
    }

    // Group by normalized name and find inconsistencies
    const conceptGroups = this.groupByConcept(identifiers);

    for (const [concept, variants] of conceptGroups) {
      if (variants.size > 1) {
        const variantList = Array.from(variants.keys());
        suggestions.push(this.createCandidate({
          title: `Inconsistent naming: ${variantList.join(', ')}`,
          description: `The same concept '${concept}' is named differently across the codebase.`,
          rationale: 'Consistent naming improves readability and reduces bugs.',
          confidence: 0.8,
          impact: 0.4,
          effort: 0.3,
          autoFixable: true,
          evidence: [this.createEvidence('pattern_match', this.name, {
            concept,
            variants: variantList,
            locations: Array.from(variants.values()).flat(),
          })],
        }));
      }
    }

    return {
      hunter: this.name,
      duration: Date.now() - startTime,
      suggestions: suggestions.filter(s => s.confidence >= config.minConfidence),
      scannedItems: files.length,
      timestamp: new Date(),
    };
  }

  private collectIdentifiers(
    file: { path: string; content: string },
    identifiers: Map<string, { file: string; line: number }[]>
  ): void {
    // Variable/function/class declarations
    const declRegex = /(?:const|let|var|function|class|interface|type)\s+(\w+)/g;
    let match;

    while ((match = declRegex.exec(file.content)) !== null) {
      const name = match[1];
      if (!identifiers.has(name)) {
        identifiers.set(name, []);
      }
      identifiers.get(name)!.push({
        file: file.path,
        line: this.getLineNumber(file.content, match.index),
      });
    }
  }

  private groupByConcept(
    identifiers: Map<string, { file: string; line: number }[]>
  ): Map<string, Map<string, { file: string; line: number }[]>> {
    const groups = new Map<string, Map<string, { file: string; line: number }[]>>();

    for (const [identifier, locations] of identifiers) {
      // Normalize to find concept
      const normalized = identifier
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '')
        .replace(/_+/g, '_');

      if (!groups.has(normalized)) {
        groups.set(normalized, new Map());
      }

      const variantMap = groups.get(normalized)!;
      if (!variantMap.has(identifier)) {
        variantMap.set(identifier, []);
      }
      variantMap.get(identifier)!.push(...locations);
    }

    return groups;
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }
}

// ============================================================================
// SUGGESTION HUNTING ORCHESTRATOR
// ============================================================================

export class SuggestionHuntingOrchestrator {
  private hunters: BaseHunter[];

  constructor() {
    this.hunters = [
      new ArchitecturalSimplificationHunter(),
      new TestGapHunter(),
      new PerformanceRiskHunter(),
      new DeadCodeHunter(),
      new NamingDriftHunter(),
    ];
  }

  /**
   * Run all hunters
   */
  async runHunt(
    files: { path: string; content: string }[],
    config: Partial<HuntConfig> = {}
  ): Promise<HuntSession> {
    const fullConfig: HuntConfig = {
      categories: config.categories || [
        'architectural_simplification',
        'test_gap',
        'performance_risk',
        'dead_code',
        'naming_drift',
      ],
      minConfidence: config.minConfidence ?? 0.5,
      maxSuggestions: config.maxSuggestions ?? 100,
      includeAutoFixable: config.includeAutoFixable ?? true,
      scope: config.scope || 'project',
      targetPaths: config.targetPaths,
    };

    const session: HuntSession = {
      id: crypto.randomUUID(),
      config: fullConfig,
      startedAt: new Date(),
      status: 'running',
      progress: {
        total: this.hunters.length,
        completed: 0,
        currentPhase: 'initializing',
      },
      results: [],
    };

    try {
      const activeHunters = this.hunters.filter(h =>
        fullConfig.categories.includes((h as any).category)
      );

      for (const hunter of activeHunters) {
        session.progress.currentPhase = (hunter as any).name;

        const result = await hunter.hunt(files, fullConfig);
        session.results.push(result);
        session.progress.completed++;
      }

      session.status = 'completed';
      session.completedAt = new Date();
    } catch (error) {
      session.status = 'failed';
      console.error('Hunt failed:', error);
    }

    return session;
  }

  /**
   * Get all suggestions from a hunt session
   */
  getSuggestions(session: HuntSession): SuggestionCandidate[] {
    return session.results
      .flatMap(r => r.suggestions)
      .sort((a, b) => {
        // Sort by confidence * impact
        const scoreA = a.confidence * a.impact;
        const scoreB = b.confidence * b.impact;
        return scoreB - scoreA;
      })
      .slice(0, session.config.maxSuggestions);
  }

  /**
   * Register additional hunter
   */
  registerHunter(hunter: BaseHunter): void {
    this.hunters.push(hunter);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { SuggestionHuntingOrchestrator as default };
