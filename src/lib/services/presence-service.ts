'use client'

import { supabase } from '@/lib/supabase-client'

export interface PresenceUser {
  id: string
  name: string
  email: string
  avatar_url?: string
  status: 'online' | 'away' | 'offline'
  last_seen: string
  current_page?: string
  current_card?: string
  current_project?: string
  cursor_position?: {
    x: number
    y: number
  }
  typing?: {
    field: string
    timestamp: number
  }
}

export interface PresenceChannel {
  id: string
  name: string
  type: 'project' | 'card' | 'global'
  users: PresenceUser[]
}

class PresenceService {
  private channels: Map<string, any> = new Map()
  private currentUser: PresenceUser | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private cursorUpdateThrottle: ((position: { x: number; y: number }) => void) | null = null

  constructor() {
    this.setupCursorTracking()
    this.setupHeartbeat()
  }

  private setupCursorTracking() {
    let lastUpdate = 0
    const throttleMs = 200

    this.cursorUpdateThrottle = (position: { x: number; y: number }) => {
      const now = Date.now()
      if (now - lastUpdate < throttleMs) return
      lastUpdate = now

      this.broadcastCursorPosition(position)
    }

    // Track mouse movement
    document.addEventListener('mousemove', (e) => {
      this.cursorUpdateThrottle?.({
        x: e.clientX,
        y: e.clientY
      })
    })
  }

  private setupHeartbeat() {
    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat()
    }, 30000)

    // Send heartbeat on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.sendHeartbeat()
      }
    })
  }

  async joinChannel(channelId: string, user: PresenceUser): Promise<void> {
    try {
      this.currentUser = user

      const channel = supabase.channel(`presence:${channelId}`, {
        config: {
          presence: {
            key: user.id,
          },
        },
      })

      // Track presence state
      channel
        .on('presence', { event: 'sync' }, () => {
          console.log('Presence synced:', channel.presenceState())
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('User joined:', key, newPresences)
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('User left:', key, leftPresences)
        })

      // Track cursor position
      channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
        this.handleCursorUpdate(payload)
      })

      // Track typing indicators
      channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
        this.handleTypingUpdate(payload)
      })

      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            name: user.name,
            email: user.email,
            avatar_url: user.avatar_url,
            status: 'online',
            last_seen: new Date().toISOString(),
            current_page: window.location.pathname,
            joined_at: new Date().toISOString()
          })
        }
      })

      this.channels.set(channelId, channel)
    } catch (error) {
      console.error('Failed to join presence channel:', error)
    }
  }

  async leaveChannel(channelId: string): Promise<void> {
    const channel = this.channels.get(channelId)
    if (channel) {
      await channel.unsubscribe()
      this.channels.delete(channelId)
    }
  }

  async updatePresence(channelId: string, updates: Partial<PresenceUser>): Promise<void> {
    const channel = this.channels.get(channelId)
    if (!channel || !this.currentUser) return

    const updatedUser = {
      ...this.currentUser,
      ...updates,
      last_seen: new Date().toISOString()
    }

    this.currentUser = updatedUser

    await channel.track(updatedUser)
  }

  async broadcastCursorPosition(position: { x: number; y: number }): Promise<void> {
    if (!this.currentUser) return

    // Broadcast to all channels
    for (const [channelId, channel] of this.channels) {
      await channel.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          user_id: this.currentUser.id,
          position,
          timestamp: Date.now()
        }
      })
    }
  }

  async broadcastTyping(field: string): Promise<void> {
    if (!this.currentUser) return

    const typingData = {
      user_id: this.currentUser.id,
      field,
      timestamp: Date.now()
    }

    // Broadcast to all channels
    for (const [channelId, channel] of this.channels) {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: typingData
      })
    }

    // Clear typing indicator after 3 seconds
    setTimeout(() => {
      this.clearTypingIndicator()
    }, 3000)
  }

  private async clearTypingIndicator(): Promise<void> {
    if (!this.currentUser) return

    for (const [channelId, channel] of this.channels) {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: this.currentUser.id,
          field: null,
          timestamp: Date.now()
        }
      })
    }
  }

  private handleCursorUpdate(payload: any): void {
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('presence:cursor', {
      detail: payload
    }))
  }

  private handleTypingUpdate(payload: any): void {
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('presence:typing', {
      detail: payload
    }))
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.currentUser) return

    // Update presence in all channels
    for (const [channelId, channel] of this.channels) {
      await this.updatePresence(channelId, {
        status: document.visibilityState === 'visible' ? 'online' : 'away',
        current_page: window.location.pathname
      })
    }
  }

  getCurrentUser(): PresenceUser | null {
    return this.currentUser
  }

  getChannelUsers(channelId: string): PresenceUser[] {
    const channel = this.channels.get(channelId)
    if (!channel) return []

    const presenceState = channel.presenceState()
    return Object.values(presenceState).flat().map((presence: any) => ({
      id: presence.user_id,
      name: presence.name,
      email: presence.email,
      avatar_url: presence.avatar_url,
      status: presence.status || 'online',
      last_seen: presence.last_seen,
      current_page: presence.current_page,
      current_card: presence.current_card,
      current_project: presence.current_project
    }))
  }

  cleanup(): void {
    // Leave all channels
    for (const [channelId] of this.channels) {
      this.leaveChannel(channelId)
    }

    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    // Clear cursor tracking
    this.cursorUpdateThrottle = null
  }
}

// Singleton instance
export const presenceService = new PresenceService()

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    presenceService.cleanup()
  })
}
