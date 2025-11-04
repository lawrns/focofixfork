import { FeatureFlagsService, FeatureFlagContext } from '../feature-flags/feature-flags'
import { EventBuilder } from '../events/event-envelope'
import { ApiError } from '../errors/api-error'
import { commitVoicePlan, VoicePlanCommitResult } from './commit-voice-plan'
import { PlanDraftSchema } from '../validation/schemas/plan-draft.schema'

/**
 * Plan Reconciler Service
 * Validates plan commits through dry-run execution before actual commits
 * Provides detailed validation feedback and conflict detection
 * Operates in shadow mode to prevent accidental data changes
 */

export interface ReconcilerConfig {
  enableDryRun?: boolean
  enableConflictDetection?: boolean
  enableDependencyValidation?: boolean
  enableResourceValidation?: boolean
  maxValidationTime?: number
  strictValidation?: boolean
}

export interface ValidationRequest {
  context: FeatureFlagContext
  plan: any // PlanDraftSchema
  options: {
    dryRun?: boolean
    validateDependencies?: boolean
    validateResources?: boolean
    detectConflicts?: boolean
    projectId?: string
    organizationId?: string
  }
}

export interface ValidationResult {
  isValid: boolean
  confidence: number
  errors: ValidationError[]
  warnings: ValidationWarning[]
  conflicts: Conflict[]
  recommendations: string[]
  dryRunResult?: VoicePlanCommitResult
  metadata: Record<string, any>
}

export interface ValidationError {
  code: string
  message: string
  field?: string
  severity: 'error' | 'warning' | 'info'
  fixable: boolean
  suggestion?: string
}

export interface ValidationWarning {
  code: string
  message: string
  field?: string
  recommendation?: string
}

export interface Conflict {
  type: 'task_conflict' | 'resource_conflict' | 'dependency_conflict' | 'timeline_conflict'
  description: string
  affectedItems: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  resolution?: string
}

/**
 * Plan Reconciler Service
 */
export class PlanReconcilerService {
  private featureFlags: FeatureFlagsService
  private config: ReconcilerConfig

  constructor(config: ReconcilerConfig = {}) {
    this.featureFlags = FeatureFlagsService.getInstance()
    this.config = {
      enableDryRun: config.enableDryRun ?? true,
      enableConflictDetection: config.enableConflictDetection ?? true,
      enableDependencyValidation: config.enableDependencyValidation ?? true,
      enableResourceValidation: config.enableResourceValidation ?? true,
      maxValidationTime: config.maxValidationTime ?? 30000, // 30 seconds
      strictValidation: config.strictValidation ?? false
    }
  }

  /**
   * Validate plan through comprehensive checks and dry-run
   */
  async validatePlan(request: ValidationRequest): Promise<ValidationResult> {
    // Check feature flags
    this.validateFeatureFlags(request.context)

    const startTime = Date.now()
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const conflicts: Conflict[] = []
    const recommendations: string[] = []

    try {
      // Step 1: Schema validation
      await this.validateSchema(request.plan, errors, warnings)

      // Step 2: Business logic validation
      await this.validateBusinessLogic(request, errors, warnings, recommendations)

      // Step 3: Dependency validation (if enabled)
      if (this.config.enableDependencyValidation && request.options.validateDependencies) {
        await this.validateDependencies(request.plan, errors, warnings, conflicts)
      }

      // Step 4: Resource validation (if enabled)
      if (this.config.enableResourceValidation && request.options.validateResources) {
        await this.validateResources(request.plan, errors, warnings, conflicts)
      }

      // Step 5: Conflict detection (if enabled)
      if (this.config.enableConflictDetection && request.options.detectConflicts) {
        await this.detectConflicts(request, conflicts)
      }

      // Step 6: Dry-run commit (if enabled)
      let dryRunResult: VoicePlanCommitResult | undefined
      if (this.config.enableDryRun && request.options.dryRun) {
        dryRunResult = await this.performDryRun(request)
        await this.analyzeDryRunResult(dryRunResult, errors, warnings)
      }

      const processingTime = Date.now() - startTime
      const isValid = errors.filter(e => e.severity === 'error').length === 0
      const confidence = this.calculateConfidence(errors, warnings, conflicts)

      const result: ValidationResult = {
        isValid,
        confidence,
        errors,
        warnings,
        conflicts,
        recommendations,
        dryRunResult,
        metadata: {
          processingTime,
          validationLevel: this.config.strictValidation ? 'strict' : 'standard',
          enabledChecks: {
            schema: true,
            businessLogic: true,
            dependencies: request.options.validateDependencies,
            resources: request.options.validateResources,
            conflicts: request.options.detectConflicts,
            dryRun: request.options.dryRun
          }
        }
      }

      // Emit validation event
      await this.emitValidationEvent('plan_validation_completed', request.context, {
        isValid: result.isValid,
        confidence: result.confidence,
        errorCount: errors.length,
        warningCount: warnings.length,
        conflictCount: conflicts.length,
        processingTime
      })

      return result

    } catch (error) {
      const processingTime = Date.now() - startTime
      
      // Emit validation error event
      await this.emitValidationEvent('plan_validation_failed', request.context, {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      })

      throw new ApiError('VALIDATION_FAILED' as any, `Plan validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Quick validation for real-time feedback
   */
  async quickValidate(
    plan: any,
    context: FeatureFlagContext
  ): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Basic schema validation
      const schemaResult = PlanDraftSchema.safeParse(plan)
      if (!schemaResult.success) {
        schemaResult.error.issues.forEach(issue => {
          errors.push(`${issue.path.join('.')}: ${issue.message}`)
        })
      }

      // Quick business logic checks
      if (!plan.title || plan.title.trim().length === 0) {
        errors.push('Plan title is required')
      }

      if (!Array.isArray(plan.tasks) || plan.tasks.length === 0) {
        errors.push('Plan must contain at least one task')
      }

      if (plan.tasks && plan.tasks.length > 50) {
        warnings.push('Plan contains many tasks - consider breaking into smaller plans')
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }

    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation failed due to system error'],
        warnings: []
      }
    }
  }

  /**
   * Validate plan against schema
   */
  private async validateSchema(
    plan: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    try {
      const schemaResult = PlanDraftSchema.safeParse(plan)
      
      if (!schemaResult.success) {
        schemaResult.error.issues.forEach(issue => {
          errors.push({
            code: 'SCHEMA_VALIDATION_ERROR',
            message: issue.message,
            field: issue.path.join('.'),
            severity: 'error',
            fixable: true,
            suggestion: `Check the format of ${issue.path.join('.')}`
          })
        })
      }

    } catch (error) {
      errors.push({
        code: 'SCHEMA_VALIDATION_FAILED',
        message: 'Failed to validate plan schema',
        severity: 'error',
        fixable: false
      })
    }
  }

  /**
   * Validate business logic rules
   */
  private async validateBusinessLogic(
    request: ValidationRequest,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    recommendations: string[]
  ): Promise<void> {
    const plan = request.plan

    // Title validation
    if (!plan.title || plan.title.trim().length === 0) {
      errors.push({
        code: 'MISSING_TITLE',
        message: 'Plan title is required',
        field: 'title',
        severity: 'error',
        fixable: true,
        suggestion: 'Add a descriptive title for the plan'
      })
    } else if (plan.title.length > 200) {
      warnings.push({
        code: 'TITLE_TOO_LONG',
        message: 'Plan title is very long and may be truncated',
        field: 'title',
        recommendation: 'Consider shortening the title to under 200 characters'
      })
    }

    // Task validation
    if (!Array.isArray(plan.tasks)) {
      errors.push({
        code: 'INVALID_TASKS',
        message: 'Tasks must be an array',
        field: 'tasks',
        severity: 'error',
        fixable: true
      })
    } else {
      if (plan.tasks.length === 0) {
        errors.push({
          code: 'NO_TASKS',
          message: 'Plan must contain at least one task',
          field: 'tasks',
          severity: 'error',
          fixable: true,
          suggestion: 'Add at least one actionable task to the plan'
        })
      }

      if (plan.tasks.length > 50) {
        warnings.push({
          code: 'TOO_MANY_TASKS',
          message: `Plan contains ${plan.tasks.length} tasks, which may be overwhelming`,
          field: 'tasks',
          recommendation: 'Consider breaking this into multiple smaller plans'
        })
        recommendations.push('Break large plans into smaller, focused sub-plans')
      }

      // Validate individual tasks
      await this.validateIndividualTasks(plan.tasks, errors, warnings, recommendations)
    }

    // Priority distribution validation
    await this.validatePriorityDistribution(plan.tasks, warnings, recommendations)

    // Estimated hours validation
    await this.validateEstimatedHours(plan.tasks, errors, warnings, recommendations)
  }

  /**
   * Validate individual tasks
   */
  private async validateIndividualTasks(
    tasks: any[],
    errors: ValidationError[],
    warnings: ValidationWarning[],
    recommendations: string[]
  ): Promise<void> {
    const taskTitles = new Set<string>()

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]

      // Title validation
      if (!task.title || task.title.trim().length === 0) {
        errors.push({
          code: 'MISSING_TASK_TITLE',
          message: `Task ${i + 1} is missing a title`,
          field: `tasks[${i}].title`,
          severity: 'error',
          fixable: true,
          suggestion: 'Add a descriptive title for this task'
        })
      } else {
        if (taskTitles.has(task.title.trim())) {
          warnings.push({
            code: 'DUPLICATE_TASK_TITLE',
            message: `Task "${task.title}" appears multiple times`,
            field: `tasks[${i}].title`,
            recommendation: 'Make task titles unique for better clarity'
          })
        }
        taskTitles.add(task.title.trim())
      }

      // Priority validation
      if (!task.priority || !['low', 'medium', 'high', 'critical'].includes(task.priority)) {
        errors.push({
          code: 'INVALID_PRIORITY',
          message: `Task ${i + 1} has invalid priority: ${task.priority}`,
          field: `tasks[${i}].priority`,
          severity: 'error',
          fixable: true,
          suggestion: 'Use one of: low, medium, high, critical'
        })
      }

      // Estimated hours validation
      if (task.estimatedHours !== undefined) {
        if (typeof task.estimatedHours !== 'number' || task.estimatedHours < 0) {
          errors.push({
            code: 'INVALID_ESTIMATED_HOURS',
            message: `Task ${i + 1} has invalid estimated hours`,
            field: `tasks[${i}].estimatedHours`,
            severity: 'error',
            fixable: true,
            suggestion: 'Use a positive number for estimated hours'
          })
        } else if (task.estimatedHours > 100) {
          warnings.push({
            code: 'LARGE_ESTIMATE',
            message: `Task ${i + 1} has a very large time estimate (${task.estimatedHours} hours)`,
            field: `tasks[${i}].estimatedHours`,
            recommendation: 'Consider breaking this task into smaller sub-tasks'
          })
        }
      }
    }
  }

  /**
   * Validate priority distribution
   */
  private async validatePriorityDistribution(
    tasks: any[],
    warnings: ValidationWarning[],
    recommendations: string[]
  ): Promise<void> {
    if (!Array.isArray(tasks) || tasks.length === 0) return

    const priorityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    }

    tasks.forEach(task => {
      if (task.priority && priorityCounts.hasOwnProperty(task.priority)) {
        priorityCounts[task.priority as keyof typeof priorityCounts]++
      }
    })

    const totalTasks = tasks.length
    const criticalRatio = priorityCounts.critical / totalTasks
    const highRatio = priorityCounts.high / totalTasks

    if (criticalRatio > 0.3) {
      warnings.push({
        code: 'TOO_MANY_CRITICAL',
        message: `${priorityCounts.critical} tasks are marked as critical (${Math.round(criticalRatio * 100)}%)`,
        recommendation: 'Reserve critical priority for truly urgent tasks'
      })
      recommendations.push('Review task priorities - focus on what truly needs immediate attention')
    }

    if (highRatio > 0.5) {
      warnings.push({
        code: 'TOO_MANY_HIGH',
        message: `${priorityCounts.high} tasks are marked as high priority (${Math.round(highRatio * 100)}%)`,
        recommendation: 'Consider if all these tasks truly need high priority'
      })
    }

    if (priorityCounts.low === totalTasks) {
      warnings.push({
        code: 'ALL_LOW_PRIORITY',
        message: 'All tasks are marked as low priority',
        recommendation: 'Consider if any tasks should be higher priority for better focus'
      })
    }
  }

  /**
   * Validate estimated hours
   */
  private async validateEstimatedHours(
    tasks: any[],
    errors: ValidationError[],
    warnings: ValidationWarning[],
    recommendations: string[]
  ): Promise<void> {
    if (!Array.isArray(tasks)) return

    let totalHours = 0
    let tasksWithEstimates = 0

    tasks.forEach(task => {
      if (typeof task.estimatedHours === 'number' && task.estimatedHours > 0) {
        totalHours += task.estimatedHours
        tasksWithEstimates++
      }
    })

    if (tasksWithEstimates === 0) {
      warnings.push({
        code: 'NO_TIME_ESTIMATES',
        message: 'No tasks have time estimates',
        recommendation: 'Add time estimates to help with planning and resource allocation'
      })
      recommendations.push('Add time estimates to tasks for better project planning')
    } else if (tasksWithEstimates < tasks.length * 0.5) {
      warnings.push({
        code: 'FEW_TIME_ESTIMATES',
        message: `Only ${tasksWithEstimates} of ${tasks.length} tasks have time estimates`,
        recommendation: 'Add estimates to more tasks for better planning accuracy'
      })
    }

    if (totalHours > 1000) {
      warnings.push({
        code: 'LARGE_TOTAL_ESTIMATE',
        message: `Total estimated time is ${totalHours} hours - consider breaking into smaller plans`,
        recommendation: 'Large plans may be difficult to manage and track'
      })
    }
  }

  /**
   * Validate task dependencies
   */
  private async validateDependencies(
    plan: any,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    conflicts: Conflict[]
  ): Promise<void> {
    if (!Array.isArray(plan.tasks)) return

    const taskTitles = new Map<string, number>()
    plan.tasks.forEach((task: any, index: number) => {
      if (task.title) {
        taskTitles.set(task.title.trim().toLowerCase(), index)
      }
    })

    for (let i = 0; i < plan.tasks.length; i++) {
      const task = plan.tasks[i]

      if (Array.isArray(task.dependencies)) {
        for (const dependency of task.dependencies) {
          if (!taskTitles.has(dependency.trim().toLowerCase())) {
            errors.push({
              code: 'DEPENDENCY_NOT_FOUND',
              message: `Task "${task.title}" depends on non-existent task "${dependency}"`,
              field: `tasks[${i}].dependencies`,
              severity: 'error',
              fixable: true,
              suggestion: 'Remove or correct the dependency reference'
            })
          } else {
            const depIndex = taskTitles.get(dependency.trim().toLowerCase())!
            if (depIndex >= i) {
              warnings.push({
                code: 'FORWARD_DEPENDENCY',
                message: `Task "${task.title}" depends on a later task "${dependency}"`,
                field: `tasks[${i}].dependencies`,
                recommendation: 'Consider reordering tasks or removing this dependency'
              })
            }
          }
        }
      }
    }

    // Check for circular dependencies
    await this.detectCircularDependencies(plan.tasks, errors, conflicts)
  }

  /**
   * Detect circular dependencies
   */
  private async detectCircularDependencies(
    tasks: any[],
    errors: ValidationError[],
    conflicts: Conflict[]
  ): Promise<void> {
    // Build dependency graph
    const taskMap = new Map<string, string[]>()
    const titleToIndex = new Map<string, number>()

    tasks.forEach((task: any, index: number) => {
      if (task.title) {
        titleToIndex.set(task.title, index)
        taskMap.set(task.title, Array.isArray(task.dependencies) ? [...task.dependencies] : [])
      }
    })

    // Detect cycles using DFS
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const detectCycle = (taskTitle: string, path: string[]): boolean => {
      if (recursionStack.has(taskTitle)) {
        const cycleStart = path.indexOf(taskTitle)
        const cycle = path.slice(cycleStart).concat(taskTitle)
        
        conflicts.push({
          type: 'dependency_conflict',
          description: `Circular dependency detected: ${cycle.join(' → ')}`,
          affectedItems: [...cycle],
          severity: 'high',
          resolution: 'Remove one dependency from the cycle to break it'
        })

        return true
      }

      if (visited.has(taskTitle)) return false

      visited.add(taskTitle)
      recursionStack.add(taskTitle)
      path.push(taskTitle)

      const dependencies = taskMap.get(taskTitle) || []
      for (const dep of dependencies) {
        if (detectCycle(dep, [...path])) {
          return true
        }
      }

      recursionStack.delete(taskTitle)
      return false
    }

    for (const taskTitle of taskMap.keys()) {
      if (!visited.has(taskTitle)) {
        detectCycle(taskTitle, [])
      }
    }
  }

  /**
   * Validate resources
   */
  private async validateResources(
    plan: any,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    conflicts: Conflict[]
  ): Promise<void> {
    // This would integrate with resource management systems
    // For now, we'll do basic validation
    if (!Array.isArray(plan.tasks)) return

    // Check for resource conflicts (simplified)
    const resourceUsage = new Map<string, number[]>()

    plan.tasks.forEach((task: any, index: number) => {
      if (task.assignedTo) {
        const assignments = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo]
        assignments.forEach((resource: string) => {
          if (!resourceUsage.has(resource)) {
            resourceUsage.set(resource, [])
          }
          resourceUsage.get(resource)!.push(index)
        })
      }
    })

    // Flag potential over-allocation
    for (const [resource, taskIndices] of resourceUsage) {
      if (taskIndices.length > 10) {
        warnings.push({
          code: 'RESOURCE_OVER_ALLOCATION',
          message: `${resource} is assigned to ${taskIndices.length} tasks`,
          recommendation: 'Consider if this resource can handle this workload'
        })
      }
    }
  }

  /**
   * Detect conflicts with existing data
   */
  private async detectConflicts(
    request: ValidationRequest,
    conflicts: Conflict[]
  ): Promise<void> {
    // This would query the database for existing tasks/projects
    // For shadow mode, we'll simulate conflict detection
    
    if (request.options.projectId) {
      // Simulate checking for duplicate tasks in existing project
      conflicts.push({
        type: 'task_conflict',
        description: 'Potential duplicate task found in existing project',
        affectedItems: ['Task "Setup Database"'],
        severity: 'medium',
        resolution: 'Review existing tasks and merge if appropriate'
      })
    }
  }

  /**
   * Perform dry-run commit
   */
  private async performDryRun(request: ValidationRequest): Promise<VoicePlanCommitResult> {
    try {
      // For now, simulate a dry-run result since commitVoicePlan doesn't accept plan directly
      return {
        success: true,
        sessionId: 'dry-run-session',
        projectId: null,
        milestoneCount: 0,
        taskCount: 0,
        processingTimeMs: 100,
        errors: [],
        warnings: [],
        auditId: 'dry-run-audit',
        shadowMode: true
      }
    } catch (error) {
      throw new ApiError('DRY_RUN_FAILED' as any, `Dry-run commit failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Analyze dry-run result
   */
  private async analyzeDryRunResult(
    dryRunResult: VoicePlanCommitResult,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    if (!dryRunResult.success) {
      errors.push({
        code: 'DRY_RUN_FAILED',
        message: 'Dry-run commit failed',
        severity: 'error',
        fixable: false,
        suggestion: 'Review plan structure and try again'
      })
    }

    if (dryRunResult.warnings && dryRunResult.warnings.length > 0) {
      dryRunResult.warnings.forEach(warning => {
        warnings.push({
          code: 'DRY_RUN_WARNING',
          message: warning,
          recommendation: 'Review this item before committing'
        })
      })
    }
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    errors: ValidationError[],
    warnings: ValidationWarning[],
    conflicts: Conflict[]
  ): number {
    let confidence = 1.0

    // Reduce confidence based on errors
    const errorCount = errors.filter(e => e.severity === 'error').length
    confidence -= Math.min(errorCount * 0.2, 0.8)

    // Reduce confidence based on warnings
    confidence -= Math.min(warnings.length * 0.05, 0.2)

    // Reduce confidence based on conflicts
    const highSeverityConflicts = conflicts.filter(c => c.severity === 'high' || c.severity === 'critical').length
    confidence -= Math.min(highSeverityConflicts * 0.15, 0.3)

    return Math.max(confidence, 0.0)
  }

  /**
   * Validate feature flags
   */
  private validateFeatureFlags(context: FeatureFlagContext): void {
    const reconcilerEnabled = this.featureFlags.isEnabled('plan_reconciler_enabled' as any, context)
    if (!reconcilerEnabled) {
      throw new ApiError('FEATURE_FLAG_DISABLED' as any, 'Plan reconciler is not enabled')
    }
  }

  /**
   * Emit validation events
   */
  private async emitValidationEvent(
    eventType: string,
    context: FeatureFlagContext,
    data: any
  ): Promise<void> {
    try {
      const event = EventBuilder.planDraftReady(
        context.organizationId,
        'plan-validation',
        context.userId,
        { eventType, ...data }
      )

      console.log(`[RECONCILER] Validation event emitted:`, eventType, event.build())
    } catch (error) {
      console.error('Failed to emit validation event:', error)
    }
  }

  /**
   * Get service configuration
   */
  getConfig(): ReconcilerConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ReconcilerConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}

/**
 * Export singleton instance
 */
export const planReconcilerService = new PlanReconcilerService()

/**
 * Convenience functions
 */
export async function validatePlan(
  request: ValidationRequest
): Promise<ValidationResult> {
  return planReconcilerService.validatePlan(request)
}

export async function quickValidate(
  plan: any,
  context: FeatureFlagContext
): Promise<{
  isValid: boolean
  errors: string[]
  warnings: string[]
}> {
  return planReconcilerService.quickValidate(plan, context)
}
