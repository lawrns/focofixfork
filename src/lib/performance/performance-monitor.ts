'use client'

// Performance Monitoring Types
interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  category: 'navigation' | 'resource' | 'paint' | 'layout' | 'custom'
  metadata?: Record<string, any>
}

interface PerformanceBudget {
  name: string
  threshold: number
  category: 'navigation' | 'resource' | 'paint' | 'layout' | 'custom'
  severity: 'warning' | 'error'
  description: string
}

interface PerformanceReport {
  timestamp: number
  url: string
  metrics: PerformanceMetric[]
  budgets: Array<{
    budget: PerformanceBudget
    passed: boolean
    actual: number
    variance: number
  }>
  summary: {
    totalMetrics: number
    failedBudgets: number
    warnings: number
    errors: number
    score: number
  }
}

interface BundleAnalysis {
  name: string
  size: number
  gzippedSize: number
  dependencies: string[]
  chunks: string[]
  analysis: {
    duplicateModules: number
    unusedModules: number
    optimizationScore: number
  }
}

// Performance Monitor Class
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private budgets: PerformanceBudget[] = []
  private observers: PerformanceObserver[] = []
  private isInitialized = false

  constructor() {
    this.initializeBudgets()
  }

  // Initialize performance budgets
  private initializeBudgets(): void {
    this.budgets = [
      // Navigation Performance
      {
        name: 'First Contentful Paint',
        threshold: 1500,
        category: 'paint',
        severity: 'warning',
        description: 'Time to first contentful paint should be under 1.5s'
      },
      {
        name: 'Largest Contentful Paint',
        threshold: 2500,
        category: 'paint',
        severity: 'error',
        description: 'Largest contentful paint should be under 2.5s'
      },
      {
        name: 'First Input Delay',
        threshold: 100,
        category: 'navigation',
        severity: 'warning',
        description: 'First input delay should be under 100ms'
      },
      {
        name: 'Cumulative Layout Shift',
        threshold: 0.1,
        category: 'layout',
        severity: 'warning',
        description: 'Cumulative layout shift should be under 0.1'
      },
      
      // Resource Performance
      {
        name: 'JavaScript Bundle Size',
        threshold: 250000, // 250KB
        category: 'resource',
        severity: 'warning',
        description: 'JavaScript bundle should be under 250KB'
      },
      {
        name: 'CSS Bundle Size',
        threshold: 100000, // 100KB
        category: 'resource',
        severity: 'warning',
        description: 'CSS bundle should be under 100KB'
      },
      {
        name: 'Image Optimization',
        threshold: 500000, // 500KB
        category: 'resource',
        severity: 'warning',
        description: 'Individual images should be under 500KB'
      },
      
      // Custom Metrics
      {
        name: 'API Response Time',
        threshold: 1000,
        category: 'custom',
        severity: 'warning',
        description: 'API responses should be under 1s'
      },
      {
        name: 'Component Render Time',
        threshold: 16, // 60fps
        category: 'custom',
        severity: 'warning',
        description: 'Component renders should be under 16ms'
      }
    ]
  }

  // Initialize performance monitoring
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Monitor navigation timing
      this.observeNavigationTiming()
      
      // Monitor resource timing
      this.observeResourceTiming()
      
      // Monitor paint timing
      this.observePaintTiming()
      
      // Monitor layout shifts
      this.observeLayoutShifts()
      
      // Monitor long tasks
      this.observeLongTasks()
      
      // Monitor memory usage
      this.observeMemoryUsage()
      
      this.isInitialized = true
      console.log('[PerformanceMonitor] Initialized successfully')
    } catch (error) {
      console.error('[PerformanceMonitor] Failed to initialize:', error)
    }
  }

  // Observe navigation timing
  private observeNavigationTiming(): void {
    if (typeof window === 'undefined') return

    // Get navigation timing data
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigation) {
      this.recordMetric('navigation', 'DOM Content Loaded', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart)
      this.recordMetric('navigation', 'Load Complete', navigation.loadEventEnd - navigation.loadEventStart)
      this.recordMetric('navigation', 'Total Load Time', navigation.loadEventEnd - navigation.fetchStart)
    }

    // Monitor page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.recordMetric('custom', 'Page Visibility', 1)
      }
    })
  }

  // Observe resource timing
  private observeResourceTiming(): void {
    if (typeof window === 'undefined') return

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming
          this.recordMetric('resource', `${resourceEntry.name} Load Time`, resourceEntry.duration)
          this.recordMetric('resource', `${resourceEntry.name} Size`, resourceEntry.transferSize || 0)
        }
      }
    })

    observer.observe({ entryTypes: ['resource'] })
    this.observers.push(observer)
  }

  // Observe paint timing
  private observePaintTiming(): void {
    if (typeof window === 'undefined') return

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'paint') {
          const paintEntry = entry as PerformancePaintTiming
          this.recordMetric('paint', paintEntry.name, paintEntry.startTime)
        }
      }
    })

    observer.observe({ entryTypes: ['paint'] })
    this.observers.push(observer)
  }

  // Observe layout shifts
  private observeLayoutShifts(): void {
    if (typeof window === 'undefined') return

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'layout-shift') {
          const layoutShiftEntry = entry as any
          if (!layoutShiftEntry.hadRecentInput) {
            this.recordMetric('layout', 'Layout Shift', layoutShiftEntry.value)
          }
        }
      }
    })

    observer.observe({ entryTypes: ['layout-shift'] })
    this.observers.push(observer)
  }

  // Observe long tasks
  private observeLongTasks(): void {
    if (typeof window === 'undefined') return

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'longtask') {
          const longTaskEntry = entry as any
          this.recordMetric('custom', 'Long Task', longTaskEntry.duration)
        }
      }
    })

    observer.observe({ entryTypes: ['longtask'] })
    this.observers.push(observer)
  }

  // Observe memory usage
  private observeMemoryUsage(): void {
    if (typeof window === 'undefined') return

    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        this.recordMetric('custom', 'Memory Used', memory.usedJSHeapSize)
        this.recordMetric('custom', 'Memory Total', memory.totalJSHeapSize)
        this.recordMetric('custom', 'Memory Limit', memory.jsHeapSizeLimit)
      }
    }

    // Check memory usage periodically
    setInterval(checkMemory, 30000) // Every 30 seconds
    checkMemory() // Initial check
  }

  // Record a performance metric
  recordMetric(category: PerformanceMetric['category'], name: string, value: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      category,
      metadata
    }

    this.metrics.push(metric)

    // Check against budgets
    this.checkBudgets(metric)

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }

  // Check metric against budgets
  private checkBudgets(metric: PerformanceMetric): void {
    const relevantBudgets = this.budgets.filter(budget => 
      budget.name === metric.name || 
      (budget.category === metric.category && budget.name.includes(metric.name))
    )

    for (const budget of relevantBudgets) {
      const passed = metric.value <= budget.threshold
      const variance = metric.value - budget.threshold

      if (!passed) {
        const message = `Performance budget exceeded: ${budget.name} (${metric.value}ms > ${budget.threshold}ms)`
        
        if (budget.severity === 'error') {
          console.error(`[PerformanceMonitor] ${message}`)
        } else {
          console.warn(`[PerformanceMonitor] ${message}`)
        }

        // Emit custom event for UI to handle
        window.dispatchEvent(new CustomEvent('performance-budget-exceeded', {
          detail: { budget, metric, variance }
        }))
      }
    }
  }

  // Get performance report
  getReport(): PerformanceReport {
    const now = Date.now()
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 300000) // Last 5 minutes

    const budgetResults = this.budgets.map(budget => {
      const relevantMetrics = recentMetrics.filter(m => 
        m.name === budget.name || 
        (budget.category === m.category && budget.name.includes(m.name))
      )

      if (relevantMetrics.length === 0) {
        return {
          budget,
          passed: true,
          actual: 0,
          variance: 0
        }
      }

      const latestMetric = relevantMetrics[relevantMetrics.length - 1]
      const passed = latestMetric.value <= budget.threshold
      const variance = latestMetric.value - budget.threshold

      return {
        budget,
        passed,
        actual: latestMetric.value,
        variance
      }
    })

    const failedBudgets = budgetResults.filter(r => !r.passed)
    const warnings = failedBudgets.filter(r => r.budget.severity === 'warning').length
    const errors = failedBudgets.filter(r => r.budget.severity === 'error').length

    // Calculate performance score (0-100)
    const score = Math.max(0, 100 - (warnings * 5) - (errors * 15))

    return {
      timestamp: now,
      url: window.location.href,
      metrics: recentMetrics,
      budgets: budgetResults,
      summary: {
        totalMetrics: recentMetrics.length,
        failedBudgets: failedBudgets.length,
        warnings,
        errors,
        score
      }
    }
  }

  // Get metrics by category
  getMetricsByCategory(category: PerformanceMetric['category']): PerformanceMetric[] {
    return this.metrics.filter(m => m.category === category)
  }

  // Get latest metric by name
  getLatestMetric(name: string): PerformanceMetric | null {
    const matchingMetrics = this.metrics.filter(m => m.name === name)
    return matchingMetrics.length > 0 ? matchingMetrics[matchingMetrics.length - 1] : null
  }

  // Get average metric by name
  getAverageMetric(name: string, timeWindow: number = 300000): number {
    const now = Date.now()
    const recentMetrics = this.metrics.filter(m => 
      m.name === name && now - m.timestamp < timeWindow
    )

    if (recentMetrics.length === 0) return 0

    const sum = recentMetrics.reduce((acc, m) => acc + m.value, 0)
    return sum / recentMetrics.length
  }

  // Analyze bundle size
  analyzeBundleSize(): BundleAnalysis[] {
    const bundles: BundleAnalysis[] = []

    // Get all script resources
    const scripts = performance.getEntriesByType('resource').filter(
      (entry: any) => entry.name.includes('.js')
    ) as PerformanceResourceTiming[]

    for (const script of scripts) {
      const bundle: BundleAnalysis = {
        name: script.name.split('/').pop() || 'unknown',
        size: script.transferSize || 0,
        gzippedSize: script.transferSize || 0, // Approximate
        dependencies: [],
        chunks: [],
        analysis: {
          duplicateModules: 0,
          unusedModules: 0,
          optimizationScore: 85 // Default score
        }
      }

      bundles.push(bundle)
    }

    return bundles
  }

  // Get performance recommendations
  getRecommendations(): string[] {
    const recommendations: string[] = []
    const report = this.getReport()

    // Check for slow API responses
    const apiMetrics = this.getMetricsByCategory('custom').filter(m => 
      m.name.includes('API Response Time')
    )
    if (apiMetrics.length > 0) {
      const avgApiTime = this.getAverageMetric('API Response Time')
      if (avgApiTime > 1000) {
        recommendations.push('Consider implementing API response caching')
        recommendations.push('Optimize database queries and add indexes')
      }
    }

    // Check for large bundles
    const bundles = this.analyzeBundleSize()
    const largeBundles = bundles.filter(b => b.size > 250000)
    if (largeBundles.length > 0) {
      recommendations.push('Implement code splitting for large JavaScript bundles')
      recommendations.push('Consider lazy loading for non-critical components')
    }

    // Check for layout shifts
    const layoutShifts = this.getMetricsByCategory('layout')
    if (layoutShifts.length > 0) {
      const avgLayoutShift = this.getAverageMetric('Layout Shift')
      if (avgLayoutShift > 0.1) {
        recommendations.push('Add explicit dimensions to images and videos')
        recommendations.push('Reserve space for dynamically loaded content')
      }
    }

    // Check for long tasks
    const longTasks = this.getMetricsByCategory('custom').filter(m => 
      m.name === 'Long Task'
    )
    if (longTasks.length > 0) {
      recommendations.push('Break up long-running JavaScript tasks')
      recommendations.push('Use Web Workers for CPU-intensive operations')
    }

    return recommendations
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics = []
  }

  // Dispose
  dispose(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.metrics = []
    this.isInitialized = false
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Initialize on page load
if (typeof window !== 'undefined') {
  performanceMonitor.initialize()
}

// Export types
export type {
  PerformanceMetric,
  PerformanceBudget,
  PerformanceReport,
  BundleAnalysis
}
