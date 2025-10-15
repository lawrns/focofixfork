'use client'

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-client'
import type { RealTimeEvent } from '@/lib/models/real-time-events'

export interface RealtimeOptions {
  projectId?: string
  milestoneId?: string
  organizationId?: string
  userId?: string
  eventTypes?: string[]
  enabled?: boolean
}

export interface RealtimeEventPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: any
  old: any
  table: string
  schema: string
}

export type RealtimeCallback = (payload: RealtimeEventPayload) => void

export function useRealtime(
  options: RealtimeOptions,
  callback: RealtimeCallback
) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const callbackRef = useRef(callback)

  // Keep callback reference updated
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const subscribe = useCallback(() => {
    if (!options.enabled) return

    // Create a unique channel name based on the options
    const channelName = `realtime:${
      options.projectId || options.organizationId || options.userId || 'global'
    }`

    const channel = supabase.channel(channelName)

    // Subscribe to different tables based on options
    if (options.projectId) {
      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'milestones',
            filter: `project_id=eq.${options.projectId}`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            callbackRef.current({
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
              table: 'milestones',
              schema: 'public'
            })
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'real_time_events',
            filter: `milestone_id=in.(${options.projectId})`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            callbackRef.current({
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
              table: 'real_time_events',
              schema: 'public'
            })
          }
        )
    }

    if (options.milestoneId) {
      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'milestone_comments',
            filter: `milestone_id=eq.${options.milestoneId}`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            callbackRef.current({
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
              table: 'milestone_comments',
              schema: 'public'
            })
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'milestone_labels',
            filter: `milestone_id=eq.${options.milestoneId}`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            callbackRef.current({
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
              table: 'milestone_labels',
              schema: 'public'
            })
          }
        )
    }

    if (options.organizationId) {
      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'projects',
            filter: `organization_id=eq.${options.organizationId}`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            callbackRef.current({
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
              table: 'projects',
              schema: 'public'
            })
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'organization_members',
            filter: `organization_id=eq.${options.organizationId}`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            callbackRef.current({
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
              table: 'organization_members',
              schema: 'public'
            })
          }
        )
    }

    // Global projects subscription when no specific filters are provided
    // Note: This creates a global subscription that may conflict with organization-specific ones
    // Consider using organization-specific subscriptions instead for better consistency
    if (options.enabled && !options.projectId && !options.organizationId && !options.userId) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          callbackRef.current({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            table: 'projects',
            schema: 'public'
          })
        }
      )
    }

    // DISABLED: Global real-time events subscription
    // The 'real_time_events' table does not exist in the current database schema
    // Uncomment when the table is created and realtime is enabled for it
    /*
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'real_time_events'
      },
      (payload: RealtimePostgresChangesPayload<any>) => {
        callbackRef.current({
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
          table: 'real_time_events',
          schema: 'public'
        })
      }
    )
    */

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        // Only log in development - realtime may not be enabled for all tables in production
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[useRealtime] Channel subscription error for ${channelName}. This may be due to missing tables or realtime not being enabled.`)
        }
      } else if (status === 'SUBSCRIBED') {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[useRealtime] Successfully subscribed to ${channelName}`)
        }
      }
    })

    channelRef.current = channel
  }, [options])

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [])

  useEffect(() => {
    subscribe()

    return () => {
      unsubscribe()
    }
  }, [subscribe, unsubscribe])

  return {
    subscribe,
    unsubscribe,
    isSubscribed: !!channelRef.current
  }
}

// Specialized hooks for specific use cases

export function useProjectRealtime(projectId: string, callback: RealtimeCallback, enabled = true) {
  const options = useMemo(() => ({ projectId, enabled }), [projectId, enabled])
  return useRealtime(options, callback)
}

export function useMilestoneRealtime(milestoneId: string, callback: RealtimeCallback, enabled = true) {
  const options = useMemo(() => ({ milestoneId, enabled }), [milestoneId, enabled])
  return useRealtime(options, callback)
}

export function useOrganizationRealtime(organizationId: string, callback: RealtimeCallback, enabled = true) {
  const options = useMemo(() => ({ organizationId, enabled }), [organizationId, enabled])
  return useRealtime(options, callback)
}

export function useGlobalRealtime(callback: RealtimeCallback, enabled = true) {
  const options = useMemo(() => ({ enabled }), [enabled])
  return useRealtime(options, callback)
}

// Hook for activity feed
export function useActivityFeed(options: RealtimeOptions = {}) {
  const [events, setEvents] = useState<RealTimeEvent[]>([])

  const handleRealtimeEvent = useCallback((payload: RealtimeEventPayload) => {
    if (payload.table === 'real_time_events') {
      if (payload.eventType === 'INSERT') {
        setEvents(prev => [payload.new, ...prev].slice(0, 50)) // Keep latest 50 events
      }
    } else {
      // Generate activity events for other table changes
      const activityEvent: RealTimeEvent = {
        id: `activity-${Date.now()}`,
        milestone_id: payload.new?.id || payload.old?.id || '',
        user_id: payload.new?.created_by || payload.old?.created_by || '',
        event_type: getEventTypeFromPayload(payload),
        data: {
          table: payload.table,
          changes: {
            old: payload.old,
            new: payload.new
          }
        },
        created_at: new Date().toISOString()
      }

      setEvents(prev => [activityEvent, ...prev].slice(0, 50))
    }
  }, [])

  const { isSubscribed } = useRealtime(options, handleRealtimeEvent)

  return {
    events,
    isSubscribed,
    clearEvents: () => setEvents([])
  }
}

function getEventTypeFromPayload(payload: RealtimeEventPayload): RealTimeEvent['event_type'] {
  const { table, eventType } = payload

  switch (table) {
    case 'milestones':
      return eventType === 'INSERT' ? 'milestone_created' :
             eventType === 'UPDATE' ? 'milestone_updated' :
             'milestone_deleted'
    case 'projects':
      return 'project_updated'
    case 'milestone_comments':
      return eventType === 'INSERT' ? 'comment_added' : 'comment_deleted'
    case 'milestone_labels':
      return eventType === 'INSERT' ? 'label_added' : 'label_removed'
    default:
      return 'organization_updated'
  }
}
