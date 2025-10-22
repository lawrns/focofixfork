import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-client'

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

export interface RealtimePayload<T = any> {
  schema: string
  table: string
  commit_timestamp: string
  eventType: RealtimeEvent
  new: T
  old: T | {}
  errors: null | string[]
}

export interface RealtimeSubscription {
  channel: RealtimeChannel
  unsubscribe: () => void
}

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map()

  /**
   * Subscribe to changes on a specific table
   */
  subscribeToTable<T = any>(
    table: string,
    callback: (payload: RealtimePayload<T>) => void,
    filter?: { column: string; value: string }
  ): RealtimeSubscription {
    const channelName = filter
      ? `${table}:${filter.column}=eq.${filter.value}`
      : `${table}:*`

    // Reuse existing channel if available
    let channel = this.channels.get(channelName)

    if (!channel) {
      channel = supabase.channel(channelName)

      if (filter) {
        channel = channel
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table,
              filter: `${filter.column}=eq.${filter.value}`,
            },
            (payload) => callback(payload as RealtimePayload<T>)
          )
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR') {
              console.warn(`[RealtimeService] Channel error for table '${table}' with filter. Table may not exist or realtime may not be enabled.`)
            } else if (status === 'SUBSCRIBED') {
              console.log(`[RealtimeService] Successfully subscribed to table '${table}' with filter`)
            }
          })
      } else {
        channel = channel
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table,
            },
            (payload) => callback(payload as RealtimePayload<T>)
          )
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR') {
              console.warn(`[RealtimeService] Channel error for table '${table}'. Table may not exist or realtime may not be enabled.`)
            } else if (status === 'SUBSCRIBED') {
              console.log(`[RealtimeService] Successfully subscribed to table '${table}'`)
            }
          })
      }

      this.channels.set(channelName, channel)
    }

    return {
      channel,
      unsubscribe: () => {
        try {
          supabase.removeChannel(channel!)
        } catch (error) {
          console.warn(`[RealtimeService] Error removing channel ${channelName}:`, error)
        }
        this.channels.delete(channelName)
      },
    }
  }

  /**
   * Subscribe to project changes
   */
  subscribeToProject(
    projectId: string,
    callbacks: {
      onProjectUpdate?: (project: any) => void
      onMilestoneChange?: (milestone: any) => void
      onTaskChange?: (task: any) => void
    }
  ): () => void {
    const subscriptions: RealtimeSubscription[] = []

    if (callbacks.onProjectUpdate) {
      subscriptions.push(
        this.subscribeToTable(
          'projects',
          (payload) => {
            if (payload.eventType === 'UPDATE' && payload.new.id === projectId) {
              callbacks.onProjectUpdate?.(payload.new)
            }
          },
          { column: 'id', value: projectId }
        )
      )
    }

    if (callbacks.onMilestoneChange) {
      subscriptions.push(
        this.subscribeToTable(
          'milestones',
          (payload) => {
            if (payload.new.project_id === projectId) {
              callbacks.onMilestoneChange?.(payload.new)
            }
          },
          { column: 'project_id', value: projectId }
        )
      )
    }

    if (callbacks.onTaskChange) {
      subscriptions.push(
        this.subscribeToTable(
          'tasks',
          (payload) => {
            if (payload.new.project_id === projectId) {
              callbacks.onTaskChange?.(payload.new)
            }
          },
          { column: 'project_id', value: projectId }
        )
      )
    }

    // Return cleanup function
    return () => {
      subscriptions.forEach((sub) => sub.unsubscribe())
    }
  }

  /**
   * Subscribe to user presence in a project
   */
  subscribeToPresence(
    projectId: string,
    userId: string,
    userName: string,
    onPresenceChange: (presences: Record<string, any>) => void
  ): () => void {
    const channelName = `presence:project:${projectId}`

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        onPresenceChange(state)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            user_name: userName,
            online_at: new Date().toISOString(),
          })
        }
      })

    this.channels.set(channelName, channel)

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  /**
   * Broadcast a custom event to all subscribers of a channel
   */
  async broadcast(
    channelName: string,
    event: string,
    payload: any
  ): Promise<void> {
    const channel = this.channels.get(channelName)
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event,
        payload,
      })
    }
  }

  /**
   * Clean up all active channels
   */
  cleanup(): void {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel)
    })
    this.channels.clear()
  }
}

export const realtimeService = new RealtimeService()
