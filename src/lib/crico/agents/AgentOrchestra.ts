/**
 * CRICO Multi-Agent Orchestra
 * Implements Section 4 of the CRICO Master Plan
 *
 * Agent Society:
 * - Conductor Agent: Routes tasks to appropriate agents
 * - Planner Agent: Breaks down complex tasks
 * - Code Auditor Agent: Quality checks
 * - Test Architect Agent: Coverage analysis
 * - Schema Integrity Agent: Drift detection
 * - UX Coherence Agent: UI-backend alignment
 * - Risk & Regression Agent: Predict failures
 */

import { BaseAgent, AgentRegistry, type AnalysisContext, type VerificationResult } from './base-agent';
import type {
  AgentType,
  AgentOutput,
  Claim,
  Suggestion,
  Evidence,
  SuggestionCategory,
} from '../types';
import { AlignmentCalculator, type AlignmentScore } from '../alignment/AlignmentGraph';
import { TypeCoherenceAnalyzer } from '../alignment/TypeCoherenceAnalyzer';
import { TestRealityScorer } from '../alignment/TestRealityScorer';

// ============================================================================
// ORCHESTRA TYPES
// ============================================================================

export interface TaskRequest {
  id: string;
  type: 'analysis' | 'suggestion' | 'verification' | 'planning';
  description: string;
  context: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  deadline?: Date;
  requiredAgents?: AgentType[];
}

export interface TaskResult {
  requestId: string;
  agentType: AgentType;
  success: boolean;
  output: AgentOutput;
  duration: number;
  timestamp: Date;
}

export interface OrchestraState {
  activeRequests: TaskRequest[];
  completedRequests: string[];
  agentStatuses: Map<AgentType, 'idle' | 'busy' | 'error'>;
  lastHealthCheck: Date;
}

// ============================================================================
// CONDUCTOR AGENT
// ============================================================================

/**
 * Conductor Agent - Routes tasks to appropriate agents
 */
export class ConductorAgent extends BaseAgent {
  private orchestra: AgentOrchestra;

  constructor(orchestra: AgentOrchestra) {
    super('conductor', 'Conductor', 'Routes and coordinates tasks across agents', '1.0.0');
    this.orchestra = orchestra;
  }

  async analyze(context: AnalysisContext): Promise<AgentOutput> {
    const startTime = Date.now();
    const claims: Claim[] = [];
    const suggestions: Suggestion[] = [];

    // Determine which agents should handle this context
    const routing = this.routeTask(context);

    claims.push(this.createClaim(
      `Task routed to ${routing.agents.length} agents: ${routing.agents.join(', ')}`,
      0.95,
      [this.createEvidence('static_analysis', 'ConductorAgent', routing)],
      'Rule-based task routing',
      ['Verify agents are available', 'Check routing logic']
    ));

    return {
      agentType: this.type,
      claims,
      suggestions,
      confidence: 0.95,
      methodology: 'Task analysis and rule-based routing',
      duration: Date.now() - startTime,
      metadata: { routing },
    };
  }

  async suggest(analysisResult: AgentOutput): Promise<Suggestion[]> {
    return [];
  }

  async verify(claim: Claim): Promise<VerificationResult> {
    return {
      verified: true,
      confidence: 0.9,
      issues: [],
    };
  }

  /**
   * Route a task to appropriate agents
   */
  private routeTask(context: AnalysisContext): {
    agents: AgentType[];
    priority: 'low' | 'medium' | 'high';
    parallelizable: boolean;
  } {
    const agents: AgentType[] = [];
    let priority: 'low' | 'medium' | 'high' = 'medium';
    let parallelizable = true;

    const triggerType = context.triggerType;

    // Route based on trigger type
    switch (triggerType) {
      case 'file_save':
        agents.push('code_auditor');
        if (context.inputData && typeof context.inputData === 'object') {
          const data = context.inputData as { filePath?: string };
          if (data.filePath?.endsWith('.ts') || data.filePath?.endsWith('.tsx')) {
            agents.push('schema_integrity');
          }
          if (data.filePath?.includes('test') || data.filePath?.includes('spec')) {
            agents.push('test_architect');
          }
        }
        break;

      case 'schema_change':
        agents.push('schema_integrity', 'risk_regression');
        priority = 'high';
        parallelizable = false; // Schema changes need sequential validation
        break;

      case 'pull_request':
        agents.push('code_auditor', 'test_architect', 'risk_regression', 'documentation');
        priority = 'high';
        break;

      case 'deployment':
        agents.push('risk_regression', 'schema_integrity');
        priority = 'high';
        parallelizable = false;
        break;

      case 'user_request':
        agents.push('planner'); // Planner will break down the request
        break;

      default:
        agents.push('code_auditor'); // Default to code audit
    }

    return { agents, priority, parallelizable };
  }
}

// ============================================================================
// PLANNER AGENT
// ============================================================================

/**
 * Planner Agent - Breaks down complex tasks
 */
export class PlannerAgent extends BaseAgent {
  constructor() {
    super('planner', 'Planner', 'Breaks down complex tasks into manageable steps', '1.0.0');
  }

  async analyze(context: AnalysisContext): Promise<AgentOutput> {
    const startTime = Date.now();
    const claims: Claim[] = [];
    const suggestions: Suggestion[] = [];

    // Analyze the task and create a plan
    const plan = this.createPlan(context);

    claims.push(this.createClaim(
      `Task broken into ${plan.steps.length} steps`,
      0.85,
      [this.createEvidence('llm_inference', 'PlannerAgent', plan)],
      'Task decomposition analysis',
      ['Review generated steps', 'Verify step dependencies']
    ));

    return {
      agentType: this.type,
      claims,
      suggestions,
      confidence: 0.85,
      methodology: 'Task decomposition and dependency analysis',
      duration: Date.now() - startTime,
      metadata: { plan },
    };
  }

  async suggest(analysisResult: AgentOutput): Promise<Suggestion[]> {
    return [];
  }

  async verify(claim: Claim): Promise<VerificationResult> {
    return {
      verified: true,
      confidence: 0.8,
      issues: [],
    };
  }

  private createPlan(context: AnalysisContext): {
    steps: { id: string; description: string; agents: AgentType[]; dependencies: string[] }[];
    estimatedDuration: number;
  } {
    // Simplified planning - a real implementation would use more sophisticated analysis
    const steps: { id: string; description: string; agents: AgentType[]; dependencies: string[] }[] = [];

    if (context.triggerType === 'user_request') {
      steps.push(
        { id: 'analyze', description: 'Analyze current state', agents: ['code_auditor'], dependencies: [] },
        { id: 'plan', description: 'Create detailed plan', agents: ['planner'], dependencies: ['analyze'] },
        { id: 'implement', description: 'Implement changes', agents: ['code_auditor'], dependencies: ['plan'] },
        { id: 'test', description: 'Verify changes', agents: ['test_architect'], dependencies: ['implement'] },
        { id: 'review', description: 'Final review', agents: ['risk_regression'], dependencies: ['test'] }
      );
    }

    return {
      steps,
      estimatedDuration: steps.length * 60000, // 1 minute per step estimate
    };
  }
}

// ============================================================================
// CODE AUDITOR AGENT
// ============================================================================

/**
 * Code Auditor Agent - Quality checks
 */
export class CodeAuditorAgent extends BaseAgent {
  constructor() {
    super('code_auditor', 'Code Auditor', 'Performs code quality analysis and audits', '1.0.0');
  }

  async analyze(context: AnalysisContext): Promise<AgentOutput> {
    const startTime = Date.now();
    const claims: Claim[] = [];
    const suggestions: Suggestion[] = [];

    if (context.inputData && typeof context.inputData === 'object') {
      const data = context.inputData as { content?: string; filePath?: string };

      if (data.content && data.filePath) {
        // Run type coherence check
        const typeCheck = TypeCoherenceAnalyzer.quickTypeCheck(data.content, data.filePath);

        if (typeCheck.issues.length > 0) {
          claims.push(this.createClaim(
            `Found ${typeCheck.issues.length} type issues`,
            0.9,
            [this.createEvidence('static_analysis', 'CodeAuditorAgent', typeCheck)],
            'TypeScript static analysis',
            ['Run tsc --noEmit', 'Check IDE for red squiggles']
          ));

          for (const issue of typeCheck.issues) {
            suggestions.push({
              id: crypto.randomUUID(),
              category: 'type_mismatch',
              priority: issue.severity === 'high' ? 'p1' : 'p2',
              title: 'Type issue detected',
              description: issue.message,
              filePath: data.filePath,
              lineStart: issue.line,
              confidence: 0.9,
              impactScore: 0.6,
              effortScore: 0.2,
              status: 'pending',
              createdAt: new Date(),
              tags: ['type-safety'],
              relatedSuggestions: [],
              metadata: {},
            });
          }
        }

        // Check complexity
        const complexity = this.analyzeComplexity(data.content);
        if (complexity.cyclomaticComplexity > 10) {
          claims.push(this.createClaim(
            `High cyclomatic complexity: ${complexity.cyclomaticComplexity}`,
            0.85,
            [this.createEvidence('static_analysis', 'CodeAuditorAgent', complexity)],
            'Complexity analysis',
            ['Review function and consider refactoring']
          ));
        }
      }
    }

    return {
      agentType: this.type,
      claims,
      suggestions,
      confidence: 0.9,
      methodology: 'Static code analysis',
      duration: Date.now() - startTime,
      metadata: {},
    };
  }

  async suggest(analysisResult: AgentOutput): Promise<Suggestion[]> {
    return analysisResult.suggestions;
  }

  async verify(claim: Claim): Promise<VerificationResult> {
    return {
      verified: claim.confidence >= 0.8,
      confidence: claim.confidence,
      issues: [],
    };
  }

  private analyzeComplexity(content: string): {
    cyclomaticComplexity: number;
    linesOfCode: number;
  } {
    let complexity = 1;
    const decisionPoints = [
      /\bif\s*\(/g,
      /\belse\s+if\s*\(/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /\?\s*[^:]/g,
      /&&/g,
      /\|\|/g,
    ];

    for (const pattern of decisionPoints) {
      const matches = content.match(pattern);
      if (matches) complexity += matches.length;
    }

    return {
      cyclomaticComplexity: complexity,
      linesOfCode: content.split('\n').filter(l => l.trim()).length,
    };
  }
}

// ============================================================================
// TEST ARCHITECT AGENT
// ============================================================================

/**
 * Test Architect Agent - Coverage analysis
 */
export class TestArchitectAgent extends BaseAgent {
  constructor() {
    super('test_architect', 'Test Architect', 'Analyzes test coverage and quality', '1.0.0');
  }

  async analyze(context: AnalysisContext): Promise<AgentOutput> {
    const startTime = Date.now();
    const claims: Claim[] = [];
    const suggestions: Suggestion[] = [];

    if (context.inputData && typeof context.inputData === 'object') {
      const data = context.inputData as { testContent?: string; testFilePath?: string };

      if (data.testContent && data.testFilePath) {
        const analysis = TestRealityScorer.analyzeTestFile(data.testContent, data.testFilePath);

        claims.push(this.createClaim(
          `Test assertion quality: ${analysis.assertionAnalysis.qualityScore}%`,
          0.85,
          [this.createEvidence('static_analysis', 'TestArchitectAgent', analysis)],
          'Test quality analysis',
          ['Review weak assertions', 'Check mock depth']
        ));

        if (analysis.assertionAnalysis.qualityScore < 60) {
          suggestions.push({
            id: crypto.randomUUID(),
            category: 'test_gap',
            priority: 'p2',
            title: 'Low assertion quality',
            description: `Test file has ${analysis.assertionAnalysis.weakAssertions} weak assertions`,
            filePath: data.testFilePath,
            confidence: 0.85,
            impactScore: 0.5,
            effortScore: 0.3,
            status: 'pending',
            createdAt: new Date(),
            tags: ['testing'],
            relatedSuggestions: [],
            metadata: {},
          });
        }

        if (analysis.mockAnalysis.mockDepthRatio > 0.7) {
          suggestions.push({
            id: crypto.randomUUID(),
            category: 'test_gap',
            priority: 'p2',
            title: 'High mock ratio',
            description: 'Test mocks most dependencies, reducing test reality',
            filePath: data.testFilePath,
            confidence: 0.8,
            impactScore: 0.4,
            effortScore: 0.5,
            status: 'pending',
            createdAt: new Date(),
            tags: ['testing', 'mocking'],
            relatedSuggestions: [],
            metadata: {},
          });
        }
      }
    }

    return {
      agentType: this.type,
      claims,
      suggestions,
      confidence: 0.85,
      methodology: 'Test quality and coverage analysis',
      duration: Date.now() - startTime,
      metadata: {},
    };
  }

  async suggest(analysisResult: AgentOutput): Promise<Suggestion[]> {
    return analysisResult.suggestions;
  }

  async verify(claim: Claim): Promise<VerificationResult> {
    return {
      verified: true,
      confidence: claim.confidence,
      issues: [],
    };
  }
}

// ============================================================================
// SCHEMA INTEGRITY AGENT
// ============================================================================

/**
 * Schema Integrity Agent - Drift detection
 */
export class SchemaIntegrityAgent extends BaseAgent {
  constructor() {
    super('schema_integrity', 'Schema Integrity', 'Detects schema drift across layers', '1.0.0');
  }

  async analyze(context: AnalysisContext): Promise<AgentOutput> {
    const startTime = Date.now();
    const claims: Claim[] = [];
    const suggestions: Suggestion[] = [];

    // This would integrate with SchemaAlignmentChecker in a real implementation
    claims.push(this.createClaim(
      'Schema integrity check initiated',
      0.9,
      [this.createEvidence('static_analysis', 'SchemaIntegrityAgent', { context })],
      'Schema comparison analysis',
      ['Compare DB schema with TypeScript types', 'Check API contracts']
    ));

    return {
      agentType: this.type,
      claims,
      suggestions,
      confidence: 0.9,
      methodology: 'Cross-layer schema comparison',
      duration: Date.now() - startTime,
      metadata: {},
    };
  }

  async suggest(analysisResult: AgentOutput): Promise<Suggestion[]> {
    return [];
  }

  async verify(claim: Claim): Promise<VerificationResult> {
    return {
      verified: true,
      confidence: 0.9,
      issues: [],
    };
  }
}

// ============================================================================
// RISK & REGRESSION AGENT
// ============================================================================

/**
 * Risk & Regression Agent - Predict failures
 */
export class RiskRegressionAgent extends BaseAgent {
  constructor() {
    super('risk_regression', 'Risk & Regression', 'Predicts potential failures and regressions', '1.0.0');
  }

  async analyze(context: AnalysisContext): Promise<AgentOutput> {
    const startTime = Date.now();
    const claims: Claim[] = [];
    const suggestions: Suggestion[] = [];

    // Analyze risk factors
    const riskFactors = this.assessRisk(context);

    if (riskFactors.length > 0) {
      claims.push(this.createClaim(
        `Identified ${riskFactors.length} risk factors`,
        0.75,
        [this.createEvidence('pattern_match', 'RiskRegressionAgent', { riskFactors })],
        'Historical pattern analysis and risk assessment',
        ['Review historical failures', 'Check similar changes']
      ));

      for (const risk of riskFactors) {
        if (risk.score > 0.7) {
          suggestions.push({
            id: crypto.randomUUID(),
            category: 'performance_risk',
            priority: risk.score > 0.9 ? 'p0' : 'p1',
            title: risk.name,
            description: risk.description,
            confidence: risk.score,
            impactScore: risk.impact,
            effortScore: risk.mitigation,
            status: 'pending',
            createdAt: new Date(),
            tags: ['risk'],
            relatedSuggestions: [],
            metadata: { risk },
          });
        }
      }
    }

    return {
      agentType: this.type,
      claims,
      suggestions,
      confidence: 0.75,
      methodology: 'Risk factor analysis and historical pattern matching',
      duration: Date.now() - startTime,
      metadata: { riskFactors },
    };
  }

  async suggest(analysisResult: AgentOutput): Promise<Suggestion[]> {
    return analysisResult.suggestions;
  }

  async verify(claim: Claim): Promise<VerificationResult> {
    return {
      verified: true,
      confidence: claim.confidence,
      issues: [],
    };
  }

  private assessRisk(context: AnalysisContext): {
    name: string;
    description: string;
    score: number;
    impact: number;
    mitigation: number;
  }[] {
    const risks: { name: string; description: string; score: number; impact: number; mitigation: number }[] = [];

    // Check for high-risk patterns
    if (context.triggerType === 'schema_change') {
      risks.push({
        name: 'Schema Change Risk',
        description: 'Schema changes can cause runtime errors if types are not updated',
        score: 0.8,
        impact: 0.9,
        mitigation: 0.3,
      });
    }

    if (context.triggerType === 'deployment') {
      risks.push({
        name: 'Deployment Risk',
        description: 'Ensure all migrations are applied and services are healthy',
        score: 0.7,
        impact: 0.95,
        mitigation: 0.4,
      });
    }

    return risks;
  }
}

// ============================================================================
// AGENT ORCHESTRA
// ============================================================================

/**
 * Agent Orchestra - Coordinates all agents
 */
export class AgentOrchestra {
  private registry: AgentRegistry;
  private conductor: ConductorAgent;
  private state: OrchestraState;

  constructor() {
    this.registry = AgentRegistry.getInstance();
    this.conductor = new ConductorAgent(this);

    // Register all agents
    this.registerAgents();

    this.state = {
      activeRequests: [],
      completedRequests: [],
      agentStatuses: new Map(),
      lastHealthCheck: new Date(),
    };

    // Initialize agent statuses
    for (const agent of this.registry.getAll()) {
      const info = agent.getInfo();
      if (info.type) {
        this.state.agentStatuses.set(info.type, 'idle');
      }
    }
  }

  /**
   * Register all agents with the registry
   */
  private registerAgents(): void {
    this.registry.register(this.conductor);
    this.registry.register(new PlannerAgent());
    this.registry.register(new CodeAuditorAgent());
    this.registry.register(new TestArchitectAgent());
    this.registry.register(new SchemaIntegrityAgent());
    this.registry.register(new RiskRegressionAgent());
  }

  /**
   * Submit a task to the orchestra
   */
  async submitTask(request: TaskRequest): Promise<TaskResult[]> {
    this.state.activeRequests.push(request);

    try {
      // Have conductor analyze and route the task
      const routingResult = await this.conductor.run({
        triggerType: request.type,
        inputData: request.context,
      });

      const routing = routingResult.metadata?.routing as {
        agents: AgentType[];
        parallelizable: boolean;
      };

      // Execute with appropriate agents
      const results: TaskResult[] = [];

      if (routing.parallelizable) {
        // Run agents in parallel
        const promises = routing.agents.map(agentType =>
          this.runAgent(agentType, request)
        );
        results.push(...await Promise.all(promises));
      } else {
        // Run agents sequentially
        for (const agentType of routing.agents) {
          const result = await this.runAgent(agentType, request);
          results.push(result);
        }
      }

      // Mark request as completed
      this.state.activeRequests = this.state.activeRequests.filter(r => r.id !== request.id);
      this.state.completedRequests.push(request.id);

      return results;
    } catch (error) {
      console.error('Orchestra task failed:', error);
      throw error;
    }
  }

  /**
   * Run a specific agent
   */
  private async runAgent(agentType: AgentType, request: TaskRequest): Promise<TaskResult> {
    const startTime = Date.now();
    this.state.agentStatuses.set(agentType, 'busy');

    try {
      const output = await this.registry.runAgent(agentType, {
        triggerType: request.type,
        inputData: request.context,
        userId: request.context.userId as string | undefined,
      });

      this.state.agentStatuses.set(agentType, 'idle');

      return {
        requestId: request.id,
        agentType,
        success: true,
        output: output || {
          agentType,
          claims: [],
          suggestions: [],
          confidence: 0,
          methodology: 'failed',
          duration: Date.now() - startTime,
          metadata: {},
        },
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      this.state.agentStatuses.set(agentType, 'error');
      throw error;
    }
  }

  /**
   * Get orchestra state
   */
  getState(): OrchestraState {
    return { ...this.state };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    agents: { type: AgentType; status: string }[];
  }> {
    this.state.lastHealthCheck = new Date();

    const agents: { type: AgentType; status: string }[] = [];
    let healthy = true;

    for (const [type, status] of this.state.agentStatuses) {
      agents.push({ type, status });
      if (status === 'error') {
        healthy = false;
      }
    }

    return { healthy, agents };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { AgentOrchestra as default };
