/**
 * Error Tracking and Monitoring System
 *
 * This module provides centralized error tracking, monitoring, and reporting
 * for production issues. It helps identify patterns in API failures and
 * provides insights for debugging.
 */

interface ErrorEvent {
  timestamp: number
  url: string
  method: string
  status: number
  message: string
  context?: Record<string, any>
  stack?: string
  userId?: string
  sessionId?: string
}

interface ErrorMetrics {
  totalErrors: number
  errorsByStatus: Map<number, number>
  errorsByEndpoint: Map<string, number>
  recentErrors: ErrorEvent[]
  circuitBreakerTrips: Map<string, number>
}

class ErrorTracker {
  private errors: ErrorEvent[] = []
  private metrics: ErrorMetrics = {
    totalErrors: 0,
    errorsByStatus: new Map(),
    errorsByEndpoint: new Map(),
    recentErrors: [],
    circuitBreakerTrips: new Map()
  }
  private maxErrors = 100 // Keep only last 100 errors in memory
  private reportingEndpoint = '/api/monitoring/errors'
  private batchSize = 10
  private pendingReports: ErrorEvent[] = []
  private reportingInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Start periodic reporting
    this.startPeriodicReporting()

    // Listen for unhandled errors
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this))
      window.addEventListener('error', this.handleGlobalError.bind(this))
    }
  }

  /**
   * Track an API error
   */
  trackApiError(
    url: string,
    method: string,
    status: number,
    message: string,
    context?: Record<string, any>
  ) {
    const error: ErrorEvent = {
      timestamp: Date.now(),
      url: this.sanitizeUrl(url),
      method,
      status,
      message,
      context,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId()
    }

    this.addError(error)
    this.updateMetrics(error)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error Tracked:', error)
    }

    // Check for critical patterns
    this.checkCriticalPatterns(error)
  }

  /**
   * Track a circuit breaker trip
   */
  trackCircuitBreakerTrip(url: string) {
    const baseUrl = this.sanitizeUrl(url)
    const trips = this.metrics.circuitBreakerTrips.get(baseUrl) || 0
    this.metrics.circuitBreakerTrips.set(baseUrl, trips + 1)

    console.warn(`Circuit breaker tripped for ${baseUrl} (${trips + 1} times)`)

    // Alert if too many trips
    if (trips + 1 >= 5) {
      this.sendAlert({
        type: 'CIRCUIT_BREAKER_CRITICAL',
        message: `Circuit breaker has tripped ${trips + 1} times for ${baseUrl}`,
        severity: 'high'
      })
    }
  }

  /**
   * Track a JavaScript error
   */
  trackJsError(error: Error, context?: Record<string, any>) {
    const errorEvent: ErrorEvent = {
      timestamp: Date.now(),
      url: window.location.href,
      method: 'JS_ERROR',
      status: 0,
      message: error.message,
      stack: error.stack,
      context,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId()
    }

    this.addError(errorEvent)

    // Log to console
    console.error('JS Error Tracked:', errorEvent)
  }

  /**
   * Get current error metrics
   */
  getMetrics(): ErrorMetrics {
    return {
      ...this.metrics,
      recentErrors: [...this.metrics.recentErrors]
    }
  }

  /**
   * Get errors for a specific endpoint
   */
  getErrorsForEndpoint(endpoint: string): ErrorEvent[] {
    return this.errors.filter(e => e.url.includes(endpoint))
  }

  /**
   * Clear all tracked errors
   */
  clearErrors() {
    this.errors = []
    this.metrics = {
      totalErrors: 0,
      errorsByStatus: new Map(),
      errorsByEndpoint: new Map(),
      recentErrors: [],
      circuitBreakerTrips: new Map()
    }
  }

  /**
   * Export errors for debugging
   */
  exportErrors(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics: {
        totalErrors: this.metrics.totalErrors,
        errorsByStatus: Array.from(this.metrics.errorsByStatus.entries()),
        errorsByEndpoint: Array.from(this.metrics.errorsByEndpoint.entries()),
        circuitBreakerTrips: Array.from(this.metrics.circuitBreakerTrips.entries())
      },
      errors: this.errors
    }

    return JSON.stringify(exportData, null, 2)
  }

  // Private methods

  private addError(error: ErrorEvent) {
    this.errors.push(error)
    this.metrics.recentErrors.push(error)

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift()
    }
    if (this.metrics.recentErrors.length > 10) {
      this.metrics.recentErrors.shift()
    }

    // Add to pending reports
    this.pendingReports.push(error)
    if (this.pendingReports.length >= this.batchSize) {
      this.reportErrors()
    }
  }

  private updateMetrics(error: ErrorEvent) {
    this.metrics.totalErrors++

    // Update status metrics
    const statusCount = this.metrics.errorsByStatus.get(error.status) || 0
    this.metrics.errorsByStatus.set(error.status, statusCount + 1)

    // Update endpoint metrics
    const baseUrl = this.sanitizeUrl(error.url)
    const endpointCount = this.metrics.errorsByEndpoint.get(baseUrl) || 0
    this.metrics.errorsByEndpoint.set(baseUrl, endpointCount + 1)
  }

  private checkCriticalPatterns(error: ErrorEvent) {
    // Check for authentication failures
    if (error.status === 401) {
      const authFailures = this.errors.filter(
        e => e.status === 401 && e.timestamp > Date.now() - 60000
      ).length

      if (authFailures >= 5) {
        this.sendAlert({
          type: 'AUTH_FAILURES',
          message: `Multiple authentication failures detected (${authFailures} in last minute)`,
          severity: 'high'
        })
      }
    }

    // Check for repeated 500 errors
    if (error.status >= 500) {
      const serverErrors = this.errors.filter(
        e => e.status >= 500 &&
        e.url === error.url &&
        e.timestamp > Date.now() - 300000
      ).length

      if (serverErrors >= 10) {
        this.sendAlert({
          type: 'SERVER_ERROR_SPIKE',
          message: `Server error spike on ${error.url} (${serverErrors} errors in 5 minutes)`,
          severity: 'critical'
        })
      }
    }

    // Check for 404 patterns (possible broken deployment)
    if (error.status === 404) {
      const notFoundErrors = this.errors.filter(
        e => e.status === 404 && e.timestamp > Date.now() - 60000
      ).length

      if (notFoundErrors >= 10) {
        this.sendAlert({
          type: 'NOT_FOUND_SPIKE',
          message: `Multiple 404 errors detected (${notFoundErrors} in last minute)`,
          severity: 'medium'
        })
      }
    }
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      // Remove query params and hash for grouping
      return `${urlObj.origin}${urlObj.pathname}`
    } catch {
      return url.split('?')[0].split('#')[0]
    }
  }

  private getCurrentUserId(): string | undefined {
    // Try to get user ID from various sources
    if (typeof window !== 'undefined') {
      // Check localStorage
      try {
        const authData = localStorage.getItem('auth')
        if (authData) {
          const parsed = JSON.parse(authData)
          return parsed.userId || parsed.user?.id
        }
      } catch {}
    }
    return undefined
  }

  private getSessionId(): string {
    if (typeof window !== 'undefined') {
      // Get or create session ID
      let sessionId = sessionStorage.getItem('error-tracking-session')
      if (!sessionId) {
        sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        sessionStorage.setItem('error-tracking-session', sessionId)
      }
      return sessionId
    }
    return 'unknown'
  }

  private async reportErrors() {
    if (this.pendingReports.length === 0) return

    const toReport = [...this.pendingReports]
    this.pendingReports = []

    try {
      // In production, send to monitoring endpoint
      if (process.env.NODE_ENV === 'production') {
        await fetch(this.reportingEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ errors: toReport })
        })
      }
    } catch (error) {
      // Failed to report, add back to pending
      this.pendingReports.unshift(...toReport)
      console.error('Failed to report errors:', error)
    }
  }

  private startPeriodicReporting() {
    // Report errors every 30 seconds
    this.reportingInterval = setInterval(() => {
      this.reportErrors()
    }, 30000)
  }

  private sendAlert(alert: { type: string; message: string; severity: string }) {
    // In production, this would send to a real alerting service
    console.error(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`)

    // Store alert in localStorage for debugging
    if (typeof window !== 'undefined') {
      try {
        const alerts = JSON.parse(localStorage.getItem('error-alerts') || '[]')
        alerts.push({ ...alert, timestamp: Date.now() })
        // Keep only last 50 alerts
        if (alerts.length > 50) {
          alerts.splice(0, alerts.length - 50)
        }
        localStorage.setItem('error-alerts', JSON.stringify(alerts))
      } catch {}
    }

    // Trigger custom event for UI components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('error-alert', { detail: alert }))
    }
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent) {
    this.trackJsError(new Error(event.reason?.message || 'Unhandled Promise Rejection'), {
      type: 'unhandledRejection',
      reason: event.reason
    })
  }

  private handleGlobalError(event: ErrorEvent) {
    this.trackJsError(new Error(event.message), {
      type: 'globalError',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    })
  }

  // Cleanup
  destroy() {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval)
    }
    this.reportErrors() // Final report
  }
}

// Create singleton instance
export const errorTracker = new ErrorTracker()

// Export types
export type { ErrorEvent, ErrorMetrics }