/**
 * WhatsApp Session Service
 * Manages conversation context for multi-turn WhatsApp interactions
 * Uses Redis for fast session storage with 30-minute TTL
 */

import { createClient } from 'redis'

// Redis configuration (reuse existing Redis setup)
const REDIS_HOST = process.env.REDIS_HOST || 'redis-16417.fcrce172.us-east-1-1.ec2.cloud.redislabs.com'
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '16417')
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || ''
const REDIS_ENABLED = !!REDIS_PASSWORD

// Session TTL: 30 minutes (matches conversation timeout)
const SESSION_TTL = 30 * 60 // seconds

export interface WhatsAppSession {
  phone: string
  user_id: string
  workspace_id: string | null
  project_id: string | null
  conversation_state: 'idle' | 'awaiting_project' | 'creating_proposal'
  last_message_at: string
  metadata: {
    pending_proposal_id?: string
    last_command?: string
    language?: 'en' | 'es'
    [key: string]: any
  }
}

export interface SessionUpdate {
  workspace_id?: string | null
  project_id?: string | null
  conversation_state?: WhatsAppSession['conversation_state']
  metadata?: Partial<WhatsAppSession['metadata']>
}

class WhatsAppSessionService {
  private redisClient: ReturnType<typeof createClient> | null = null
  private isConnected = false

  /**
   * Initialize Redis connection
   */
  private async getClient() {
    if (!REDIS_ENABLED) {
      throw new Error('Redis is not configured. Set REDIS_PASSWORD in environment.')
    }

    if (this.redisClient && this.isConnected) {
      return this.redisClient
    }

    if (!this.redisClient) {
      this.redisClient = createClient({
        username: 'default',
        password: REDIS_PASSWORD,
        socket: {
          host: REDIS_HOST,
          port: REDIS_PORT,
          connectTimeout: 5000,
        },
      })

      this.redisClient.on('error', (err) => {
        console.error('Redis error:', err)
        this.isConnected = false
      })

      this.redisClient.on('connect', () => {
        this.isConnected = true
      })
    }

    if (!this.isConnected) {
      await this.redisClient.connect()
      this.isConnected = true
    }

    return this.redisClient
  }

  /**
   * Generate Redis key for session
   */
  private getKey(phone: string): string {
    return `whatsapp:session:${phone}`
  }

  /**
   * Get session by phone number
   * Returns null if session doesn't exist or has expired
   */
  async getSession(phone: string): Promise<WhatsAppSession | null> {
    try {
      const client = await this.getClient()
      const key = this.getKey(phone)
      const data = await client.get(key)

      if (!data) {
        return null
      }

      const dataStr = typeof data === 'string' ? data : String(data)
      return JSON.parse(dataStr) as WhatsAppSession
    } catch (error) {
      console.error('Failed to get WhatsApp session:', error)
      return null
    }
  }

  /**
   * Create or update session
   * Automatically extends TTL on each update
   */
  async updateSession(
    phone: string,
    userId: string,
    updates: SessionUpdate
  ): Promise<WhatsAppSession> {
    try {
      const client = await this.getClient()
      const key = this.getKey(phone)

      // Get existing session or create new one
      const existing = await this.getSession(phone)

      const session: WhatsAppSession = {
        phone,
        user_id: userId,
        workspace_id: updates.workspace_id ?? existing?.workspace_id ?? null,
        project_id: updates.project_id ?? existing?.project_id ?? null,
        conversation_state: updates.conversation_state ?? existing?.conversation_state ?? 'idle',
        last_message_at: new Date().toISOString(),
        metadata: {
          ...existing?.metadata,
          ...updates.metadata,
        },
      }

      // Store with 30-minute TTL
      await client.setEx(key, SESSION_TTL, JSON.stringify(session))

      return session
    } catch (error) {
      console.error('Failed to update WhatsApp session:', error)
      throw error
    }
  }

  /**
   * Create new session
   */
  async createSession(
    phone: string,
    userId: string,
    workspaceId?: string,
    projectId?: string
  ): Promise<WhatsAppSession> {
    return this.updateSession(phone, userId, {
      workspace_id: workspaceId ?? null,
      project_id: projectId ?? null,
      conversation_state: 'idle',
    })
  }

  /**
   * End session (delete from Redis)
   */
  async endSession(phone: string): Promise<void> {
    try {
      const client = await this.getClient()
      const key = this.getKey(phone)
      await client.del(key)
    } catch (error) {
      console.error('Failed to end WhatsApp session:', error)
      // Don't throw - ending session is best-effort
    }
  }

  /**
   * Set conversation state
   */
  async setConversationState(
    phone: string,
    userId: string,
    state: WhatsAppSession['conversation_state']
  ): Promise<WhatsAppSession> {
    return this.updateSession(phone, userId, {
      conversation_state: state,
    })
  }

  /**
   * Set workspace context
   */
  async setWorkspace(
    phone: string,
    userId: string,
    workspaceId: string
  ): Promise<WhatsAppSession> {
    return this.updateSession(phone, userId, {
      workspace_id: workspaceId,
    })
  }

  /**
   * Set project context
   */
  async setProject(
    phone: string,
    userId: string,
    projectId: string,
    workspaceId?: string
  ): Promise<WhatsAppSession> {
    return this.updateSession(phone, userId, {
      project_id: projectId,
      workspace_id: workspaceId ?? undefined,
    })
  }

  /**
   * Clear project context (keep workspace)
   */
  async clearProject(phone: string, userId: string): Promise<WhatsAppSession> {
    return this.updateSession(phone, userId, {
      project_id: null,
    })
  }

  /**
   * Update metadata
   */
  async updateMetadata(
    phone: string,
    userId: string,
    metadata: Partial<WhatsAppSession['metadata']>
  ): Promise<WhatsAppSession> {
    return this.updateSession(phone, userId, {
      metadata,
    })
  }

  /**
   * Get session TTL in seconds
   * Returns null if session doesn't exist
   */
  async getSessionTTL(phone: string): Promise<number | null> {
    try {
      const client = await this.getClient()
      const key = this.getKey(phone)
      const ttl = await client.ttl(key)
      const ttlNum = typeof ttl === 'number' ? ttl : Number(ttl)

      if (ttlNum < 0) {
        return null // Key doesn't exist or has no TTL
      }

      return ttlNum
    } catch (error) {
      console.error('Failed to get session TTL:', error)
      return null
    }
  }

  /**
   * Check if session exists and is active
   */
  async hasActiveSession(phone: string): Promise<boolean> {
    const session = await this.getSession(phone)
    return session !== null
  }

  /**
   * Get all active sessions (for debugging/admin)
   * WARNING: O(N) operation, use sparingly
   */
  async getAllActiveSessions(): Promise<WhatsAppSession[]> {
    try {
      const client = await this.getClient()
      const pattern = 'whatsapp:session:*'
      const keys = await client.keys(pattern)

      const sessions: WhatsAppSession[] = []
      for (const key of keys) {
        const data = await client.get(key)
        if (data) {
          const dataStr = typeof data === 'string' ? data : String(data)
          sessions.push(JSON.parse(dataStr))
        }
      }

      return sessions
    } catch (error) {
      console.error('Failed to get all active sessions:', error)
      return []
    }
  }

  /**
   * Cleanup (disconnect Redis)
   */
  async disconnect(): Promise<void> {
    if (this.redisClient && this.isConnected) {
      await this.redisClient.quit()
      this.isConnected = false
    }
  }
}

// Singleton instance
let sessionServiceInstance: WhatsAppSessionService | null = null

/**
 * Get WhatsApp session service instance (singleton)
 */
export function getWhatsAppSessionService(): WhatsAppSessionService {
  if (!sessionServiceInstance) {
    sessionServiceInstance = new WhatsAppSessionService()
  }
  return sessionServiceInstance
}

export default WhatsAppSessionService
