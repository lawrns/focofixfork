import { supabase } from '../supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Real-time subscription configuration for goals and settings
export interface RealtimeConfig {
  table: string
  filter?: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  callback: (payload: any) => void
}

// Goals real-time subscriptions
export const goalsRealtimeConfig: RealtimeConfig[] = [
  {
    table: 'goals',
    event: '*',
    callback: (payload) => {
      console.log('Goals change:', payload)
      // Trigger goals list refresh, progress recalculation, etc.
      window.dispatchEvent(new CustomEvent('goals:changed', { detail: payload }))
    }
  },
  {
    table: 'goal_milestones',
    event: '*',
    callback: (payload) => {
      console.log('Goal milestones change:', payload)
      // Trigger goal progress updates, milestone list refresh
      window.dispatchEvent(new CustomEvent('goal-milestones:changed', { detail: payload }))
    }
  },
  {
    table: 'goal_project_links',
    event: '*',
    callback: (payload) => {
      console.log('Goal project links change:', payload)
      // Trigger goal project association updates
      window.dispatchEvent(new CustomEvent('goal-project-links:changed', { detail: payload }))
    }
  }
]

// Settings real-time subscriptions
export const settingsRealtimeConfig: RealtimeConfig[] = [
  {
    table: 'user_notification_preferences',
    event: '*',
    callback: (payload) => {
      console.log('Notification preferences change:', payload)
      window.dispatchEvent(new CustomEvent('notification-preferences:changed', { detail: payload }))
    }
  },
  {
    table: 'organization_settings',
    event: '*',
    callback: (payload) => {
      console.log('Organization settings change:', payload)
      window.dispatchEvent(new CustomEvent('organization-settings:changed', { detail: payload }))
    }
  },
  {
    table: 'project_settings',
    event: '*',
    callback: (payload) => {
      console.log('Project settings change:', payload)
      window.dispatchEvent(new CustomEvent('project-settings:changed', { detail: payload }))
    }
  }
]

// Combined real-time configuration
export const allRealtimeConfigs = [
  ...goalsRealtimeConfig,
  ...settingsRealtimeConfig
]

// Real-time subscription manager
export class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map()
  private isInitialized = false

  async initialize() {
    if (this.isInitialized) return

    try {
      // Subscribe to all configured tables
      for (const config of allRealtimeConfigs) {
        const channelName = `realtime:${config.table}`
        const channel = supabase.channel(channelName)

        channel
          .on(
            'postgres_changes',
            {
              event: config.event || '*',
              schema: 'public',
              table: config.table,
              filter: config.filter
            } as any,
            config.callback
          )
          .subscribe((status) => {
            console.log(`Realtime subscription ${channelName}:`, status)
          })

        this.channels.set(channelName, channel)
      }

      this.isInitialized = true
      console.log('Real-time subscriptions initialized for goals and settings')
    } catch (error) {
      console.error('Failed to initialize real-time subscriptions:', error)
    }
  }

  async cleanup() {
    for (const [name, channel] of this.channels) {
      await channel.unsubscribe()
      console.log(`Unsubscribed from ${name}`)
    }
    this.channels.clear()
    this.isInitialized = false
  }

  isActive(): boolean {
    return this.isInitialized
  }

  getChannelCount(): number {
    return this.channels.size
  }
}

// Global real-time manager instance
export const realtimeManager = new RealtimeManager()

// Initialize real-time subscriptions when the app starts
if (typeof window !== 'undefined') {
  // Initialize on app start
  realtimeManager.initialize().catch(console.error)

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    realtimeManager.cleanup().catch(console.error)
  })
}
