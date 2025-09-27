/**
 * Real-time Collaboration Entity Models
 * Defines the structure and operations for collaborative editing
 */

export type CollaborationEntityType = 'project' | 'milestone' | 'task' | 'comment' | 'time_entry'

export type OperationType = 'insert' | 'delete' | 'update'

export type PresenceStatus = 'online' | 'away' | 'offline'

export interface OperationalTransform {
  id: string
  entity_type: CollaborationEntityType
  entity_id: string
  operation: OperationType
  path: string[] // Path to the field being modified (e.g., ['description'], ['name'])
  old_value: any
  new_value: any
  position?: number // For text operations
  length?: number // For text operations
  version: number
  client_id: string
  user_id: string
  timestamp: string
}

export interface CollaborationSession {
  id: string
  entity_type: CollaborationEntityType
  entity_id: string
  active_users: CollaborationUser[]
  last_activity: string
  version: number
  created_at: string
}

export interface CollaborationUser {
  user_id: string
  user_name: string
  avatar?: string
  status: PresenceStatus
  last_seen: string
  cursor_position?: CursorPosition
  selection?: TextSelection
  color: string // For user identification in UI
}

export interface CursorPosition {
  line: number
  column: number
  offset: number
}

export interface TextSelection {
  start: CursorPosition
  end: CursorPosition
  direction: 'forward' | 'backward' | 'none'
}

export interface CollaborationEvent {
  type: 'operation' | 'presence' | 'cursor' | 'selection' | 'join' | 'leave'
  session_id: string
  user_id: string
  data: any
  timestamp: string
}

export interface ConflictResolution {
  operation_id: string
  conflicting_operations: string[]
  resolution: 'accept' | 'reject' | 'merge'
  resolved_operation?: OperationalTransform
  timestamp: string
}

export interface CollaborativeDocument {
  id: string
  entity_type: CollaborationEntityType
  entity_id: string
  content: Record<string, any>
  version: number
  last_modified: string
  last_modified_by: string
  collaborators: string[]
  lock_status: 'unlocked' | 'locked'
  locked_by?: string
  lock_expires_at?: string
}

export class OperationalTransformModel {
  /**
   * Apply operational transformation to resolve conflicts
   */
  static transformOperation(
    operation: OperationalTransform,
    concurrentOperations: OperationalTransform[]
  ): OperationalTransform {
    let transformedOp = { ...operation }

    // Sort concurrent operations by timestamp
    const sortedOps = concurrentOperations
      .filter(op => op.timestamp < operation.timestamp)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))

    // Apply each concurrent operation's transformation
    for (const concurrentOp of sortedOps) {
      transformedOp = this.transformAgainst(transformedOp, concurrentOp)
    }

    return transformedOp
  }

  /**
   * Transform one operation against another
   */
  private static transformAgainst(
    op1: OperationalTransform,
    op2: OperationalTransform
  ): OperationalTransform {
    // If operations don't affect the same path, no transformation needed
    if (!this.pathsOverlap(op1.path, op2.path)) {
      return op1
    }

    // Handle text operations (insert/delete)
    if (this.isTextOperation(op1) && this.isTextOperation(op2)) {
      return this.transformTextOperation(op1, op2)
    }

    // Handle field updates
    if (this.isFieldUpdate(op1) && this.isFieldUpdate(op2)) {
      return this.transformFieldUpdate(op1, op2)
    }

    // Default: keep op1 as-is (last-write-wins for conflicting operations)
    return op1
  }

  /**
   * Check if two operation paths overlap
   */
  private static pathsOverlap(path1: string[], path2: string[]): boolean {
    const minLength = Math.min(path1.length, path2.length)
    for (let i = 0; i < minLength; i++) {
      if (path1[i] !== path2[i]) return false
    }
    return true
  }

  /**
   * Check if operation is a text operation
   */
  private static isTextOperation(op: OperationalTransform): boolean {
    return op.operation === 'insert' || op.operation === 'delete'
  }

  /**
   * Check if operation is a field update
   */
  private static isFieldUpdate(op: OperationalTransform): boolean {
    return op.operation === 'update' && typeof op.position === 'undefined'
  }

  /**
   * Transform text operations (insert/delete)
   */
  private static transformTextOperation(
    op1: OperationalTransform,
    op2: OperationalTransform
  ): OperationalTransform {
    const pos1 = op1.position || 0
    const pos2 = op2.position || 0
    const len2 = op2.length || 0

    let newPos1 = pos1

    if (op2.operation === 'insert' && pos2 <= pos1) {
      // op2 inserts before op1's position, shift op1
      newPos1 += len2
    } else if (op2.operation === 'delete' && pos2 < pos1) {
      // op2 deletes before op1's position
      if (pos2 + len2 <= pos1) {
        // Delete is entirely before op1, shift op1 left
        newPos1 -= len2
      } else {
        // Delete overlaps with op1's position
        // This is a complex case - for simplicity, we'll handle it by rejecting the operation
        throw new Error('Conflicting text operations detected')
      }
    }

    return {
      ...op1,
      position: newPos1
    }
  }

  /**
   * Transform field updates
   */
  private static transformFieldUpdate(
    op1: OperationalTransform,
    op2: OperationalTransform
  ): OperationalTransform {
    // For field updates, last-write-wins
    // If op2 came after op1 but we're transforming op1 against op2,
    // it means op2 should win
    return op1
  }

  /**
   * Create an operational transform from a change
   */
  static createOperation(
    entityType: CollaborationEntityType,
    entityId: string,
    operation: OperationType,
    path: string[],
    oldValue: any,
    newValue: any,
    userId: string,
    clientId: string,
    position?: number,
    length?: number
  ): OperationalTransform {
    return {
      id: `${clientId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entity_type: entityType,
      entity_id: entityId,
      operation,
      path,
      old_value: oldValue,
      new_value: newValue,
      position,
      length,
      version: 1,
      client_id: clientId,
      user_id: userId,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Apply operation to document content
   */
  static applyOperation(content: Record<string, any>, operation: OperationalTransform): Record<string, any> {
    const newContent = { ...content }

    if (operation.operation === 'update') {
      this.setNestedValue(newContent, operation.path, operation.new_value)
    } else if (operation.operation === 'insert' && operation.position !== undefined) {
      // For text operations, the path should point to the text field
      const textField = this.getNestedValue(newContent, operation.path)
      if (typeof textField === 'string' && operation.new_value) {
        const before = textField.substring(0, operation.position)
        const after = textField.substring(operation.position)
        this.setNestedValue(newContent, operation.path, before + operation.new_value + after)
      }
    } else if (operation.operation === 'delete' && operation.position !== undefined && operation.length) {
      // For text operations, the path should point to the text field
      const textField = this.getNestedValue(newContent, operation.path)
      if (typeof textField === 'string') {
        const before = textField.substring(0, operation.position)
        const after = textField.substring(operation.position + operation.length)
        this.setNestedValue(newContent, operation.path, before + after)
      }
    }

    return newContent
  }

  /**
   * Get nested value from object
   */
  private static getNestedValue(obj: Record<string, any>, path: string[]): any {
    return path.reduce((current, key) => current?.[key], obj)
  }

  /**
   * Set nested value in object
   */
  private static setNestedValue(obj: Record<string, any>, path: string[], value: any): void {
    const lastKey = path[path.length - 1]
    const parentPath = path.slice(0, -1)

    const parent = parentPath.length > 0 ?
      parentPath.reduce((current, key) => {
        if (!current[key] || typeof current[key] !== 'object') {
          current[key] = {}
        }
        return current[key]
      }, obj) : obj

    parent[lastKey] = value
  }
}

export class CollaborationSessionModel {
  /**
   * Generate a unique color for user identification
   */
  static generateUserColor(userId: string): string {
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

  /**
   * Check if user has permission to collaborate on entity
   */
  static canCollaborate(
    userId: string,
    userRole: string,
    entityType: CollaborationEntityType,
    entityPermissions: any
  ): boolean {
    // Basic permission check - can be extended based on entity type
    return entityPermissions?.can_edit || ['director', 'lead'].includes(userRole)
  }

  /**
   * Get presence status based on last activity
   */
  static getPresenceStatus(lastSeen: string): PresenceStatus {
    const lastSeenDate = new Date(lastSeen)
    const now = new Date()
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60)

    if (diffMinutes < 2) return 'online'
    if (diffMinutes < 10) return 'away'
    return 'offline'
  }

  /**
   * Transform raw database response to CollaborationUser
   */
  static fromDatabase(data: any): CollaborationUser {
    return {
      user_id: data.user_id,
      user_name: data.user_name,
      avatar: data.avatar,
      status: data.status || 'online',
      last_seen: data.last_seen,
      cursor_position: data.cursor_position,
      selection: data.selection,
      color: data.color || this.generateUserColor(data.user_id)
    }
  }
}


