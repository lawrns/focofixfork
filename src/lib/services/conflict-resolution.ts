import { supabase } from '@/lib/supabase'

export interface ConflictResolutionOptions {
  strategy: 'server-wins' | 'client-wins' | 'merge' | 'manual'
  onConflict?: (conflict: ConflictData) => Promise<ResolutionResult>
  mergeStrategy?: (serverData: any, clientData: any) => any
}

export interface ConflictData {
  id: string
  table: string
  serverData: any
  clientData: any
  timestamp: Date
  userId: string
}

export interface ResolutionResult {
  resolvedData: any
  strategy: string
  accepted: boolean
}

export class ConflictResolutionService {
  private static conflictHandlers = new Map<string, ConflictResolutionOptions>()

  /**
   * Register a conflict resolution strategy for a table
   */
  static registerHandler(table: string, options: ConflictResolutionOptions) {
    this.conflictHandlers.set(table, options)
  }

  /**
   * Unregister a conflict resolution handler
   */
  static unregisterHandler(table: string) {
    this.conflictHandlers.delete(table)
  }

  /**
   * Resolve a conflict using the registered strategy
   */
  static async resolveConflict(conflict: ConflictData): Promise<ResolutionResult> {
    const handler = this.conflictHandlers.get(conflict.table)

    if (!handler) {
      // Default to server-wins strategy
      return {
        resolvedData: conflict.serverData,
        strategy: 'server-wins',
        accepted: true
      }
    }

    switch (handler.strategy) {
      case 'server-wins':
        return {
          resolvedData: conflict.serverData,
          strategy: 'server-wins',
          accepted: true
        }

      case 'client-wins':
        return {
          resolvedData: conflict.clientData,
          strategy: 'client-wins',
          accepted: true
        }

      case 'merge':
        if (handler.mergeStrategy) {
          const mergedData = handler.mergeStrategy(conflict.serverData, conflict.clientData)
          return {
            resolvedData: mergedData,
            strategy: 'merge',
            accepted: true
          }
        } else {
          // Default merge strategy: combine objects, preferring non-null values
          const mergedData = this.defaultMerge(conflict.serverData, conflict.clientData)
          return {
            resolvedData: mergedData,
            strategy: 'merge',
            accepted: true
          }
        }

      case 'manual':
        if (handler.onConflict) {
          return await handler.onConflict(conflict)
        } else {
          // Fall back to server-wins if no manual handler
          return {
            resolvedData: conflict.serverData,
            strategy: 'server-wins',
            accepted: true
          }
        }

      default:
        return {
          resolvedData: conflict.serverData,
          strategy: 'server-wins',
          accepted: true
        }
    }
  }

  /**
   * Default merge strategy for objects
   */
  private static defaultMerge(serverData: any, clientData: any): any {
    if (typeof serverData !== 'object' || typeof clientData !== 'object') {
      return serverData
    }

    const merged = { ...serverData }

    for (const [key, clientValue] of Object.entries(clientData)) {
      const serverValue = serverData[key]

      // Prefer non-null values
      if (clientValue !== null && clientValue !== undefined) {
        merged[key] = clientValue
      } else if (serverValue !== null && serverValue !== undefined) {
        merged[key] = serverValue
      }
    }

    return merged
  }

  /**
   * Detect conflicts by comparing timestamps and versions
   */
  static hasConflict(serverData: any, clientData: any): boolean {
    if (!serverData || !clientData) return false

    // Check if both have timestamps and compare them
    if (serverData.updated_at && clientData.updated_at) {
      const serverTime = new Date(serverData.updated_at).getTime()
      const clientTime = new Date(clientData.updated_at).getTime()
      return serverTime > clientTime
    }

    // Check if both have version numbers
    if (serverData.version && clientData.version) {
      return serverData.version > clientData.version
    }

    // Fallback: deep compare for simple conflicts
    return JSON.stringify(serverData) !== JSON.stringify(clientData)
  }

  /**
   * Store conflict for later resolution
   */
  static async storeConflict(conflict: ConflictData): Promise<void> {
    try {
      const { error } = await supabase
        .from('conflict_logs')
        .insert({
          id: conflict.id,
          table_name: conflict.table,
          server_data: conflict.serverData,
          client_data: conflict.clientData,
          conflict_timestamp: conflict.timestamp.toISOString(),
          user_id: conflict.userId,
          status: 'pending'
        })

      if (error) {
        console.error('Failed to store conflict:', error)
      }
    } catch (error) {
      console.error('Error storing conflict:', error)
    }
  }

  /**
   * Get pending conflicts for a user
   */
  static async getPendingConflicts(userId: string): Promise<ConflictData[]> {
    try {
      const { data, error } = await supabase
        .from('conflict_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('conflict_timestamp', { ascending: false })

      if (error) {
        console.error('Failed to fetch conflicts:', error)
        return []
      }

      return (data || []).map(row => ({
        id: row.id,
        table: row.table_name,
        serverData: row.server_data,
        clientData: row.client_data,
        timestamp: new Date(row.conflict_timestamp),
        userId: row.user_id
      }))
    } catch (error) {
      console.error('Error fetching conflicts:', error)
      return []
    }
  }

  /**
   * Mark conflict as resolved
   */
  static async markConflictResolved(conflictId: string, resolution: ResolutionResult): Promise<void> {
    try {
      const { error } = await supabase
        .from('conflict_logs')
        .update({
          status: 'resolved',
          resolution_strategy: resolution.strategy,
          resolved_data: resolution.resolvedData,
          resolved_at: new Date().toISOString()
        })
        .eq('id', conflictId)

      if (error) {
        console.error('Failed to mark conflict as resolved:', error)
      }
    } catch (error) {
      console.error('Error marking conflict as resolved:', error)
    }
  }
}

/**
 * Pre-configured conflict handlers for common entities
 */

// Project conflict handler - merge strategy
ConflictResolutionService.registerHandler('projects', {
  strategy: 'merge',
  mergeStrategy: (serverData, clientData) => {
    return {
      ...serverData,
      // Prefer client changes for user-editable fields
      name: clientData.name || serverData.name,
      description: clientData.description || serverData.description,
      status: clientData.status || serverData.status,
      priority: clientData.priority || serverData.priority,
      progress_percentage: Math.max(serverData.progress_percentage, clientData.progress_percentage),
      // Keep server values for system fields
      updated_at: new Date().toISOString(),
      updated_by: clientData.updated_by || serverData.updated_by
    }
  }
})

// Task conflict handler - manual resolution
ConflictResolutionService.registerHandler('tasks', {
  strategy: 'manual',
  onConflict: async (conflict) => {
    // For tasks, we prefer manual resolution due to their importance
    // In a real app, this would show a UI dialog
    console.warn('Task conflict detected, using server data:', conflict)

    // For now, use server-wins but log it
    return {
      resolvedData: conflict.serverData,
      strategy: 'manual-server-wins',
      accepted: true
    }
  }
})

// Milestone conflict handler - merge with caution
ConflictResolutionService.registerHandler('milestones', {
  strategy: 'merge',
  mergeStrategy: (serverData, clientData) => {
    return {
      ...serverData,
      // Critical fields - prefer the latest change
      title: clientData.title || serverData.title,
      description: clientData.description || serverData.description,
      status: clientData.status || serverData.status,
      progress_percentage: Math.max(serverData.progress_percentage, clientData.progress_percentage),
      // Date fields - prefer the one that makes sense
      due_date: clientData.due_date || serverData.due_date,
      completion_date: clientData.completion_date || serverData.completion_date,
      // Keep server values for system fields
      updated_at: new Date().toISOString()
    }
  }
})

/**
 * Utility function to handle optimistic updates with conflict resolution
 */
export async function handleOptimisticUpdate<T>(
  optimisticUpdate: () => T,
  serverUpdate: Promise<T>,
  table: string,
  id: string,
  userId: string
): Promise<T> {
  try {
    // Apply optimistic update
    const optimisticData = optimisticUpdate()

    // Wait for server response
    const serverData = await serverUpdate

    // Check for conflicts
    if (ConflictResolutionService.hasConflict(serverData, optimisticData)) {
      const conflict: ConflictData = {
        id,
        table,
        serverData,
        clientData: optimisticData,
        timestamp: new Date(),
        userId
      }

      // Store conflict for later analysis
      await ConflictResolutionService.storeConflict(conflict)

      // Resolve conflict
      const resolution = await ConflictResolutionService.resolveConflict(conflict)

      return resolution.resolvedData
    }

    return serverData
  } catch (error) {
    console.error('Error in optimistic update with conflict resolution:', error)
    throw error
  }
}
