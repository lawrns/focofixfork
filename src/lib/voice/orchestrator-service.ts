import { randomUUID } from 'crypto'
import { FeatureFlagsService, FeatureFlagContext } from '../feature-flags/feature-flags'
import { EventBuilder } from '../events/event-envelope'
import { ApiError } from '../errors/api-error'
import { 
  VoiceCaptureService, 
  VoiceCaptureSession, 
  TranscriptionResult 
} from './capture-service'
import { 
  transcribeAudio, 
  AudioFile 
} from '../ai/openai-whisper'
import { 
  generatePlan, 
  PlanGenerationRequest, 
  PlanGenerationResult,
  generateAlternatives as generatePlanAlternatives
} from '../ai/openai-gpt4o'
import { VoiceSessionsAdapter } from '../database/adapters'
import { 
  voiceMonitoringService,
  trackSessionMetrics
} from './monitoring-service'
import { 
  commitVoicePlan,
  VoicePlanCommitResult
} from './commit-voice-plan'

/**
 * Plan Orchestrator Service
 * Coordinates the entire voice-to-plan workflow:
 * 1. Voice capture and transcription
 * 2. Plan generation using AI
 * 3. Validation and storage
 * 4. Event emission and monitoring
 * 
 * Operates in shadow mode - only writes to plan_sessions table
 */

export interface OrchestratorConfig {
  enableRealTimeTranscription?: boolean
  enablePlanValidation?: boolean
  enableAlternatives?: boolean
  maxProcessingTime?: number
  autoRefinePlans?: boolean
  confidenceThreshold?: number
}

export interface PlanOrchestrationRequest {
  context: FeatureFlagContext
  transcription?: string
  audioFile?: AudioFile
  options: {
    language?: string
    complexity?: 'simple' | 'moderate' | 'complex'
    includeDependencies?: boolean
    includeTimeline?: boolean
    includeRisks?: boolean
    maxTasks?: number
    timeframe?: string
    customPrompt?: string
  }
  metadata?: Record<string, any>
}

export interface PlanOrchestrationResult {
  sessionId: string
  planId: string
  status: 'processing' | 'completed' | 'failed' | 'timeout'
  transcription?: TranscriptionResult
  plan?: PlanGenerationResult
  alternatives?: PlanGenerationResult[]
  processingTime: number
  confidence: number
  errors?: string[]
  metadata: Record<string, any>
}

export interface OrchestrationSession {
  id: string
  organizationId: string
  userId: string
  status: 'initializing' | 'transcribing' | 'generating' | 'validating' | 'completed' | 'failed' | 'committing' | 'committed' | 'commit_failed'
  completedAt?: Date
  startedAt: Date
  planId: string
  request: PlanOrchestrationRequest
  result?: PlanOrchestrationResult
  metadata: Record<string, any>
}

/**
 * Plan Orchestrator Service
 */
export class PlanOrchestratorService {
  private featureFlags: FeatureFlagsService
  private voiceCaptureService: VoiceCaptureService
  private voiceSessionsAdapter: VoiceSessionsAdapter
  private config: OrchestratorConfig
  private activeSessions = new Map<string, OrchestrationSession>()

  constructor(config: OrchestratorConfig = {}) {
    this.featureFlags = FeatureFlagsService.getInstance()
    this.voiceCaptureService = new VoiceCaptureService()
    this.voiceSessionsAdapter = new VoiceSessionsAdapter({
      useCompatibilityViews: false,
      enableVoiceFeatures: true,
      enableDualWriteMode: false,
      context: { userId: '', organizationId: '', environment: 'development' }
    })
    this.config = {
      enableRealTimeTranscription: config.enableRealTimeTranscription ?? true,
      enablePlanValidation: config.enablePlanValidation ?? true,
      enableAlternatives: config.enableAlternatives ?? false,
      maxProcessingTime: config.maxProcessingTime ?? 60000, // 60 seconds
      autoRefinePlans: config.autoRefinePlans ?? false,
      confidenceThreshold: config.confidenceThreshold ?? 0.7
    }
  }

  /**
   * Start plan orchestration process
   */
  async orchestratePlan(
    request: PlanOrchestrationRequest
  ): Promise<OrchestrationSession> {
    // Check feature flags
    this.validateFeatureFlags(request.context)

    const sessionId = randomUUID()
    const planId = randomUUID()

    const session: OrchestrationSession = {
      id: sessionId,
      planId,
      userId: request.context.userId,
      organizationId: request.context.organizationId,
      status: 'initializing',
      startedAt: new Date(),
      request,
      metadata: {
        config: this.config,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
        timestamp: new Date().toISOString(),
        ...request.metadata
      }
    }

    // Store session
    this.activeSessions.set(sessionId, session)

    // Create database session record
    await this.createDatabaseSession(session)

    // Emit orchestration started event
    await this.emitOrchestrationEvent('plan_orchestration_started', session)

    // Start processing asynchronously
    this.processPlanOrchestration(sessionId).catch(error => {
      console.error('Plan orchestration processing failed:', error)
    })

    return session
  }

  /**
   * Get orchestration session status
   */
  async getSessionStatus(sessionId: string): Promise<OrchestrationSession | null> {
    // Check memory first for active sessions
    const memorySession = this.activeSessions.get(sessionId)
    if (memorySession) {
      return memorySession
    }

    // Fall back to database for completed sessions
    return this.getDatabaseSession(sessionId)
  }

  /**
   * Cancel orchestration session
   */
  async cancelSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new ApiError('NOT_FOUND' as any, 'Orchestration session not found')
    }

    session.status = 'failed'
    session.completedAt = new Date()

    // Update database session
    await this.updateSessionStatus(sessionId, 'failed')

    // Remove from active sessions
    this.activeSessions.delete(sessionId)

    // Emit cancellation event
    await this.emitOrchestrationEvent('plan_orchestration_cancelled', session)
  }

  /**
   * Main orchestration processing logic
   */
  private async processPlanOrchestration(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) return

    const startTime = Date.now()

    try {
      // Step 1: Transcription (if audio provided)
      if (session.request.audioFile && !session.request.transcription) {
        session.status = 'transcribing'
        await this.updateSessionStatus(sessionId, 'transcribing')
        
        const transcription = await this.transcribeAudio(session)
        session.request.transcription = transcription.text
      }

      // Step 2: Plan Generation
      session.status = 'generating'
      await this.updateSessionStatus(sessionId, 'generating')

      const planResult = await this.generatePlan(session)
      
      // Step 3: Validation (if enabled)
      if (this.config.enablePlanValidation) {
        session.status = 'validating'
        await this.updateSessionStatus(sessionId, 'validating')
        
        await this.validatePlan(session, planResult)
      }

      // Step 4: Generate alternatives (if enabled)
      let alternatives: PlanGenerationResult[] = []
      if (this.config.enableAlternatives && planResult.plan) {
        alternatives = await this.generateAlternatives(session, planResult.plan)
      }

      // Step 5: Auto-refine (if enabled and needed)
      if (this.config.autoRefinePlans && planResult.confidence < this.config.confidenceThreshold) {
        await this.autoRefinePlan(session, planResult)
      }

      // Complete orchestration
      const processingTime = Date.now() - startTime
      
      const result: PlanOrchestrationResult = {
        sessionId: session.id,
        planId: session.planId,
        status: 'completed',
        transcription: session.request.audioFile ? {
          text: session.request.transcription!,
          confidence: 0.9,
          language: session.request.options.language || 'en',
          duration: 0,
          words: []
        } : undefined,
        plan: planResult,
        alternatives: alternatives.length > 0 ? alternatives : undefined,
        processingTime,
        confidence: planResult.confidence,
        metadata: session.metadata
      }

      session.result = result
      session.status = 'completed'
      session.completedAt = new Date()

      // Update database with results
      await this.updateSessionWithResults(sessionId, result)

      // Emit completion event
      await this.emitOrchestrationEvent('plan_orchestration_completed', session, {
        processingTime,
        confidence: result.confidence,
        taskCount: result.plan?.plan.tasks?.length || 0
      })

      // Remove from active sessions
      this.activeSessions.delete(sessionId)

    } catch (error) {
      const processingTime = Date.now() - startTime
      
      session.status = 'failed'
      session.completedAt = new Date()

      const result: PlanOrchestrationResult = {
        sessionId: session.id,
        planId: session.planId,
        status: 'failed',
        processingTime,
        confidence: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        metadata: session.metadata
      }

      session.result = result

      // Update database with error
      await this.updateSessionWithResults(sessionId, result)

      // Emit error event
      await this.emitOrchestrationEvent('plan_orchestration_failed', session, {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      })

      // Remove from active sessions
      this.activeSessions.delete(sessionId)
    }
  }

  /**
   * Transcribe audio file
   */
  private async transcribeAudio(session: OrchestrationSession): Promise<TranscriptionResult> {
    if (!session.request.audioFile) {
      throw new Error('No audio file provided for transcription')
    }

    const startTime = Date.now()

    try {
      const whisperResult = await transcribeAudio(
        session.request.audioFile,
        session.request.context,
        {
          language: session.request.options.language,
          responseFormat: 'verbose_json',
          timestampGranularities: ['word']
        }
      )

      const processingTime = Date.now() - startTime

      // Convert Whisper result to capture service TranscriptionResult format
      const transcription: TranscriptionResult = {
        text: whisperResult.text,
        confidence: whisperResult.confidence || 0.8,
        language: whisperResult.language,
        duration: whisperResult.duration,
        words: whisperResult.words
      }

      // Track transcription metrics
      await voiceMonitoringService.trackTranscriptionCompletion(
        session.id,
        session.request.context,
        {
          latency: processingTime,
          confidence: transcription.confidence,
          language: transcription.language,
          duration: transcription.duration,
          audioSize: session.request.audioFile.size
        }
      )

      return transcription
    } catch (error) {
      const processingTime = Date.now() - startTime
      
      // Track transcription failure
      await voiceMonitoringService.trackSessionFailure(
        session.id,
        session.request.context,
        {
          type: 'transcription_error',
          message: error instanceof Error ? error.message : 'Unknown error',
          stage: 'transcription'
        }
      )

      throw new ApiError('TRANSCRIPTION_FAILED' as any, `Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate plan from transcription
   */
  private async generatePlan(session: OrchestrationSession): Promise<PlanGenerationResult> {
    if (!session.request.transcription) {
      throw new Error('No transcription available for plan generation')
    }

    const startTime = Date.now()

    const planRequest: PlanGenerationRequest = {
      transcription: session.request.transcription,
      context: {
        organizationId: session.organizationId,
        constraints: session.metadata.constraints,
        teamCapabilities: session.metadata.teamCapabilities
      },
      options: {
        language: session.request.options.language,
        complexity: session.request.options.complexity,
        includeDependencies: session.request.options.includeDependencies,
        includeTimeline: session.request.options.includeTimeline,
        includeRisks: session.request.options.includeRisks,
        maxTasks: session.request.options.maxTasks,
        timeframe: session.request.options.timeframe,
        customPrompt: session.request.options.customPrompt
      }
    }

    try {
      const planResult = await generatePlan(planRequest, session.request.context)
      const processingTime = Date.now() - startTime

      // Track plan generation metrics
      await voiceMonitoringService.trackPlanGenerationCompletion(
        session.id,
        session.request.context,
        {
          latency: processingTime,
          confidence: planResult.confidence,
          taskCount: planResult.plan?.plan?.tasks?.length || 0,
          complexity: session.request.options.complexity || 'moderate',
          validationScore: 85, // Would come from actual validation
          errorCount: 0,
          warningCount: 0,
          featureFlags: this.getActiveFlags(session.request.context)
        }
      )

      return planResult
    } catch (error) {
      const processingTime = Date.now() - startTime
      
      // Track plan generation failure
      await voiceMonitoringService.trackSessionFailure(
        session.id,
        session.request.context,
        {
          type: 'plan_generation_error',
          message: error instanceof Error ? error.message : 'Unknown error',
          stage: 'plan_generation'
        }
      )

      throw new ApiError('PLAN_GENERATION_FAILED' as any, `Plan generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate generated plan
   */
  private async validatePlan(
    session: OrchestrationSession,
    planResult: PlanGenerationResult
  ): Promise<void> {
    // Basic validation checks
    if (!planResult.plan || !planResult.plan.plan) {
      throw new Error('Invalid plan structure')
    }

    const plan = planResult.plan.plan

    if (!plan.title || plan.title.trim().length === 0) {
      throw new Error('Plan title is required')
    }

    if (!Array.isArray(plan.tasks) || plan.tasks.length === 0) {
      throw new Error('Plan must contain at least one task')
    }

    if (plan.tasks.length > (session.request.options.maxTasks || 20)) {
      throw new Error(`Plan exceeds maximum task limit of ${session.request.options.maxTasks || 20}`)
    }

    // Validate each task
    for (const task of plan.tasks) {
      if (!task.title || task.title.trim().length === 0) {
        throw new Error('All tasks must have a title')
      }
      
      if (!task.priority || !['low', 'medium', 'high', 'critical'].includes(task.priority)) {
        throw new Error('Invalid task priority')
      }
    }
  }

  /**
   * Generate plan alternatives
   */
  private async generateAlternatives(
    session: OrchestrationSession,
    originalPlan: any
  ): Promise<PlanGenerationResult[]> {
    try {
      return await generatePlanAlternatives(originalPlan, 2, session.request.context)
    } catch (error) {
      console.warn('Failed to generate alternatives:', error)
      return []
    }
  }

  /**
   * Auto-refine plan if confidence is low
   */
  private async autoRefinePlan(
    session: OrchestrationSession,
    planResult: PlanGenerationResult
  ): Promise<void> {
    try {
      // This would call the refinement service
      console.log(`Auto-refining plan ${session.planId} due to low confidence: ${planResult.confidence}`)
      // Implementation would go here
    } catch (error) {
      console.warn('Auto-refinement failed:', error)
    }
  }

  /**
   * Create database session record
   */
  private async createDatabaseSession(session: OrchestrationSession): Promise<void> {
    try {
      await this.voiceSessionsAdapter.create({
        id: session.id,
        organization_id: session.organizationId,
        user_id: session.userId,
        title: `Plan Orchestration ${session.planId.slice(0, 8)}...`,
        language: session.request.options.language || 'en',
        status: session.status,
        max_duration_seconds: Math.floor(this.config.maxProcessingTime! / 1000),
        audio_format: 'webm',
        sample_rate: 16000,
        noise_reduction_enabled: false,
        started_at: session.startedAt,
        transcription_status: session.request.audioFile ? 'pending' : 'completed',
        plan_status: 'pending',
        commit_status: 'pending',
        feature_flags: this.getActiveFlags(session.request.context),
        experimental_settings: {},
        metadata: session.metadata
      })
    } catch (error) {
      console.error('Failed to create database session:', error)
      // Don't throw - this is shadow mode
    }
  }

  /**
   * Update session status in database
   */
  private async updateSessionStatus(sessionId: string, status: string): Promise<void> {
    try {
      await this.voiceSessionsAdapter.update(sessionId, { status })
    } catch (error) {
      console.error('Failed to update session status:', error)
    }
  }

  /**
   * Update session with results
   */
  private async updateSessionWithResults(
    sessionId: string,
    result: PlanOrchestrationResult
  ): Promise<void> {
    try {
      const updateData: any = {
        status: result.status,
        ended_at: new Date(),
        last_activity_at: new Date()
      }

      if (result.transcription) {
        updateData.transcript = result.transcription.text
        updateData.transcript_confidence = result.transcription.confidence
        updateData.transcription_status = 'completed'
        updateData.transcribed_at = new Date()
        updateData.transcription_model = 'whisper-1'
      }

      if (result.plan) {
        updateData.plan_json = result.plan.plan
        updateData.plan_status = 'completed'
        updateData.generated_at = new Date()
        updateData.generation_model = result.plan.model
        updateData.generation_confidence = result.plan.confidence
      }

      if (result.errors?.length) {
        updateData.error_message = result.errors.join('; ')
      }

      await this.voiceSessionsAdapter.update(sessionId, updateData)
    } catch (error) {
      console.error('Failed to update session with results:', error)
    }
  }

  /**
   * Get database session
   */
  private async getDatabaseSession(sessionId: string): Promise<OrchestrationSession | null> {
    try {
      const dbSession = await this.voiceSessionsAdapter.findById(sessionId)
      if (!dbSession) return null

      return {
        id: dbSession.id,
        planId: dbSession.id, // Use session ID as plan ID for now
        userId: dbSession.user_id,
        organizationId: dbSession.organization_id,
        status: dbSession.status as any,
        startedAt: dbSession.started_at,
        completedAt: dbSession.ended_at,
        request: {} as PlanOrchestrationRequest, // Would be reconstructed from metadata
        metadata: dbSession.metadata
      }
    } catch (error) {
      console.error('Failed to get database session:', error)
      return null
    }
  }

  /**
   * Get active feature flags
   */
  private getActiveFlags(context: FeatureFlagContext): string[] {
    return [
      'voice_capture_enabled',
      'plan_orchestration_enabled',
      'ai_whisper_integration' as any,
      'ai_gpt4o_integration' as any,
      'shadow_mode_enabled' as any
    ].filter(flag => this.featureFlags.isEnabled(flag as any, context))
  }

  /**
   * Validate feature flags
   */
  private validateFeatureFlags(context: FeatureFlagContext): void {
    const orchestrationEnabled = this.featureFlags.isEnabled('plan_orchestration_enabled', context)
    const shadowModeEnabled = this.featureFlags.isEnabled('shadow_mode_enabled' as any, context)

    if (!orchestrationEnabled && !shadowModeEnabled) {
      throw new ApiError('FEATURE_FLAG_DISABLED' as any, 'Plan orchestration is not enabled')
    }
  }

  /**
   * Emit orchestration events
   */
  private async emitOrchestrationEvent(
    eventType: string,
    session: OrchestrationSession,
    data?: any
  ): Promise<void> {
    try {
      const event = EventBuilder.planDraftReady(
        session.organizationId,
        session.planId,
        session.userId,
        { eventType, ...data }
      )

      console.log(`[ORCHESTRATOR] Event emitted:`, eventType, event.build())
    } catch (error) {
      console.error('Failed to emit orchestration event:', error)
    }
  }

  /**
   * Commit a voice plan to production database
   */
  async commitPlan(
    sessionId: string,
    context: FeatureFlagContext,
    options?: {
      dryRun?: boolean
      forceCommit?: boolean
      skipValidation?: boolean
    }
  ): Promise<VoicePlanCommitResult> {
    const startTime = Date.now()

    try {
      // Validate feature flags
      this.validateFeatureFlags(context)

      // Get session
      const session = this.activeSessions.get(sessionId)
      if (!session) {
        throw new ApiError('SESSION_NOT_FOUND' as any, 'Orchestration session not found')
      }

      // Update session status
      session.status = 'committing'
      session.completedAt = new Date()

      // Store session in database
      await this.voiceSessionsAdapter.create(session)

      // Commit the plan
      const commitResult = await commitVoicePlan(sessionId, context, options)

      // Update session with commit result
      session.status = commitResult.success ? 'committed' : 'commit_failed'
      session.completedAt = new Date()
      session.metadata = {
        ...session.metadata,
        commitResult,
        commitProcessingTime: Date.now() - startTime
      }

      // Update session in database
      await this.voiceSessionsAdapter.update(sessionId, session)

      // Track commit metrics
      await voiceMonitoringService.trackSessionMetrics(sessionId, context, {
        errorCount: commitResult.success ? 0 : 1,
        validationScore: commitResult.success ? 90 : 10
      })

      // Emit commit event
      await this.emitOrchestrationEvent('plan_committed', session, {
        success: commitResult.success,
        projectId: commitResult.projectId,
        milestoneCount: commitResult.milestoneCount,
        taskCount: commitResult.taskCount,
        processingTime: Date.now() - startTime,
        shadowMode: commitResult.shadowMode
      })

      console.log(`[ORCHESTRATOR] Plan committed:`, sessionId, commitResult)
      return commitResult

    } catch (error) {
      const processingTime = Date.now() - startTime
      
      // Track commit failure
      await voiceMonitoringService.trackSessionFailure(
        sessionId,
        context,
        {
          type: 'commit_error',
          message: error instanceof Error ? error.message : 'Unknown error',
          stage: 'plan_generation' // Use existing stage type
        }
      )

      // Update session status
      const session = this.activeSessions.get(sessionId)
      if (session) {
        session.status = 'commit_failed'
        session.completedAt = new Date()
        await this.voiceSessionsAdapter.update(sessionId, session)
      }

      throw new ApiError('COMMIT_FAILED' as any, `Plan commit failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.activeSessions.size
  }

  /**
   * Get orchestration statistics
   */
  getStatistics(): {
    totalSessions: number
    activeSessions: number
    completedSessions: number
    failedSessions: number
    committedSessions: number
  } {
    const sessions = Array.from(this.activeSessions.values())
    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'generating' || s.status === 'transcribing' || s.status === 'validating' || s.status === 'committing').length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      failedSessions: sessions.filter(s => s.status === 'failed').length,
      committedSessions: sessions.filter(s => s.status === 'committed').length
    }
  }

  /**
   * Cleanup old sessions
   */
  cleanup(): void {
    const now = Date.now()
    const timeoutMs = this.config.maxProcessingTime! * 2 // Double the processing time

    for (const [sessionId, session] of this.activeSessions.entries()) {
      const sessionAge = now - session.startedAt.getTime()
      if (sessionAge > timeoutMs) {
        console.log(`Cleaning up stale orchestration session: ${sessionId}`)
        this.activeSessions.delete(sessionId)
      }
    }
  }
}

/**
 * Export singleton instance
 */
export const planOrchestratorService = new PlanOrchestratorService()

/**
 * Convenience functions
 */
export async function orchestratePlan(
  request: PlanOrchestrationRequest
): Promise<OrchestrationSession> {
  return planOrchestratorService.orchestratePlan(request)
}

export async function getOrchestrationStatus(
  sessionId: string
): Promise<OrchestrationSession | null> {
  return planOrchestratorService.getSessionStatus(sessionId)
}

export async function commitOrchestratedPlan(
  sessionId: string,
  context: FeatureFlagContext,
  options?: {
    dryRun?: boolean
    forceCommit?: boolean
    skipValidation?: boolean
  }
): Promise<VoicePlanCommitResult> {
  return planOrchestratorService.commitPlan(sessionId, context, options)
}
