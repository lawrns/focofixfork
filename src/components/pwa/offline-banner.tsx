'use client'

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { syncManager } from '@/lib/offline/sync-manager'

interface OfflineBannerProps {
  className?: string
}

export function OfflineBanner({ className }: OfflineBannerProps) {
  const [mounted, setMounted] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [syncStatus, setSyncStatus] = useState({
    pendingRequests: 0,
    offlineData: 0,
    unsyncedData: 0
  })
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  useEffect(() => {
    // Check initial online status only after mount to prevent hydration mismatch
    setIsOnline(navigator.onLine)
    setMounted(true)

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      setLastSyncTime(new Date())
      // Auto-sync when back online
      syncManager.forceSync()
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Update sync status periodically
    const updateSyncStatus = async () => {
      const status = await syncManager.getSyncStatus()
      setSyncStatus(status)
    }

    updateSyncStatus()
    const interval = setInterval(updateSyncStatus, 5000) // Update every 5 seconds

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      await syncManager.forceSync()
      setLastSyncTime(new Date())
      // Update status after sync
      const status = await syncManager.getSyncStatus()
      setSyncStatus(status)
    } catch (error) {
      console.error('Manual sync failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  // Don't show banner if online and no pending sync
  if (isOnline && syncStatus.pendingRequests === 0 && syncStatus.unsyncedData === 0) {
    return null
  }

  return (
    <div className={cn(
      'fixed top-0 left-0 right-0 z-40 transition-all duration-300',
      'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg',
      className
    )}>
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Status Icon */}
            <div className="flex-shrink-0">
              {isOnline ? (
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm font-medium">Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <WifiOff className="w-4 h-4" />
                  <span className="text-sm font-medium">Offline</span>
                </div>
              )}
            </div>

            {/* Status Message */}
            <div className="flex items-center gap-4 text-sm">
              {!isOnline ? (
                <span>Working offline - changes will sync when reconnected</span>
              ) : syncStatus.pendingRequests > 0 ? (
                <span>
                  {syncStatus.pendingRequests} pending changes to sync
                </span>
              ) : syncStatus.unsyncedData > 0 ? (
                <span>
                  {syncStatus.unsyncedData} items need syncing
                </span>
              ) : (
                <span>All changes synced</span>
              )}

              {/* Sync Status Indicators */}
              {syncStatus.pendingRequests > 0 && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{syncStatus.pendingRequests}</span>
                </div>
              )}

              {syncStatus.unsyncedData > 0 && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{syncStatus.unsyncedData}</span>
                </div>
              )}

              {syncStatus.pendingRequests === 0 && syncStatus.unsyncedData === 0 && isOnline && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>Synced</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {lastSyncTime && (
              <span className="text-xs opacity-75">
                Last sync: {lastSyncTime.toLocaleTimeString()}
              </span>
            )}

            {isOnline && (syncStatus.pendingRequests > 0 || syncStatus.unsyncedData > 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Sync Now
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar for Sync */}
        {isSyncing && (
          <div className="mt-2">
            <div className="w-full bg-white/20 rounded-full h-1">
              <div className="bg-white h-1 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Hook for offline status
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [syncStatus, setSyncStatus] = useState({
    pendingRequests: 0,
    offlineData: 0,
    unsyncedData: 0
  })

  useEffect(() => {
    // Set actual online status only after mount
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Update sync status
    const updateStatus = async () => {
      const status = await syncManager.getSyncStatus()
      setSyncStatus(status)
    }

    updateStatus()
    const interval = setInterval(updateStatus, 10000) // Update every 10 seconds

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  return {
    isOnline,
    syncStatus,
    hasPendingChanges: syncStatus.pendingRequests > 0 || syncStatus.unsyncedData > 0
  }
}
