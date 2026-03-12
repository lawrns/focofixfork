/**
 * Settings Repository
 * Type-safe database access for user_profiles.settings JSONB column
 */

import { BaseRepository, Result, Ok, Err, isError } from './base-repository'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface UserProfileWithSettings {
  id: string
  user_id?: string
  full_name: string | null
  bio?: string | null
  avatar_url: string | null
  timezone: string | null
  language?: string | null
  email_notifications: boolean
  settings?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface UserSettings {
  workspaceName?: string
  workspaceSlug?: string
  workspaceDescription?: string
  aiPolicy?: Record<string, unknown>
  notifications?: Record<string, unknown>
  [key: string]: unknown
}

export class SettingsRepository extends BaseRepository<UserProfileWithSettings> {
  protected table = 'user_profiles'

  constructor(supabase: SupabaseClient) {
    super(supabase)
  }

  private async findSettingsRow(userId: string): Promise<Result<{ id: string; settings: UserSettings }>> {
    const byId = await this.findSettingsRowByColumn('id', userId)
    if (byId.ok || byId.error.code !== 'NOT_FOUND') {
      return byId
    }

    const byUserId = await this.findSettingsRowByColumn('user_id', userId)
    if (!byUserId.ok && this.isMissingColumnError(byUserId.error.details)) {
      return Err({
        code: 'NOT_FOUND',
        message: `User profile with id ${userId} not found`,
        details: { userId },
      })
    }

    return byUserId
  }

  private async findSettingsRowByColumn(
    column: 'id' | 'user_id',
    userId: string
  ): Promise<Result<{ id: string; settings: UserSettings }>> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('id, settings')
      .eq(column, userId)
      .maybeSingle()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch user settings',
        details: error,
      })
    }

    if (!data) {
      return Err({
        code: 'NOT_FOUND',
        message: `User profile with id ${userId} not found`,
        details: { userId },
      })
    }

    return Ok({
      id: data.id as string,
      settings: (data.settings as UserSettings) || {},
    })
  }

  private isMissingColumnError(details: unknown): boolean {
    if (!details || typeof details !== 'object') {
      return false
    }

    const code = 'code' in details ? details.code : null
    return code === '42703' || code === 'PGRST204'
  }

  /**
   * Get user settings by user ID
   */
  async getSettings(userId: string): Promise<Result<UserSettings>> {
    const row = await this.findSettingsRow(userId)
    if (isError(row)) {
      return row
    }

    return Ok(row.data.settings)
  }

  /**
   * Update user settings (merge with existing)
   */
  async updateSettings(userId: string, updates: Partial<UserSettings>): Promise<Result<UserSettings>> {
    const currentResult = await this.findSettingsRow(userId)
    if (isError(currentResult) && currentResult.error.code !== 'NOT_FOUND') {
      return currentResult
    }

    // Merge settings
    const currentSettings = currentResult.ok ? currentResult.data.settings : {}
    const updatedSettings: Record<string, unknown> = { ...currentSettings }

    // Update workspace settings if provided
    if (updates.workspaceName !== undefined) {
      updatedSettings.workspaceName = updates.workspaceName
    }
    if (updates.workspaceSlug !== undefined) {
      updatedSettings.workspaceSlug = updates.workspaceSlug
    }
    if (updates.workspaceDescription !== undefined) {
      updatedSettings.workspaceDescription = updates.workspaceDescription
    }

    // Update AI policy settings if provided
    if (updates.aiPolicy !== undefined) {
      updatedSettings.aiPolicy = updates.aiPolicy
    }

    // Update notification settings if provided
    if (updates.notifications !== undefined) {
      updatedSettings.notifications = updates.notifications
    }

    // Copy any other settings
    Object.keys(updates).forEach((key) => {
      if (!['workspaceName', 'workspaceSlug', 'workspaceDescription', 'aiPolicy', 'notifications'].includes(key)) {
        updatedSettings[key] = updates[key]
      }
    })

    const payload = {
      id: currentResult.ok ? currentResult.data.id : userId,
      settings: updatedSettings,
      updated_at: new Date().toISOString(),
    }

    const mutation = currentResult.ok
      ? this.supabase
          .from(this.table)
          .update({
            settings: updatedSettings,
            updated_at: payload.updated_at,
          })
          .eq('id', currentResult.data.id)
          .select('settings')
          .single()
      : this.supabase
          .from(this.table)
          .upsert(payload, { onConflict: 'id' })
          .select('settings')
          .single()

    const { data, error: updateError } = await mutation

    if (updateError) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to update settings',
        details: updateError,
      })
    }

    return Ok(((data?.settings as UserSettings) || updatedSettings) as UserSettings)
  }

  /**
   * Replace all user settings (not merge)
   */
  async replaceSettings(userId: string, settings: UserSettings): Promise<Result<UserSettings>> {
    const { error } = await this.supabase
      .from(this.table)
      .update({
        settings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      // Check if record not found
      if (error.code === 'PGRST116') {
        return Err({
          code: 'NOT_FOUND',
          message: `User profile with id ${userId} not found`,
          details: { userId },
        })
      }

      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to replace settings',
        details: error,
      })
    }

    return Ok(settings)
  }

  /**
   * Delete specific setting keys
   */
  async deleteSettingKeys(userId: string, keys: string[]): Promise<Result<UserSettings>> {
    // Get current settings
    const currentResult = await this.getSettings(userId)

    if (isError(currentResult)) {
      return currentResult
    }

    // Remove specified keys
    const updatedSettings = { ...currentResult.data }
    keys.forEach((key) => {
      delete updatedSettings[key]
    })

    // Update in database
    const { error } = await this.supabase
      .from(this.table)
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to delete setting keys',
        details: error,
      })
    }

    return Ok(updatedSettings as UserSettings)
  }
}
