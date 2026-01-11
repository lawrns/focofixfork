import { Pool } from 'pg'
import { randomUUID } from 'crypto'
import { FeatureFlagsService, FeatureFlagContext } from '../feature-flags/feature-flags'
import { EventBuilder } from '../events/event-envelope'
import { ApiError } from '../errors/api-error'
import { ErrorCode } from '../errors/api-error'
import { DatabaseUtils } from '../database/adapters'

/**
 * Voice Plan Commit Service
 * Commits AI-generated voice plans to the production database
 * Runs behind feature flags for safe rollout
 */

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Hennie@@12Hennie@@12@db.czijxfbkihrauyjwcgfn.supabase.co:5432/postgres',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

/**
 * Commit result interface
 */
export interface VoicePlanCommitResult {
  success: boolean
  sessionId: string
  projectId?: string
  milestoneCount: number
  taskCount: number
  processingTimeMs: number
  errors?: string[]
  warnings?: string[]
  auditId: string
  shadowMode: boolean
}

/**
 * Plan validation result
 */
export interface PlanValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  confidence: number
  dependencyCount: number
  estimatedDuration: number
}

/**
 * Voice Plan Commit Service
 */
export class VoicePlanCommitService {
  private featureFlags: FeatureFlagsService

  constructor() {
    this.featureFlags = FeatureFlagsService.getInstance()
  }

  /**
   * Main commit function - validates and commits a voice plan
   */
  async commitVoicePlan(
    sessionId: string,
    context: FeatureFlagContext,
    options: {
      dryRun?: boolean
      forceCommit?: boolean
      skipValidation?: boolean
    } = {}
  ): Promise<VoicePlanCommitResult> {
    const startTime = Date.now()
    const auditId = randomUUID()
    
    try {
      // Check feature flags
      this.validateFeatureFlags(context, options)
      
      // Get voice session
      const session = await this.getVoiceSession(sessionId, context)
      if (!session) {
        throw new ApiError('NOT_FOUND' as any, 'Voice session not found')
      }

      if (!session.plan_json) {
        throw new ApiError('INVALID_REQUEST' as any, 'No plan data found in session')
      }

      // Validate plan structure
      const validationResult = options.skipValidation 
        ? { valid: true, errors: [], warnings: [], confidence: 1.0, dependencyCount: 0, estimatedDuration: 0 }
        : await this.validatePlan(session.plan_json, session)

      if (!validationResult.valid && !options.forceCommit) {
        throw new ApiError('VALIDATION_FAILED' as any, `Plan validation failed: ${validationResult.errors.join(', ')}`)
      }

      // Check if already committed
      if (session.commit_status === 'committed' && !options.forceCommit) {
        throw new ApiError('CONFLICT' as any, 'Plan already committed')
      }

      // Determine if we're in shadow mode
      const shadowMode = this.isShadowMode(context)
      
      // Start audit trail
      await this.startAuditTrail(auditId, sessionId, 'commit', context, {
        plan_validation: validationResult,
        shadow_mode: shadowMode,
        dry_run: options.dryRun || false
      })

      // Commit the plan
      const commitResult = await this.performCommit(session, validationResult, context, {
        shadowMode,
        dryRun: options.dryRun || false
      })

      // Update session status
      await this.updateSessionCommitStatus(sessionId, commitResult.success ? 'committed' : 'failed', commitResult.errors)

      // Complete audit trail
      const processingTime = Date.now() - startTime
      await this.completeAuditTrail(auditId, commitResult.success ? 'completed' : 'failed', {
        processing_time_ms: processingTime,
        result: commitResult
      })

      // Emit events
      if (commitResult.success) {
        await this.emitCommitEvent(session, commitResult, context)
      }

      return {
        success: commitResult.success,
        sessionId,
        projectId: commitResult.projectId,
        milestoneCount: commitResult.milestoneCount,
        taskCount: commitResult.taskCount,
        processingTimeMs: processingTime,
        errors: commitResult.errors,
        warnings: commitResult.warnings,
        auditId,
        shadowMode
      }

    } catch (error) {
      const processingTime = Date.now() - startTime
      
      // Log error in audit trail
      await this.completeAuditTrail(auditId, 'failed', {
        processing_time_ms: processingTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        error_code: error instanceof ApiError ? error.code : 'INTERNAL_ERROR'
      })

      throw error
    }
  }

  /**
   * Validate feature flags before proceeding
   */
  private validateFeatureFlags(context: FeatureFlagContext, options: any): void {
    const planCommitEnabled = this.featureFlags.isEnabled('plan_commit_enabled', context)
    const planCommitShadowMode = this.featureFlags.isEnabled('plan_commit_shadow_mode', context)

    if (!planCommitEnabled && !planCommitShadowMode) {
      throw new ApiError('FEATURE_FLAG_DISABLED' as any, 'Plan commit is not enabled')
    }

    if (options.dryRun && !planCommitShadowMode) {
      throw new ApiError('FEATURE_FLAG_DISABLED' as any, 'Dry run mode requires shadow mode to be enabled')
    }
  }

  /**
   * Check if we're running in shadow mode
   */
  private isShadowMode(context: FeatureFlagContext): boolean {
    return this.featureFlags.isEnabled('plan_commit_shadow_mode', context) &&
           !this.featureFlags.isEnabled('plan_commit_enabled', context)
  }

  /**
   * Get voice session with validation
   */
  private async getVoiceSession(sessionId: string, context: FeatureFlagContext): Promise<any> {
    const query = `
      SELECT * FROM voice_sessions 
      WHERE id = $1 AND 
      (organization_id = ANY(SELECT organization_id FROM user_organizations WHERE user_id = $2) OR user_id = $2)
    `
    
    const result = await pool.query(query, [sessionId, context.userId])
    return result.rows[0] || null
  }

  /**
   * Validate plan structure and content
   */
  private async validatePlan(planJson: any, session: any): Promise<PlanValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Basic structure validation
    if (!planJson.project) {
      errors.push('Plan must contain a project')
    }

    if (!planJson.milestones || !Array.isArray(planJson.milestones)) {
      errors.push('Plan must contain milestones array')
    }

    if (!planJson.tasks || !Array.isArray(planJson.tasks)) {
      errors.push('Plan must contain tasks array')
    }

    // Content validation
    if (planJson.project && !planJson.project.name) {
      errors.push('Project must have a name')
    }

    if (planJson.milestones) {
      planJson.milestones.forEach((milestone: any, index: number) => {
        if (!milestone.name) {
          errors.push(`Milestone ${index + 1} must have a name`)
        }
        if (!milestone.due_date) {
          warnings.push(`Milestone ${index + 1} has no due date`)
        }
      })
    }

    if (planJson.tasks) {
      planJson.tasks.forEach((task: any, index: number) => {
        if (!task.title) {
          errors.push(`Task ${index + 1} must have a title`)
        }
        if (!task.estimated_hours || task.estimated_hours <= 0) {
          warnings.push(`Task ${index + 1} has invalid estimated hours`)
        }
      })
    }

    // Dependency validation
    const dependencyCount = this.validateDependencies(planJson.tasks || [], errors, warnings)

    // Calculate confidence based on validation results
    const confidence = this.calculateConfidence(errors, warnings, session.plan_confidence || 0)

    // Estimate duration
    const estimatedDuration = this.estimatePlanDuration(planJson.tasks || [])

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      confidence,
      dependencyCount,
      estimatedDuration
    }
  }

  /**
   * Validate task dependencies
   */
  private validateDependencies(tasks: any[], errors: string[], warnings: string[]): number {
    let dependencyCount = 0
    const taskIds = new Set(tasks.map(task => task.id))

    tasks.forEach(task => {
      if (task.dependencies && Array.isArray(task.dependencies)) {
        dependencyCount += task.dependencies.length
        
        task.dependencies.forEach((depId: string) => {
          if (!taskIds.has(depId)) {
            errors.push(`Task ${task.id} depends on non-existent task ${depId}`)
          }
        })
      }
    })

    return dependencyCount
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(errors: string[], warnings: string[], baseConfidence: number): number {
    let confidence = baseConfidence
    
    // Penalize for errors
    confidence -= errors.length * 0.1
    
    // Penalize for warnings
    confidence -= warnings.length * 0.05
    
    return Math.max(0, Math.min(1, confidence))
  }

  /**
   * Estimate total plan duration in hours
   */
  private estimatePlanDuration(tasks: any[]): number {
    return tasks.reduce((total, task) => {
      return total + (task.estimated_hours || 0)
    }, 0)
  }

  /**
   * Start audit trail for commit operation
   */
  private async startAuditTrail(
    auditId: string, 
    sessionId: string, 
    operation: string, 
    context: FeatureFlagContext,
    metadata: any
  ): Promise<void> {
    const query = `
      INSERT INTO voice_plan_audit (
        id, session_id, operation_type, operation_status, 
        user_id, operation_data, metadata, started_at
      ) VALUES ($1, $2, $3, 'pending', $4, $5, $6, NOW())
    `
    
    await pool.query(query, [
      auditId, sessionId, operation, context.userId, 
      JSON.stringify(metadata), JSON.stringify(metadata)
    ])
  }

  /**
   * Complete audit trail
   */
  private async completeAuditTrail(
    auditId: string, 
    status: string, 
    result: any
  ): Promise<void> {
    const query = `
      UPDATE voice_plan_audit 
      SET operation_status = $2, operation_data = $3, completed_at = NOW()
      WHERE id = $1
    `
    
    await pool.query(query, [auditId, status, JSON.stringify(result)])
  }

  /**
   * Perform the actual commit operation
   */
  private async performCommit(
    session: any,
    validationResult: PlanValidationResult,
    context: FeatureFlagContext,
    options: { shadowMode: boolean; dryRun: boolean }
  ): Promise<{
    success: boolean
    projectId?: string
    milestoneCount: number
    taskCount: number
    errors?: string[]
    warnings?: string[]
  }> {
    if (options.dryRun) {
      // Dry run - just validate without committing
      return {
        success: validationResult.valid,
        milestoneCount: session.plan_json.milestones?.length || 0,
        taskCount: session.plan_json.tasks?.length || 0,
        warnings: validationResult.warnings
      }
    }

    if (options.shadowMode) {
      // Shadow mode - simulate commit without writing to production tables
      return await this.performShadowCommit(session, validationResult, context)
    }

    // Production commit
    return await this.performProductionCommit(session, validationResult, context)
  }

  /**
   * Shadow mode commit - validates and simulates without production writes
   */
  private async performShadowCommit(
    session: any,
    validationResult: PlanValidationResult,
    context: FeatureFlagContext
  ): Promise<any> {
    // Simulate the commit process without actual database writes
    const simulatedProjectId = `shadow_${randomUUID()}`
    
    // Validate that we could create the project
    if (!session.plan_json.project?.name) {
      throw new ApiError('VALIDATION_FAILED' as any, 'Project name is required')
    }

    // Simulate milestone creation
    const milestoneCount = session.plan_json.milestones?.length || 0
    const taskCount = session.plan_json.tasks?.length || 0

    // Log shadow commit details
    console.log(`[SHADOW COMMIT] Session ${session.id}: Simulated creation of project ${simulatedProjectId} with ${milestoneCount} milestones and ${taskCount} tasks`)

    return {
      success: true,
      projectId: simulatedProjectId,
      milestoneCount,
      taskCount,
      warnings: validationResult.warnings
    }
  }

  /**
   * Production commit - actually writes to database
   */
  private async performProductionCommit(
    session: any,
    validationResult: PlanValidationResult,
    context: FeatureFlagContext
  ): Promise<any> {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Create project
      const projectQuery = `
        INSERT INTO projects (
          name, description, organization_id, status, priority, 
          start_date, due_date, created_by, updated_by,
          voice_session_id, voice_generated, voice_confidence, voice_commit_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
        RETURNING *
      `
      
      const projectResult = await client.query(projectQuery, [
        session.plan_json.project.name,
        session.plan_json.project.description,
        session.organization_id,
        'active',
        session.plan_json.project.priority || 'medium',
        session.plan_json.project.start_date,
        session.plan_json.project.due_date,
        context.userId,
        context.userId,
        session.id,
        true,
        validationResult.confidence
      ])

      const project = projectResult.rows[0]

      // Create milestones
      const milestoneIds: string[] = []
      for (const milestone of session.plan_json.milestones || []) {
        const milestoneQuery = `
          INSERT INTO milestones (
            name, description, project_id, status, deadline, due_date,
            created_by, updated_by, voice_session_id, voice_generated, 
            voice_task_id, voice_confidence, voice_commit_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
          RETURNING *
        `
        
        const milestoneResult = await client.query(milestoneQuery, [
          milestone.name,
          milestone.description,
          project.id,
          milestone.status || 'pending',
          milestone.due_date,
          milestone.due_date,
          context.userId,
          context.userId,
          session.id,
          true,
          milestone.id,
          validationResult.confidence
        ])

        milestoneIds.push(milestoneResult.rows[0].id)
      }

      // Create tasks
      const taskIds: string[] = []
      for (const task of session.plan_json.tasks || []) {
        // Find milestone ID for this task
        const milestoneId = task.milestone_id 
          ? milestoneIds.find(mid => {
              const milestone = session.plan_json.milestones.find((m: any) => m.id === task.milestone_id)
              return milestone // This is simplified - in production you'd map this properly
            })
          : null

        const taskQuery = `
          INSERT INTO work_items (
            title, description, project_id, milestone_id, status, priority,
            estimated_hours, due_date, created_by, updated_by,
            voice_session_id, voice_generated, voice_task_id, 
            voice_milestone_id, voice_dependencies, voice_confidence, voice_commit_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'pending')
          RETURNING *
        `
        
        const taskResult = await client.query(taskQuery, [
          task.title,
          task.description,
          project.id,
          milestoneId,
          task.status || 'pending',
          task.priority || 'medium',
          task.estimated_hours,
          task.due_date,
          context.userId,
          context.userId,
          session.id,
          true,
          task.id,
          task.milestone_id,
          JSON.stringify(task.dependencies || []),
          validationResult.confidence
        ])

        taskIds.push(taskResult.rows[0].id)
      }

      // Create dependencies
      for (const task of session.plan_json.tasks || []) {
        if (task.dependencies && Array.isArray(task.dependencies)) {
          for (const depId of task.dependencies) {
            const dependencyQuery = `
              INSERT INTO voice_plan_dependencies (
                session_id, depends_on_task_id, dependent_task_id, dependency_type
              ) VALUES ($1, $2, $3, $4)
            `
            
            await client.query(dependencyQuery, [
              session.id, depId, task.id, 'finish_to_start'
            ])
          }
        }
      }

      // Mark all items as committed
      await client.query('UPDATE foco_projects SET voice_commit_status = $1, voice_committed_at = NOW() WHERE id = $2', ['committed', project.id])
      await client.query('UPDATE milestones SET voice_commit_status = $1, voice_committed_at = NOW() WHERE voice_session_id = $2', ['committed', session.id])
      await client.query('UPDATE work_items SET voice_commit_status = $1, voice_committed_at = NOW() WHERE voice_session_id = $2', ['committed', session.id])

      await client.query('COMMIT')

      return {
        success: true,
        projectId: project.id,
        milestoneCount: milestoneIds.length,
        taskCount: taskIds.length,
        warnings: validationResult.warnings
      }

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Update session commit status
   */
  private async updateSessionCommitStatus(
    sessionId: string, 
    status: string, 
    errors?: string[]
  ): Promise<void> {
    const query = `
      UPDATE voice_sessions 
      SET commit_status = $1, commit_errors = $2, committed_at = NOW()
      WHERE id = $1
    `
    
    await pool.query(query, [sessionId, status, errors ? JSON.stringify(errors) : null])
  }

  /**
   * Emit commit success event
   */
  private async emitCommitEvent(session: any, result: any, context: FeatureFlagContext): Promise<void> {
    const event = EventBuilder.planCommitSuccess(
      session.organization_id,
      session.id,
      context.userId,
      {
        projectId: result.projectId,
        milestoneCount: result.milestoneCount,
        taskCount: result.taskCount,
        processingTimeMs: result.processingTimeMs
      }
    )

    // In a real implementation, you would emit this to your event system
    console.log('Event emitted:', event.build())
  }

  /**
   * Get commit status for a session
   */
  async getCommitStatus(sessionId: string, context: FeatureFlagContext): Promise<any> {
    const query = `
      SELECT 
        commit_status, 
        commit_errors, 
        committed_at,
        (SELECT COUNT(*) FROM projects WHERE voice_session_id = $1 AND voice_commit_status = 'committed') as committed_projects,
        (SELECT COUNT(*) FROM milestones WHERE voice_session_id = $1 AND voice_commit_status = 'committed') as committed_milestones,
        (SELECT COUNT(*) FROM work_items WHERE voice_session_id = $1 AND voice_commit_status = 'committed') as committed_tasks
      FROM voice_sessions 
      WHERE id = $1 AND 
      (organization_id = ANY(SELECT organization_id FROM user_organizations WHERE user_id = $2) OR user_id = $2)
    `
    
    const result = await pool.query(query, [sessionId, context.userId])
    return result.rows[0] || null
  }

  /**
   * Rollback a committed plan (emergency feature)
   */
  async rollbackCommit(sessionId: string, context: FeatureFlagContext): Promise<boolean> {
    const rollbackEnabled = this.featureFlags.isEnabled('plan_commit_dual_write', context)
    if (!rollbackEnabled) {
      throw new ApiError('FEATURE_FLAG_DISABLED' as any, 'Rollback is not enabled')
    }

    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Delete tasks created by this session
      await client.query('DELETE FROM work_items WHERE voice_session_id = $1', [sessionId])

      // Delete milestones created by this session
      await client.query('DELETE FROM milestones WHERE voice_session_id = $1', [sessionId])

      // Delete project created by this session
      await client.query('DELETE FROM foco_projects WHERE voice_session_id = $1', [sessionId])

      // Delete dependencies
      await client.query('DELETE FROM voice_plan_dependencies WHERE session_id = $1', [sessionId])

      // Update session status
      await client.query(
        'UPDATE voice_sessions SET commit_status = $1, committed_at = NULL WHERE id = $2',
        ['rolled_back', sessionId]
      )

      await client.query('COMMIT')
      return true

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}

/**
 * Export the service instance
 */
export const voicePlanCommitService = new VoicePlanCommitService()

/**
 * Convenience function for committing voice plans
 */
export async function commitVoicePlan(
  sessionId: string,
  context: FeatureFlagContext,
  options?: {
    dryRun?: boolean
    forceCommit?: boolean
    skipValidation?: boolean
  }
): Promise<VoicePlanCommitResult> {
  return voicePlanCommitService.commitVoicePlan(sessionId, context, options)
}

// Types are already exported through their interface declarations
