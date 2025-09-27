'use client'

import React, { useEffect, useState } from 'react'
import { Zap, Wifi, Battery, HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PerformanceMetrics {
  lcp: number // Largest Contentful Paint
  fid: number // First Input Delay
  cls: number // Cumulative Layout Shift
  fcp: number // First Contentful Paint
  ttfb: number // Time to First Byte
}

interface NetworkInfo {
  effectiveType: string
  downlink: number
  rtt: number
}

export function MobilePerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false)
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [deviceMemory, setDeviceMemory] = useState<number | null>(null)

  useEffect(() => {
    // Only show in development or when explicitly enabled
    if (process.env.NODE_ENV === 'development' || localStorage.getItem('show-performance-monitor')) {
      setIsVisible(true)
    }

    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const newMetrics: Partial<PerformanceMetrics> = {}

      entries.forEach((entry) => {
        switch (entry.name) {
          case 'largest-contentful-paint':
            newMetrics.lcp = entry.startTime
            break
          case 'first-input':
            newMetrics.fid = (entry as any).processingStart - entry.startTime
            break
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              newMetrics.cls = (newMetrics.cls || 0) + (entry as any).value
            }
            break
          case 'paint':
            if ((entry as any).name === 'first-contentful-paint') {
              newMetrics.fcp = entry.startTime
            }
            break
        }
      })

      setMetrics(prev => ({ ...prev, ...newMetrics } as PerformanceMetrics))
    })

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift', 'paint'] })
    } catch (e) {
      console.warn('Performance monitoring not fully supported')
    }

    // Monitor navigation timing for TTFB
    const navigationObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming
          setMetrics(prev => ({
            ...prev,
            ttfb: navEntry.responseStart - navEntry.requestStart
          } as PerformanceMetrics))
        }
      })
    })

    try {
      navigationObserver.observe({ entryTypes: ['navigation'] })
    } catch (e) {
      console.warn('Navigation timing not supported')
    }

    // Get network information
    const updateNetworkInfo = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        setNetworkInfo({
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0
        })
      }
    }

    updateNetworkInfo()
    if ('connection' in navigator) {
      ;(navigator as any).connection.addEventListener('change', updateNetworkInfo)
    }

    // Get device memory
    if ('deviceMemory' in navigator) {
      setDeviceMemory((navigator as any).deviceMemory)
    }

    // Monitor online status
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    updateOnlineStatus()

    return () => {
      observer.disconnect()
      navigationObserver.disconnect()
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  if (!isVisible) return null

  const getScoreColor = (value: number, thresholds: { good: number; poor: number }) => {
    if (value <= thresholds.good) return 'text-green-600'
    if (value <= thresholds.poor) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getNetworkIcon = () => {
    if (!isOnline) return <Wifi className="w-4 h-4 text-red-500" />
    if (!networkInfo) return <Wifi className="w-4 h-4 text-gray-400" />

    switch (networkInfo.effectiveType) {
      case '4g':
        return <Wifi className="w-4 h-4 text-green-500" />
      case '3g':
        return <Wifi className="w-4 h-4 text-yellow-500" />
      case '2g':
      case 'slow-2g':
        return <Wifi className="w-4 h-4 text-red-500" />
      default:
        return <Wifi className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-card border border-border rounded-lg shadow-lg p-3 max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Performance</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(false)}
          className="p-1 h-6 w-6"
        >
          ×
        </Button>
      </div>

      {/* Core Web Vitals */}
      <div className="space-y-1 text-xs">
        {metrics?.lcp && (
          <div className="flex justify-between">
            <span>LCP:</span>
            <span className={cn(getScoreColor(metrics.lcp, { good: 2500, poor: 4000 }))}>
              {Math.round(metrics.lcp)}ms
            </span>
          </div>
        )}
        {metrics?.fid && (
          <div className="flex justify-between">
            <span>FID:</span>
            <span className={cn(getScoreColor(metrics.fid, { good: 100, poor: 300 }))}>
              {Math.round(metrics.fid)}ms
            </span>
          </div>
        )}
        {metrics?.cls !== undefined && (
          <div className="flex justify-between">
            <span>CLS:</span>
            <span className={cn(getScoreColor(metrics.cls, { good: 0.1, poor: 0.25 }))}>
              {metrics.cls.toFixed(3)}
            </span>
          </div>
        )}
        {metrics?.ttfb && (
          <div className="flex justify-between">
            <span>TTFB:</span>
            <span className={cn(getScoreColor(metrics.ttfb, { good: 800, poor: 1800 }))}>
              {Math.round(metrics.ttfb)}ms
            </span>
          </div>
        )}
      </div>

      {/* Network & Device Info */}
      <div className="border-t border-border mt-2 pt-2 space-y-1 text-xs">
        <div className="flex items-center gap-2">
          {getNetworkIcon()}
          <span>
            {networkInfo ? `${networkInfo.effectiveType.toUpperCase()} (${networkInfo.downlink}Mbps)` : 'Unknown'}
          </span>
        </div>

        {deviceMemory && (
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-gray-400" />
            <span>{deviceMemory}GB RAM</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Battery className="w-4 h-4 text-gray-400" />
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      {/* Mobile-specific optimizations indicator */}
      <div className="border-t border-border mt-2 pt-2">
        <div className="text-xs text-muted-foreground">
          Mobile optimizations active
        </div>
      </div>
    </div>
  )
}

export default MobilePerformanceMonitor
