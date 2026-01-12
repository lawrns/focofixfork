import { useState, useCallback, useEffect } from 'react'
import { ActivityItem } from '@/components/activity/activity-feed'

interface UseActivityFeedOptions {
  projectId?: string
  entityId?: string
  limit?: number
  autoFetch?: boolean
}

interface UseActivityFeedResult {
  activities: ActivityItem[]
  loading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refetch: () => Promise<void>
}

/**
 * Hook for fetching and managing activity feed data
 */
export function useActivityFeed(options: UseActivityFeedOptions = {}): UseActivityFeedResult {
  const {
    projectId,
    entityId,
    limit = 50,
    autoFetch = true,
  } = options

  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const fetchActivities = useCallback(async (loadMore = false) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (projectId) params.append('project_id', projectId)
      if (entityId) params.append('entity_id', entityId)
      params.append('limit', limit.toString())
      params.append('offset', (loadMore ? offset + limit : 0).toString())

      const response = await fetch(`/api/activity?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch activity feed')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch activity')
      }

      const newActivities = data.data.data || []

      if (loadMore) {
        setActivities(prev => [...prev, ...newActivities])
        setOffset(prev => prev + limit)
      } else {
        setActivities(newActivities)
        setOffset(0)
      }

      setHasMore(newActivities.length === limit)
    } catch (err: any) {
      setError(err.message)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [projectId, entityId, limit, offset])

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    await fetchActivities(true)
  }, [hasMore, loading, fetchActivities])

  const refetch = useCallback(async () => {
    setOffset(0)
    await fetchActivities(false)
  }, [fetchActivities])

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchActivities(false)
    }
  }, [autoFetch, projectId, entityId])

  return {
    activities,
    loading,
    error,
    hasMore,
    loadMore,
    refetch,
  }
}
