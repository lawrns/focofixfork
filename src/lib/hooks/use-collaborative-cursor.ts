'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase-client'
import { CollaborationUser } from '@/lib/models/realtime-collaboration'
import { RealtimeChannel } from '@supabase/supabase-js'

interface CursorBroadcastPayload {
  user_id: string
  cursor_x: number
  cursor_y: number
  page_path: string
  timestamp?: number
}

interface UseCollaborativeCursorOptions {
  entityId: string
  entityType: 'project' | 'task'
  pagePath: string
  currentUserId: string
  currentUserName: string
  currentUserAvatar?: string
}

/**
 * Hook to manage collaborative cursor presence using Supabase Realtime
 * Broadcasts user cursor position and receives other users' cursors
 */
export function useCollaborativeCursor({
  entityId,
  entityType,
  pagePath,
  currentUserId,
  currentUserName,
  currentUserAvatar,
}: UseCollaborativeCursorOptions) {
  const [users, setUsers] = useState<CollaborationUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastCursorBroadcastRef = useRef<number>(0)

  // Initialize presence channel and listeners
  useEffect(() => {
    const channelId = `presence:${entityType}:${entityId}`

    const channel = supabase.channel(channelId, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    })

    channelRef.current = channel

    // Subscribe to presence events
    channel
      .on('presence', { event: 'sync' }, () => {
        updatePresenceUsers()
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences)
        updatePresenceUsers()
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences)
        updatePresenceUsers()
      })
      .on('broadcast', { event: 'cursor_position' }, ({ payload }) => {
        handleCursorBroadcast(payload)
      })

    // Subscribe to channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true)

        // Track current user presence
        await channel.track({
          user_id: currentUserId,
          user_name: currentUserName,
          avatar: currentUserAvatar,
          status: 'online',
          last_seen: new Date().toISOString(),
          page_path: pagePath,
        })

        updatePresenceUsers()
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setIsConnected(false)
      }
    })

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
    }
  }, [entityId, entityType, currentUserId, currentUserName, currentUserAvatar, pagePath])

  // Update presence users from channel state
  const updatePresenceUsers = useCallback(() => {
    if (!channelRef.current) return

    const presenceState = channelRef.current.presenceState()
    const usersList: CollaborationUser[] = []

    Object.values(presenceState).forEach((presences: any[]) => {
      presences.forEach((presence: any) => {
        usersList.push({
          user_id: presence.user_id,
          user_name: presence.user_name,
          avatar: presence.avatar,
          status: presence.status || 'online',
          last_seen: presence.last_seen,
          cursor_position: presence.cursor_position,
          color: generateUserColor(presence.user_id),
        })
      })
    })

    setUsers(usersList)
  }, [])

  // Handle incoming cursor position broadcasts
  const handleCursorBroadcast = useCallback(
    (payload: any) => {
      if (payload.user_id === currentUserId) return // Ignore own cursor

      setUsers((prevUsers) =>
        prevUsers.map((user) => {
          if (user.user_id === payload.user_id) {
            return {
              ...user,
              cursor_position: {
                line: Math.floor(payload.cursor_y / 20), // Approximate line from Y
                column: Math.floor(payload.cursor_x / 8), // Approximate column from X
                offset: Math.floor(payload.cursor_y / 20) * 80 + Math.floor(payload.cursor_x / 8),
              },
              last_seen: new Date().toISOString(),
            }
          }
          return user
        })
      )
    },
    [currentUserId]
  )

  // Broadcast cursor position
  const broadcastCursor = useCallback(
    (payload: CursorBroadcastPayload) => {
      if (!channelRef.current || !isConnected) return

      // Throttle broadcasts to avoid excessive updates
      const now = Date.now()
      if (now - lastCursorBroadcastRef.current < 100) return
      lastCursorBroadcastRef.current = now

      // Update own presence with cursor position
      channelRef.current.track({
        user_id: currentUserId,
        user_name: currentUserName,
        avatar: currentUserAvatar,
        status: 'online',
        last_seen: new Date().toISOString(),
        page_path: pagePath,
        cursor_position: {
          line: Math.floor(payload.cursor_y / 20),
          column: Math.floor(payload.cursor_x / 8),
          offset: Math.floor(payload.cursor_y / 20) * 80 + Math.floor(payload.cursor_x / 8),
        },
      })

      // Broadcast cursor event to all subscribers
      channelRef.current.send({
        type: 'broadcast',
        event: 'cursor_position',
        payload: {
          user_id: currentUserId,
          cursor_x: payload.cursor_x,
          cursor_y: payload.cursor_y,
          page_path: payload.page_path,
          timestamp: payload.timestamp || Date.now(),
        },
      })
    },
    [currentUserId, currentUserName, currentUserAvatar, pagePath, isConnected]
  )

  return {
    users,
    isConnected,
    broadcastCursor,
  }
}

/**
 * Generate consistent color for user based on user_id
 */
function generateUserColor(userId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ]

  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}
