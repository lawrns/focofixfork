import { supabase } from '@/lib/supabase'
import type {
  UserSettings,
  UserSettingsUpdate,
  OrganizationSettings,
  OrganizationSettingsUpdate,
  ProjectSettings,
  ProjectSettingsUpdate,
  DataExportRequest,
  DataExportResponse,
  AuditLogEntry
} from '@/lib/validation/schemas/settings'

// SettingsService class for managing user, organization, and project settings
export class SettingsService {
  // ===============================
  // USER SETTINGS
  // ===============================

  /**
   * Get current user settings
   */
  static async getUserSettings(): Promise<UserSettings> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user profile from user_profiles table
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') throw profileError

    // Get notification preferences
    const { data: notifications, error: notificationsError } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (notificationsError && notificationsError.code !== 'PGRST116') throw notificationsError

    return {
      profile: {
        fullName: profile?.display_name || '',
        bio: profile?.bio || '',
        avatarUrl: profile?.avatar_url || ''
      },
      preferences: {
        theme: profile?.theme_preference || 'system',
        language: profile?.locale || 'en',
        timezone: profile?.timezone || 'UTC',
        defaultTimePeriod: '30d' // Default, could be stored in user metadata
      },
      notifications: {
        milestoneDue: notifications?.milestone_due ?? true,
        overdueTask: notifications?.overdue_task ?? true,
        projectHealthChanges: notifications?.project_health_changes ?? true,
        mentionsAssignments: notifications?.mentions_assignments ?? true,
        channels: notifications?.channels || ['in_app']
      }
    }
  }

  /**
   * Update user settings
   */
  static async updateUserSettings(updates: UserSettingsUpdate): Promise<UserSettings> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Update profile if provided
    if (updates.profile) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          display_name: updates.profile.fullName || null,
          bio: updates.profile.bio || null,
          avatar_url: updates.profile.avatarUrl || null,
          updated_at: new Date().toISOString()
        })

      if (profileError) throw profileError
    }

    // Update preferences if provided
    if (updates.preferences) {
      const { error: prefsError } = await supabase
        .from('user_profiles')
        .update({
          theme_preference: updates.preferences.theme,
          locale: updates.preferences.language,
          timezone: updates.preferences.timezone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (prefsError) throw prefsError
    }

    // Update notifications if provided
    if (updates.notifications) {
      const { error: notificationsError } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          milestone_due: updates.notifications.milestoneDue,
          overdue_task: updates.notifications.overdueTask,
          project_health_changes: updates.notifications.projectHealthChanges,
          mentions_assignments: updates.notifications.mentionsAssignments,
          channels: updates.notifications.channels,
          updated_at: new Date().toISOString()
        })

      if (notificationsError) throw notificationsError
    }

    // Log the settings change
    await this.logAuditEvent({
      action: 'settings_change',
      resourceType: 'user_settings',
      resourceId: user.id,
      details: { updates }
    })

    // Return updated settings
    return this.getUserSettings()
  }

  // ===============================
  // ORGANIZATION SETTINGS
  // ===============================

  /**
   * Get organization settings
   */
  static async getOrganizationSettings(organizationId: string): Promise<OrganizationSettings> {
    // Check if user has access to this organization
    const hasAccess = await this.checkOrganizationAccess(organizationId)
    if (!hasAccess) throw new Error('Access denied')

    const { data: settings, error } = await supabase
      .from('organization_settings')
      .select('setting_key, setting_value')
      .eq('organization_id', organizationId)

    if (error) throw error

    // Convert key-value pairs to structured settings
    const settingsMap = new Map(settings?.map(s => [s.setting_key, s.setting_value]) || [])

    return {
      security: {
        enforceTwoFactor: settingsMap.get('security.enforceTwoFactor') ?? false,
        passwordPolicy: settingsMap.get('security.passwordPolicy') ?? 'basic',
        sessionTimeout: settingsMap.get('security.sessionTimeout') ?? 60
      },
      features: {
        analyticsEnabled: settingsMap.get('features.analyticsEnabled') ?? true,
        notificationsEnabled: settingsMap.get('features.notificationsEnabled') ?? true,
        exportEnabled: settingsMap.get('features.exportEnabled') ?? true
      },
      limits: {
        maxProjects: settingsMap.get('limits.maxProjects') ?? 100,
        maxUsers: settingsMap.get('limits.maxUsers') ?? 1000,
        storageLimit: settingsMap.get('limits.storageLimit') ?? 100
      }
    }
  }

  /**
   * Update organization settings (admin only)
   */
  static async updateOrganizationSettings(
    organizationId: string,
    updates: OrganizationSettingsUpdate
  ): Promise<OrganizationSettings> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Check admin permissions
    const isAdmin = await this.checkOrganizationAdminAccess(organizationId)
    if (!isAdmin) throw new Error('Admin access required')

    // Convert structured updates to key-value pairs
    const keyValueUpdates: Array<{ setting_key: string, setting_value: any }> = []

    if (updates.security) {
      if (updates.security.enforceTwoFactor !== undefined) {
        keyValueUpdates.push({
          setting_key: 'security.enforceTwoFactor',
          setting_value: updates.security.enforceTwoFactor
        })
      }
      if (updates.security.passwordPolicy) {
        keyValueUpdates.push({
          setting_key: 'security.passwordPolicy',
          setting_value: updates.security.passwordPolicy
        })
      }
      if (updates.security.sessionTimeout) {
        keyValueUpdates.push({
          setting_key: 'security.sessionTimeout',
          setting_value: updates.security.sessionTimeout
        })
      }
    }

    if (updates.features) {
      if (updates.features.analyticsEnabled !== undefined) {
        keyValueUpdates.push({
          setting_key: 'features.analyticsEnabled',
          setting_value: updates.features.analyticsEnabled
        })
      }
      if (updates.features.notificationsEnabled !== undefined) {
        keyValueUpdates.push({
          setting_key: 'features.notificationsEnabled',
          setting_value: updates.features.notificationsEnabled
        })
      }
      if (updates.features.exportEnabled !== undefined) {
        keyValueUpdates.push({
          setting_key: 'features.exportEnabled',
          setting_value: updates.features.exportEnabled
        })
      }
    }

    if (updates.limits) {
      if (updates.limits.maxProjects) {
        keyValueUpdates.push({
          setting_key: 'limits.maxProjects',
          setting_value: updates.limits.maxProjects
        })
      }
      if (updates.limits.maxUsers) {
        keyValueUpdates.push({
          setting_key: 'limits.maxUsers',
          setting_value: updates.limits.maxUsers
        })
      }
      if (updates.limits.storageLimit) {
        keyValueUpdates.push({
          setting_key: 'limits.storageLimit',
          setting_value: updates.limits.storageLimit
        })
      }
    }

    // Update settings in database
    for (const update of keyValueUpdates) {
      const { error } = await supabase
        .from('organization_settings')
        .upsert({
          organization_id: organizationId,
          setting_key: update.setting_key,
          setting_value: update.setting_value,
          created_by: user.id,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
    }

    // Log the organization settings change
    await this.logAuditEvent({
      action: 'organization_change',
      resourceType: 'organization_settings',
      resourceId: organizationId,
      details: { updates }
    })

    return this.getOrganizationSettings(organizationId)
  }

  // ===============================
  // PROJECT SETTINGS
  // ===============================

  /**
   * Get project settings
   */
  static async getProjectSettings(projectId: string): Promise<ProjectSettings> {
    // Check project access
    const hasAccess = await this.checkProjectAccess(projectId)
    if (!hasAccess) throw new Error('Access denied')

    const { data: settings, error } = await supabase
      .from('project_settings')
      .select('setting_key, setting_value')
      .eq('project_id', projectId)

    if (error) throw error

    // Convert key-value pairs to structured settings
    const settingsMap = new Map(settings?.map(s => [s.setting_key, s.setting_value]) || [])

    return {
      visibility: settingsMap.get('visibility') ?? 'organization',
      permissions: {
        allowGuestComments: settingsMap.get('permissions.allowGuestComments') ?? false,
        requireApprovalForChanges: settingsMap.get('permissions.requireApprovalForChanges') ?? false
      },
      workflow: {
        defaultTaskTemplate: settingsMap.get('workflow.defaultTaskTemplate') ?? undefined,
        customFields: settingsMap.get('workflow.customFields') ?? []
      }
    }
  }

  /**
   * Update project settings
   */
  static async updateProjectSettings(
    projectId: string,
    updates: ProjectSettingsUpdate
  ): Promise<ProjectSettings> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Check manager permissions
    const hasManagerAccess = await this.checkProjectManagerAccess(projectId)
    if (!hasManagerAccess) throw new Error('Manager access required')

    // Convert structured updates to key-value pairs
    const keyValueUpdates: Array<{ setting_key: string, setting_value: any }> = []

    if (updates.visibility) {
      keyValueUpdates.push({
        setting_key: 'visibility',
        setting_value: updates.visibility
      })
    }

    if (updates.permissions) {
      if (updates.permissions.allowGuestComments !== undefined) {
        keyValueUpdates.push({
          setting_key: 'permissions.allowGuestComments',
          setting_value: updates.permissions.allowGuestComments
        })
      }
      if (updates.permissions.requireApprovalForChanges !== undefined) {
        keyValueUpdates.push({
          setting_key: 'permissions.requireApprovalForChanges',
          setting_value: updates.permissions.requireApprovalForChanges
        })
      }
    }

    if (updates.workflow) {
      if (updates.workflow.defaultTaskTemplate !== undefined) {
        keyValueUpdates.push({
          setting_key: 'workflow.defaultTaskTemplate',
          setting_value: updates.workflow.defaultTaskTemplate
        })
      }
      if (updates.workflow.customFields !== undefined) {
        keyValueUpdates.push({
          setting_key: 'workflow.customFields',
          setting_value: updates.workflow.customFields
        })
      }
    }

    // Update settings in database
    for (const update of keyValueUpdates) {
      const { error } = await supabase
        .from('project_settings')
        .upsert({
          project_id: projectId,
          setting_key: update.setting_key,
          setting_value: update.setting_value,
          created_by: user.id,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
    }

    // Log the project settings change
    await this.logAuditEvent({
      action: 'update',
      resourceType: 'project_settings',
      resourceId: projectId,
      details: { updates }
    })

    return this.getProjectSettings(projectId)
  }

  // ===============================
  // DATA EXPORT
  // ===============================

  /**
   * Export user data
   */
  static async exportUserData(request: DataExportRequest): Promise<DataExportResponse> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // This would typically create a background job for data export
    // For now, we'll simulate the export process
    const exportId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Log the export request
    await this.logAuditEvent({
      action: 'create',
      resourceType: 'user_settings',
      resourceId: user.id,
      details: { request, exportId }
    })

    // In a real implementation, this would queue a background job
    // For now, we'll simulate an immediate completion
    return {
      exportId,
      status: 'completed',
      downloadUrl: `/api/exports/${exportId}/download`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      fileSize: 1024, // Simulated file size
      recordCount: 42 // Simulated record count
    }
  }

  // ===============================
  // AUDIT LOG
  // ===============================

  /**
   * Get user audit log
   */
  static async getUserAuditLog(limit: number = 50, offset: number = 0, action?: string): Promise<AuditLogEntry[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    let query = supabase
      .from('audit_log')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    if (action) {
      query = query.eq('action', action)
    }

    const { data, error } = await query
    if (error) throw error

    return data || []
  }

  /**
   * Get organization audit log (admin only)
   */
  static async getOrganizationAuditLog(
    organizationId: string,
    limit: number = 50,
    userId?: string
  ): Promise<AuditLogEntry[]> {
    // Check admin permissions
    const isAdmin = await this.checkOrganizationAdminAccess(organizationId)
    if (!isAdmin) throw new Error('Admin access required')

    let query = supabase
      .from('audit_log')
      .select('*')
      .eq('resource_type', 'organization_settings')
      .eq('resource_id', organizationId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query
    if (error) throw error

    return data || []
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  /**
   * Check if user has access to organization
   */
  private static async checkOrganizationAccess(organizationId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    return !error && !!data
  }

  /**
   * Check if user has admin access to organization
   */
  private static async checkOrganizationAdminAccess(organizationId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    return !error && (data?.role === 'owner' || data?.role === 'admin')
  }

  /**
   * Check if user has access to project
   */
  private static async checkProjectAccess(projectId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    return !error && !!data
  }

  /**
   * Check if user has manager access to project
   */
  private static async checkProjectManagerAccess(projectId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    return !error && ['owner', 'admin', 'manager'].includes(data?.role || '')
  }

  /**
   * Log audit event
   */
  private static async logAuditEvent(details: Omit<AuditLogEntry, 'id' | 'timestamp' | 'userId'>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      await supabase.from('audit_log').insert({
        ...details,
        userId: user.id,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      // Log audit failure but don't throw - audit logging shouldn't break functionality
      console.error('Failed to log audit event:', error)
    }
  }
}

// Export singleton instance
export const settingsService = SettingsService
