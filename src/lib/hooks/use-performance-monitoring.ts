'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { performanceMonitor, PerformanceReport } from '@/lib/performance/performance-monitor'

interface UsePerformanceMonitoringOptions {
  autoStart?: boolean
  reportInterval?: number
  enableCoreWebVitals?: boolean
  enableComponentMonitoring?: boolean
  enableAPIMonitoring?: boolean
}

interface PerformanceMonitoringState {
  isMonitoring: boolean
  report: PerformanceReport | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

export function usePerformanceMonitoring(options: UsePerformanceMonitoringOptions = {}) {
  const {
    autoStart = true,
    reportInterval = 30000,
    enableCoreWebVitals = true,
    enableComponentMonitoring = true,
    enableAPIMonitoring = true
  } = options

  const [state, setState] = useState<PerformanceMonitoringState>({
    isMonitoring: false,
    report: null,
    loading: false,
    error: null,
    lastUpdated: null
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const componentTimersRef = useRef<Map<string, number>>(new Map())

  // Start monitoring
  const startMonitoring = useCallback(async () => {
    if (state.isMonitoring) return

    try {
      await performanceMonitor.initialize()
      setState(prev => ({ ...prev, isMonitoring: true, error: null }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: `Failed to start monitoring: ${error}` 
      }))
    }
  }, [state.isMonitoring])

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (!state.isMonitoring) return

    try {
      performanceMonitor.dispose()
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      setState(prev => ({ ...prev, isMonitoring: false }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: `Failed to stop monitoring: ${error}` 
      }))
    }
  }, [state.isMonitoring])

  // Generate report
  const generateReport = useCallback(async () => {
    if (!state.isMonitoring) return

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const report = performanceMonitor.getReport()
      setState(prev => ({ 
        ...prev, 
        report, 
        loading: false, 
        lastUpdated: new Date() 
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: `Failed to generate report: ${error}` 
      }))
    }
  }, [state.isMonitoring])

  // Measure component render time
  const measureComponentRender = useCallback((componentName: string) => {
    if (!state.isMonitoring || !enableComponentMonitoring) return

    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      performanceMonitor.recordMetric('custom', `Component Render: ${componentName}`, renderTime, { componentName })
    }
  }, [state.isMonitoring, enableComponentMonitoring])

  // Measure API call
  const measureAPICall = useCallback((endpoint: string) => {
    if (!state.isMonitoring || !enableAPIMonitoring) return

    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      performanceMonitor.recordMetric('custom', `API Call: ${endpoint}`, responseTime, { endpoint })
    }
  }, [state.isMonitoring, enableAPIMonitoring])

  // Measure custom operation
  const measureOperation = useCallback((operationName: string) => {
    if (!state.isMonitoring) return

    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      performanceMonitor.recordMetric('custom', `Operation: ${operationName}`, duration, { operationName })
    }
  }, [state.isMonitoring])

  // Set up automatic reporting
  useEffect(() => {
    if (state.isMonitoring && reportInterval > 0) {
      intervalRef.current = setInterval(generateReport, reportInterval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [state.isMonitoring, reportInterval, generateReport])

  // Auto-start monitoring
  useEffect(() => {
    if (autoStart) {
      startMonitoring()
    }

    return () => {
      stopMonitoring()
    }
  }, [autoStart, startMonitoring, stopMonitoring])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring()
    }
  }, [stopMonitoring])

  return {
    ...state,
    startMonitoring,
    stopMonitoring,
    generateReport,
    measureComponentRender,
    measureAPICall,
    measureOperation
  }
}
