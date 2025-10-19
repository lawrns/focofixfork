'use client'

import { useEffect, useCallback } from 'react'
import { telemetryService } from '@/lib/telemetry/telemetry-service'

interface UseTelemetryOptions {
  enabled?: boolean
  userId?: string | null
  trackPageViews?: boolean
  trackClicks?: boolean
  trackFormSubmissions?: boolean
}

export function useTelemetry(options: UseTelemetryOptions = {}) {
  const {
    enabled = true,
    userId,
    trackPageViews = true,
    trackClicks = true,
    trackFormSubmissions = true
  } = options

  // Set user ID
  useEffect(() => {
    if (enabled && userId) {
      telemetryService.setUserId(userId)
    }
  }, [enabled, userId])

  // Track page views
  useEffect(() => {
    if (!enabled || !trackPageViews) return

    const trackPageView = () => {
      telemetryService.trackUserAction('page-view', {
        path: window.location.pathname,
        search: window.location.search,
        title: document.title
      })
    }

    // Track initial page view
    trackPageView()

    // Track navigation changes
    const handlePopState = () => trackPageView()
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [enabled, trackPageViews])

  // Track clicks
  useEffect(() => {
    if (!enabled || !trackClicks) return

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const element = target.closest('button, a, [role="button"]')
      
      if (element) {
        const tagName = element.tagName.toLowerCase()
        const text = element.textContent?.trim() || ''
        const href = element.getAttribute('href') || ''
        const role = element.getAttribute('role') || ''
        
        telemetryService.trackUserAction('click', {
          tagName,
          text: text.substring(0, 50),
          href: href.substring(0, 100),
          role,
          x: event.clientX,
          y: event.clientY
        })
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [enabled, trackClicks])

  // Track form submissions
  useEffect(() => {
    if (!enabled || !trackFormSubmissions) return

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement
      const formId = form.id || 'unnamed'
      const formAction = form.action || ''
      const formMethod = form.method || 'get'
      
      telemetryService.trackUserAction('form-submit', {
        formId,
        formAction,
        formMethod,
        fieldCount: form.elements.length
      })
    }

    document.addEventListener('submit', handleSubmit)
    return () => document.removeEventListener('submit', handleSubmit)
  }, [enabled, trackFormSubmissions])

  // Helper functions
  const trackEvent = useCallback((eventType: string, properties?: Record<string, any>) => {
    if (enabled) {
      telemetryService.track(eventType, properties)
    }
  }, [enabled])

  const trackUserAction = useCallback((action: string, properties?: Record<string, any>) => {
    if (enabled) {
      telemetryService.trackUserAction(action, properties)
    }
  }, [enabled])

  const trackFeatureUsage = useCallback((feature: string, properties?: Record<string, any>) => {
    if (enabled) {
      telemetryService.trackFeatureUsage(feature, properties)
    }
  }, [enabled])

  const trackPerformance = useCallback((metric: string, value: number, properties?: Record<string, any>) => {
    if (enabled) {
      telemetryService.trackPerformance(metric, value, properties)
    }
  }, [enabled])

  const trackError = useCallback((errorType: string, properties?: Record<string, any>) => {
    if (enabled) {
      telemetryService.trackError(errorType, properties)
    }
  }, [enabled])

  return {
    trackEvent,
    trackUserAction,
    trackFeatureUsage,
    trackPerformance,
    trackError
  }
}
