'use client'

import { useEffect, useRef, useCallback, useState, useMemo, useReducer } from 'react'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-client'
import { audioService } from '@/lib/audio/audio-service'
import { reportChannelStatus, removeChannel } from './use-connection-health'
import { AccessibilityService } from '@/lib/accessibility/accessibility'
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

    // Require at least one valid context parameter (non-empty string)
    const hasValidContext =
      (options.projectId && options.projectId.trim() !== '') ||
      (options.organizationId && options.organizationId.trim() !== '') ||
      (options.userId && options.userId.trim() !== '')

    if (!hasValidContext) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[useRealtime] No valid context provided (projectId, organizationId, or userId), skipping subscription')
      }
      return
    }

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
            table: 'work_items',
            filter: `project_id=eq.${options.projectId}`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            // World-class sensory feedback for remote task updates
            audioService.play('sync');
            const data = (payload.new || payload.old) as any;
            AccessibilityService.announce(`Task ${payload.eventType === 'INSERT' ? 'created' : payload.eventType === 'UPDATE' ? 'updated' : 'deleted'}: ${data?.title || 'Unknown'}`);
            
            callbackRef.current({
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
              table: 'work_items',
              schema: 'public'
            })
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'milestones',
            filter: `project_id=eq.${options.projectId}`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            // World-class sensory feedback for remote updates
            audioService.play('sync');
            AccessibilityService.announce(`Milestone ${payload.eventType === 'INSERT' ? 'created' : payload.eventType === 'UPDATE' ? 'updated' : 'deleted'}`);
            
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
            table: 'foco_projects',
            filter: `workspace_id=eq.${options.organizationId}`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            // World-class sensory feedback for remote updates
            audioService.play('sync');
            AccessibilityService.announce(`Project ${payload.eventType === 'INSERT' ? 'created' : payload.eventType === 'UPDATE' ? 'updated' : 'deleted'}`);
            
            callbackRef.current({
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
              table: 'foco_projects',
              schema: 'public'
            })
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'workspace_members',
            filter: `workspace_id=eq.${options.organizationId}`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            // World-class sensory feedback for remote updates
            audioService.play('sync');
            AccessibilityService.announce(`Organization member ${payload.eventType === 'INSERT' ? 'added' : payload.eventType === 'UPDATE' ? 'updated' : 'removed'}`);
            
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

    // DISABLED: Global projects subscription
    // This was causing "realtime:global" channel errors because it subscribed to the entire
    // projects table without filters. Components should use organization-specific or
    // project-specific subscriptions instead for better performance and reliability.
    // The early return above (lines 42-48) now prevents this code from ever executing.
    /*
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
    */

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
        reportChannelStatus(channelName, 'offline')
        console.error(`[useRealtime] Channel subscription error for ${channelName}`, {
          channelName,
          projectId: options.projectId,
          organizationId: options.organizationId,
          userId: options.userId,
          status
        })
      } else if (status === 'SUBSCRIBED') {
        reportChannelStatus(channelName, 'online')
        if (process.env.NODE_ENV === 'development') {
          console.log(`[useRealtime] Successfully subscribed to ${channelName}`, {
            channelName,
            projectId: options.projectId,
            organizationId: options.organizationId,
            userId: options.userId
          })
        }
      } else if (status === 'TIMED_OUT') {
        reportChannelStatus(channelName, 'reconnecting')
        console.warn(`[useRealtime] Channel subscription timed out for ${channelName}`, {
          channelName,
          projectId: options.projectId,
          organizationId: options.organizationId,
          userId: options.userId
        })
      } else if (status === 'CLOSED') {
        removeChannel(channelName)
        if (process.env.NODE_ENV === 'development') {
          console.log(`[useRealtime] Channel closed for ${channelName}`)
        }
      }
    })

    channelRef.current = channel
  }, [options])

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      // Clean up connection health tracking
      const name = (channelRef.current as any).topic ?? ''
      if (name) removeChannel(name)
      try {
        supabase.removeChannel(channelRef.current)
      } catch (error) {
        console.warn('[useRealtime] Error removing channel:', error)
      }
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

// ─── Optimistic update helper ───────────────────────────────────────────────
//
// Wraps a Supabase mutation so the UI updates instantly, then rolls back
// if the server request fails. Works with any array-of-records state.
//
// Usage:
//   const { items, applyOptimistic } = useOptimisticList<WorkItem>(initialItems)
//   applyOptimistic(
//     (draft) => draft.map(i => i.id === id ? { ...i, status: 'done' } : i),
//     () => supabase.from('work_items').update({ status: 'done' }).eq('id', id)
//   )

type OptimisticAction<T> =
  | { type: 'set'; items: T[] }
  | { type: 'optimistic'; items: T[]; rollback: T[] }
  | { type: 'commit' }
  | { type: 'rollback' }

function optimisticReducer<T>(
  state: { items: T[]; pending: T[] | null },
  action: OptimisticAction<T>
): { items: T[]; pending: T[] | null } {
  switch (action.type) {
    case 'set':
      return { items: action.items, pending: null }
    case 'optimistic':
      return { items: action.items, pending: action.rollback }
    case 'commit':
      return { ...state, pending: null }
    case 'rollback':
      return { items: state.pending ?? state.items, pending: null }
  }
}

export function useOptimisticList<T>(initial: T[] = []) {
  const [state, dispatch] = useReducer(optimisticReducer<T>, {
    items: initial,
    pending: null,
  })

  // Sync when the source-of-truth changes (e.g. new fetch / realtime push)
  const setItems = useCallback((items: T[]) => {
    dispatch({ type: 'set', items })
  }, [])

  const applyOptimistic = useCallback(
    async (
      updater: (current: T[]) => T[],
      mutation: () => Promise<{ error?: any }>
    ) => {
      const rollback = state.items
      dispatch({ type: 'optimistic', items: updater(state.items), rollback })
      try {
        const { error } = await mutation()
        if (error) {
          dispatch({ type: 'rollback' })
        } else {
          dispatch({ type: 'commit' })
        }
      } catch {
        dispatch({ type: 'rollback' })
      }
    },
    [state.items]
  )

  return {
    items: state.items as T[],
    isPending: state.pending !== null,
    setItems,
    applyOptimistic,
  }
}

function getEventTypeFromPayload(payload: RealtimeEventPayload): RealTimeEvent['event_type'] {
  const { table, eventType } = payload

  switch (table) {
    case 'milestones':
      return eventType === 'INSERT' ? 'milestone_created' :
             eventType === 'UPDATE' ? 'milestone_updated' :
             'milestone_deleted'
    case 'foco_projects':
      return 'project_updated'
    case 'milestone_comments':
      return eventType === 'INSERT' ? 'comment_added' : 'comment_deleted'
    case 'milestone_labels':
      return eventType === 'INSERT' ? 'label_added' : 'label_removed'
    default:
      return 'organization_updated'
  }
}
