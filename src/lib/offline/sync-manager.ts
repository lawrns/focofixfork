'use client'

interface SyncQueueItem {
  id: string
  url: string
  method: string
  headers: Record<string, string>
  body?: string
  timestamp: number
  retryCount: number
  maxRetries: number
}

interface OfflineData {
  id: string
  type: 'project' | 'task' | 'organization' | 'user_data'
  data: any
  timestamp: number
  synced: boolean
}

class SyncManager {
  private syncQueue: SyncQueueItem[] = []
  private offlineData: OfflineData[] = []
  private isOnline: boolean = typeof window !== 'undefined' ? navigator.onLine : true
  private syncInProgress: boolean = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine
      this.loadFromStorage()
      this.setupEventListeners()
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return
    
    try {
      const savedQueue = localStorage.getItem('foco-sync-queue')
      const savedData = localStorage.getItem('foco-offline-data')
      
      if (savedQueue) {
        this.syncQueue = JSON.parse(savedQueue)
      }
      if (savedData) {
        this.offlineData = JSON.parse(savedData)
      }
      
      console.log('[SyncManager] Data loaded from localStorage')
    } catch (error) {
      console.error('[SyncManager] Failed to load from storage:', error)
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem('foco-sync-queue', JSON.stringify(this.syncQueue))
      localStorage.setItem('foco-offline-data', JSON.stringify(this.offlineData))
    } catch (error) {
      console.error('[SyncManager] Failed to save to storage:', error)
    }
  }

  private setupEventListeners() {
    if (typeof window === 'undefined') return
    
    window.addEventListener('online', () => {
      this.isOnline = true
      console.log('[SyncManager] Back online, starting sync')
      this.syncPendingRequests()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      console.log('[SyncManager] Gone offline')
    })
  }

  // Queue a request for later sync
  async queueRequest(
    url: string,
    method: string = 'GET',
    headers: Record<string, string> = {},
    body?: string
  ): Promise<void> {
    const item: SyncQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url,
      method,
      headers,
      body,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3
    }

    this.syncQueue.push(item)
    this.saveToStorage()
    console.log('[SyncManager] Request queued:', url)
  }

  // Sync all pending requests
  async syncPendingRequests(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      return
    }

    this.syncInProgress = true
    console.log('[SyncManager] Starting sync of pending requests')

    try {
      const items = [...this.syncQueue]
      
      for (const item of items) {
        try {
          const response = await fetch(item.url, {
            method: item.method,
            headers: item.headers,
            body: item.body
          })

          if (response.ok) {
            // Remove successful request from queue
            this.syncQueue = this.syncQueue.filter(q => q.id !== item.id)
            console.log('[SyncManager] Synced request:', item.url)
          } else {
            // Increment retry count
            item.retryCount++
            if (item.retryCount >= item.maxRetries) {
              this.syncQueue = this.syncQueue.filter(q => q.id !== item.id)
              console.log('[SyncManager] Max retries reached for:', item.url)
            }
          }
        } catch (error) {
          console.error('[SyncManager] Failed to sync request:', item.url, error)
          item.retryCount++
          if (item.retryCount >= item.maxRetries) {
            this.syncQueue = this.syncQueue.filter(q => q.id !== item.id)
          }
        }
      }
      
      this.saveToStorage()
    } catch (error) {
      console.error('[SyncManager] Sync failed:', error)
    } finally {
      this.syncInProgress = false
    }
  }

  // Store data offline
  async storeOfflineData(
    id: string,
    type: OfflineData['type'],
    data: any
  ): Promise<void> {
    const item: OfflineData = {
      id,
      type,
      data,
      timestamp: Date.now(),
      synced: false
    }

    // Remove existing item with same id
    this.offlineData = this.offlineData.filter(item => item.id !== id)
    this.offlineData.push(item)
    this.saveToStorage()
    console.log('[SyncManager] Data stored offline:', type, id)
  }

  // Get offline data
  async getOfflineData(type?: OfflineData['type']): Promise<OfflineData[]> {
    if (type) {
      return this.offlineData.filter(item => item.type === type)
    }
    return [...this.offlineData]
  }

  // Mark data as synced
  async markDataSynced(id: string): Promise<void> {
    const item = this.offlineData.find(item => item.id === id)
    if (item) {
      item.synced = true
      this.saveToStorage()
    }
  }

  // Get sync status
  async getSyncStatus(): Promise<{
    pendingRequests: number
    offlineData: number
    unsyncedData: number
  }> {
    return {
      pendingRequests: this.syncQueue.length,
      offlineData: this.offlineData.length,
      unsyncedData: this.offlineData.filter(item => !item.synced).length
    }
  }

  // Clear old synced data
  async clearOldData(olderThanDays: number = 7): Promise<void> {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000)
    
    const oldDataCount = this.offlineData.length
    this.offlineData = this.offlineData.filter(item => 
      !item.synced || item.timestamp >= cutoffTime
    )
    
    if (oldDataCount !== this.offlineData.length) {
      this.saveToStorage()
      console.log('[SyncManager] Cleared', oldDataCount - this.offlineData.length, 'old synced items')
    }
  }

  // Force sync now
  async forceSync(): Promise<void> {
    if (this.isOnline) {
      await this.syncPendingRequests()
    }
  }

  // Get online status
  isOnlineStatus(): boolean {
    return this.isOnline
  }
}

// Singleton instance
export const syncManager = new SyncManager()

// Helper functions for common operations
export async function queueApiRequest(
  url: string,
  method: string = 'GET',
  data?: any
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  let body: string | undefined
  if (data) {
    body = JSON.stringify(data)
  }

  await syncManager.queueRequest(url, method, headers, body)
}

export async function storeProjectOffline(project: any): Promise<void> {
  await syncManager.storeOfflineData(
    `project-${project.id}`,
    'project',
    project
  )
}

export async function storeTaskOffline(task: any): Promise<void> {
  await syncManager.storeOfflineData(
    `task-${task.id}`,
    'task',
    task
  )
}

export async function storeOrganizationOffline(organization: any): Promise<void> {
  await syncManager.storeOfflineData(
    `org-${organization.id}`,
    'organization',
    organization
  )
}

export async function getOfflineProjects(): Promise<any[]> {
  const data = await syncManager.getOfflineData('project')
  return data.map(item => item.data)
}

export async function getOfflineTasks(): Promise<any[]> {
  const data = await syncManager.getOfflineData('task')
  return data.map(item => item.data)
}

export async function getOfflineOrganizations(): Promise<any[]> {
  const data = await syncManager.getOfflineData('organization')
  return data.map(item => item.data)
}
