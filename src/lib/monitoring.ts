/**
 * Application Monitoring and Analytics
 * Provides comprehensive monitoring for performance, errors, and user behavior
 */

import React from 'react'

interface MetricData {
  name: string
  value: number
  timestamp: number
  tags?: Record<string, string>
}

interface ErrorData {
  message: string
  stack?: string
  url: string
  userAgent: string
  userId?: string
  timestamp: number
  severity: 'low' | 'medium' | 'high' | 'critical'
}

interface UserEvent {
  event: string
  properties: Record<string, any>
  userId?: string
  sessionId: string
  timestamp: number
  url: string
}

interface PerformanceData {
  page: string
  loadTime: number
  domContentLoaded: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  firstInputDelay: number
  cumulativeLayoutShift: number
  timestamp: number
  userId?: string
}

class MonitoringService {
  private metrics: MetricData[] = []
  private errors: ErrorData[] = []
  private events: UserEvent[] = []
  private performance: PerformanceData[] = []
  private readonly MAX_STORAGE = 1000 // Maximum items to keep in memory

  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: MetricData = {
      name,
      value,
      timestamp: Date.now(),
      tags
    }

    this.metrics.push(metric)
    this.trimStorage('metrics')

    // Send to external monitoring service if configured
    this.sendToExternalService('metric', metric)
  }

  /**
   * Record an error
   */
  recordError(
    error: Error,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    context?: Record<string, any>
  ): void {
    const errorData: ErrorData = {
      message: error.message,
      stack: error.stack,
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      userId: context?.userId,
      timestamp: Date.now(),
      severity
    }

    this.errors.push(errorData)
    this.trimStorage('errors')

    // Send to external error tracking service
    this.sendToExternalService('error', errorData)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Monitored Error:', errorData)
    }
  }

  /**
   * Record a user event
   */
  recordEvent(
    event: string,
    properties: Record<string, any> = {},
    userId?: string
  ): void {
    const userEvent: UserEvent = {
      event,
      properties,
      userId,
      sessionId: this.getSessionId(),
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : 'server'
    }

    this.events.push(userEvent)
    this.trimStorage('events')

    // Send to external analytics service
    this.sendToExternalService('event', userEvent)
  }

  /**
   * Record performance metrics
   */
  recordPerformance(performanceData: PerformanceData): void {
    this.performance.push(performanceData)
    this.trimStorage('performance')

    // Send to external performance monitoring service
    this.sendToExternalService('performance', performanceData)
  }

  /**
   * Get current metrics
   */
  getMetrics(timeRange?: { start: number; end: number }): MetricData[] {
    if (!timeRange) return [...this.metrics]

    return this.metrics.filter(
      metric => metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    )
  }

  /**
   * Get errors
   */
  getErrors(timeRange?: { start: number; end: number }): ErrorData[] {
    if (!timeRange) return [...this.errors]

    return this.errors.filter(
      error => error.timestamp >= timeRange.start && error.timestamp <= timeRange.end
    )
  }

  /**
   * Get user events
   */
  getEvents(timeRange?: { start: number; end: number }): UserEvent[] {
    if (!timeRange) return [...this.events]

    return this.events.filter(
      event => event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
    )
  }

  /**
   * Get performance data
   */
  getPerformance(timeRange?: { start: number; end: number }): PerformanceData[] {
    if (!timeRange) return [...this.performance]

    return this.performance.filter(
      perf => perf.timestamp >= timeRange.start && perf.timestamp <= timeRange.end
    )
  }

  /**
   * Get analytics summary
   */
  getAnalyticsSummary(timeRange?: { start: number; end: number }): {
    totalEvents: number
    uniqueUsers: number
    errorRate: number
    averageLoadTime: number
    topEvents: Array<{ event: string; count: number }>
    topErrors: Array<{ message: string; count: number }>
  } {
    const events = this.getEvents(timeRange)
    const errors = this.getErrors(timeRange)
    const performance = this.getPerformance(timeRange)

    // Count unique users
    const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean)).size

    // Calculate error rate
    const errorRate = events.length > 0 ? (errors.length / events.length) * 100 : 0

    // Calculate average load time
    const averageLoadTime = performance.length > 0
      ? performance.reduce((sum, p) => sum + p.loadTime, 0) / performance.length
      : 0

    // Top events
    const eventCounts = new Map<string, number>()
    events.forEach(event => {
      eventCounts.set(event.event, (eventCounts.get(event.event) || 0) + 1)
    })
    const topEvents = Array.from(eventCounts.entries())
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Top errors
    const errorCounts = new Map<string, number>()
    errors.forEach(error => {
      errorCounts.set(error.message, (errorCounts.get(error.message) || 0) + 1)
    })
    const topErrors = Array.from(errorCounts.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalEvents: events.length,
      uniqueUsers,
      errorRate,
      averageLoadTime,
      topEvents,
      topErrors
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.metrics = []
    this.errors = []
    this.events = []
    this.performance = []
  }

  /**
   * Export data for external analysis
   */
  exportData(): {
    metrics: MetricData[]
    errors: ErrorData[]
    events: UserEvent[]
    performance: PerformanceData[]
  } {
    return {
      metrics: [...this.metrics],
      errors: [...this.errors],
      events: [...this.events],
      performance: [...this.performance]
    }
  }

  /**
   * Get session ID
   */
  private getSessionId(): string {
    if (typeof window === 'undefined') return 'server-session'

    let sessionId = sessionStorage.getItem('monitoring-session-id')
    if (!sessionId) {
      sessionId = Math.random().toString(36).substr(2, 9)
      sessionStorage.setItem('monitoring-session-id', sessionId)
    }
    return sessionId
  }

  /**
   * Trim storage to prevent memory leaks
   */
  private trimStorage(type: 'metrics' | 'errors' | 'events' | 'performance'): void {
    const storage = this[type] as any[]
    if (storage.length > this.MAX_STORAGE) {
      storage.splice(0, storage.length - this.MAX_STORAGE)
    }
  }

  /**
   * Send data to external service
   */
  private async sendToExternalService(type: string, data: any): Promise<void> {
    // In a real implementation, this would send to services like:
    // - Sentry for errors
    // - Google Analytics for events
    // - DataDog for metrics
    // - New Relic for performance

    try {
      // Example: Send to internal API endpoint
      if (typeof window !== 'undefined') {
        await fetch('/api/monitoring', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ type, data })
        })
      }
    } catch (error) {
      console.warn('Failed to send monitoring data:', error)
    }
  }
}

// Create global monitoring instance
export const monitoring = new MonitoringService()

// Performance monitoring hook for React components
export function usePerformanceMonitoring(componentName: string) {
  if (typeof window === 'undefined') return

  const startTime = performance.now()

  return {
    end: () => {
      const endTime = performance.now()
      monitoring.recordMetric('component-render-time', endTime - startTime, {
        component: componentName
      })
    }
  }
}

// Error boundary integration
export function withErrorMonitoring<T extends React.ComponentType<any>>(
  Component: T,
  componentName: string
): T {
  return ((props: any) => {
    try {
      return React.createElement(Component, props)
    } catch (error) {
      monitoring.recordError(error as Error, 'high', {
        component: componentName,
        props: Object.keys(props)
      })
      throw error
    }
  }) as T
}

// API monitoring wrapper
export function withAPIMonitoring<T extends (...args: any[]) => Promise<any>>(
  apiFunction: T,
  endpoint: string
): T {
  return (async (...args: any[]) => {
    const startTime = performance.now()
    
    try {
      const result = await apiFunction(...args)
      const duration = performance.now() - startTime
      
      monitoring.recordMetric('api-response-time', duration, {
        endpoint,
        status: 'success'
      })
      
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      
      monitoring.recordMetric('api-response-time', duration, {
        endpoint,
        status: 'error'
      })
      
      monitoring.recordError(error as Error, 'medium', {
        endpoint,
        args: args.length
      })
      
      throw error
    }
  }) as T
}

// Web Vitals monitoring
export function initWebVitalsMonitoring(): void {
  if (typeof window === 'undefined') return

  // First Contentful Paint
  new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint')
    if (fcpEntry) {
      monitoring.recordMetric('web-vitals-fcp', fcpEntry.startTime)
    }
  }).observe({ entryTypes: ['paint'] })

  // Largest Contentful Paint
  new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const lastEntry = entries[entries.length - 1]
    if (lastEntry) {
      monitoring.recordMetric('web-vitals-lcp', lastEntry.startTime)
    }
  }).observe({ entryTypes: ['largest-contentful-paint'] })

  // First Input Delay
  new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const fidEntry = entries[0] as PerformanceEventTiming
    if (fidEntry) {
      monitoring.recordMetric('web-vitals-fid', fidEntry.processingStart - fidEntry.startTime)
    }
  }).observe({ entryTypes: ['first-input'] })

  // Cumulative Layout Shift
  let clsValue = 0
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value
      }
    }
    monitoring.recordMetric('web-vitals-cls', clsValue)
  }).observe({ entryTypes: ['layout-shift'] })
}

// Initialize monitoring when module loads
if (typeof window !== 'undefined') {
  initWebVitalsMonitoring()
}
