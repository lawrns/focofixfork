import { useState, useEffect, useCallback } from 'react'
import { analyticsService } from '../services/analyticsService'
import type { AnalyticsData, AnalyticsFilters } from '../types'

export function useAnalytics(filters?: AnalyticsFilters) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await analyticsService.getComprehensiveAnalytics(
        filters?.organizationId,
        filters?.dateRange?.start,
        filters?.dateRange?.end
      )
      setAnalytics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics
  }
}

export function useProjectAnalytics(organizationId?: string) {
  const [analytics, setAnalytics] = useState<import('../types').ProjectAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await analyticsService.getProjectAnalytics(organizationId)
      setAnalytics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project analytics')
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics
  }
}

export function useTaskAnalytics(organizationId?: string) {
  const [analytics, setAnalytics] = useState<import('../types').TaskAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await analyticsService.getTaskAnalytics(organizationId)
      setAnalytics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch task analytics')
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics
  }
}

export function useTimeTrackingAnalytics(organizationId?: string, startDate?: string, endDate?: string) {
  const [analytics, setAnalytics] = useState<import('../types').TimeTrackingAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await analyticsService.getTimeTrackingAnalytics(organizationId, startDate, endDate)
      setAnalytics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch time tracking analytics')
    } finally {
      setLoading(false)
    }
  }, [organizationId, startDate, endDate])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics
  }
}
