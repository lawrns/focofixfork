import { useState, useEffect, useCallback } from 'react'
import { analyticsService } from '@/lib/services/analytics.service'
import { useAuth } from '@/lib/hooks/use-auth'
import type { AnalyticsData, AnalyticsFilters } from '../types'

export function useAnalytics(filters?: AnalyticsFilters) {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const userId = user.id
      const dashboardData = await analyticsService.getDashboardAnalytics(
        userId,
        '30d',
        filters?.organizationId
      )

      // Map DashboardAnalytics to AnalyticsData
      const analyticsData: AnalyticsData = {
        projects: {
          totalProjects: dashboardData.projectMetrics.length,
          activeProjects: dashboardData.projectMetrics.filter(p => p.completionRate < 100).length,
          completedProjects: dashboardData.projectMetrics.filter(p => p.completionRate === 100).length,
          overdueProjects: dashboardData.projectMetrics.filter(p => p.overdueTasks > 0).length,
          projectCompletionRate: dashboardData.summary.averageCompletionRate || 0,
          averageProjectDuration: dashboardData.summary.averageCompletionTime
        },
        milestones: {
          totalMilestones: 0,
          completedMilestones: 0,
          overdueMilestones: 0,
          milestoneCompletionRate: 0,
          averageMilestoneDuration: 0
        },
        tasks: {
          totalTasks: dashboardData.summary.totalTasks || 0,
          completedTasks: dashboardData.summary.completedTasks || 0,
          overdueTasks: dashboardData.summary.overdueTasks || 0,
          taskCompletionRate: dashboardData.summary.averageCompletionRate || 0,
          tasksByPriority: {},
          tasksByStatus: {
            completed: dashboardData.summary.completedTasks || 0,
            inProgress: (dashboardData.summary.totalTasks || 0) - (dashboardData.summary.completedTasks || 0) - (dashboardData.summary.overdueTasks || 0),
            overdue: dashboardData.summary.overdueTasks || 0
          }
        },
        timeTracking: {
          totalHoursTracked: (dashboardData.summary.averageCompletionTime || 0) * (dashboardData.summary.completedTasks || 0),
          averageHoursPerDay: dashboardData.summary.averageCompletionTime || 0,
          mostProductiveDay: 'Monday',
          topContributors: dashboardData.teamMetrics.slice(0, 5).map(tm => ({
            userId: tm.userId,
            name: tm.userName,
            hours: (tm.averageCycleTime || 0) * tm.tasksCompleted
          })),
          hoursByProject: []
        },
        team: {
          totalMembers: dashboardData.teamMetrics.length,
          activeMembers: dashboardData.teamMetrics.filter(tm => tm.activeProjects > 0).length,
          averageTasksPerMember: dashboardData.teamMetrics.length > 0 ? dashboardData.teamMetrics.reduce((sum, tm) => sum + tm.tasksCompleted, 0) / dashboardData.teamMetrics.length : 0,
          memberProductivity: dashboardData.teamMetrics.map(tm => ({
            userId: tm.userId,
            name: tm.userName,
            tasksCompleted: tm.tasksCompleted,
            hoursTracked: (tm.averageCycleTime || 0) * tm.tasksCompleted
          }))
        },
        generatedAt: new Date().toISOString()
      }

      setAnalytics(analyticsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }, [user?.id, filters])

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
      // Get user ID from somewhere - this should be passed or from context
      const userId = 'current-user' // TODO: Get from auth context
      const data = await analyticsService.getDashboardAnalytics(userId, '30d', organizationId)
      // Extract project analytics from dashboard data
      const projectAnalytics = {
        totalProjects: data.projectMetrics.length,
        activeProjects: data.projectMetrics.filter(p => p.completionRate < 100).length,
        completedProjects: data.projectMetrics.filter(p => p.completionRate === 100).length,
        overallCompletionRate: data.summary.averageCompletionRate,
        projects: data.projectMetrics
      }
      setAnalytics(projectAnalytics as any)
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
      // Get user ID from somewhere - this should be passed or from context
      const userId = 'current-user' // TODO: Get from auth context
      const data = await analyticsService.getDashboardAnalytics(userId, '30d', organizationId)
      // Extract task analytics from dashboard data
      const taskAnalytics = {
        totalTasks: data.summary.totalTasks || 0,
        completedTasks: data.summary.completedTasks || 0,
        inProgressTasks: (data.summary.totalTasks || 0) - (data.summary.completedTasks || 0) - (data.summary.overdueTasks || 0),
        overdueTasks: data.summary.overdueTasks || 0,
        completionRate: data.summary.averageCompletionRate || 0,
        averageCycleTime: data.summary.averageCompletionTime || 0
      }
      setAnalytics(taskAnalytics as any)
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
      // Get user ID from somewhere - this should be passed or from context
      const userId = 'current-user' // TODO: Get from auth context
      const data = await analyticsService.getDashboardAnalytics(userId, '30d', organizationId)
      // Extract time tracking analytics from dashboard data
      const timeTrackingAnalytics = {
        totalTimeTracked: data.summary.averageCompletionTime * data.summary.completedTasks,
        averageTimePerTask: data.summary.averageCompletionTime,
        teamMetrics: data.teamMetrics
      }
      setAnalytics(timeTrackingAnalytics as any)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch time tracking analytics')
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
