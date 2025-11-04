import { z } from 'zod'

/**
 * Zod Schemas for Voice Planning Runtime Validation
 * Provides type-safe validation for all voice planning data structures
 */

// Base schemas
export const UUIDSchema = z.string().uuid()
export const TimestampSchema = z.string().datetime()
export const NonEmptyStringSchema = z.string().min(1)

// Feature Flag Context
export const FeatureFlagContextSchema = z.object({
  userId: NonEmptyStringSchema,
  organizationId: NonEmptyStringSchema,
  environment: z.enum(['development', 'staging', 'production'])
})

export type FeatureFlagContext = z.infer<typeof FeatureFlagContextSchema>

// Voice Session schemas
export const VoiceSessionSchema = z.object({
  id: UUIDSchema,
  userId: NonEmptyStringSchema,
  organizationId: NonEmptyStringSchema,
  status: z.enum([
    'initializing',
    'transcribing', 
    'generating',
    'validating',
    'completed',
    'failed',
    'committing',
    'committed',
    'commit_failed'
  ]),
  transcript: z.string().optional(),
  transcriptConfidence: z.number().min(0).max(100).optional(),
  planJson: z.any().optional(),
  planConfidence: z.number().min(0).max(100).optional(),
  commitStatus: z.enum(['pending', 'committed', 'failed']).optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema.optional(),
  startedAt: TimestampSchema,
  completedAt: TimestampSchema.optional(),
  metadata: z.record(z.any()).optional()
})

export type VoiceSession = z.infer<typeof VoiceSessionSchema>

// Transcription schemas
export const TranscriptionResultSchema = z.object({
  text: NonEmptyStringSchema,
  confidence: z.number().min(0).max(100),
  words: z.array(z.object({
    word: NonEmptyStringSchema,
    start: z.number().min(0),
    end: z.number().min(0),
    confidence: z.number().min(0).max(100)
  })).optional(),
  processingTime: z.number().min(0),
  language: z.string().optional(),
  model: NonEmptyStringSchema
})

export type TranscriptionResult = z.infer<typeof TranscriptionResultSchema>

// Plan Generation schemas
export const TaskSchema = z.object({
  id: UUIDSchema,
  title: NonEmptyStringSchema,
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  estimatedDuration: z.number().min(0).optional(),
  assigneeId: NonEmptyStringSchema.optional(),
  dependencies: z.array(UUIDSchema).optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema.optional(),
  dueDate: TimestampSchema.optional(),
  metadata: z.record(z.any()).optional()
})

export const MilestoneSchema = z.object({
  id: UUIDSchema,
  title: NonEmptyStringSchema,
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  targetDate: TimestampSchema,
  completedAt: TimestampSchema.optional(),
  tasks: z.array(TaskSchema).optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema.optional(),
  metadata: z.record(z.any()).optional()
})

export const ProjectSchema = z.object({
  id: UUIDSchema,
  title: NonEmptyStringSchema,
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  startDate: TimestampSchema.optional(),
  targetDate: TimestampSchema.optional(),
  completedAt: TimestampSchema.optional(),
  budget: z.number().min(0).optional(),
  currency: z.string().optional(),
  team: z.array(z.object({
    userId: NonEmptyStringSchema,
    role: NonEmptyStringSchema,
    allocation: z.number().min(0).max(100).optional()
  })).optional(),
  milestones: z.array(MilestoneSchema).optional(),
  tasks: z.array(TaskSchema).optional(),
  voiceSessionId: NonEmptyStringSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema.optional(),
  metadata: z.record(z.any()).optional()
})

export type Task = z.infer<typeof TaskSchema>
export type Milestone = z.infer<typeof MilestoneSchema>
export type Project = z.infer<typeof ProjectSchema>

// Plan Generation Result
export const PlanGenerationResultSchema = z.object({
  id: UUIDSchema,
  project: ProjectSchema,
  confidence: z.number().min(0).max(100),
  processingTime: z.number().min(0),
  model: NonEmptyStringSchema,
  alternatives: z.array(z.any()).optional(),
  errors: z.array(NonEmptyStringSchema).optional(),
  warnings: z.array(NonEmptyStringSchema).optional(),
  metadata: z.record(z.any()).optional()
})

export type PlanGenerationResult = z.infer<typeof PlanGenerationResultSchema>

// Voice Plan Commit schemas
export const VoicePlanCommitResultSchema = z.object({
  sessionId: UUIDSchema,
  success: z.boolean(),
  projectId: NonEmptyStringSchema.optional(),
  milestoneCount: z.number().min(0),
  taskCount: z.number().min(0),
  processingTimeMs: z.number().min(0),
  auditId: UUIDSchema.optional(),
  shadowMode: z.boolean(),
  errors: z.array(NonEmptyStringSchema).optional(),
  warnings: z.array(NonEmptyStringSchema).optional()
})

export type VoicePlanCommitResult = z.infer<typeof VoicePlanCommitResultSchema>

// Orchestration schemas
export const PlanOrchestrationRequestSchema = z.object({
  audioBlob: z.any(), // Blob type
  context: FeatureFlagContextSchema,
  options: z.object({
    language: z.string().optional(),
    generateAlternatives: z.boolean().optional(),
    skipValidation: z.boolean().optional(),
    autoCommit: z.boolean().optional()
  }).optional()
})

export const PlanOrchestrationResultSchema = z.object({
  sessionId: UUIDSchema,
  transcription: TranscriptionResultSchema.optional(),
  plan: PlanGenerationResultSchema.optional(),
  validation: z.any().optional(),
  processingTime: z.number().min(0),
  confidence: z.number().min(0).max(100),
  errors: z.array(NonEmptyStringSchema).optional(),
  warnings: z.array(NonEmptyStringSchema).optional(),
  metadata: z.record(z.any()).optional()
})

export const OrchestrationSessionSchema = z.object({
  id: UUIDSchema,
  organizationId: NonEmptyStringSchema,
  userId: NonEmptyStringSchema,
  status: z.enum([
    'initializing',
    'transcribing', 
    'generating',
    'validating',
    'completed',
    'failed',
    'committing',
    'committed',
    'commit_failed'
  ]),
  completedAt: TimestampSchema.optional(),
  startedAt: TimestampSchema,
  planId: UUIDSchema,
  request: PlanOrchestrationRequestSchema,
  result: PlanOrchestrationResultSchema.optional(),
  metadata: z.record(z.any())
})

export type PlanOrchestrationRequest = z.infer<typeof PlanOrchestrationRequestSchema>
export type PlanOrchestrationResult = z.infer<typeof PlanOrchestrationResultSchema>
export type OrchestrationSession = z.infer<typeof OrchestrationSessionSchema>

// Monitoring schemas
export const VoiceMetricsSchema = z.object({
  sessionId: UUIDSchema,
  userId: NonEmptyStringSchema,
  organizationId: NonEmptyStringSchema,
  timestamp: TimestampSchema,
  metrics: z.object({
    transcriptionLatency: z.number().min(0),
    planGenerationLatency: z.number().min(0),
    confidence: z.number().min(0).max(100),
    errorCount: z.number().min(0),
    validationScore: z.number().min(0).max(100)
  }),
  metadata: z.record(z.any()).optional()
})

export const KPIDataSchema = z.object({
  timeWindow: z.enum(['1h', '24h', '7d', '30d']),
  metrics: z.object({
    totalSessions: z.number().min(0),
    successRate: z.number().min(0).max(100),
    averageLatency: z.number().min(0),
    errorRate: z.number().min(0).max(100),
    confidenceScore: z.number().min(0).max(100)
  }),
  timestamp: TimestampSchema
})

export const AlertDataSchema = z.object({
  id: UUIDSchema,
  type: z.enum(['latency', 'error_rate', 'confidence', 'system']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  message: NonEmptyStringSchema,
  timestamp: TimestampSchema,
  resolved: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
})

export type VoiceMetrics = z.infer<typeof VoiceMetricsSchema>
export type KPIData = z.infer<typeof KPIDataSchema>
export type AlertData = z.infer<typeof AlertDataSchema>

// Backfill schemas
export const BackfillConfigSchema = z.object({
  batchSize: z.number().min(1).max(1000).optional(),
  maxRetries: z.number().min(0).max(10).optional(),
  enableDryRun: z.boolean().optional(),
  enableParityCheck: z.boolean().optional(),
  enableAuditLogging: z.boolean().optional(),
  targetDateRange: z.object({
    start: TimestampSchema,
    end: TimestampSchema
  }).optional()
})

export const BackfillResultSchema = z.object({
  success: z.boolean(),
  totalSessions: z.number().min(0),
  processedSessions: z.number().min(0),
  skippedSessions: z.number().min(0),
  failedSessions: z.number().min(0),
  errors: z.array(NonEmptyStringSchema),
  warnings: z.array(NonEmptyStringSchema),
  processingTimeMs: z.number().min(0),
  dryRun: z.boolean()
})

export const ParityCheckResultSchema = z.object({
  success: z.boolean(),
  totalSessions: z.number().min(0),
  matchingSessions: z.number().min(0),
  mismatchedSessions: z.number().min(0),
  missingInProduction: z.number().min(0),
  missingInShadow: z.number().min(0),
  discrepancies: z.array(z.object({
    sessionId: UUIDSchema,
    type: z.enum(['project_count', 'milestone_count', 'task_count', 'data_mismatch']),
    expected: z.any(),
    actual: z.any()
  })),
  processingTimeMs: z.number().min(0)
})

export const BackfillJobSchema = z.object({
  id: UUIDSchema,
  type: z.enum(['migration', 'parity_check', 'cleanup']),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  config: BackfillConfigSchema,
  result: z.union([BackfillResultSchema, ParityCheckResultSchema]).optional(),
  createdAt: TimestampSchema,
  startedAt: TimestampSchema.optional(),
  completedAt: TimestampSchema.optional(),
  error: NonEmptyStringSchema.optional()
})

export type BackfillConfig = z.infer<typeof BackfillConfigSchema>
export type BackfillResult = z.infer<typeof BackfillResultSchema>
export type ParityCheckResult = z.infer<typeof ParityCheckResultSchema>
export type BackfillJob = z.infer<typeof BackfillJobSchema>

// API Request/Response schemas
export const APIResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: NonEmptyStringSchema.optional(),
  code: NonEmptyStringSchema.optional(),
  details: z.record(z.any()).optional()
})

export const PaginationQuerySchema = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional()
})

export const PaginatedResponseSchema = z.object({
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number().min(1),
    limit: z.number().min(1),
    total: z.number().min(0),
    totalPages: z.number().min(0),
    hasNext: z.boolean(),
    hasPrev: z.boolean()
  })
})

export type APIResponse = z.infer<typeof APIResponseSchema>
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>
export type PaginatedResponse = z.infer<typeof PaginatedResponseSchema>

// Settings schemas
export const FeatureFlagsSchema = z.object({
  voice_capture_enabled: z.boolean(),
  plan_orchestration_enabled: z.boolean(),
  plan_commit_enabled: z.boolean(),
  plan_commit_shadow_mode: z.boolean(),
  voice_backfill_enabled: z.boolean(),
  voice_monitoring_enabled: z.boolean()
})

export const ThresholdSettingsSchema = z.object({
  transcription_latency_ms: z.number().min(1000),
  plan_generation_latency_ms: z.number().min(5000),
  error_rate_percent: z.number().min(0).max(100),
  confidence_threshold: z.number().min(0).max(100)
})

export const SecuritySettingsSchema = z.object({
  audio_retention_days: z.number().min(1).max(365),
  session_retention_days: z.number().min(7).max(1095),
  pii_redaction_enabled: z.boolean(),
  encryption_enabled: z.boolean(),
  audit_logging_enabled: z.boolean()
})

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>
export type ThresholdSettings = z.infer<typeof ThresholdSettingsSchema>
export type SecuritySettings = z.infer<typeof SecuritySettingsSchema>

// Validation utilities
export class VoicePlanningValidator {
  static validateFeatureFlagContext(data: unknown): FeatureFlagContext {
    return FeatureFlagContextSchema.parse(data)
  }

  static validateVoiceSession(data: unknown): VoiceSession {
    return VoiceSessionSchema.parse(data)
  }

  static validateTranscriptionResult(data: unknown): TranscriptionResult {
    return TranscriptionResultSchema.parse(data)
  }

  static validatePlanGenerationResult(data: unknown): PlanGenerationResult {
    return PlanGenerationResultSchema.parse(data)
  }

  static validateVoicePlanCommitResult(data: unknown): VoicePlanCommitResult {
    return VoicePlanCommitResultSchema.parse(data)
  }

  static validateOrchestrationSession(data: unknown): OrchestrationSession {
    return OrchestrationSessionSchema.parse(data)
  }

  static validateVoiceMetrics(data: unknown): VoiceMetrics {
    return VoiceMetricsSchema.parse(data)
  }

  static validateKPIData(data: unknown): KPIData {
    return KPIDataSchema.parse(data)
  }

  static validateAlertData(data: unknown): AlertData {
    return AlertDataSchema.parse(data)
  }

  static validateBackfillConfig(data: unknown): BackfillConfig {
    return BackfillConfigSchema.parse(data)
  }

  static validateBackfillResult(data: unknown): BackfillResult {
    return BackfillResultSchema.parse(data)
  }

  static validateParityCheckResult(data: unknown): ParityCheckResult {
    return ParityCheckResultSchema.parse(data)
  }

  static validateBackfillJob(data: unknown): BackfillJob {
    return BackfillJobSchema.parse(data)
  }

  static validateAPIResponse(data: unknown): APIResponse {
    return APIResponseSchema.parse(data)
  }

  static validatePaginationQuery(data: unknown): PaginationQuery {
    return PaginationQuerySchema.parse(data)
  }

  static validateFeatureFlags(data: unknown): FeatureFlags {
    return FeatureFlagsSchema.parse(data)
  }

  static validateThresholdSettings(data: unknown): ThresholdSettings {
    return ThresholdSettingsSchema.parse(data)
  }

  static validateSecuritySettings(data: unknown): SecuritySettings {
    return SecuritySettingsSchema.parse(data)
  }

  // Safe validation methods (return null instead of throwing)
  static safeValidateFeatureFlagContext(data: unknown): FeatureFlagContext | null {
    try {
      return this.validateFeatureFlagContext(data)
    } catch {
      return null
    }
  }

  static safeValidateVoiceSession(data: unknown): VoiceSession | null {
    try {
      return this.validateVoiceSession(data)
    } catch {
      return null
    }
  }

  static safeValidateTranscriptionResult(data: unknown): TranscriptionResult | null {
    try {
      return this.validateTranscriptionResult(data)
    } catch {
      return null
    }
  }

  static safeValidatePlanGenerationResult(data: unknown): PlanGenerationResult | null {
    try {
      return this.validatePlanGenerationResult(data)
    } catch {
      return null
    }
  }
}

// Export all schemas for external use (schemas are already exported inline above)
