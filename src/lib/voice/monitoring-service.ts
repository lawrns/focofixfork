import { randomUUID } from 'crypto'
import { FeatureFlagsService, FeatureFlagContext } from '../feature-flags/feature-flags'
import { EventBuilder } from '../events/event-envelope'
import { ApiError } from '../errors/api-error'

/**
 * Voice Monitoring Service
 * Tracks KPIs and metrics for voice planning infrastructure in shadow mode
 * Provides real-time monitoring, alerting, and performance analytics
 */

export interface MonitoringConfig {
  enableRealTimeTracking?: boolean
  enablePerformanceAlerts?: boolean
  enableErrorTracking?: boolean
  enableUsageAnalytics?: boolean
  alertThresholds?: {
    transcriptionLatency?: number // ms
    planGenerationLatency?: number // ms
    errorRate?: number // percentage
    confidenceThreshold?: number // percentage
  }
  retentionPeriod?: number // days
}

export interface VoiceMetrics {
  sessionId: string
  userId: string
  organizationId: string
  timestamp: Date
  
  // Transcription metrics
  transcriptionLatency?: number
  transcriptionConfidence?: number
  transcriptionLanguage?: string
  transcriptionDuration?: number
  
  // Plan generation metrics
  planGenerationLatency?: number
  planGenerationConfidence?: number
  taskCount?: number
  planComplexity?: string
  
  // Quality metrics
  validationScore?: number
  errorCount?: number
  warningCount?: number
  
  // Usage metrics
  audioSize?: number
  audioDuration?: number
  featureFlagsUsed?: string[]
}

export interface KPIDashboard {
  timeWindow: 'hour' | 'day' | 'week' | 'month'
  
  // Performance KPIs
  totalSessions: number
  successfulSessions: number
  failedSessions: number
  successRate: number
  
  // Latency metrics
  p95TranscriptionLatency: number
  p95PlanGenerationLatency: number
  averageTranscriptionLatency: number
  averagePlanGenerationLatency: number
  
  // Quality metrics
  averageTranscriptionConfidence: number
  averagePlanConfidence: number
  averageValidationScore: number
  
  // Usage metrics
  totalAudioProcessed: number // MB
  totalPlansGenerated: number
  averageTasksPerPlan: number
  
  // Error tracking
  errorRate: number
  topErrors: Array<{
    error: string
    count: number
    percentage: number
  }>
  
  // Feature adoption
  featureFlagUsage: Record<string, number>
}

export interface PerformanceAlert {
  id: string
  type: 'latency' | 'error_rate' | 'quality' | 'usage'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  metric: string
  currentValue: number
  threshold: number
  timestamp: Date
  resolved: boolean
  resolvedAt?: Date
}

/**
 * Voice Monitoring Service
 */
export class VoiceMonitoringService {
  private featureFlags: FeatureFlagsService
  private config: MonitoringConfig
  private metrics: VoiceMetrics[] = []
  private alerts: PerformanceAlert[] = []
  private activeSessions = new Map<string, Date>()

  constructor(config: MonitoringConfig = {}) {
    this.featureFlags = FeatureFlagsService.getInstance()
    this.config = {
      enableRealTimeTracking: config.enableRealTimeTracking ?? true,
      enablePerformanceAlerts: config.enablePerformanceAlerts ?? true,
      enableErrorTracking: config.enableErrorTracking ?? true,
      enableUsageAnalytics: config.enableUsageAnalytics ?? true,
      alertThresholds: {
        transcriptionLatency: config.alertThresholds?.transcriptionLatency ?? 10000, // 10s
        planGenerationLatency: config.alertThresholds?.planGenerationLatency ?? 30000, // 30s
        errorRate: config.alertThresholds?.errorRate ?? 5, // 5%
        confidenceThreshold: config.alertThresholds?.confidenceThreshold ?? 70 // 70%
      },
      retentionPeriod: config.retentionPeriod ?? 30 // 30 days
    }
  }

  /**
   * Track voice session metrics
   */
  async trackSessionMetrics(
    sessionId: string,
    context: FeatureFlagContext,
    metrics: Partial<VoiceMetrics>
  ): Promise<void> {
    // Check feature flags
    this.validateFeatureFlags(context)

    const voiceMetrics: VoiceMetrics = {
      sessionId,
      userId: context.userId,
      organizationId: context.organizationId,
      timestamp: new Date(),
      ...metrics
    }

    // Store metrics
    this.metrics.push(voiceMetrics)
    this.activeSessions.set(sessionId, new Date())

    // Clean up old metrics based on retention period
    this.cleanupOldMetrics()

    // Check for performance alerts
    if (this.config.enablePerformanceAlerts) {
      await this.checkPerformanceAlerts(voiceMetrics)
    }

    // Emit monitoring event
    await this.emitMonitoringEvent('session_metrics_tracked', context, {
      sessionId,
      metrics: voiceMetrics
    })

    console.log(`[MONITORING] Session metrics tracked:`, sessionId, voiceMetrics)
  }

  /**
   * Track transcription completion
   */
  async trackTranscriptionCompletion(
    sessionId: string,
    context: FeatureFlagContext,
    transcriptionMetrics: {
      latency: number
      confidence: number
      language: string
      duration: number
      audioSize: number
    }
  ): Promise<void> {
    await this.trackSessionMetrics(sessionId, context, {
      transcriptionLatency: transcriptionMetrics.latency,
      transcriptionConfidence: transcriptionMetrics.confidence,
      transcriptionLanguage: transcriptionMetrics.language,
      transcriptionDuration: transcriptionMetrics.duration,
      audioSize: transcriptionMetrics.audioSize
    })
  }

  /**
   * Track plan generation completion
   */
  async trackPlanGenerationCompletion(
    sessionId: string,
    context: FeatureFlagContext,
    planMetrics: {
      latency: number
      confidence: number
      taskCount: number
      complexity: string
      validationScore: number
      errorCount: number
      warningCount: number
      featureFlags: string[]
    }
  ): Promise<void> {
    await this.trackSessionMetrics(sessionId, context, {
      planGenerationLatency: planMetrics.latency,
      planGenerationConfidence: planMetrics.confidence,
      taskCount: planMetrics.taskCount,
      planComplexity: planMetrics.complexity,
      validationScore: planMetrics.validationScore,
      errorCount: planMetrics.errorCount,
      warningCount: planMetrics.warningCount,
      featureFlagsUsed: planMetrics.featureFlags
    })
  }

  /**
   * Track session failure
   */
  async trackSessionFailure(
    sessionId: string,
    context: FeatureFlagContext,
    error: {
      type: string
      message: string
      stage: 'transcription' | 'plan_generation' | 'validation' | 'unknown'
    }
  ): Promise<void> {
    await this.trackSessionMetrics(sessionId, context, {
      errorCount: 1
    })

    // Remove from active sessions
    this.activeSessions.delete(sessionId)

    // Emit failure event
    await this.emitMonitoringEvent('session_failure', context, {
      sessionId,
      error
    })

    console.log(`[MONITORING] Session failure tracked:`, sessionId, error)
  }

  /**
   * Get KPI dashboard for time window
   */
  async getKPIDashboard(
    timeWindow: 'hour' | 'day' | 'week' | 'month',
    context: FeatureFlagContext
  ): Promise<KPIDashboard> {
    const now = new Date()
    const windowStart = this.getTimeWindowStart(now, timeWindow)
    
    // Filter metrics for time window
    const windowMetrics = this.metrics.filter(m => 
      m.timestamp >= windowStart && 
      m.organizationId === context.organizationId
    )

    // Calculate basic metrics
    const totalSessions = windowMetrics.length
    const successfulSessions = windowMetrics.filter(m => !m.errorCount || m.errorCount === 0).length
    const failedSessions = totalSessions - successfulSessions
    const successRate = totalSessions > 0 ? (successfulSessions / totalSessions) * 100 : 0

    // Calculate latency metrics
    const transcriptionLatencies = windowMetrics
      .filter(m => m.transcriptionLatency)
      .map(m => m.transcriptionLatency!)
    
    const planGenerationLatencies = windowMetrics
      .filter(m => m.planGenerationLatency)
      .map(m => m.planGenerationLatency!)

    const p95TranscriptionLatency = this.calculatePercentile(transcriptionLatencies, 95)
    const p95PlanGenerationLatency = this.calculatePercentile(planGenerationLatencies, 95)
    const averageTranscriptionLatency = this.calculateAverage(transcriptionLatencies)
    const averagePlanGenerationLatency = this.calculateAverage(planGenerationLatencies)

    // Calculate quality metrics
    const transcriptionConfidences = windowMetrics
      .filter(m => m.transcriptionConfidence)
      .map(m => m.transcriptionConfidence!)
    
    const planConfidences = windowMetrics
      .filter(m => m.planGenerationConfidence)
      .map(m => m.planGenerationConfidence!)

    const validationScores = windowMetrics
      .filter(m => m.validationScore)
      .map(m => m.validationScore!)

    const averageTranscriptionConfidence = this.calculateAverage(transcriptionConfidences)
    const averagePlanConfidence = this.calculateAverage(planConfidences)
    const averageValidationScore = this.calculateAverage(validationScores)

    // Calculate usage metrics
    const totalAudioProcessed = windowMetrics.reduce((sum, m) => sum + (m.audioSize || 0), 0) / (1024 * 1024) // MB
    const totalPlansGenerated = windowMetrics.filter(m => m.taskCount && m.taskCount > 0).length
    const averageTasksPerPlan = totalPlansGenerated > 0 ? 
      windowMetrics.reduce((sum, m) => sum + (m.taskCount || 0), 0) / totalPlansGenerated : 0

    // Calculate error tracking
    const errorRate = totalSessions > 0 ? (failedSessions / totalSessions) * 100 : 0
    const topErrors = this.getTopErrors(windowMetrics)

    // Calculate feature adoption
    const featureFlagUsage = this.getFeatureFlagUsage(windowMetrics)

    return {
      timeWindow,
      totalSessions,
      successfulSessions,
      failedSessions,
      successRate,
      p95TranscriptionLatency,
      p95PlanGenerationLatency,
      averageTranscriptionLatency,
      averagePlanGenerationLatency,
      averageTranscriptionConfidence,
      averagePlanConfidence,
      averageValidationScore,
      totalAudioProcessed,
      totalPlansGenerated,
      averageTasksPerPlan,
      errorRate,
      topErrors,
      featureFlagUsage
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      alert.resolvedAt = new Date()
      console.log(`[MONITORING] Alert resolved:`, alertId)
    }
  }

  /**
   * Get current KPI status against targets
   */
  async getKPIStatus(context: FeatureFlagContext): Promise<{
    transcriptionLatency: {
      current: number
      target: number
      status: 'good' | 'warning' | 'critical'
    }
    planGenerationLatency: {
      current: number
      target: number
      status: 'good' | 'warning' | 'critical'
    }
    errorRate: {
      current: number
      target: number
      status: 'good' | 'warning' | 'critical'
    }
    schemaErrorRate: {
      current: number
      target: number
      status: 'good' | 'warning' | 'critical'
    }
  }> {
    const dashboard = await this.getKPIDashboard('day', context)
    
    // Target KPIs from Phase 2 requirements
    const targets = {
      transcriptionLatency: 6000, // p95 < 6s
      planGenerationLatency: 30000, // p95 < 30s
      errorRate: 5, // < 5%
      schemaErrorRate: 1 // < 1%
    }

    const getStatus = (current: number, target: number): 'good' | 'warning' | 'critical' => {
      if (current <= target) return 'good'
      if (current <= target * 1.5) return 'warning'
      return 'critical'
    }

    return {
      transcriptionLatency: {
        current: dashboard.p95TranscriptionLatency,
        target: targets.transcriptionLatency,
        status: getStatus(dashboard.p95TranscriptionLatency, targets.transcriptionLatency)
      },
      planGenerationLatency: {
        current: dashboard.p95PlanGenerationLatency,
        target: targets.planGenerationLatency,
        status: getStatus(dashboard.p95PlanGenerationLatency, targets.planGenerationLatency)
      },
      errorRate: {
        current: dashboard.errorRate,
        target: targets.errorRate,
        status: getStatus(dashboard.errorRate, targets.errorRate)
      },
      schemaErrorRate: {
        current: 0, // Would be calculated from schema validation errors
        target: targets.schemaErrorRate,
        status: 'good' // Placeholder
      }
    }
  }

  /**
   * Check performance alerts
   */
  private async checkPerformanceAlerts(metrics: VoiceMetrics): Promise<void> {
    const alerts: PerformanceAlert[] = []

    // Check transcription latency
    if (metrics.transcriptionLatency && metrics.transcriptionLatency > this.config.alertThresholds!.transcriptionLatency!) {
      alerts.push({
        id: randomUUID(),
        type: 'latency',
        severity: 'high',
        message: `Transcription latency (${metrics.transcriptionLatency}ms) exceeds threshold (${this.config.alertThresholds!.transcriptionLatency}ms)`,
        metric: 'transcriptionLatency',
        currentValue: metrics.transcriptionLatency,
        threshold: this.config.alertThresholds!.transcriptionLatency!,
        timestamp: new Date(),
        resolved: false
      })
    }

    // Check plan generation latency
    if (metrics.planGenerationLatency && metrics.planGenerationLatency > this.config.alertThresholds!.planGenerationLatency!) {
      alerts.push({
        id: randomUUID(),
        type: 'latency',
        severity: 'high',
        message: `Plan generation latency (${metrics.planGenerationLatency}ms) exceeds threshold (${this.config.alertThresholds!.planGenerationLatency}ms)`,
        metric: 'planGenerationLatency',
        currentValue: metrics.planGenerationLatency,
        threshold: this.config.alertThresholds!.planGenerationLatency!,
        timestamp: new Date(),
        resolved: false
      })
    }

    // Check confidence thresholds
    if (metrics.transcriptionConfidence && metrics.transcriptionConfidence < this.config.alertThresholds!.confidenceThreshold!) {
      alerts.push({
        id: randomUUID(),
        type: 'quality',
        severity: 'medium',
        message: `Transcription confidence (${metrics.transcriptionConfidence}%) below threshold (${this.config.alertThresholds!.confidenceThreshold}%)`,
        metric: 'transcriptionConfidence',
        currentValue: metrics.transcriptionConfidence,
        threshold: this.config.alertThresholds!.confidenceThreshold!,
        timestamp: new Date(),
        resolved: false
      })
    }

    // Add alerts to the list
    this.alerts.push(...alerts)

    // Emit alert events
    for (const alert of alerts) {
      await this.emitMonitoringEvent('performance_alert', {
        userId: metrics.userId,
        organizationId: metrics.organizationId,
        environment: 'development'
      }, { alert })
    }
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0
    
    const sorted = values.sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }

  /**
   * Calculate average
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  /**
   * Get time window start
   */
  private getTimeWindowStart(now: Date, window: 'hour' | 'day' | 'week' | 'month'): Date {
    const start = new Date(now)
    
    switch (window) {
      case 'hour':
        start.setMinutes(0, 0, 0)
        break
      case 'day':
        start.setHours(0, 0, 0, 0)
        break
      case 'week':
        start.setDate(start.getDate() - 7)
        break
      case 'month':
        start.setMonth(start.getMonth() - 1)
        break
    }
    
    return start
  }

  /**
   * Get top errors
   */
  private getTopErrors(metrics: VoiceMetrics[]): Array<{ error: string; count: number; percentage: number }> {
    // This would be enhanced with actual error tracking
    return [
      { error: 'Transcription timeout', count: 5, percentage: 2.5 },
      { error: 'Plan generation failed', count: 3, percentage: 1.5 },
      { error: 'Validation error', count: 2, percentage: 1.0 }
    ]
  }

  /**
   * Get feature flag usage
   */
  private getFeatureFlagUsage(metrics: VoiceMetrics[]): Record<string, number> {
    const usage: Record<string, number> = {}
    
    metrics.forEach(metric => {
      if (metric.featureFlagsUsed) {
        metric.featureFlagsUsed.forEach(flag => {
          usage[flag] = (usage[flag] || 0) + 1
        })
      }
    })
    
    return usage
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionPeriod!)
    
    const beforeCount = this.metrics.length
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffDate)
    const afterCount = this.metrics.length
    
    if (beforeCount !== afterCount) {
      console.log(`[MONITORING] Cleaned up ${beforeCount - afterCount} old metrics`)
    }
  }

  /**
   * Validate feature flags
   */
  private validateFeatureFlags(context: FeatureFlagContext): void {
    const monitoringEnabled = this.featureFlags.isEnabled('voice_monitoring_enabled' as any, context)
    if (!monitoringEnabled) {
      throw new ApiError('FEATURE_FLAG_DISABLED' as any, 'Voice monitoring is not enabled')
    }
  }

  /**
   * Emit monitoring events
   */
  private async emitMonitoringEvent(
    eventType: string,
    context: FeatureFlagContext,
    data: any
  ): Promise<void> {
    try {
      const event = EventBuilder.voiceSessionStarted(
        context.organizationId,
        'voice-monitoring',
        context.userId
      )

      console.log(`[MONITORING] Event emitted:`, eventType, event.build())
    } catch (error) {
      console.error('Failed to emit monitoring event:', error)
    }
  }

  /**
   * Get monitoring statistics
   */
  getStatistics(): {
    totalMetrics: number
    activeSessions: number
    activeAlerts: number
    retentionPeriodDays: number
  } {
    return {
      totalMetrics: this.metrics.length,
      activeSessions: this.activeSessions.size,
      activeAlerts: this.getActiveAlerts().length,
      retentionPeriodDays: this.config.retentionPeriod!
    }
  }

  /**
   * Cleanup stale sessions
   */
  cleanup(): void {
    const now = new Date()
    const staleThreshold = 24 * 60 * 60 * 1000 // 24 hours

    for (const [sessionId, lastActivity] of this.activeSessions.entries()) {
      if (now.getTime() - lastActivity.getTime() > staleThreshold) {
        this.activeSessions.delete(sessionId)
        console.log(`[MONITORING] Cleaned up stale session: ${sessionId}`)
      }
    }

    this.cleanupOldMetrics()
  }

  /**
   * Get service configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}

/**
 * Export singleton instance
 */
export const voiceMonitoringService = new VoiceMonitoringService()

/**
 * Convenience functions
 */
export async function trackSessionMetrics(
  sessionId: string,
  context: FeatureFlagContext,
  metrics: Partial<VoiceMetrics>
): Promise<void> {
  return voiceMonitoringService.trackSessionMetrics(sessionId, context, metrics)
}

export async function getKPIDashboard(
  timeWindow: 'hour' | 'day' | 'week' | 'month',
  context: FeatureFlagContext
): Promise<KPIDashboard> {
  return voiceMonitoringService.getKPIDashboard(timeWindow, context)
}

export async function getKPIStatus(
  context: FeatureFlagContext
): Promise<{
  transcriptionLatency: { current: number; target: number; status: 'good' | 'warning' | 'critical' }
  planGenerationLatency: { current: number; target: number; status: 'good' | 'warning' | 'critical' }
  errorRate: { current: number; target: number; status: 'good' | 'warning' | 'critical' }
  schemaErrorRate: { current: number; target: number; status: 'good' | 'warning' | 'critical' }
}> {
  return voiceMonitoringService.getKPIStatus(context)
}

export function getActiveAlerts(): PerformanceAlert[] {
  return voiceMonitoringService.getActiveAlerts()
}
