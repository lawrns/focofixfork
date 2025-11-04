import { z } from 'zod'
import { randomUUID } from 'crypto'

/**
 * Event envelope schema for real-time FOCO system events v1.0.0
 * Matches the JSON Schema in schemas/event-envelope.v1.json
 */

// Event type enum for type safety
export const EventTypeEnum = z.enum([
  'voice.session_started',
  'voice.session_ended',
  'voice.audio_uploaded',
  'voice.transcript_ready',
  'voice.transcription_failed',
  'voice.intent_extracted',
  'plan.draft_ready',
  'plan.draft_failed',
  'plan.refined',
  'plan.commit_started',
  'plan.commit_success',
  'plan.commit_error',
  'plan.rollback_success',
  'plan.rollback_error',
  'project.created',
  'project.updated',
  'project.deleted',
  'milestone.created',
  'milestone.updated',
  'milestone.deleted',
  'milestone.completed',
  'task.created',
  'task.updated',
  'task.deleted',
  'task.completed',
  'task.status_changed',
  'dependency.created',
  'dependency.deleted',
  'dependency.cycle_detected',
  'user.joined_organization',
  'user.left_organization',
  'ai.suggestion_generated',
  'ai.suggestion_applied',
  'ai.suggestion_rejected',
  'system.feature_flag_changed',
  'system.migration_started',
  'system.migration_completed',
  'system.migration_failed',
  'monitoring.health_check',
  'monitoring.alert_triggered',
  'monitoring.alert_resolved',
  'analytics.usage_recorded',
  'analytics.performance_metric',
  'security.auth_attempt',
  'security.auth_success',
  'security.auth_failure',
  'security.suspicious_activity',
  'audit.data_accessed',
  'audit.data_modified',
  'audit.data_exported',
  'backup.started',
  'backup.completed',
  'backup.failed',
  'restore.started',
  'restore.completed',
  'restore.failed'
])

// Environment enum
export const EnvironmentEnum = z.enum(['development', 'staging', 'production'])

// Event metadata schema
export const EventMetadataSchema = z.object({
  latency_ms: z.number().min(0).max(300000).optional(),
  source_service: z.string().max(100).optional(),
  source_ip: z.string().max(45).optional(),
  user_agent: z.string().max(500).optional(),
  request_id: z.string().max(100).optional(),
  trace_id: z.string().max(100).optional(),
  span_id: z.string().max(50).optional(),
  environment: EnvironmentEnum.optional(),
  region: z.string().max(20).optional(),
  feature_flags: z.array(z.string().max(50)).optional(),
  experimental_features: z.array(z.string().max(50)).optional(),
  retry_count: z.number().min(0).max(10).optional(),
  batch_size: z.number().min(1).max(10000).optional(),
  queue_position: z.number().min(0).optional(),
  worker_id: z.string().max(50).optional(),
  schema_version: z.string().regex(/^\d+\.\d+\.\d+$/).optional()
}).passthrough() // Allow additional properties for extensibility

// Main event envelope schema
export const EventEnvelopeSchema = z.object({
  event: EventTypeEnum,
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  occurred_at: z.string().datetime(),
  org_id: z.string().uuid(),
  session_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  payload: z.object({}).passthrough(), // Any payload structure allowed
  correlationId: z.string().uuid().optional(),
  causationId: z.string().uuid().optional(),
  metadata: EventMetadataSchema.optional(),
  tags: z.array(z.string()
    .min(1, 'Tag cannot be empty')
    .max(50, 'Tag must be less than 50 characters')
    .regex(/^[a-z0-9\-_]+$/, 'Tag must contain only lowercase letters, numbers, hyphens, and underscores'))
    .max(20, 'Cannot have more than 20 tags')
    .optional()
})

// Type exports
export type EventType = z.infer<typeof EventTypeEnum>
export type Environment = z.infer<typeof EnvironmentEnum>
export type EventMetadata = z.infer<typeof EventMetadataSchema>
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>

/**
 * Event builder class for creating standardized events
 */
export class EventBuilder {
  private event: Partial<EventEnvelope> = {}

  constructor(eventType: EventType, orgId: string, version: string = '1.0.0') {
    this.event = {
      event: eventType,
      version,
      occurred_at: new Date().toISOString(),
      org_id: orgId,
      correlationId: randomUUID()
    }
  }

  static voiceSessionStarted(orgId: string, sessionId: string, userId: string): EventBuilder {
    return new EventBuilder('voice.session_started', orgId)
      .setSessionId(sessionId)
      .setUserId(userId)
      .addTags('voice', 'session', 'api')
  }

  static voiceTranscriptReady(orgId: string, sessionId: string, userId: string, transcript: string): EventBuilder {
    return new EventBuilder('voice.transcript_ready', orgId)
      .setSessionId(sessionId)
      .setUserId(userId)
      .setPayload({ transcript, language: 'en' })
      .addTags('voice', 'transcript', 'ai')
  }

  static planDraftReady(orgId: string, sessionId: string, userId: string, plan: any): EventBuilder {
    return new EventBuilder('plan.draft_ready', orgId)
      .setSessionId(sessionId)
      .setUserId(userId)
      .setPayload({ plan, confidence_score: plan.metadata?.confidence_score })
      .addTags('plan', 'draft', 'ai', 'voice')
  }

  static planCommitSuccess(orgId: string, sessionId: string, userId: string, result: any): EventBuilder {
    return new EventBuilder('plan.commit_success', orgId)
      .setSessionId(sessionId)
      .setUserId(userId)
      .setPayload({
        project_id: result.projectId,
        milestone_count: result.milestoneCount,
        task_count: result.taskCount,
        confidence_score: result.confidenceScore,
        processing_time_ms: result.processingTimeMs
      })
      .addTags('plan', 'commit', 'success', 'voice')
  }

  static taskStatusChanged(orgId: string, userId: string, taskId: string, oldStatus: string, newStatus: string): EventBuilder {
    return new EventBuilder('task.status_changed', orgId)
      .setUserId(userId)
      .setPayload({
        task_id: taskId,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: userId
      })
      .addTags('task', 'status', 'update')
  }

  static aiSuggestionGenerated(orgId: string, userId: string, suggestionType: string, suggestion: any): EventBuilder {
    return new EventBuilder('ai.suggestion_generated', orgId)
      .setUserId(userId)
      .setPayload({ suggestion_type: suggestionType, suggestion })
      .addTags('ai', 'suggestion', 'generated')
  }

  static monitoringAlertTriggered(orgId: string, alertType: string, severity: string, message: string): EventBuilder {
    return new EventBuilder('monitoring.alert_triggered', orgId)
      .setPayload({ alert_type: alertType, severity, message })
      .addTags('monitoring', 'alert', 'triggered')
  }

  setSessionId(sessionId: string): EventBuilder {
    this.event.session_id = sessionId
    return this
  }

  setUserId(userId: string): EventBuilder {
    this.event.user_id = userId
    return this
  }

  setPayload(payload: any): EventBuilder {
    this.event.payload = payload
    return this
  }

  setCorrelationId(correlationId: string): EventBuilder {
    this.event.correlationId = correlationId
    return this
  }

  setCausationId(causationId: string): EventBuilder {
    this.event.causationId = causationId
    return this
  }

  setMetadata(metadata: Partial<EventMetadata>): EventBuilder {
    this.event.metadata = { ...this.event.metadata, ...metadata }
    return this
  }

  addTags(...tags: string[]): EventBuilder {
    const existingTags = this.event.tags || []
    this.event.tags = [...new Set([...existingTags, ...tags])]
    return this
  }

  setLatency(latencyMs: number): EventBuilder {
    this.event.metadata = { ...this.event.metadata, latency_ms: latencyMs }
    return this
  }

  setSourceService(service: string): EventBuilder {
    this.event.metadata = { ...this.event.metadata, source_service: service }
    return this
  }

  setTraceId(traceId: string, spanId?: string): EventBuilder {
    this.event.metadata = { ...this.event.metadata, trace_id: traceId }
    if (spanId) {
      this.event.metadata.span_id = spanId
    }
    return this
  }

  build(): EventEnvelope {
    const result = EventEnvelopeSchema.parse(this.event)
    return result
  }

  buildSafe(): EventEnvelope | null {
    const result = EventEnvelopeSchema.safeParse(this.event)
    return result.success ? result.data : null
  }
}

/**
 * Event validation utilities
 */
export class EventValidator {
  static validate(event: unknown): EventEnvelope {
    return EventEnvelopeSchema.parse(event)
  }

  static safeValidate(event: unknown): { success: true; data: EventEnvelope } | { success: false; error: z.ZodError } {
    const result = EventEnvelopeSchema.safeParse(event)
    return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
  }

  static validatePartial(event: unknown): Partial<EventEnvelope> {
    return EventEnvelopeSchema.partial().parse(event)
  }
}

/**
 * Event filtering and routing utilities
 */
export class EventRouter {
  private routes: Map<EventType, Array<(event: EventEnvelope) => void | Promise<void>>> = new Map()
  private tagRoutes: Map<string, Array<(event: EventEnvelope) => void | Promise<void>>> = new Map()

  /**
   * Register a handler for a specific event type
   */
  on(eventType: EventType, handler: (event: EventEnvelope) => void | Promise<void>): void {
    if (!this.routes.has(eventType)) {
      this.routes.set(eventType, [])
    }
    this.routes.get(eventType)!.push(handler)
  }

  /**
   * Register a handler for events with specific tags
   */
  onTag(tag: string, handler: (event: EventEnvelope) => void | Promise<void>): void {
    if (!this.tagRoutes.has(tag)) {
      this.tagRoutes.set(tag, [])
    }
    this.tagRoutes.get(tag)!.push(handler)
  }

  /**
   * Route an event to all matching handlers
   */
  async route(event: EventEnvelope): Promise<void> {
    // Route by event type
    const typeHandlers = this.routes.get(event.event) || []
    
    // Route by tags
    const tagHandlers: Array<(event: EventEnvelope) => void | Promise<void>> = []
    if (event.tags) {
      for (const tag of event.tags) {
        const handlers = this.tagRoutes.get(tag) || []
        tagHandlers.push(...handlers)
      }
    }

    // Execute all handlers
    const allHandlers = [...typeHandlers, ...tagHandlers]
    await Promise.allSettled(
      allHandlers.map(async (handler) => {
        try {
          await handler(event)
        } catch (error) {
          console.error('Event handler error:', error, { event })
        }
      })
    )
  }

  /**
   * Get statistics about registered routes
   */
  getStats(): {
    eventTypeRoutes: number
    tagRoutes: number
    totalHandlers: number
  } {
    let totalHandlers = 0
    for (const handlers of this.routes.values()) {
      totalHandlers += handlers.length
    }
    for (const handlers of this.tagRoutes.values()) {
      totalHandlers += handlers.length
    }

    return {
      eventTypeRoutes: this.routes.size,
      tagRoutes: this.tagRoutes.size,
      totalHandlers
    }
  }

  /**
   * Clear all routes (useful for testing)
   */
  clear(): void {
    this.routes.clear()
    this.tagRoutes.clear()
  }
}

/**
 * Event aggregation utilities
 */
export class EventAggregator {
  private events: EventEnvelope[] = []
  private maxEvents: number

  constructor(maxEvents: number = 1000) {
    this.maxEvents = maxEvents
  }

  /**
   * Add an event to the aggregator
   */
  add(event: EventEnvelope): void {
    this.events.push(event)
    if (this.events.length > this.maxEvents) {
      this.events.shift() // Remove oldest event
    }
  }

  /**
   * Get events by type
   */
  getByType(eventType: EventType, limit?: number): EventEnvelope[] {
    const filtered = this.events.filter(e => e.event === eventType)
    return limit ? filtered.slice(-limit) : filtered
  }

  /**
   * Get events by organization
   */
  getByOrg(orgId: string, limit?: number): EventEnvelope[] {
    const filtered = this.events.filter(e => e.org_id === orgId)
    return limit ? filtered.slice(-limit) : filtered
  }

  /**
   * Get events by user
   */
  getByUser(userId: string, limit?: number): EventEnvelope[] {
    const filtered = this.events.filter(e => e.user_id === userId)
    return limit ? filtered.slice(-limit) : filtered
  }

  /**
   * Get events by tags
   */
  getByTags(tags: string[], matchAll: boolean = false, limit?: number): EventEnvelope[] {
    const filtered = this.events.filter(e => {
      if (!e.tags) return false
      
      if (matchAll) {
        return tags.every(tag => e.tags!.includes(tag))
      } else {
        return tags.some(tag => e.tags!.includes(tag))
      }
    })
    return limit ? filtered.slice(-limit) : filtered
  }

  /**
   * Get events in time range
   */
  getByTimeRange(startTime: Date, endTime: Date, limit?: number): EventEnvelope[] {
    const filtered = this.events.filter(e => {
      const eventTime = new Date(e.occurred_at)
      return eventTime >= startTime && eventTime <= endTime
    })
    return limit ? filtered.slice(-limit) : filtered
  }

  /**
   * Get statistics about aggregated events
   */
  getStats(): {
    totalEvents: number
    eventTypeCounts: Record<EventType, number>
    orgCounts: Record<string, number>
    userCounts: Record<string, number>
    tagCounts: Record<string, number>
  } {
    const eventTypeCounts: Record<string, number> = {}
    const orgCounts: Record<string, number> = {}
    const userCounts: Record<string, number> = {}
    const tagCounts: Record<string, number> = {}

    for (const event of this.events) {
      // Count by event type
      eventTypeCounts[event.event] = (eventTypeCounts[event.event] || 0) + 1

      // Count by organization
      orgCounts[event.org_id] = (orgCounts[event.org_id] || 0) + 1

      // Count by user
      if (event.user_id) {
        userCounts[event.user_id] = (userCounts[event.user_id] || 0) + 1
      }

      // Count by tags
      if (event.tags) {
        for (const tag of event.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        }
      }
    }

    return {
      totalEvents: this.events.length,
      eventTypeCounts: eventTypeCounts as Record<EventType, number>,
      orgCounts,
      userCounts,
      tagCounts
    }
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = []
  }
}

// Types are already exported through their type declarations
