/**
 * CRICO Documentation Freshness Tracker
 * Monitors doc-code drift and documentation staleness
 *
 * Implements Section 6.5 of the CRICO Master Plan
 * Addresses the "Docs ↔ Reality" alignment axis
 */

import type { Claim, DriftSeverity } from '../types';

// ============================================================================
// DOCUMENTATION TYPES
// ============================================================================

export interface DocumentationFile {
  path: string;
  content: string;
  type: 'readme' | 'api_doc' | 'jsdoc' | 'comment' | 'changelog' | 'guide';
  lastModified: Date;
  relatedCodePaths: string[];
}

export interface CodeFile {
  path: string;
  content: string;
  lastModified: Date;
  exports: string[];
  publicAPI: APIElement[];
}

export interface APIElement {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'constant' | 'variable';
  signature?: string;
  jsdoc?: string;
  lineNumber: number;
}

export interface DocFreshnessResult {
  file: string;
  freshnessScore: number; // 0-100
  staleScore: number; // 0-100, inverse of freshness
  lastDocUpdate: Date;
  lastCodeUpdate: Date;
  daysSinceDocUpdate: number;
  daysSinceCodeUpdate: number;
  semanticDrift: number; // 0-1, how different doc is from code
  driftDetails: DriftDetail[];
  severity: DriftSeverity;
  recommendations: string[];
}

export interface DriftDetail {
  type: 'missing_doc' | 'outdated_example' | 'wrong_signature' | 'missing_param' | 'extra_param' | 'semantic_mismatch';
  element: string;
  docValue?: string;
  codeValue?: string;
  severity: DriftSeverity;
  suggestion: string;
}

export interface OverallFreshnessScore {
  score: number; // 0-100
  totalDocs: number;
  staleDocs: number;
  freshDocs: number;
  criticalIssues: number;
  byType: Record<string, { count: number; avgFreshness: number }>;
  worstOffenders: DocFreshnessResult[];
  recommendations: string[];
  timestamp: Date;
}

// ============================================================================
// CONCEPT EXTRACTION
// ============================================================================

/**
 * Extract concepts/terms from documentation
 */
export function extractDocConcepts(docContent: string): Set<string> {
  const concepts = new Set<string>();

  // Extract code blocks and inline code
  const codeBlockRegex = /```[\s\S]*?```/g;
  const inlineCodeRegex = /`([^`]+)`/g;

  let match;
  while ((match = inlineCodeRegex.exec(docContent)) !== null) {
    concepts.add(match[1].trim());
  }

  // Extract headings as concepts
  const headingRegex = /^#{1,6}\s+(.+)$/gm;
  while ((match = headingRegex.exec(docContent)) !== null) {
    const heading = match[1].trim();
    // Extract individual words from heading
    heading.split(/\s+/).forEach(word => {
      if (word.length > 3 && /^[A-Za-z]/.test(word)) {
        concepts.add(word.toLowerCase());
      }
    });
  }

  // Extract function/method names mentioned
  const funcRegex = /\b([a-z][a-zA-Z0-9]*)\s*\(/g;
  while ((match = funcRegex.exec(docContent)) !== null) {
    concepts.add(match[1]);
  }

  // Extract class/type names (PascalCase)
  const classRegex = /\b([A-Z][a-zA-Z0-9]+)\b/g;
  while ((match = classRegex.exec(docContent)) !== null) {
    concepts.add(match[1]);
  }

  return concepts;
}

/**
 * Extract concepts from code
 */
export function extractCodeConcepts(codeContent: string): Set<string> {
  const concepts = new Set<string>();

  // Extract exported function names
  const exportFuncRegex = /export\s+(?:async\s+)?function\s+(\w+)/g;
  let match;
  while ((match = exportFuncRegex.exec(codeContent)) !== null) {
    concepts.add(match[1]);
  }

  // Extract exported const/let/var names
  const exportVarRegex = /export\s+(?:const|let|var)\s+(\w+)/g;
  while ((match = exportVarRegex.exec(codeContent)) !== null) {
    concepts.add(match[1]);
  }

  // Extract exported class names
  const exportClassRegex = /export\s+(?:abstract\s+)?class\s+(\w+)/g;
  while ((match = exportClassRegex.exec(codeContent)) !== null) {
    concepts.add(match[1]);
  }

  // Extract exported interface/type names
  const exportTypeRegex = /export\s+(?:interface|type)\s+(\w+)/g;
  while ((match = exportTypeRegex.exec(codeContent)) !== null) {
    concepts.add(match[1]);
  }

  // Extract public method names from classes
  const methodRegex = /(?:public\s+)?(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g;
  while ((match = methodRegex.exec(codeContent)) !== null) {
    if (!['if', 'for', 'while', 'switch', 'catch', 'constructor'].includes(match[1])) {
      concepts.add(match[1]);
    }
  }

  return concepts;
}

// ============================================================================
// SEMANTIC DRIFT CALCULATION
// ============================================================================

/**
 * Calculate semantic drift between documentation and code
 */
export function calculateSemanticDrift(
  docConcepts: Set<string>,
  codeConcepts: Set<string>
): { drift: number; missingInDoc: string[]; extraInDoc: string[] } {
  const missingInDoc: string[] = [];
  const extraInDoc: string[] = [];

  // Find code concepts not documented
  for (const concept of codeConcepts) {
    const normalizedConcept = concept.toLowerCase();
    const foundInDoc = Array.from(docConcepts).some(
      dc => dc.toLowerCase() === normalizedConcept ||
        dc.toLowerCase().includes(normalizedConcept) ||
        normalizedConcept.includes(dc.toLowerCase())
    );
    if (!foundInDoc) {
      missingInDoc.push(concept);
    }
  }

  // Find doc concepts not in code (might be outdated references)
  for (const concept of docConcepts) {
    const normalizedConcept = concept.toLowerCase();
    // Only flag if it looks like a code reference (camelCase or PascalCase)
    if (/^[a-z][a-zA-Z0-9]*$/.test(concept) || /^[A-Z][a-zA-Z0-9]+$/.test(concept)) {
      const foundInCode = Array.from(codeConcepts).some(
        cc => cc.toLowerCase() === normalizedConcept ||
          cc.toLowerCase().includes(normalizedConcept) ||
          normalizedConcept.includes(cc.toLowerCase())
      );
      if (!foundInCode) {
        extraInDoc.push(concept);
      }
    }
  }

  // Calculate drift score
  const totalConcepts = Math.max(codeConcepts.size, 1);
  const driftRatio = (missingInDoc.length + extraInDoc.length * 0.5) / totalConcepts;
  const drift = Math.min(driftRatio, 1);

  return { drift, missingInDoc, extraInDoc };
}

// ============================================================================
// JSDOC ANALYSIS
// ============================================================================

/**
 * Extract JSDoc from code
 */
export function extractJSDoc(codeContent: string): Map<string, JSDocInfo> {
  const jsdocs = new Map<string, JSDocInfo>();

  // Match JSDoc comments followed by exports
  const jsdocRegex = /\/\*\*\s*([\s\S]*?)\s*\*\/\s*export\s+(?:async\s+)?(?:function|const|class|interface|type)\s+(\w+)/g;

  let match;
  while ((match = jsdocRegex.exec(codeContent)) !== null) {
    const jsdocContent = match[1];
    const name = match[2];

    jsdocs.set(name, parseJSDoc(jsdocContent));
  }

  return jsdocs;
}

interface JSDocInfo {
  description: string;
  params: { name: string; type?: string; description?: string }[];
  returns?: { type?: string; description?: string };
  examples: string[];
  deprecated?: string;
  since?: string;
  see?: string[];
}

/**
 * Parse JSDoc content
 */
function parseJSDoc(content: string): JSDocInfo {
  const lines = content.split('\n').map(l => l.replace(/^\s*\*\s?/, '').trim());

  const info: JSDocInfo = {
    description: '',
    params: [],
    examples: [],
    see: [],
  };

  let currentExample = '';
  let inExample = false;

  for (const line of lines) {
    if (line.startsWith('@param')) {
      const paramMatch = /^@param\s+(?:\{([^}]+)\}\s+)?(\w+)\s*(.*)$/.exec(line);
      if (paramMatch) {
        info.params.push({
          name: paramMatch[2],
          type: paramMatch[1],
          description: paramMatch[3],
        });
      }
    } else if (line.startsWith('@returns') || line.startsWith('@return')) {
      const returnMatch = /^@returns?\s+(?:\{([^}]+)\}\s+)?(.*)$/.exec(line);
      if (returnMatch) {
        info.returns = {
          type: returnMatch[1],
          description: returnMatch[2],
        };
      }
    } else if (line.startsWith('@example')) {
      inExample = true;
      currentExample = '';
    } else if (line.startsWith('@deprecated')) {
      info.deprecated = line.replace('@deprecated', '').trim() || 'true';
    } else if (line.startsWith('@since')) {
      info.since = line.replace('@since', '').trim();
    } else if (line.startsWith('@see')) {
      info.see?.push(line.replace('@see', '').trim());
    } else if (line.startsWith('@')) {
      if (inExample && currentExample) {
        info.examples.push(currentExample.trim());
      }
      inExample = false;
    } else if (inExample) {
      currentExample += line + '\n';
    } else if (!info.description && line) {
      info.description = line;
    }
  }

  if (inExample && currentExample) {
    info.examples.push(currentExample.trim());
  }

  return info;
}

/**
 * Compare JSDoc with actual function signature
 */
export function compareJSDocWithCode(
  jsdoc: JSDocInfo,
  codeSignature: string,
  functionName: string
): DriftDetail[] {
  const details: DriftDetail[] = [];

  // Extract parameters from code signature
  const paramRegex = /(\w+)\s*(?::\s*([^,)]+))?/g;
  const paramsMatch = codeSignature.match(/\(([^)]*)\)/);
  const codeParams: { name: string; type?: string }[] = [];

  if (paramsMatch) {
    let match;
    while ((match = paramRegex.exec(paramsMatch[1])) !== null) {
      if (match[1] !== 'this') {
        codeParams.push({ name: match[1], type: match[2]?.trim() });
      }
    }
  }

  // Check for missing params in JSDoc
  for (const codeParam of codeParams) {
    const docParam = jsdoc.params.find(p => p.name === codeParam.name);
    if (!docParam) {
      details.push({
        type: 'missing_param',
        element: `${functionName}.${codeParam.name}`,
        codeValue: codeParam.name,
        severity: 'medium',
        suggestion: `Add @param {${codeParam.type || 'unknown'}} ${codeParam.name} to JSDoc`,
      });
    }
  }

  // Check for extra params in JSDoc
  for (const docParam of jsdoc.params) {
    const codeParam = codeParams.find(p => p.name === docParam.name);
    if (!codeParam) {
      details.push({
        type: 'extra_param',
        element: `${functionName}.${docParam.name}`,
        docValue: docParam.name,
        severity: 'medium',
        suggestion: `Remove @param ${docParam.name} from JSDoc (not in function signature)`,
      });
    }
  }

  return details;
}

// ============================================================================
// FRESHNESS CALCULATION
// ============================================================================

/**
 * Calculate documentation freshness for a single file
 */
export function calculateDocFreshness(
  doc: DocumentationFile,
  relatedCode: CodeFile[]
): DocFreshnessResult {
  const driftDetails: DriftDetail[] = [];
  const recommendations: string[] = [];

  // Calculate time-based staleness
  const now = new Date();
  const daysSinceDocUpdate = Math.floor(
    (now.getTime() - doc.lastModified.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Find most recent code update
  const latestCodeUpdate = relatedCode.length > 0
    ? new Date(Math.max(...relatedCode.map(c => c.lastModified.getTime())))
    : doc.lastModified;

  const daysSinceCodeUpdate = Math.floor(
    (now.getTime() - latestCodeUpdate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Doc is stale if code was updated more recently
  const docLagDays = Math.max(0, daysSinceDocUpdate - daysSinceCodeUpdate);

  // Extract concepts for semantic comparison
  const docConcepts = extractDocConcepts(doc.content);
  const codeConcepts = new Set<string>();

  for (const code of relatedCode) {
    extractCodeConcepts(code.content).forEach(c => codeConcepts.add(c));
  }

  // Calculate semantic drift
  const { drift, missingInDoc, extraInDoc } = calculateSemanticDrift(docConcepts, codeConcepts);

  // Add drift details
  for (const missing of missingInDoc.slice(0, 10)) {
    driftDetails.push({
      type: 'missing_doc',
      element: missing,
      codeValue: missing,
      severity: 'medium',
      suggestion: `Document '${missing}' - it exists in code but not in documentation`,
    });
  }

  for (const extra of extraInDoc.slice(0, 5)) {
    driftDetails.push({
      type: 'semantic_mismatch',
      element: extra,
      docValue: extra,
      severity: 'low',
      suggestion: `'${extra}' is documented but may no longer exist in code`,
    });
  }

  // Calculate freshness score
  // Factors: time lag, semantic drift, JSDoc accuracy
  let freshnessScore = 100;

  // Time penalty (up to 30 points)
  if (docLagDays > 0) {
    freshnessScore -= Math.min(docLagDays * 2, 30);
  }

  // Semantic drift penalty (up to 40 points)
  freshnessScore -= Math.round(drift * 40);

  // Missing documentation penalty (up to 30 points)
  const missingRatio = codeConcepts.size > 0 ? missingInDoc.length / codeConcepts.size : 0;
  freshnessScore -= Math.round(Math.min(missingRatio * 30, 30));

  freshnessScore = Math.max(0, Math.min(100, freshnessScore));

  // Determine severity
  let severity: DriftSeverity = 'info';
  if (freshnessScore < 30) severity = 'critical';
  else if (freshnessScore < 50) severity = 'high';
  else if (freshnessScore < 70) severity = 'medium';
  else if (freshnessScore < 90) severity = 'low';

  // Generate recommendations
  if (docLagDays > 30) {
    recommendations.push(`Documentation hasn't been updated in ${daysSinceDocUpdate} days but code was updated ${daysSinceCodeUpdate} days ago`);
  }

  if (missingInDoc.length > 3) {
    recommendations.push(`${missingInDoc.length} code elements lack documentation`);
  }

  if (extraInDoc.length > 2) {
    recommendations.push(`${extraInDoc.length} documented elements may be outdated`);
  }

  return {
    file: doc.path,
    freshnessScore,
    staleScore: 100 - freshnessScore,
    lastDocUpdate: doc.lastModified,
    lastCodeUpdate: latestCodeUpdate,
    daysSinceDocUpdate,
    daysSinceCodeUpdate,
    semanticDrift: drift,
    driftDetails,
    severity,
    recommendations,
  };
}

/**
 * Calculate overall documentation freshness for a project
 */
export function calculateOverallFreshness(
  docs: DocumentationFile[],
  codeFiles: CodeFile[]
): OverallFreshnessScore {
  const results: DocFreshnessResult[] = [];
  const byType: Record<string, { count: number; totalFreshness: number }> = {};

  // Map code files to docs
  for (const doc of docs) {
    const relatedCode = codeFiles.filter(cf =>
      doc.relatedCodePaths.some(rcp =>
        cf.path.includes(rcp) || rcp.includes(cf.path)
      )
    );

    const result = calculateDocFreshness(doc, relatedCode);
    results.push(result);

    // Track by type
    if (!byType[doc.type]) {
      byType[doc.type] = { count: 0, totalFreshness: 0 };
    }
    byType[doc.type].count++;
    byType[doc.type].totalFreshness += result.freshnessScore;
  }

  // Calculate averages
  const typeStats: Record<string, { count: number; avgFreshness: number }> = {};
  for (const [type, stats] of Object.entries(byType)) {
    typeStats[type] = {
      count: stats.count,
      avgFreshness: Math.round(stats.totalFreshness / stats.count),
    };
  }

  // Overall metrics
  const totalDocs = results.length;
  const staleDocs = results.filter(r => r.freshnessScore < 50).length;
  const freshDocs = results.filter(r => r.freshnessScore >= 80).length;
  const criticalIssues = results.filter(r => r.severity === 'critical').length;

  const avgFreshness = totalDocs > 0
    ? Math.round(results.reduce((sum, r) => sum + r.freshnessScore, 0) / totalDocs)
    : 100;

  // Get worst offenders
  const worstOffenders = results
    .filter(r => r.freshnessScore < 70)
    .sort((a, b) => a.freshnessScore - b.freshnessScore)
    .slice(0, 5);

  // Generate recommendations
  const recommendations: string[] = [];

  if (staleDocs > totalDocs * 0.3) {
    recommendations.push(`${Math.round((staleDocs / totalDocs) * 100)}% of documentation is stale`);
  }

  if (criticalIssues > 0) {
    recommendations.push(`${criticalIssues} documentation file(s) require immediate attention`);
  }

  for (const [type, stats] of Object.entries(typeStats)) {
    if (stats.avgFreshness < 50) {
      recommendations.push(`${type} documentation average freshness is only ${stats.avgFreshness}%`);
    }
  }

  return {
    score: avgFreshness,
    totalDocs,
    staleDocs,
    freshDocs,
    criticalIssues,
    byType: typeStats,
    worstOffenders,
    recommendations,
    timestamp: new Date(),
  };
}

// ============================================================================
// CLAIMS GENERATION
// ============================================================================

/**
 * Generate claims from freshness analysis
 */
export function generateFreshnessClaims(score: OverallFreshnessScore): Claim[] {
  const claims: Claim[] = [];

  // Overall freshness claim
  claims.push({
    statement: score.score >= 80
      ? `Documentation freshness is ${score.score}% - docs are generally up to date`
      : `Documentation freshness is only ${score.score}% - significant doc-code drift detected`,
    confidence: 0.85,
    evidence: [
      {
        type: 'static_analysis',
        source: 'DocFreshnessTracker',
        data: {
          score: score.score,
          totalDocs: score.totalDocs,
          staleDocs: score.staleDocs,
          freshDocs: score.freshDocs,
        },
        weight: 0.85,
      },
    ],
    methodology: 'Temporal analysis and semantic concept comparison',
    falsifiable: true,
    verificationSteps: [
      'Review flagged documentation files',
      'Compare documented API with actual exports',
      'Check commit history for doc vs code changes',
    ],
  });

  // Critical issues claim
  if (score.criticalIssues > 0) {
    claims.push({
      statement: `${score.criticalIssues} documentation file(s) are critically out of date`,
      confidence: 0.90,
      evidence: [
        {
          type: 'static_analysis',
          source: 'DocFreshnessTracker',
          data: {
            criticalFiles: score.worstOffenders.map(w => w.file),
          },
          weight: 0.9,
        },
      ],
      methodology: 'Freshness score below 30% threshold',
      falsifiable: true,
      verificationSteps: score.worstOffenders.map(w => `Review ${w.file}`),
    });
  }

  return claims;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const DocFreshnessTracker = {
  extractDocConcepts,
  extractCodeConcepts,
  calculateSemanticDrift,
  extractJSDoc,
  compareJSDocWithCode,
  calculateDocFreshness,
  calculateOverallFreshness,
  generateFreshnessClaims,
};
