import { FeatureFlagsService, FeatureFlagContext } from '../feature-flags/feature-flags'
import { EventBuilder } from '../events/event-envelope'
import { ApiError } from '../errors/api-error'
import { PlanDraftSchema } from '../validation/schemas/plan-draft.schema'

/**
 * OpenAI GPT-4o Integration Service
 * Handles plan generation from transcribed text using OpenAI's GPT-4o model
 * Supports structured plan generation with validation and refinement
 */

export interface GPT4oConfig {
  apiKey?: string
  model?: 'gpt-4o' | 'gpt-4o-mini'
  maxTokens?: number
  temperature?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
}

export interface PlanGenerationOptions {
  language?: string
  complexity?: 'simple' | 'moderate' | 'complex'
  includeDependencies?: boolean
  includeTimeline?: boolean
  includeRisks?: boolean
  customPrompt?: string
  maxTasks?: number
  timeframe?: string
}

export interface PlanGenerationRequest {
  transcription: string
  context?: {
    organizationId: string
    projectId?: string
    existingTasks?: string[]
    teamCapabilities?: string[]
    constraints?: string[]
  }
  options: PlanGenerationOptions
}

export interface PlanGenerationResult {
  plan: any // Matches PlanDraftSchema
  confidence: number
  processingTime: number
  tokensUsed: number
  model: string
  reasoning?: string
  alternatives?: any[]
}

export interface PlanRefinementOptions {
  focus: 'timeline' | 'resources' | 'dependencies' | 'risks' | 'quality'
  feedback?: string
  adjustments?: string[]
}

/**
 * OpenAI GPT-4o Service
 */
export class OpenAIGPT4oService {
  private featureFlags: FeatureFlagsService
  private config: GPT4oConfig
  private baseUrl: string

  constructor(config: GPT4oConfig = {}) {
    this.featureFlags = FeatureFlagsService.getInstance()
    this.config = {
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      model: config.model || 'gpt-4o',
      maxTokens: config.maxTokens || 4000,
      temperature: config.temperature || 0.3,
      topP: config.topP || 0.9,
      frequencyPenalty: config.frequencyPenalty || 0.1,
      presencePenalty: config.presencePenalty || 0.1
    }
    this.baseUrl = 'https://api.openai.com/v1'
  }

  /**
   * Generate plan from transcription
   */
  async generatePlan(
    request: PlanGenerationRequest,
    context: FeatureFlagContext
  ): Promise<PlanGenerationResult> {
    // Check feature flags
    this.validateFeatureFlags(context)

    if (!this.config.apiKey) {
      throw new ApiError('MISSING_API_KEY' as any, 'OpenAI API key is required')
    }

    const startTime = Date.now()

    try {
      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(request.options)
      
      // Build user prompt with transcription and context
      const userPrompt = this.buildUserPrompt(request)

      // Make API request
      const response = await this.makeGPTRequest(systemPrompt, userPrompt, context)
      
      const processingTime = Date.now() - startTime

      // Parse and validate the response
      const plan = this.parsePlanResponse(response.choices[0].message.content)
      const validatedPlan = this.validatePlan(plan)

      // Calculate confidence based on response quality
      const confidence = this.calculateConfidence(response, validatedPlan)

      const result: PlanGenerationResult = {
        plan: validatedPlan,
        confidence,
        processingTime,
        tokensUsed: response.usage.total_tokens,
        model: this.config.model!,
        reasoning: response.choices[0].message.content?.includes('REASONING:') 
          ? this.extractReasoning(response.choices[0].message.content)
          : undefined
      }

      // Emit plan generation event
      await this.emitPlanEvent('gpt4o_plan_generated', context, {
        processingTime,
        tokensUsed: result.tokensUsed,
        confidence: result.confidence,
        taskCount: validatedPlan.tasks?.length || 0,
        model: result.model
      })

      return result

    } catch (error) {
      const processingTime = Date.now() - startTime
      
      // Emit error event
      await this.emitPlanEvent('gpt4o_plan_generation_failed', context, {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      })

      throw error
    }
  }

  /**
   * Refine existing plan
   */
  async refinePlan(
    existingPlan: any,
    refinementOptions: PlanRefinementOptions,
    context: FeatureFlagContext
  ): Promise<PlanGenerationResult> {
    // Check feature flags
    this.validateFeatureFlags(context)

    const startTime = Date.now()

    try {
      const systemPrompt = this.buildRefinementSystemPrompt(refinementOptions)
      const userPrompt = this.buildRefinementUserPrompt(existingPlan, refinementOptions)

      const response = await this.makeGPTRequest(systemPrompt, userPrompt, context)
      const processingTime = Date.now() - startTime

      const refinedPlan = this.parsePlanResponse(response.choices[0].message.content)
      const validatedPlan = this.validatePlan(refinedPlan)

      const confidence = this.calculateConfidence(response, validatedPlan)

      const result: PlanGenerationResult = {
        plan: validatedPlan,
        confidence,
        processingTime,
        tokensUsed: response.usage.total_tokens,
        model: this.config.model!
      }

      // Emit refinement event
      await this.emitPlanEvent('gpt4o_plan_refined', context, {
        processingTime,
        tokensUsed: result.tokensUsed,
        confidence: result.confidence,
        focus: refinementOptions.focus
      })

      return result

    } catch (error) {
      const processingTime = Date.now() - startTime
      
      await this.emitPlanEvent('gpt4o_plan_refinement_failed', context, {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      })

      throw error
    }
  }

  /**
   * Generate plan alternatives
   */
  async generateAlternatives(
    originalPlan: any,
    alternativesCount: number = 3,
    context: FeatureFlagContext
  ): Promise<PlanGenerationResult[]> {
    // Check feature flags
    this.validateFeatureFlags(context)

    const results: PlanGenerationResult[] = []

    for (let i = 0; i < alternativesCount; i++) {
      try {
        const startTime = Date.now()

        const systemPrompt = this.buildAlternativeSystemPrompt(i + 1, alternativesCount)
        const userPrompt = this.buildAlternativeUserPrompt(originalPlan)

        const response = await this.makeGPTRequest(systemPrompt, userPrompt, context)
        const processingTime = Date.now() - startTime

        const alternativePlan = this.parsePlanResponse(response.choices[0].message.content)
        const validatedPlan = this.validatePlan(alternativePlan)

        const confidence = this.calculateConfidence(response, validatedPlan)

        const result: PlanGenerationResult = {
          plan: validatedPlan,
          confidence,
          processingTime,
          tokensUsed: response.usage.total_tokens,
          model: this.config.model!
        }

        results.push(result)

      } catch (error) {
        console.error(`Failed to generate alternative ${i + 1}:`, error)
      }
    }

    // Emit alternatives generation event
    await this.emitPlanEvent('gpt4o_alternatives_generated', context, {
      alternativesCount: results.length,
      totalTokens: results.reduce((sum, r) => sum + r.tokensUsed, 0)
    })

    return results
  }

  /**
   * Validate and score plan quality
   */
  async validatePlanQuality(
    plan: any,
    context: FeatureFlagContext
  ): Promise<{
    isValid: boolean
    score: number
    issues: string[]
    suggestions: string[]
  }> {
    try {
      const systemPrompt = `You are a project management expert. Validate the quality of a generated plan and provide feedback.`
      
      const userPrompt = `
Please analyze this plan and provide:
1. A validity score (0-100)
2. List of issues found
3. Suggestions for improvement

Plan JSON:
${JSON.stringify(plan, null, 2)}

Respond in this format:
SCORE: 0-100
ISSUES: [list of issues]
SUGGESTIONS: [list of suggestions]
`

      const response = await this.makeGPTRequest(systemPrompt, userPrompt, context)
      const analysis = response.choices[0].message.content || ''

      return this.parseQualityAnalysis(analysis)

    } catch (error) {
      console.error('Failed to validate plan quality:', error)
      return {
        isValid: false,
        score: 0,
        issues: ['Failed to analyze plan'],
        suggestions: ['Please try regenerating the plan']
      }
    }
  }

  /**
   * Make GPT API request
   */
  private async makeGPTRequest(
    systemPrompt: string,
    userPrompt: string,
    context: FeatureFlagContext
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        top_p: this.config.topP,
        frequency_penalty: this.config.frequencyPenalty,
        presence_penalty: this.config.presencePenalty,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new ApiError('GPT4O_API_ERROR' as any, `GPT-4o API error: ${error.error?.message || 'Unknown error'}`)
    }

    return response.json()
  }

  /**
   * Build system prompt for plan generation
   */
  private buildSystemPrompt(options: PlanGenerationOptions): string {
    return `You are an expert project manager and AI assistant specializing in converting voice transcriptions into actionable project plans.

Your task is to analyze transcribed speech and generate a structured project plan in JSON format that follows this exact schema:

{
  "title": "string",
  "description": "string", 
  "language": "string",
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "status": "todo",
      "priority": "low|medium|high|critical",
      "estimatedHours": number,
      "dependencies": ["string"],
      "tags": ["string"],
      "metadata": {}
    }
  ],
  "metadata": {
    "generatedFrom": "voice",
    "complexity": "${options.complexity || 'moderate'}",
    "estimatedDuration": "string",
    "teamSize": number
  }
}

Guidelines:
- Extract clear, actionable tasks from the transcription
- Estimate realistic timeframes and priorities
- Identify logical dependencies between tasks
- Use professional language and clear descriptions
- Include risk assessment if requested
- Generate timeline if requested
- Maximum ${options.maxTasks || 20} tasks
- Language: ${options.language || 'en'}

Respond ONLY with valid JSON. No explanations or additional text.`
  }

  /**
   * Build user prompt with transcription and context
   */
  private buildUserPrompt(request: PlanGenerationRequest): string {
    let prompt = `Convert this voice transcription into a structured project plan:\n\n"${request.transcription}"\n\n`

    if (request.context) {
      if (request.context.existingTasks?.length) {
        prompt += `Existing tasks to consider:\n${request.context.existingTasks.join('\n')}\n\n`
      }
      if (request.context.teamCapabilities?.length) {
        prompt += `Team capabilities:\n${request.context.teamCapabilities.join('\n')}\n\n`
      }
      if (request.context.constraints?.length) {
        prompt += `Constraints:\n${request.context.constraints.join('\n')}\n\n`
      }
    }

    if (request.options.customPrompt) {
      prompt += `Additional instructions: ${request.options.customPrompt}\n\n`
    }

    prompt += `Generate a complete project plan following the schema. Include ${request.options.includeDependencies ? 'task dependencies' : 'no dependencies'}. ${request.options.includeTimeline ? 'Include timeline estimates' : 'No timeline required'}. ${request.options.includeRisks ? 'Include risk assessment' : 'No risk assessment required'}.`

    return prompt
  }

  /**
   * Build refinement system prompt
   */
  private buildRefinementSystemPrompt(options: PlanRefinementOptions): string {
    const focusInstructions = {
      timeline: 'Focus on optimizing task timelines and deadlines',
      resources: 'Focus on resource allocation and team assignments',
      dependencies: 'Focus on task dependencies and critical path',
      risks: 'Focus on risk identification and mitigation strategies',
      quality: 'Focus on improving task quality and deliverables'
    }

    return `You are a project management expert. ${focusInstructions[options.focus]}.

Refine the provided project plan while maintaining its core structure and intent. The plan should remain valid JSON following the same schema.

${options.feedback ? `User feedback: ${options.feedback}` : ''}
${options.adjustments?.length ? `Specific adjustments requested: ${options.adjustments.join(', ')}` : ''}

Respond ONLY with valid JSON. No explanations.`
  }

  /**
   * Build refinement user prompt
   */
  private buildRefinementUserPrompt(plan: any, options: PlanRefinementOptions): string {
    return `Refine this project plan:\n\n${JSON.stringify(plan, null, 2)}\n\nFocus on: ${options.focus}`
  }

  /**
   * Build alternative system prompt
   */
  private buildAlternativeSystemPrompt(alternativeNumber: number, totalAlternatives: number): string {
    return `You are a creative project manager generating alternative approaches to a project plan.

Generate alternative #${alternativeNumber} of ${totalAlternatives}. This alternative should:
- Offer a different approach to task breakdown
- Consider alternative timelines or resource allocation
- Provide unique insights or perspectives
- Maintain feasibility and professional quality

Follow the same JSON schema as the original plan. Respond ONLY with valid JSON.`
  }

  /**
   * Build alternative user prompt
   */
  private buildAlternativeUserPrompt(plan: any): string {
    return `Generate an alternative approach to this project plan:\n\n${JSON.stringify(plan, null, 2)}`
  }

  /**
   * Parse plan response from GPT
   */
  private parsePlanResponse(response: string | null): any {
    if (!response) {
      throw new Error('Empty response from GPT-4o')
    }

    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      return JSON.parse(jsonMatch[0])
    } catch (error) {
      throw new Error(`Failed to parse plan response: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate plan against schema
   */
  private validatePlan(plan: any): any {
    try {
      return PlanDraftSchema.parse(plan)
    } catch (error) {
      console.error('Plan validation failed:', error)
      
      // Return a basic valid structure if validation fails
      return {
        title: plan.title || 'Generated Plan',
        description: plan.description || 'Plan generated from voice input',
        language: plan.language || 'en',
        tasks: Array.isArray(plan.tasks) ? plan.tasks.slice(0, 20) : [],
        metadata: {
          generatedFrom: 'voice',
          complexity: 'moderate',
          estimatedDuration: 'Unknown',
          teamSize: 1,
          ...plan.metadata
        }
      }
    }
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(response: any, plan: any): number {
    let confidence = 0.5 // Base confidence

    // Boost confidence based on response quality
    if (response.choices[0].finish_reason === 'stop') {
      confidence += 0.2
    }

    // Boost based on plan structure
    if (plan.title && plan.description) {
      confidence += 0.1
    }

    if (Array.isArray(plan.tasks) && plan.tasks.length > 0) {
      confidence += Math.min(0.2, plan.tasks.length * 0.01)
    }

    // Check task quality
    const validTasks = plan.tasks?.filter((task: any) => 
      task.title && task.description && task.priority
    ) || []
    
    if (validTasks.length > 0) {
      confidence += Math.min(0.1, validTasks.length / plan.tasks?.length * 0.1)
    }

    return Math.min(confidence, 1.0)
  }

  /**
   * Extract reasoning from response
   */
  private extractReasoning(response: string): string {
    const match = response.match(/REASONING:\s*([\s\S]*?)(?=\n\n|\{)/)
    return match ? match[1].trim() : ''
  }

  /**
   * Parse quality analysis
   */
  private parseQualityAnalysis(analysis: string): {
    isValid: boolean
    score: number
    issues: string[]
    suggestions: string[]
  } {
    const scoreMatch = analysis.match(/SCORE:\s*(\d+)/)
    const issuesMatch = analysis.match(/ISSUES:\s*\[([\s\S]*?)\]/)
    const suggestionsMatch = analysis.match(/SUGGESTIONS:\s*\[([\s\S]*?)\]/)

    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0
    const issues = issuesMatch ? 
      issuesMatch[1].split(',').map(s => s.trim().replace(/['"]/g, '')) : []
    const suggestions = suggestionsMatch ? 
      suggestionsMatch[1].split(',').map(s => s.trim().replace(/['"]/g, '')) : []

    return {
      isValid: score >= 70,
      score,
      issues,
      suggestions
    }
  }

  /**
   * Validate feature flags
   */
  private validateFeatureFlags(context: FeatureFlagContext): void {
    const gpt4oEnabled = this.featureFlags.isEnabled('ai_gpt4o_integration' as any, context)
    if (!gpt4oEnabled) {
      throw new ApiError('FEATURE_FLAG_DISABLED' as any, 'OpenAI GPT-4o integration is not enabled')
    }
  }

  /**
   * Emit plan events
   */
  private async emitPlanEvent(
    eventType: string,
    context: FeatureFlagContext,
    data: any
  ): Promise<void> {
    try {
      const event = EventBuilder.planDraftReady(
        context.organizationId,
        'gpt4o-plan-generation',
        context.userId,
        { eventType, ...data }
      )

      console.log(`[GPT4O] Plan event emitted:`, eventType, event.build())
    } catch (error) {
      console.error('Failed to emit plan event:', error)
    }
  }

  /**
   * Get service configuration
   */
  getConfig(): GPT4oConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<GPT4oConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}

/**
 * Export singleton instance
 */
export const openAIGPT4oService = new OpenAIGPT4oService()

/**
 * Convenience functions
 */
export async function generatePlan(
  request: PlanGenerationRequest,
  context: FeatureFlagContext
): Promise<PlanGenerationResult> {
  return openAIGPT4oService.generatePlan(request, context)
}

export async function refinePlan(
  existingPlan: any,
  refinementOptions: PlanRefinementOptions,
  context: FeatureFlagContext
): Promise<PlanGenerationResult> {
  return openAIGPT4oService.refinePlan(existingPlan, refinementOptions, context)
}

export async function generateAlternatives(
  originalPlan: any,
  alternativesCount?: number,
  context?: FeatureFlagContext
): Promise<PlanGenerationResult[]> {
  return openAIGPT4oService.generateAlternatives(originalPlan, alternativesCount, context!)
}
