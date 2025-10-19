export interface TelemetryEvent {
  id: string
  type: string
  category: 'user-action' | 'performance' | 'error' | 'feature-usage' | 'system'
  timestamp: Date
  userId?: string
  sessionId: string
  properties: Record<string, any>
  metadata?: Record<string, any>
}

export interface TelemetryConfig {
  enabled: boolean
  endpoint: string
  batchSize: number
  flushInterval: number
  maxRetries: number
  debug: boolean
}

export interface TelemetryMetrics {
  totalEvents: number
  eventsByCategory: Record<string, number>
  eventsByType: Record<string, number>
  errorRate: number
  averageResponseTime: number
  lastFlush: Date | null
}

class TelemetryService {
  private config: TelemetryConfig
  private eventQueue: TelemetryEvent[] = []
  private sessionId: string
  private userId: string | null = null
  private isOnline: boolean = true
  private flushTimer: NodeJS.Timeout | null = null
  private retryCount: number = 0
  private metrics: TelemetryMetrics

  constructor(config: Partial<TelemetryConfig> = {}) {
    this.config = {
      enabled: true,
      endpoint: '/api/telemetry',
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
      maxRetries: 3,
      debug: false,
      ...config
    }

    this.sessionId = this.generateSessionId()
    this.metrics = {
      totalEvents: 0,
      eventsByCategory: {},
      eventsByType: {},
      errorRate: 0,
      averageResponseTime: 0,
      lastFlush: null
    }

    this.initialize()
  }

  // Initialize the service
  private initialize(): void {
    if (typeof window === 'undefined') return

    // Set up online/offline detection
    this.isOnline = navigator.onLine
    window.addEventListener('online', () => {
      this.isOnline = true
      this.flush()
    })
    window.addEventListener('offline', () => {
      this.isOnline = false
    })

    // Set up periodic flushing
    this.startFlushTimer()

    // Set up page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flush()
      }
    })

    // Set up beforeunload
    window.addEventListener('beforeunload', () => {
      this.flush()
    })

    // Set up error tracking
    window.addEventListener('error', (event) => {
      this.trackError('javascript-error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      })
    })

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError('unhandled-promise-rejection', {
        reason: event.reason,
        stack: event.reason?.stack
      })
    })
  }

  // Generate unique session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Start flush timer
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }

    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.config.flushInterval)
  }

  // Set user ID
  setUserId(userId: string | null): void {
    this.userId = userId
  }

  // Track an event
  track(eventType: string, properties: Record<string, any> = {}, category: TelemetryEvent['category'] = 'user-action'): void {
    if (!this.config.enabled) return

    const event: TelemetryEvent = {
      id: this.generateEventId(),
      type: eventType,
      category,
      timestamp: new Date(),
      userId: this.userId || undefined,
      sessionId: this.sessionId,
      properties: this.sanitizeProperties(properties),
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    }

    this.eventQueue.push(event)
    this.updateMetrics(event)

    if (this.config.debug) {
      console.log('Telemetry event:', event)
    }

    // Flush if queue is full
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush()
    }
  }

  // Track user actions
  trackUserAction(action: string, properties: Record<string, any> = {}): void {
    this.track(`user-action:${action}`, properties, 'user-action')
  }

  // Track feature usage
  trackFeatureUsage(feature: string, properties: Record<string, any> = {}): void {
    this.track(`feature-usage:${feature}`, properties, 'feature-usage')
  }

  // Track performance metrics
  trackPerformance(metric: string, value: number, properties: Record<string, any> = {}): void {
    this.track(`performance:${metric}`, { value, ...properties }, 'performance')
  }

  // Track errors
  trackError(errorType: string, properties: Record<string, any> = {}): void {
    this.track(`error:${errorType}`, properties, 'error')
  }

  // Track system events
  trackSystemEvent(event: string, properties: Record<string, any> = {}): void {
    this.track(`system:${event}`, properties, 'system')
  }

  // Generate unique event ID
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Sanitize properties to remove sensitive data
  private sanitizeProperties(properties: Record<string, any>): Record<string, any> {
    const sanitized = { ...properties }
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'email', 'phone']
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]'
      }
    })

    // Limit string length
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
        sanitized[key] = sanitized[key].substring(0, 1000) + '...'
      }
    })

    return sanitized
  }

  // Update internal metrics
  private updateMetrics(event: TelemetryEvent): void {
    this.metrics.totalEvents++
    this.metrics.eventsByCategory[event.category] = (this.metrics.eventsByCategory[event.category] || 0) + 1
    this.metrics.eventsByType[event.type] = (this.metrics.eventsByType[event.type] || 0) + 1
  }

  // Flush events to server
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0 || !this.isOnline) return

    const events = [...this.eventQueue]
    this.eventQueue = []

    try {
      const startTime = performance.now()
      
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events,
          sessionId: this.sessionId,
          userId: this.userId,
          timestamp: new Date().toISOString()
        })
      })

      const endTime = performance.now()
      const responseTime = endTime - startTime

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Update metrics
      this.metrics.lastFlush = new Date()
      this.metrics.averageResponseTime = (this.metrics.averageResponseTime + responseTime) / 2
      this.retryCount = 0

      if (this.config.debug) {
        console.log(`Telemetry flushed ${events.length} events in ${responseTime.toFixed(2)}ms`)
      }

    } catch (error) {
      // Re-queue events for retry
      this.eventQueue.unshift(...events)
      this.retryCount++

      if (this.config.debug) {
        console.error('Telemetry flush failed:', error)
      }

      // Track the error
      this.trackError('telemetry-flush-failed', {
        error: error instanceof Error ? error.message : String(error),
        retryCount: this.retryCount,
        eventCount: events.length
      })

      // Stop retrying after max retries
      if (this.retryCount >= this.config.maxRetries) {
        if (this.config.debug) {
          console.warn('Telemetry: Max retries reached, dropping events')
        }
        this.eventQueue = []
        this.retryCount = 0
      }
    }
  }

  // Get current metrics
  getMetrics(): TelemetryMetrics {
    return { ...this.metrics }
  }

  // Get event queue size
  getQueueSize(): number {
    return this.eventQueue.length
  }

  // Check if service is enabled
  isEnabled(): boolean {
    return this.config.enabled
  }

  // Enable/disable the service
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
    
    if (enabled) {
      this.startFlushTimer()
    } else {
      if (this.flushTimer) {
        clearInterval(this.flushTimer)
        this.flushTimer = null
      }
    }
  }

  // Update configuration
  updateConfig(newConfig: Partial<TelemetryConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (newConfig.flushInterval) {
      this.startFlushTimer()
    }
  }

  // Clear all data
  clear(): void {
    this.eventQueue = []
    this.metrics = {
      totalEvents: 0,
      eventsByCategory: {},
      eventsByType: {},
      errorRate: 0,
      averageResponseTime: 0,
      lastFlush: null
    }
  }

  // Destroy the service
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    
    this.flush()
    this.clear()
  }
}

// Export singleton instance
export const telemetryService = new TelemetryService()

// Export helper functions
export function trackEvent(eventType: string, properties?: Record<string, any>): void {
  telemetryService.track(eventType, properties)
}

export function trackUserAction(action: string, properties?: Record<string, any>): void {
  telemetryService.trackUserAction(action, properties)
}

export function trackFeatureUsage(feature: string, properties?: Record<string, any>): void {
  telemetryService.trackFeatureUsage(feature, properties)
}

export function trackPerformance(metric: string, value: number, properties?: Record<string, any>): void {
  telemetryService.trackPerformance(metric, value, properties)
}

export function trackError(errorType: string, properties?: Record<string, any>): void {
  telemetryService.trackError(errorType, properties)
}

export function trackSystemEvent(event: string, properties?: Record<string, any>): void {
  telemetryService.trackSystemEvent(event, properties)
}
