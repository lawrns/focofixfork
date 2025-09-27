'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface OfflineIndicatorProps {
  className?: string
  showRetry?: boolean
  onRetry?: () => void
  compact?: boolean
}

export function OfflineIndicator({
  className,
  showRetry = true,
  onRetry,
  compact = false
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)
  const [showIndicator, setShowIndicator] = useState(false)
  const [queueLength, setQueueLength] = useState(0)

  // Monitor online status
  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine
      setIsOnline(online)
      setShowIndicator(!online)
    }

    updateOnlineStatus()
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  // Monitor offline queue
  useEffect(() => {
    const checkOfflineQueue = () => {
      try {
        const queue = localStorage.getItem('foco_offline_actions')
        if (queue) {
          const actions = JSON.parse(queue)
          setQueueLength(actions.length)
        } else {
          setQueueLength(0)
        }
      } catch (error) {
        setQueueLength(0)
      }
    }

    checkOfflineQueue()

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'foco_offline_actions') {
        checkOfflineQueue()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    // Also listen for custom events from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        checkOfflineQueue()
      }
    }

    navigator.serviceWorker?.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      navigator.serviceWorker?.removeEventListener('message', handleMessage)
    }
  }, [])

  const handleRetry = async () => {
    if (!onRetry) return

    setIsRetrying(true)
    try {
      await onRetry()
    } finally {
      setIsRetrying(false)
    }
  }

  if (compact) {
    // Compact version for mobile header/status bar
    return (
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn(
              'flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20',
              className
            )}
          >
            <WifiOff className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive font-medium">Offline</span>
            {queueLength > 0 && (
              <Badge variant="secondary" className="text-xs">
                {queueLength}
              </Badge>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  // Full banner version
  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={cn(
            'fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground shadow-lg',
            'border-b border-destructive-foreground/20',
            className
          )}
        >
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <WifiOff className="w-5 h-5" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">You're offline</span>
                    <span className="text-xs opacity-90">
                      Changes will sync when connection returns
                    </span>
                  </div>
                </div>

                {queueLength > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-destructive-foreground/10">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">
                      {queueLength} pending action{queueLength !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              {showRetry && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Hook for managing offline actions
export function useOfflineActions() {
  const [actions, setActions] = useState<any[]>([])

  useEffect(() => {
    const loadActions = () => {
      try {
        const stored = localStorage.getItem('foco_offline_actions')
        if (stored) {
          setActions(JSON.parse(stored))
        }
      } catch (error) {
        console.error('Failed to load offline actions:', error)
      }
    }

    loadActions()

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'foco_offline_actions') {
        loadActions()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const addAction = (action: any) => {
    const newAction = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      ...action
    }

    try {
      const current = [...actions, newAction]
      localStorage.setItem('foco_offline_actions', JSON.stringify(current))
      setActions(current)

      // Register background sync if available
      if ('serviceWorker' in navigator && 'sync' in (window as any).ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
          ;(registration as any).sync.register('background-sync')
        })
      }
    } catch (error) {
      console.error('Failed to add offline action:', error)
    }
  }

  const removeAction = (actionId: string) => {
    try {
      const filtered = actions.filter(action => action.id !== actionId)
      localStorage.setItem('foco_offline_actions', JSON.stringify(filtered))
      setActions(filtered)
    } catch (error) {
      console.error('Failed to remove offline action:', error)
    }
  }

  return {
    actions,
    addAction,
    removeAction,
    queueLength: actions.length
  }
}

export default OfflineIndicator
