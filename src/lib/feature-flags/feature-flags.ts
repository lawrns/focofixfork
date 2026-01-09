import { z } from 'zod'

/**
 * Feature flags system for controlled rollout of voice planning features
 */

// Feature flag enum for type safety
export const FeatureFlagEnum = z.enum([
  // Voice capture features
  'voice_capture_enabled',
  'voice_capture_shadow_mode',

  // Plan orchestration features
  'plan_orchestration_enabled',
  'plan_orchestration_shadow_mode',

  // Plan commit features
  'plan_commit_enabled',
  'plan_commit_shadow_mode',
  'plan_commit_dual_write',

  // AI and ML features
  'ai_whisper_integration',
  'ai_gpt4_integration',
  
  // UI/UX features
  'ui_voice_button',
  'ui_plan_review_panel',
  'ui_gantt_timeline',
  'ui_dependency_visualization',
  'ui_drag_drop_editing',
  'ui_modernization',
  'voice_monitoring_enabled',
  
  // System features
  'system_dual_write_mode',
  'system_compatibility_views',
  'system_enhanced_logging',
  'system_performance_monitoring',
  'system_analytics_tracking',
  
  // Security and compliance
  'security_pii_redaction',
  'security_gdpr_compliance',
  'security_encryption_at_rest',
  'security_audit_logging',
  'security_rate_limiting',
  
  // Integration features
  'integration_websocket_support',
  'integration_redis_caching',
  'integration_email_notifications',
  'integration_slack_notifications',
  'integration_calendar_sync',
  
  // Experimental features
  'experimental_voice_cloning',
  'experimental_smart_planning',
  'experimental_predictive_scheduling',
  'experimental_natural_language_queries',
  'experimental_voice_commands'
])

export type FeatureFlag = z.infer<typeof FeatureFlagEnum>

// Feature flag value schema
export const FeatureFlagValueSchema = z.object({
  enabled: z.boolean(),
  rollout_percentage: z.number().min(0).max(100).default(100),
  user_ids: z.array(z.string().uuid()).default([]),
  organization_ids: z.array(z.string().uuid()).default([]),
  environments: z.array(z.enum(['development', 'staging', 'production'])).default(['production']),
  metadata: z.object({
    description: z.string(),
    owner: z.string(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    version: z.string().default('1.0.0'),
    tags: z.array(z.string()).default([])
  }).optional()
})

export type FeatureFlagValue = z.infer<typeof FeatureFlagValueSchema>

// Feature flag context for evaluation
export interface FeatureFlagContext {
  userId?: string
  organizationId?: string
  environment?: 'development' | 'staging' | 'production'
  userAgent?: string
  ipAddress?: string
  sessionId?: string
  metadata?: Record<string, any>
}

/**
 * Feature flags service
 */
export class FeatureFlagsService {
  private static instance: FeatureFlagsService
  private flags: Map<FeatureFlag, FeatureFlagValue> = new Map()

  private constructor() {
    this.initializeDefaultFlags()
  }

  static getInstance(): FeatureFlagsService {
    if (!FeatureFlagsService.instance) {
      FeatureFlagsService.instance = new FeatureFlagsService()
    }
    return FeatureFlagsService.instance
  }

  /**
   * Initialize default feature flags
   */
  private initializeDefaultFlags(): void {
    const defaultFlags: Record<FeatureFlag, FeatureFlagValue> = {
      // Voice capture - disabled by default for safe rollout
      voice_capture_enabled: {
        enabled: false,
        rollout_percentage: 0,
        environments: ['development'],
        metadata: {
          description: 'Enable voice capture functionality',
          owner: 'voice-team',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: ['voice', 'capture', 'core']
        }
      },
      voice_capture_shadow_mode: {
        enabled: true,
        rollout_percentage: 100,
        environments: ['development', 'staging'],
        metadata: {
          description: 'Enable voice capture in shadow mode (no production writes)',
          owner: 'voice-team',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: ['voice', 'shadow', 'safe']
        }
      },
      
      // Plan orchestration - shadow mode only initially
      plan_orchestration_enabled: {
        enabled: false,
        rollout_percentage: 0,
        environments: ['development'],
        metadata: {
          description: 'Enable AI-powered plan orchestration',
          owner: 'ai-team',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: ['ai', 'planning', 'core']
        }
      },
      plan_orchestration_shadow_mode: {
        enabled: true,
        rollout_percentage: 100,
        environments: ['development', 'staging'],
        metadata: {
          description: 'Enable plan orchestration in shadow mode',
          owner: 'ai-team',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: ['ai', 'shadow', 'safe']
        }
      },
      
      // Plan commit - disabled until Phase 3
      plan_commit_enabled: {
        enabled: false,
        rollout_percentage: 0,
        environments: [],
        metadata: {
          description: 'Enable committing AI-generated plans to production',
          owner: 'backend-team',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: ['commit', 'production', 'risky']
        }
      },
      plan_commit_shadow_mode: {
        enabled: false,
        rollout_percentage: 0,
        environments: ['development', 'staging'],
        metadata: {
          description: 'Enable plan commit in shadow mode',
          owner: 'backend-team',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: ['commit', 'shadow', 'safe']
        }
      },
      
      // AI integrations - enabled in development
      ai_whisper_integration: {
        enabled: true,
        rollout_percentage: 100,
        environments: ['development', 'staging'],
        metadata: {
          description: 'Enable OpenAI Whisper for speech transcription',
          owner: 'ai-team',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: ['ai', 'transcription', 'openai']
        }
      },
      ai_gpt4_integration: {
        enabled: true,
        rollout_percentage: 100,
        environments: ['development', 'staging'],
        metadata: {
          description: 'Enable OpenAI GPT-4 for plan generation',
          owner: 'ai-team',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: ['ai', 'planning', 'openai']
        }
      },
      
      // UI features - disabled until backend is ready
      ui_voice_button: {
        enabled: false,
        rollout_percentage: 0,
        environments: ['development'],
        metadata: {
          description: 'Show voice capture button in UI',
          owner: 'frontend-team',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: ['ui', 'voice', 'button']
        }
      },
      ui_plan_review_panel: {
        enabled: false,
        rollout_percentage: 0,
        environments: ['development'],
        metadata: {
          description: 'Show plan review panel for editing AI-generated plans',
          owner: 'frontend-team',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: ['ui', 'planning', 'review']
        }
      },
      ui_modernization: {
        enabled: true,
        rollout_percentage: 100,
        environments: ['development', 'staging'],
        metadata: {
          description: 'Gate modernized UI templates (tables, tabs, cards)',
          owner: 'frontend-team',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: ['ui', 'modernization']
        }
      },
      voice_monitoring_enabled: {
        enabled: true,
        rollout_percentage: 100,
        environments: ['development', 'staging'],
        metadata: {
          description: 'Enable voice monitoring and metrics tracking in shadow mode',
          owner: 'voice-team',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: ['voice', 'monitoring']
        }
      },
      
      // System features - enabled for rollout
      system_dual_write_mode: {
        enabled: false,
        rollout_percentage: 0,
        environments: [],
        metadata: {
          description: 'Enable dual write mode for data migration',
          owner: 'backend-team',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: ['system', 'migration', 'dual-write']
        }
      },
      system_compatibility_views: {
        enabled: true,
        rollout_percentage: 100,
        environments: ['development', 'staging', 'production'],
        metadata: {
          description: 'Enable compatibility views for backward compatibility',
          owner: 'backend-team',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: ['system', 'compatibility', 'migration']
        }
      },
      
      // Security features - enabled by default
      security_pii_redaction: {
        enabled: true,
        rollout_percentage: 100,
        environments: ['development', 'staging', 'production'],
        metadata: {
          description: 'Enable PII redaction for voice data',
          owner: 'security-team',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: ['security', 'privacy', 'pii']
        }
      },
      security_gdpr_compliance: {
        enabled: true,
        rollout_percentage: 100,
        environments: ['development', 'staging', 'production'],
        metadata: {
          description: 'Enable GDPR compliance features',
          owner: 'security-team',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: ['security', 'privacy', 'gdpr']
        }
      },
      
      // Experimental features - disabled
      experimental_voice_cloning: {
        enabled: false,
        rollout_percentage: 0,
        environments: [],
        metadata: {
          description: 'Experimental voice cloning features',
          owner: 'research-team',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: ['experimental', 'voice', 'ai']
        }
      },
      experimental_smart_planning: {
        enabled: false,
        rollout_percentage: 0,
        environments: ['development'],
        metadata: {
          description: 'Experimental smart planning algorithms',
          owner: 'research-team',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: ['experimental', 'ai', 'planning']
        }
      },

      // All other defined flags default to disabled
      plan_commit_dual_write: { enabled: false, rollout_percentage: 0, environments: [] },
      ui_gantt_timeline: { enabled: false, rollout_percentage: 0, environments: [] },
      ui_dependency_visualization: { enabled: false, rollout_percentage: 0, environments: [] },
      ui_drag_drop_editing: { enabled: false, rollout_percentage: 0, environments: [] },
      system_enhanced_logging: { enabled: false, rollout_percentage: 0, environments: [] },
      system_performance_monitoring: { enabled: false, rollout_percentage: 0, environments: [] },
      system_analytics_tracking: { enabled: false, rollout_percentage: 0, environments: [] },
      security_encryption_at_rest: { enabled: false, rollout_percentage: 0, environments: [] },
      security_audit_logging: { enabled: false, rollout_percentage: 0, environments: [] },
      security_rate_limiting: { enabled: false, rollout_percentage: 0, environments: [] },
      integration_websocket_support: { enabled: false, rollout_percentage: 0, environments: [] },
      integration_redis_caching: { enabled: false, rollout_percentage: 0, environments: [] },
      integration_email_notifications: { enabled: false, rollout_percentage: 0, environments: [] },
      integration_slack_notifications: { enabled: false, rollout_percentage: 0, environments: [] },
      integration_calendar_sync: { enabled: false, rollout_percentage: 0, environments: [] },
      experimental_predictive_scheduling: { enabled: false, rollout_percentage: 0, environments: [] },
      experimental_natural_language_queries: { enabled: false, rollout_percentage: 0, environments: [] },
      experimental_voice_commands: { enabled: false, rollout_percentage: 0, environments: [] }
    }

    for (const [flag, value] of Object.entries(defaultFlags)) {
      this.flags.set(flag as FeatureFlag, value)
    }
  }

  /**
   * Check if a feature flag is enabled for the given context
   */
  isEnabled(flag: FeatureFlag, context?: FeatureFlagContext): boolean {
    const flagValue = this.flags.get(flag)
    if (!flagValue) {
      return false
    }

    // Check if flag is globally disabled
    if (!flagValue.enabled) {
      return false
    }

    // Check environment
    const envs = Array.isArray(flagValue.environments) ? flagValue.environments : ['development','staging','production']
    if (context?.environment && !envs.includes(context.environment)) {
      return false
    }

    // Check specific user inclusion
    const userIds = Array.isArray(flagValue.user_ids) ? flagValue.user_ids : []
    if (context?.userId && userIds.length > 0) {
      return userIds.includes(context.userId)
    }

    // Check specific organization inclusion
    const orgIds = Array.isArray(flagValue.organization_ids) ? flagValue.organization_ids : []
    if (context?.organizationId && orgIds.length > 0) {
      return orgIds.includes(context.organizationId)
    }

    // Check rollout percentage (simple hash-based rollout)
    if ((flagValue.rollout_percentage ?? 100) < 100) {
      if (!context?.userId) {
        return false // Need user ID for percentage-based rollout
      }

      const hash = this.hashUserId(context.userId)
      const rolloutThreshold = ((flagValue.rollout_percentage ?? 0) / 100) * 1000000
      return hash < rolloutThreshold
    }

    return true
  }

  /**
   * Get feature flag value
   */
  getFlag(flag: FeatureFlag): FeatureFlagValue | undefined {
    return this.flags.get(flag)
  }

  /**
   * Set feature flag value
   */
  setFlag(flag: FeatureFlag, value: FeatureFlagValue): void {
    const updatedValue = {
      ...value,
      metadata: {
        ...value.metadata,
        updated_at: new Date().toISOString()
      }
    }
    this.flags.set(flag, updatedValue)
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): Record<FeatureFlag, FeatureFlagValue> {
    const result: Record<string, FeatureFlagValue> = {}
    for (const [flag, value] of this.flags.entries()) {
      result[flag] = value
    }
    return result as Record<FeatureFlag, FeatureFlagValue>
  }

  /**
   * Get enabled flags for a specific context
   */
  getEnabledFlags(context?: FeatureFlagContext): FeatureFlag[] {
    const enabled: FeatureFlag[] = []
    for (const flag of this.flags.keys()) {
      if (this.isEnabled(flag, context)) {
        enabled.push(flag)
      }
    }
    return enabled
  }

  /**
   * Enable users for a feature flag
   */
  enableUsers(flag: FeatureFlag, userIds: string[]): void {
    const currentValue = this.flags.get(flag)
    if (currentValue) {
      this.setFlag(flag, {
        ...currentValue,
        user_ids: [...new Set([...currentValue.user_ids, ...userIds])]
      })
    }
  }

  /**
   * Enable organizations for a feature flag
   */
  enableOrganizations(flag: FeatureFlag, organizationIds: string[]): void {
    const currentValue = this.flags.get(flag)
    if (currentValue) {
      this.setFlag(flag, {
        ...currentValue,
        organization_ids: [...new Set([...currentValue.organization_ids, ...organizationIds])]
      })
    }
  }

  /**
   * Set rollout percentage for a feature flag
   */
  setRolloutPercentage(flag: FeatureFlag, percentage: number): void {
    const currentValue = this.flags.get(flag)
    if (currentValue) {
      this.setFlag(flag, {
        ...currentValue,
        rollout_percentage: Math.max(0, Math.min(100, percentage))
      })
    }
  }

  /**
   * Hash user ID for percentage-based rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash) % 1000000
  }

  /**
   * Reset all flags to defaults (useful for testing)
   */
  reset(): void {
    this.flags.clear()
    this.initializeDefaultFlags()
  }
}

/**
 * Feature flag decorators and utilities
 */
export function requireFeatureFlag(flag: FeatureFlag) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = function (...args: any[]) {
      const context = args[0]?.context || {}
      const featureFlags = FeatureFlagsService.getInstance()

      if (!featureFlags.isEnabled(flag, context)) {
        throw new Error(`Feature flag '${flag}' is not enabled`)
      }

      return method.apply(this, args)
    }

    return descriptor
  }
}

/**
 * Express middleware for feature flag checking
 */
export function featureFlagMiddleware(flag: FeatureFlag) {
  return (req: any, res: any, next: any) => {
    const featureFlags = FeatureFlagsService.getInstance()
    const context: FeatureFlagContext = {
      userId: req.user?.id,
      organizationId: req.organization?.id,
      environment: process.env.NODE_ENV as any
    }

    if (!featureFlags.isEnabled(flag, context)) {
      return res.status(503).json({
        error: {
          code: 'FEATURE_FLAG_DISABLED',
          message: `Feature '${flag}' is currently disabled`,
          retriable: false,
          correlationId: req.id
        }
      })
    }

    // Add feature flags to request for downstream use
    req.featureFlags = featureFlags
    req.enabledFlags = featureFlags.getEnabledFlags(context)

    next()
  }
}

/**
 * React hook for feature flags (frontend)
 */
export function useFeatureFlag(flag: FeatureFlag, context?: FeatureFlagContext): boolean {
  // This would be implemented in the frontend with proper React hooks
  // For now, just return the service result
  const featureFlags = FeatureFlagsService.getInstance()
  return featureFlags.isEnabled(flag, context)
}

/**
 * Feature flag utilities
 */
export class FeatureFlagUtils {
  /**
   * Check if any voice features are enabled
   */
  static isVoiceEnabled(context?: FeatureFlagContext): boolean {
    const featureFlags = FeatureFlagsService.getInstance()
    return featureFlags.isEnabled('voice_capture_enabled', context) ||
           featureFlags.isEnabled('voice_capture_shadow_mode', context)
  }

  /**
   * Check if shadow mode is enabled for any feature
   */
  static isShadowModeEnabled(context?: FeatureFlagContext): boolean {
    const featureFlags = FeatureFlagsService.getInstance()
    return featureFlags.isEnabled('voice_capture_shadow_mode', context) ||
           featureFlags.isEnabled('plan_orchestration_shadow_mode', context) ||
           featureFlags.isEnabled('plan_commit_shadow_mode', context)
  }

  /**
   * Check if dual write mode is enabled
   */
  static isDualWriteEnabled(context?: FeatureFlagContext): boolean {
    const featureFlags = FeatureFlagsService.getInstance()
    return featureFlags.isEnabled('system_dual_write_mode', context) ||
           featureFlags.isEnabled('plan_commit_dual_write', context)
  }

  /**
   * Get all voice-related flags
   */
  static getVoiceFlags(): FeatureFlag[] {
    return [
      'voice_capture_enabled',
      'voice_capture_shadow_mode',
      'voice_monitoring_enabled'
    ]
  }

  /**
   * Get all AI-related flags
   */
  static getAIFlags(): FeatureFlag[] {
    return [
      'ai_whisper_integration',
      'ai_gpt4_integration'
    ]
  }

  /**
   * Get all experimental flags
   */
  static getExperimentalFlags(): FeatureFlag[] {
    return [
      'experimental_voice_cloning',
      'experimental_smart_planning',
      'experimental_predictive_scheduling',
      'experimental_natural_language_queries',
      'experimental_voice_commands'
    ]
  }
}

// Types are already exported through their interface declarations
