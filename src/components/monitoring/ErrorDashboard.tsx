'use client'

import React, { useEffect, useState } from 'react'
import { errorTracker, type ErrorMetrics } from '@/lib/monitoring/error-tracker'
import { AlertCircle, AlertTriangle, CheckCircle, Info, Download, RefreshCw } from 'lucide-react'

/**
 * Error Dashboard Component
 *
 * This component provides a real-time view of errors and system health.
 * It should only be shown in development or to admin users in production.
 */
export function ErrorDashboard() {
  const [metrics, setMetrics] = useState<ErrorMetrics | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    // Only show in development or if user is admin
    const isDev = process.env.NODE_ENV === 'development'
    const isAdmin = localStorage.getItem('userRole') === 'admin'
    setIsVisible(isDev || isAdmin)

    if (!isDev && !isAdmin) return

    // Load initial metrics
    setMetrics(errorTracker.getMetrics())

    // Auto-refresh metrics
    const interval = autoRefresh ? setInterval(() => {
      setMetrics(errorTracker.getMetrics())
    }, 5000) : null

    // Listen for alerts
    const handleAlert = (event: CustomEvent) => {
      console.log('Error alert received:', event.detail)
      // Force refresh on alert
      setMetrics(errorTracker.getMetrics())
    }

    window.addEventListener('error-alert', handleAlert as EventListener)

    return () => {
      if (interval) clearInterval(interval)
      window.removeEventListener('error-alert', handleAlert as EventListener)
    }
  }, [autoRefresh])

  if (!isVisible || !metrics) return null

  const exportErrors = () => {
    const data = errorTracker.exportErrors()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `error-report-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearErrors = () => {
    if (confirm('Clear all error tracking data?')) {
      errorTracker.clearErrors()
      setMetrics(errorTracker.getMetrics())
    }
  }

  const resetCircuitBreaker = (url?: string) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'RESET_CIRCUIT_BREAKER',
        url
      })
    }
  }

  // Calculate health status
  const getHealthStatus = () => {
    if (metrics.totalErrors === 0) return 'healthy'
    if (metrics.circuitBreakerTrips.size > 0) return 'critical'

    const recentErrors = metrics.recentErrors.filter(
      e => e.timestamp > Date.now() - 60000
    ).length

    if (recentErrors > 5) return 'warning'
    return 'stable'
  }

  const healthStatus = getHealthStatus()

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className={`p-3 rounded-t-lg flex items-center justify-between ${
        healthStatus === 'healthy' ? 'bg-green-50 dark:bg-green-900/20' :
        healthStatus === 'critical' ? 'bg-red-50 dark:bg-red-900/20' :
        healthStatus === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
        'bg-blue-50 dark:bg-blue-900/20'
      }`}>
        <div className="flex items-center gap-2">
          {healthStatus === 'healthy' ? (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : healthStatus === 'critical' ? (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          ) : healthStatus === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          ) : (
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          )}
          <span className="font-semibold text-sm">System Health</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title={autoRefresh ? 'Pause refresh' : 'Enable auto-refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportErrors}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Export error log"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="p-3 space-y-3">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
            <div className="text-xs text-gray-500 dark:text-gray-400">Total Errors</div>
            <div className="text-lg font-semibold">{metrics.totalErrors}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
            <div className="text-xs text-gray-500 dark:text-gray-400">Circuit Breakers</div>
            <div className="text-lg font-semibold">{metrics.circuitBreakerTrips.size}</div>
          </div>
        </div>

        {/* Error by Status */}
        {metrics.errorsByStatus.size > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
              Errors by Status
            </div>
            <div className="space-y-1">
              {Array.from(metrics.errorsByStatus.entries()).map(([status, count]) => (
                <div key={status} className="flex justify-between text-xs">
                  <span className={`font-mono ${
                    status >= 500 ? 'text-red-600 dark:text-red-400' :
                    status >= 400 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-gray-600 dark:text-gray-400'
                  }`}>
                    {status === 0 ? 'Network' : status}
                  </span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Circuit Breakers */}
        {metrics.circuitBreakerTrips.size > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
              Circuit Breakers Open
            </div>
            <div className="space-y-1">
              {Array.from(metrics.circuitBreakerTrips.entries()).map(([url, trips]) => (
                <div key={url} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-red-600 dark:text-red-400 truncate">
                    {url.replace(/^https?:\/\/[^/]+/, '')}
                  </span>
                  <button
                    onClick={() => resetCircuitBreaker(url)}
                    className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 rounded"
                  >
                    Reset ({trips})
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Errors */}
        {metrics.recentErrors.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
              Recent Errors
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {metrics.recentErrors.slice(0, 5).map((error, idx) => (
                <div key={idx} className="text-xs bg-gray-50 dark:bg-gray-700 p-1 rounded">
                  <div className="flex justify-between">
                    <span className="font-mono text-red-600 dark:text-red-400">
                      {error.method} {error.status}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {new Date(error.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="truncate text-gray-600 dark:text-gray-300">
                    {error.url.replace(/^https?:\/\/[^/]+/, '')}
                  </div>
                  {error.message && (
                    <div className="truncate text-gray-500 dark:text-gray-400">
                      {error.message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={clearErrors}
            className="flex-1 text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
          >
            Clear All
          </button>
          <button
            onClick={() => resetCircuitBreaker()}
            className="flex-1 text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 rounded"
          >
            Reset All Breakers
          </button>
        </div>
      </div>
    </div>
  )
}