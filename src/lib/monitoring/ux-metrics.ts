'use client'

interface UXMetric {
  id: string
  type: 'performance' | 'engagement' | 'conversion' | 'error' | 'accessibility'
  name: string
  value: number
  unit: string
  timestamp: number
  metadata?: Record<string, any>
}

interface UserSession {
  id: string
  startTime: number
  endTime?: number
  pageViews: number
  interactions: number
  errors: number
  device: {
    type: 'mobile' | 'tablet' | 'desktop'
    userAgent: string
    screenSize: string
  }
  user?: {
    id: string
    email: string
    level: 'beginner' | 'intermediate' | 'advanced'
  }
}

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  url: string
  metadata?: Record<string, any>
}

class UXMetricsCollector {
  private metrics: UXMetric[] = []
  private session: UserSession | null = null
  private isCollecting = false
  private observers: Array<(metric: UXMetric) => void> = []

  constructor() {
    this.initializeSession()
    this.startCollection()
  }

  private initializeSession() {
    if (typeof window === 'undefined') return

    this.session = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
      pageViews: 0,
      interactions: 0,
      errors: 0,
      device: {
        type: this.getDeviceType(),
        userAgent: navigator.userAgent,
        screenSize: `${window.screen.width}x${window.screen.height}`
      }
    }

    // Track session end
    window.addEventListener('beforeunload', () => {
      this.endSession()
    })

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackMetric('engagement', 'session_pause', Date.now() - this.session!.startTime, 'ms')
      } else {
        this.trackMetric('engagement', 'session_resume', Date.now() - this.session!.startTime, 'ms')
      }
    })
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop'
    
    const width = window.innerWidth
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }

  private startCollection() {
    if (typeof window === 'undefined' || this.isCollecting) return

    this.isCollecting = true

    // Track page views
    this.trackPageView(window.location.pathname)

    // Track performance metrics
    this.trackPerformanceMetrics()

    // Track user interactions
    this.trackInteractions()

    // Track errors
    this.trackErrors()

    // Track accessibility metrics
    this.trackAccessibilityMetrics()

    // Periodic collection
    setInterval(() => {
      this.collectPeriodicMetrics()
    }, 30000) // Every 30 seconds
  }

  private trackPageView(path: string) {
    if (!this.session) return

    this.session.pageViews++
    this.trackMetric('engagement', 'page_view', 1, 'count', {
      path,
      timestamp: Date.now()
    })

    // Track time on previous page
    if (this.session.pageViews > 1) {
      const timeOnPage = Date.now() - this.session.startTime
      this.trackMetric('engagement', 'time_on_page', timeOnPage, 'ms', {
        path: window.location.pathname
      })
    }
  }

  private trackPerformanceMetrics() {
    if (typeof window === 'undefined') return

    // Track Core Web Vitals
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        this.trackMetric('performance', 'lcp', lastEntry.startTime, 'ms', {
          url: window.location.pathname
        })
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          this.trackMetric('performance', 'fid', entry.processingStart - entry.startTime, 'ms', {
            url: window.location.pathname
          })
        })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })

      // Cumulative Layout Shift (CLS)
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })
        this.trackMetric('performance', 'cls', clsValue, 'score', {
          url: window.location.pathname
        })
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
    }

    // Track page load time
    window.addEventListener('load', () => {
      const loadTime = performance.now()
      this.trackMetric('performance', 'page_load_time', loadTime, 'ms', {
        url: window.location.pathname
      })
    })
  }

  private trackInteractions() {
    if (typeof window === 'undefined') return

    let interactionCount = 0
    const interactionTypes = new Set<string>()

    // Track clicks
    document.addEventListener('click', (e) => {
      interactionCount++
      if (this.session) this.session.interactions++
      
      const target = e.target as HTMLElement
      interactionTypes.add('click')
      
      this.trackMetric('engagement', 'click', 1, 'count', {
        target: target.tagName,
        id: target.id,
        className: target.className,
        text: target.textContent?.slice(0, 50)
      })
    })

    // Track form interactions
    document.addEventListener('input', (e) => {
      interactionCount++
      if (this.session) this.session.interactions++
      
      const target = e.target as HTMLInputElement
      interactionTypes.add('form_input')
      
      this.trackMetric('engagement', 'form_input', 1, 'count', {
        type: target.type,
        id: target.id,
        field: target.name
      })
    })

    // Track scroll depth
    let maxScrollDepth = 0
    window.addEventListener('scroll', () => {
      const scrollDepth = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      )
      maxScrollDepth = Math.max(maxScrollDepth, scrollDepth)
      
      this.trackMetric('engagement', 'scroll_depth', scrollDepth, 'percent', {
        url: window.location.pathname
      })
    })

    // Track interaction diversity
    setInterval(() => {
      this.trackMetric('engagement', 'interaction_diversity', interactionTypes.size, 'count', {
        types: Array.from(interactionTypes)
      })
    }, 60000) // Every minute
  }

  private trackErrors() {
    if (typeof window === 'undefined') return

    // Track JavaScript errors
    window.addEventListener('error', (e) => {
      if (this.session) this.session.errors++
      
      this.trackMetric('error', 'javascript_error', 1, 'count', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error?.stack
      })
    })

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
      if (this.session) this.session.errors++
      
      this.trackMetric('error', 'unhandled_rejection', 1, 'count', {
        reason: e.reason?.toString(),
        stack: e.reason?.stack
      })
    })

    // Track network errors
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args)
        if (!response.ok) {
          this.trackMetric('error', 'network_error', 1, 'count', {
            url: args[0]?.toString(),
            status: response.status,
            statusText: response.statusText
          })
        }
        return response
      } catch (error) {
        this.trackMetric('error', 'network_error', 1, 'count', {
          url: args[0]?.toString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        throw error
      }
    }
  }

  private trackAccessibilityMetrics() {
    if (typeof window === 'undefined') return

    // Track keyboard navigation
    let keyboardUsage = 0
    let mouseUsage = 0

    document.addEventListener('keydown', () => {
      keyboardUsage++
    })

    document.addEventListener('mousedown', () => {
      mouseUsage++
    })

    // Track focus management
    document.addEventListener('focusin', (e) => {
      this.trackMetric('accessibility', 'focus_event', 1, 'count', {
        target: (e.target as HTMLElement).tagName,
        id: (e.target as HTMLElement).id
      })
    })

    // Track ARIA usage
    const ariaElements = document.querySelectorAll('[aria-label], [aria-describedby], [role]')
    this.trackMetric('accessibility', 'aria_usage', ariaElements.length, 'count', {
      url: window.location.pathname
    })

    // Track color contrast (simplified)
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div')
    let lowContrastElements = 0
    
    textElements.forEach((element) => {
      const styles = window.getComputedStyle(element)
      const color = styles.color
      const backgroundColor = styles.backgroundColor
      
      // Simplified contrast check (in real implementation, use a proper contrast ratio calculator)
      if (color === backgroundColor) {
        lowContrastElements++
      }
    })

    this.trackMetric('accessibility', 'low_contrast_elements', lowContrastElements, 'count', {
      url: window.location.pathname
    })

    // Track keyboard vs mouse usage ratio
    setInterval(() => {
      const totalUsage = keyboardUsage + mouseUsage
      if (totalUsage > 0) {
        const keyboardRatio = keyboardUsage / totalUsage
        this.trackMetric('accessibility', 'keyboard_usage_ratio', keyboardRatio, 'ratio', {
          keyboardUsage,
          mouseUsage
        })
      }
    }, 60000) // Every minute
  }

  private collectPeriodicMetrics() {
    if (!this.session) return

    // Track session duration
    const sessionDuration = Date.now() - this.session.startTime
    this.trackMetric('engagement', 'session_duration', sessionDuration, 'ms')

    // Track memory usage (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory
      this.trackMetric('performance', 'memory_usage', memory.usedJSHeapSize, 'bytes', {
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      })
    }

    // Track connection quality
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      this.trackMetric('performance', 'connection_quality', connection.effectiveType === '4g' ? 1 : 0, 'score', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      })
    }
  }

  private trackMetric(
    type: UXMetric['type'],
    name: string,
    value: number,
    unit: string,
    metadata?: Record<string, any>
  ) {
    const metric: UXMetric = {
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      name,
      value,
      unit,
      timestamp: Date.now(),
      metadata
    }

    this.metrics.push(metric)
    this.notifyObservers(metric)

    // Send to server (debounced)
    this.debouncedSendToServer()
  }

  private debouncedSendToServer = this.debounce(() => {
    this.sendMetricsToServer()
  }, 5000)

  private debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  private async sendMetricsToServer() {
    if (this.metrics.length === 0) return

    try {
      const response = await fetch('/api/monitoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session: this.session,
          metrics: this.metrics
        }),
      })

      if (response.ok) {
        this.metrics = [] // Clear sent metrics
      }
    } catch (error) {
      console.error('[UXMetrics] Failed to send metrics:', error)
    }
  }

  private notifyObservers(metric: UXMetric) {
    this.observers.forEach(observer => observer(metric))
  }

  private endSession() {
    if (!this.session) return

    this.session.endTime = Date.now()
    const sessionDuration = this.session.endTime - this.session.startTime

    this.trackMetric('engagement', 'session_end', sessionDuration, 'ms', {
      pageViews: this.session.pageViews,
      interactions: this.session.interactions,
      errors: this.session.errors
    })

    // Send final session data
    this.sendMetricsToServer()
  }

  // Public methods
  public subscribe(observer: (metric: UXMetric) => void) {
    this.observers.push(observer)
  }

  public unsubscribe(observer: (metric: UXMetric) => void) {
    this.observers = this.observers.filter(obs => obs !== observer)
  }

  public getMetrics(): UXMetric[] {
    return [...this.metrics]
  }

  public getSession(): UserSession | null {
    return this.session
  }

  public trackCustomMetric(
    name: string,
    value: number,
    unit: string,
    metadata?: Record<string, any>
  ) {
    this.trackMetric('engagement', name, value, unit, metadata)
  }

  public setUser(user: UserSession['user']) {
    if (this.session) {
      this.session.user = user
    }
  }
}

export const uxMetrics = new UXMetricsCollector()
