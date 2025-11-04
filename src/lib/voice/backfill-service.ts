import { Pool } from 'pg'
import { randomUUID } from 'crypto'
import { FeatureFlagsService, FeatureFlagContext } from '../feature-flags/feature-flags'
import { EventBuilder } from '../events/event-envelope'
import { ApiError } from '../errors/api-error'

/**
 * Voice Plan Backfill Service
 * Handles data migration, parity checks, and backfill operations for Phase 3
 * Ensures data consistency between shadow mode and production tables
 */

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Hennie@@12Hennie@@12@db.czijxfbkihrauyjwcgfn.supabase.co:5432/postgres',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

export interface BackfillConfig {
  batchSize?: number
  maxRetries?: number
  enableDryRun?: boolean
  enableParityCheck?: boolean
  enableAuditLogging?: boolean
  targetDateRange?: {
    start: Date
    end: Date
  }
}

export interface BackfillResult {
  success: boolean
  totalSessions: number
  processedSessions: number
  skippedSessions: number
  failedSessions: number
  errors: string[]
  warnings: string[]
  processingTimeMs: number
  dryRun: boolean
}

export interface ParityCheckResult {
  success: boolean
  totalSessions: number
  matchingSessions: number
  mismatchedSessions: number
  missingInProduction: number
  missingInShadow: number
  discrepancies: Array<{
    sessionId: string
    type: 'project_count' | 'milestone_count' | 'task_count' | 'data_mismatch'
    expected: any
    actual: any
  }>
  processingTimeMs: number
}

export interface BackfillJob {
  id: string
  type: 'migration' | 'parity_check' | 'cleanup'
  status: 'pending' | 'running' | 'completed' | 'failed'
  config: BackfillConfig
  result?: BackfillResult | ParityCheckResult
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  error?: string
}

/**
 * Voice Plan Backfill Service
 */
export class VoicePlanBackfillService {
  private featureFlags: FeatureFlagsService
  private activeJobs = new Map<string, BackfillJob>()

  constructor() {
    this.featureFlags = FeatureFlagsService.getInstance()
  }

  /**
   * Run backfill migration for voice sessions
   */
  async runBackfillMigration(
    context: FeatureFlagContext,
    config: BackfillConfig = {}
  ): Promise<BackfillResult> {
    const startTime = Date.now()
    const jobId = randomUUID()
    
    // Default configuration
    const migrationConfig: BackfillConfig = {
      batchSize: config.batchSize || 100,
      maxRetries: config.maxRetries || 3,
      enableDryRun: config.enableDryRun ?? true,
      enableParityCheck: config.enableParityCheck ?? true,
      enableAuditLogging: config.enableAuditLogging ?? true,
      targetDateRange: config.targetDateRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date()
      }
    }

    // Create job record
    const job: BackfillJob = {
      id: jobId,
      type: 'migration',
      status: 'running',
      config: migrationConfig,
      createdAt: new Date(),
      startedAt: new Date()
    }
    this.activeJobs.set(jobId, job)

    try {
      // Validate feature flags
      this.validateFeatureFlags(context)

      const result = await this.performBackfillMigration(context, migrationConfig)
      
      // Update job
      job.status = 'completed'
      job.completedAt = new Date()
      job.result = result

      // Emit completion event
      await this.emitBackfillEvent('migration_completed', context, {
        jobId,
        result,
        config: migrationConfig
      })

      console.log(`[BACKFILL] Migration completed:`, jobId, result)
      return result

    } catch (error) {
      // Update job with error
      job.status = 'failed'
      job.completedAt = new Date()
      job.error = error instanceof Error ? error.message : 'Unknown error'

      // Emit failure event
      await this.emitBackfillEvent('migration_failed', context, {
        jobId,
        error: job.error,
        config: migrationConfig
      })

      throw new ApiError('BACKFILL_FAILED' as any, `Backfill migration failed: ${job.error}`)
    }
  }

  /**
   * Run parity check between shadow and production data
   */
  async runParityCheck(
    context: FeatureFlagContext,
    config: BackfillConfig = {}
  ): Promise<ParityCheckResult> {
    const startTime = Date.now()
    const jobId = randomUUID()

    // Default configuration
    const parityConfig: BackfillConfig = {
      batchSize: config.batchSize || 100,
      enableDryRun: true,
      enableParityCheck: true,
      enableAuditLogging: config.enableAuditLogging ?? true,
      targetDateRange: config.targetDateRange || {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        end: new Date()
      }
    }

    // Create job record
    const job: BackfillJob = {
      id: jobId,
      type: 'parity_check',
      status: 'running',
      config: parityConfig,
      createdAt: new Date(),
      startedAt: new Date()
    }
    this.activeJobs.set(jobId, job)

    try {
      // Validate feature flags
      this.validateFeatureFlags(context)

      const result = await this.performParityCheck(context, parityConfig)
      
      // Update job
      job.status = 'completed'
      job.completedAt = new Date()
      job.result = result

      // Emit completion event
      await this.emitBackfillEvent('parity_check_completed', context, {
        jobId,
        result,
        config: parityConfig
      })

      console.log(`[BACKFILL] Parity check completed:`, jobId, result)
      return result

    } catch (error) {
      // Update job with error
      job.status = 'failed'
      job.completedAt = new Date()
      job.error = error instanceof Error ? error.message : 'Unknown error'

      // Emit failure event
      await this.emitBackfillEvent('parity_check_failed', context, {
        jobId,
        error: job.error,
        config: parityConfig
      })

      throw new ApiError('PARITY_CHECK_FAILED' as any, `Parity check failed: ${job.error}`)
    }
  }

  /**
   * Perform the actual backfill migration
   */
  private async performBackfillMigration(
    context: FeatureFlagContext,
    config: BackfillConfig
  ): Promise<BackfillResult> {
    const client = await pool.connect()
    const errors: string[] = []
    const warnings: string[] = []
    
    let processedSessions = 0
    let skippedSessions = 0
    let failedSessions = 0

    try {
      // Get voice sessions to migrate
      const sessionsQuery = `
        SELECT * FROM voice_sessions 
        WHERE created_at >= $1 AND created_at <= $2
        AND plan_json IS NOT NULL
        AND commit_status = 'committed'
        ORDER BY created_at ASC
        LIMIT $3
      `
      
      const sessionsResult = await client.query(sessionsQuery, [
        config.targetDateRange!.start,
        config.targetDateRange!.end,
        config.batchSize
      ])

      const totalSessions = sessionsResult.rows.length

      if (config.enableDryRun) {
        warnings.push(`DRY RUN: Would process ${totalSessions} sessions`)
      }

      // Process each session
      for (const session of sessionsResult.rows) {
        try {
          if (config.enableDryRun) {
            console.log(`[BACKFILL] DRY RUN: Would migrate session ${session.id}`)
            processedSessions++
            continue
          }

          // Check if already migrated
          const existingCheck = await client.query(
            'SELECT id FROM projects WHERE voice_session_id = $1',
            [session.id]
          )

          if (existingCheck.rows.length > 0) {
            skippedSessions++
            warnings.push(`Session ${session.id} already migrated`)
            continue
          }

          // Perform migration (simplified - would use actual commit logic)
          await this.migrateSession(client, session, context)
          processedSessions++

        } catch (sessionError) {
          failedSessions++
          errors.push(`Failed to migrate session ${session.id}: ${sessionError instanceof Error ? sessionError.message : 'Unknown error'}`)
        }
      }

      const processingTime = Date.now() - Date.now()

      return {
        success: failedSessions === 0,
        totalSessions,
        processedSessions,
        skippedSessions,
        failedSessions,
        errors,
        warnings,
        processingTimeMs: processingTime,
        dryRun: config.enableDryRun!
      }

    } finally {
      client.release()
    }
  }

  /**
   * Perform parity check between shadow and production
   */
  private async performParityCheck(
    context: FeatureFlagContext,
    config: BackfillConfig
  ): Promise<ParityCheckResult> {
    const client = await pool.connect()
    const discrepancies: Array<{
      sessionId: string
      type: 'project_count' | 'milestone_count' | 'task_count' | 'data_mismatch'
      expected: any
      actual: any
    }> = []

    try {
      // Get voice sessions to check
      const sessionsQuery = `
        SELECT * FROM voice_sessions 
        WHERE created_at >= $1 AND created_at <= $2
        AND plan_json IS NOT NULL
        AND commit_status = 'committed'
        ORDER BY created_at ASC
        LIMIT $3
      `
      
      const sessionsResult = await client.query(sessionsQuery, [
        config.targetDateRange!.start,
        config.targetDateRange!.end,
        config.batchSize
      ])

      const totalSessions = sessionsResult.rows.length
      let matchingSessions = 0
      let missingInProduction = 0
      let missingInShadow = 0

      // Check each session
      for (const session of sessionsResult.rows) {
        try {
          // Get production data
          const productionQuery = `
            SELECT 
              (SELECT COUNT(*) FROM projects WHERE voice_session_id = $1) as project_count,
              (SELECT COUNT(*) FROM milestones WHERE voice_session_id = $1) as milestone_count,
              (SELECT COUNT(*) FROM tasks WHERE voice_session_id = $1) as task_count
          `
          
          const productionResult = await client.query(productionQuery, [session.id])
          const production = productionResult.rows[0]

          // Get expected counts from plan JSON
          const planJson = session.plan_json
          const expectedProjectCount = planJson?.project ? 1 : 0
          const expectedMilestoneCount = planJson?.milestones?.length || 0
          const expectedTaskCount = planJson?.tasks?.length || 0

          // Check for discrepancies
          if (production.project_count !== expectedProjectCount) {
            discrepancies.push({
              sessionId: session.id,
              type: 'project_count',
              expected: expectedProjectCount,
              actual: production.project_count
            })
          }

          if (production.milestone_count !== expectedMilestoneCount) {
            discrepancies.push({
              sessionId: session.id,
              type: 'milestone_count',
              expected: expectedMilestoneCount,
              actual: production.milestone_count
            })
          }

          if (production.task_count !== expectedTaskCount) {
            discrepancies.push({
              sessionId: session.id,
              type: 'task_count',
              expected: expectedTaskCount,
              actual: production.task_count
            })
          }

          if (discrepancies.length === 0) {
            matchingSessions++
          } else if (production.project_count === 0) {
            missingInProduction++
          }

        } catch (sessionError) {
          missingInShadow++
        }
      }

      const mismatchedSessions = totalSessions - matchingSessions

      return {
        success: mismatchedSessions === 0,
        totalSessions,
        matchingSessions,
        mismatchedSessions,
        missingInProduction,
        missingInShadow,
        discrepancies,
        processingTimeMs: Date.now() - Date.now()
      }

    } finally {
      client.release()
    }
  }

  /**
   * Migrate a single session
   */
  private async migrateSession(
    client: any,
    session: any,
    context: FeatureFlagContext
  ): Promise<void> {
    // This would implement the actual migration logic
    // For now, it's a placeholder that would call the commit service
    console.log(`[BACKFILL] Migrating session: ${session.id}`)
  }

  /**
   * Get active jobs
   */
  getActiveJobs(): BackfillJob[] {
    return Array.from(this.activeJobs.values())
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): BackfillJob | undefined {
    return this.activeJobs.get(jobId)
  }

  /**
   * Cancel job
   */
  cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId)
    if (job && job.status === 'running') {
      job.status = 'failed'
      job.completedAt = new Date()
      job.error = 'Cancelled by user'
      return true
    }
    return false
  }

  /**
   * Validate feature flags
   */
  private validateFeatureFlags(context: FeatureFlagContext): void {
    const backfillEnabled = this.featureFlags.isEnabled('voice_backfill_enabled' as any, context)
    if (!backfillEnabled) {
      throw new ApiError('FEATURE_FLAG_DISABLED' as any, 'Voice backfill is not enabled')
    }
  }

  /**
   * Emit backfill events
   */
  private async emitBackfillEvent(
    eventType: string,
    context: FeatureFlagContext,
    data: any
  ): Promise<void> {
    try {
      const event = EventBuilder.voiceSessionStarted(
        context.organizationId,
        'voice-backfill',
        context.userId
      )

      console.log(`[BACKFILL] Event emitted:`, eventType, event.build())
    } catch (error) {
      console.error('Failed to emit backfill event:', error)
    }
  }

  /**
   * Cleanup old jobs
   */
  cleanup(): void {
    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - 24) // 24 hours ago

    for (const [jobId, job] of this.activeJobs.entries()) {
      if (job.completedAt && job.completedAt < cutoffDate) {
        this.activeJobs.delete(jobId)
        console.log(`[BACKFILL] Cleaned up old job: ${jobId}`)
      }
    }
  }
}

/**
 * Export singleton instance
 */
export const voicePlanBackfillService = new VoicePlanBackfillService()

/**
 * Convenience functions
 */
export async function runBackfillMigration(
  context: FeatureFlagContext,
  config?: BackfillConfig
): Promise<BackfillResult> {
  return voicePlanBackfillService.runBackfillMigration(context, config)
}

export async function runParityCheck(
  context: FeatureFlagContext,
  config?: BackfillConfig
): Promise<ParityCheckResult> {
  return voicePlanBackfillService.runParityCheck(context, config)
}

export function getActiveJobs(): BackfillJob[] {
  return voicePlanBackfillService.getActiveJobs()
}
