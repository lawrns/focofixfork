import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'
import {
  OperationalTransform,
  CollaborationSession,
  CollaborationUser,
  CollaborationEvent,
  CollaborativeDocument,
  OperationalTransformModel,
  CollaborationSessionModel,
  CollaborationEntityType,
  PresenceStatus
} from '@/lib/models/realtime-collaboration'

// Re-export types for convenience
export type { OperationalTransform }

export interface CollaborationState {
  session: CollaborationSession | null
  document: CollaborativeDocument | null
  users: CollaborationUser[]
  pendingOperations: OperationalTransform[]
  isConnected: boolean
  lastSyncVersion: number
}

export class RealtimeCollaborationService {
  private channel: RealtimeChannel | null = null
  private clientId: string
  private userId: string
  private userName: string
  private userColor: string
  private state: CollaborationState
  private onStateChange?: (state: CollaborationState) => void
  private onOperation?: (operation: OperationalTransform) => void
  private onPresenceChange?: (users: CollaborationUser[]) => void

  constructor(
    userId: string,
    userName: string,
    onStateChange?: (state: CollaborationState) => void,
    onOperation?: (operation: OperationalTransform) => void,
    onPresenceChange?: (users: CollaborationUser[]) => void
  ) {
    this.clientId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.userId = userId
    this.userName = userName
    this.userColor = CollaborationSessionModel.generateUserColor(userId)
    this.onStateChange = onStateChange
    this.onOperation = onOperation
    this.onPresenceChange = onPresenceChange

    this.state = {
      session: null,
      document: null,
      users: [],
      pendingOperations: [],
      isConnected: false,
      lastSyncVersion: 0
    }
  }

  /**
   * Join a collaboration session for an entity
   */
  async joinSession(
    entityType: CollaborationEntityType,
    entityId: string
  ): Promise<void> {
    try {
      // Leave any existing session
      await this.leaveSession()

      const sessionId = `session_${entityType}_${entityId}`

      // Join the real-time channel
      this.channel = supabase.channel(sessionId, {
        config: {
          presence: {
            key: this.userId
          }
        }
      })

      // Set up presence tracking
      this.channel
        .on('presence', { event: 'sync' }, () => {
          this.handlePresenceSync()
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          this.handlePresenceJoin(key, newPresences)
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          this.handlePresenceLeave(key, leftPresences)
        })

      // Set up broadcast events for operations
      this.channel
        .on('broadcast', { event: 'operation' }, ({ payload }) => {
          this.handleIncomingOperation(payload)
        })
        .on('broadcast', { event: 'cursor' }, ({ payload }) => {
          this.handleCursorUpdate(payload)
        })
        .on('broadcast', { event: 'selection' }, ({ payload }) => {
          this.handleSelectionUpdate(payload)
        })

      // Subscribe to the channel
      await this.channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          this.state.isConnected = true

          // Track our presence
          await this.channel!.track({
            user_id: this.userId,
            user_name: this.userName,
            avatar: undefined, // TODO: Add user avatar
            status: 'online' as PresenceStatus,
            last_seen: new Date().toISOString(),
            color: this.userColor
          })

          // Load or create session
          await this.loadSession(entityType, entityId)

          this.notifyStateChange()
        }
      })

    } catch (error) {
      console.error('Failed to join collaboration session:', error)
      throw error
    }
  }

  /**
   * Leave the current collaboration session
   */
  async leaveSession(): Promise<void> {
    if (this.channel) {
      await this.channel.untrack()
      await supabase.removeChannel(this.channel)
      this.channel = null
    }

    this.state = {
      session: null,
      document: null,
      users: [],
      pendingOperations: [],
      isConnected: false,
      lastSyncVersion: 0
    }

    this.notifyStateChange()
  }

  /**
   * Apply an operational transform
   */
  async applyOperation(
    operation: Omit<OperationalTransform, 'id' | 'client_id' | 'user_id' | 'timestamp' | 'version'>
  ): Promise<void> {
    if (!this.state.session || !this.channel) return

    const fullOperation: OperationalTransform = {
      ...operation,
      id: `${this.clientId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      client_id: this.clientId,
      user_id: this.userId,
      timestamp: new Date().toISOString(),
      version: this.state.lastSyncVersion + 1
    }

    // Transform against pending operations
    const transformedOperation = OperationalTransformModel.transformOperation(
      fullOperation,
      this.state.pendingOperations
    )

    // Add to pending operations
    this.state.pendingOperations.push(transformedOperation)
    this.state.lastSyncVersion = transformedOperation.version

    // Apply locally first (optimistic update)
    if (this.state.document) {
      this.state.document.content = OperationalTransformModel.applyOperation(
        this.state.document.content,
        transformedOperation
      )
      this.state.document.version = transformedOperation.version
      this.state.document.last_modified = transformedOperation.timestamp
      this.state.document.last_modified_by = this.userId
    }

    // Broadcast to other users
    await this.channel.send({
      type: 'broadcast',
      event: 'operation',
      payload: transformedOperation
    })

    // Save to database
    try {
      await this.saveOperation(transformedOperation)
    } catch (error) {
      console.error('Failed to save operation:', error)
      // TODO: Handle save failure (rollback optimistic update)
    }

    this.notifyStateChange()
    this.onOperation?.(transformedOperation)
  }

  /**
   * Update cursor position
   */
  async updateCursor(position: { line: number; column: number; offset: number }): Promise<void> {
    if (!this.channel) return

    await this.channel.send({
      type: 'broadcast',
      event: 'cursor',
      payload: {
        user_id: this.userId,
        position,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Update text selection
   */
  async updateSelection(selection: { start: any; end: any; direction: string }): Promise<void> {
    if (!this.channel) return

    await this.channel.send({
      type: 'broadcast',
      event: 'selection',
      payload: {
        user_id: this.userId,
        selection,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Get current collaboration state
   */
  getState(): CollaborationState {
    return { ...this.state }
  }

  /**
   * Handle incoming operation from another user
   */
  private async handleIncomingOperation(operation: OperationalTransform): Promise<void> {
    if (operation.client_id === this.clientId) return // Ignore our own operations

    // Transform the incoming operation against our pending operations
    const transformedOperation = OperationalTransformModel.transformOperation(
      operation,
      this.state.pendingOperations
    )

    // Apply the operation
    if (this.state.document) {
      this.state.document.content = OperationalTransformModel.applyOperation(
        this.state.document.content,
        transformedOperation
      )
      this.state.document.version = Math.max(this.state.document.version, transformedOperation.version)
      this.state.lastSyncVersion = Math.max(this.state.lastSyncVersion, transformedOperation.version)
    }

    this.notifyStateChange()
    this.onOperation?.(transformedOperation)
  }

  /**
   * Handle presence synchronization
   */
  private handlePresenceSync(): void {
    if (!this.channel) return

    const presenceState = this.channel.presenceState()
    const users: CollaborationUser[] = []

    Object.values(presenceState).forEach((presences: any) => {
      presences.forEach((presence: any) => {
        users.push(CollaborationSessionModel.fromDatabase(presence))
      })
    })

    this.state.users = users
    this.notifyStateChange()
    this.onPresenceChange?.(users)
  }

  /**
   * Handle user joining
   */
  private handlePresenceJoin(key: string, newPresences: any[]): void {
    // Presence sync will handle this
  }

  /**
   * Handle user leaving
   */
  private handlePresenceLeave(key: string, leftPresences: any[]): void {
    // Presence sync will handle this
  }

  /**
   * Handle cursor position update
   */
  private handleCursorUpdate(payload: any): void {
    const { user_id, position } = payload

    this.state.users = this.state.users.map(user =>
      user.user_id === user_id
        ? { ...user, cursor_position: position, last_seen: new Date().toISOString() }
        : user
    )

    this.notifyStateChange()
  }

  /**
   * Handle text selection update
   */
  private handleSelectionUpdate(payload: any): void {
    const { user_id, selection } = payload

    this.state.users = this.state.users.map(user =>
      user.user_id === user_id
        ? { ...user, selection, last_seen: new Date().toISOString() }
        : user
    )

    this.notifyStateChange()
  }

  /**
   * Load or create collaboration session
   */
  private async loadSession(entityType: CollaborationEntityType, entityId: string): Promise<void> {
    try {
      // Since collaborative_documents table doesn't exist, create in-memory document
      this.state.document = {
        id: `doc_${entityType}_${entityId}`,
        entity_type: entityType,
        entity_id: entityId,
        content: {},
        version: 1,
        last_modified: new Date().toISOString(),
        last_modified_by: this.userId,
        collaborators: [this.userId],
        lock_status: 'unlocked',
        locked_by: undefined,
        lock_expires_at: undefined
      }

      // Create session object
      this.state.session = {
        id: `session_${entityType}_${entityId}`,
        entity_type: entityType,
        entity_id: entityId,
        active_users: this.state.users,
        last_activity: new Date().toISOString(),
        version: this.state.document.version,
        created_at: new Date().toISOString()
      }

      this.state.lastSyncVersion = this.state.document.version

    } catch (error) {
      console.error('Failed to load/create collaboration session:', error)
      throw error
    }
  }

  /**
   * Save operation to database (disabled - tables don't exist)
   */
  private async saveOperation(operation: OperationalTransform): Promise<void> {
    // Since operational_transforms and collaborative_documents tables don't exist,
    // operations are only kept in memory for the session
    console.warn('Operation persistence disabled - database tables not found')
  }

  /**
   * Notify state change listeners
   */
  private notifyStateChange(): void {
    this.onStateChange?.(this.getState())
  }
}
