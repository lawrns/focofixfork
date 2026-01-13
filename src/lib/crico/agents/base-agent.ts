/**
 * CRICO Base Agent
 * Abstract base class for all Crico agents
 */

import { supabase } from '@/lib/supabase/client';
import type {
  Agent,
  AgentType,
  AgentStatus,
  AgentOutput,
  AgentInvocation,
  Claim,
  Suggestion,
  Evidence,
} from '../types';

export interface AnalysisContext {
  userId?: string;
  sessionId?: string;
  triggerType: string;
  triggerContext?: Record<string, unknown>;
  inputData?: unknown;
}

export interface VerificationResult {
  verified: boolean;
  confidence: number;
  issues: string[];
}

export abstract class BaseAgent {
  protected id: string;
  protected type: AgentType;
  protected name: string;
  protected description: string;
  protected version: string;
  protected config: Record<string, unknown>;
  
  constructor(
    type: AgentType,
    name: string,
    description: string,
    version: string = '1.0.0',
    config: Record<string, unknown> = {}
  ) {
    this.id = crypto.randomUUID();
    this.type = type;
    this.name = name;
    this.description = description;
    this.version = version;
    this.config = config;
  }

  /**
   * Main analysis method - must be implemented by each agent
   */
  abstract analyze(context: AnalysisContext): Promise<AgentOutput>;

  /**
   * Generate suggestions based on analysis
   */
  abstract suggest(analysisResult: AgentOutput): Promise<Suggestion[]>;

  /**
   * Verify a claim or suggestion
   */
  abstract verify(claim: Claim): Promise<VerificationResult>;

  /**
   * Calculate confidence score
   */
  protected calculateConfidence(evidence: Evidence[]): number {
    if (evidence.length === 0) return 0;
    
    const weightedSum = evidence.reduce((sum, e) => {
      // Weight by evidence type reliability
      const typeWeight = this.getEvidenceTypeWeight(e.type);
      return sum + (e.weight * typeWeight);
    }, 0);
    
    const totalWeight = evidence.reduce((sum, e) => {
      const typeWeight = this.getEvidenceTypeWeight(e.type);
      return sum + typeWeight;
    }, 0);
    
    return totalWeight > 0 ? Math.min(weightedSum / totalWeight, 1) : 0;
  }

  /**
   * Get reliability weight for evidence type
   */
  private getEvidenceTypeWeight(type: Evidence['type']): number {
    const weights: Record<Evidence['type'], number> = {
      static_analysis: 0.95,
      pattern_match: 0.80,
      historical: 0.75,
      runtime_data: 0.85,
      llm_inference: 0.60,
    };
    return weights[type] ?? 0.5;
  }

  /**
   * Create a claim with proper structure
   */
  protected createClaim(
    statement: string,
    confidence: number,
    evidence: Evidence[],
    methodology: string,
    verificationSteps?: string[]
  ): Claim {
    return {
      statement,
      confidence: Math.min(Math.max(confidence, 0), 1),
      evidence,
      methodology,
      falsifiable: verificationSteps !== undefined && verificationSteps.length > 0,
      verificationSteps,
    };
  }

  /**
   * Create evidence object
   */
  protected createEvidence(
    type: Evidence['type'],
    source: string,
    data: unknown,
    weight: number = 1
  ): Evidence {
    return {
      type,
      source,
      data,
      weight: Math.min(Math.max(weight, 0), 1),
    };
  }

  /**
   * Log agent invocation to database
   */
  protected async logInvocation(
    context: AnalysisContext,
    output: AgentOutput,
    status: AgentStatus,
    errorMessage?: string
  ): Promise<string> {
        
    const invocation: Partial<AgentInvocation> = {
      agentId: this.id,
      agentType: this.type,
      triggerType: context.triggerType,
      triggerContext: context.triggerContext,
      inputData: context.inputData,
      startedAt: new Date(),
      completedAt: new Date(),
      durationMs: output.duration,
      outputData: output.metadata,
      claims: output.claims,
      suggestions: output.suggestions,
      overallConfidence: output.confidence,
      methodology: output.methodology,
      status,
      errorMessage,
      userId: context.userId,
    };

    // Using type assertion as Crico tables aren't in generated types yet
    const { data, error } = await (supabase as any)
      .from('crico_agent_invocations')
      .insert({
        agent_id: invocation.agentId,
        agent_type: invocation.agentType,
        trigger_type: invocation.triggerType,
        trigger_context: invocation.triggerContext,
        input_data: invocation.inputData,
        started_at: invocation.startedAt?.toISOString(),
        completed_at: invocation.completedAt?.toISOString(),
        duration_ms: invocation.durationMs,
        output_data: invocation.outputData,
        claims: invocation.claims,
        suggestions: invocation.suggestions,
        overall_confidence: invocation.overallConfidence,
        methodology: invocation.methodology,
        status: invocation.status,
        error_message: invocation.errorMessage,
        user_id: invocation.userId,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to log agent invocation:', error);
      return '';
    }

    return data?.id ?? '';
  }

  /**
   * Update agent status in database
   */
  protected async updateStatus(status: AgentStatus): Promise<void> {
    // Using type assertion as Crico tables aren't in generated types yet
    await (supabase as any)
      .from('crico_agents')
      .update({
        status,
        last_run_at: new Date().toISOString(),
        ...(status === 'idle' ? { last_success_at: new Date().toISOString() } : {}),
      })
      .eq('agent_type', this.type);
  }

  /**
   * Run the agent with full lifecycle management
   */
  async run(context: AnalysisContext): Promise<AgentOutput> {
    const startTime = Date.now();
    
    try {
      await this.updateStatus('analyzing');
      
      const output = await this.analyze(context);
      output.duration = Date.now() - startTime;
      
      await this.logInvocation(context, output, 'idle');
      await this.updateStatus('idle');
      
      return output;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const errorOutput: AgentOutput = {
        agentType: this.type,
        claims: [],
        suggestions: [],
        confidence: 0,
        methodology: 'error',
        duration: Date.now() - startTime,
        metadata: { error: errorMessage },
      };
      
      await this.logInvocation(context, errorOutput, 'error', errorMessage);
      await this.updateStatus('error');
      
      throw error;
    }
  }

  /**
   * Get agent info
   */
  getInfo(): Partial<Agent> {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      description: this.description,
      version: this.version,
    };
  }
}

/**
 * Agent Registry - manages all active agents
 */
export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<AgentType, BaseAgent> = new Map();

  private constructor() {}

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  register(agent: BaseAgent): void {
    const info = agent.getInfo();
    if (info.type) {
      this.agents.set(info.type, agent);
    }
  }

  get(type: AgentType): BaseAgent | undefined {
    return this.agents.get(type);
  }

  getAll(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  async runAgent(type: AgentType, context: AnalysisContext): Promise<AgentOutput | null> {
    const agent = this.get(type);
    if (!agent) {
      console.error(`Agent not found: ${type}`);
      return null;
    }
    return agent.run(context);
  }

  async runAllAgents(context: AnalysisContext): Promise<Map<AgentType, AgentOutput>> {
    const results = new Map<AgentType, AgentOutput>();
    
    await Promise.all(
      this.getAll().map(async (agent) => {
        try {
          const info = agent.getInfo();
          if (info.type) {
            const output = await agent.run(context);
            results.set(info.type, output);
          }
        } catch (error) {
          console.error(`Agent ${agent.getInfo().type} failed:`, error);
        }
      })
    );
    
    return results;
  }
}
