import { supabase } from '@/lib/supabase-client'
import { supabaseAdmin } from '@/lib/supabase-server'
import type {
  ProjectMetrics,
  TeamMetrics,
  TimeSeriesDataPoint,
  AnalyticsSummary,
  DashboardAnalytics,
  TimePeriod,
  TrendsQueryParams
} from '@/lib/validation/schemas/analytics'

// AnalyticsService class for calculating and aggregating analytics data
export class AnalyticsService {
  // ===============================
  // DASHBOARD ANALYTICS
  // ===============================

  /**
   * Get comprehensive dashboard analytics
   */
  static async getDashboardAnalytics(userId: string, timePeriod: TimePeriod = '30d', organizationId?: string): Promise<DashboardAnalytics> {
    if (!userId) throw new Error('User not authenticated')

    // Get accessible projects
    const accessibleProjectIds = await this.getAccessibleProjectIds(userId, organizationId)

    if (accessibleProjectIds.length === 0) {
      return this.getEmptyDashboardAnalytics()
    }

    // Calculate date range
    const dateRange = this.calculateDateRange(timePeriod)

    // Get all metrics in parallel
    const [projectMetrics, teamMetrics, timeSeriesData] = await Promise.all([
      this.getProjectMetrics(accessibleProjectIds, dateRange),
      this.getTeamMetrics(accessibleProjectIds, dateRange),
      this.getTimeSeriesData(accessibleProjectIds, dateRange)
    ])

    // Calculate summary
    const summary = this.calculateAnalyticsSummary(projectMetrics, teamMetrics)

    return {
      projectMetrics,
      teamMetrics,
      timeSeriesData,
      summary
    }
  }

  // ===============================
  // PROJECT METRICS
  // ===============================

  /**
   * Get metrics for all accessible projects
   */
  static async getProjectMetrics(projectIds: string[], dateRange: { start: Date, end: Date }): Promise<ProjectMetrics[]> {
    const metrics: ProjectMetrics[] = []

    for (const projectId of projectIds) {
      const projectMetrics = await this.getProjectMetricsDetailed(projectId, dateRange)
      if (projectMetrics) {
        metrics.push(projectMetrics)
      }
    }

    return metrics
  }

  /**
   * Get detailed metrics for a specific project
   */
  static async getProjectMetricsDetailed(projectId: string, dateRange: { start: Date, end: Date }): Promise<ProjectMetrics | null> {
    // Get project basic info
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single()

    if (projectError || !project) return null

    // Get tasks for the project
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, status, created_at, updated_at, due_date')
      .eq('project_id', projectId)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())

    if (tasksError) throw tasksError

    // Calculate metrics
    const totalTasks = tasks?.length || 0
    const completedTasks = tasks?.filter(t => t.status === 'done').length || 0
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    // Calculate overdue tasks (simplified - tasks not completed by due date)
    const overdueTasks = tasks?.filter(t =>
      t.status !== 'done' &&
      t.due_date &&
      new Date(t.due_date) < new Date()
    ).length || 0

    // Calculate average cycle time (time from creation to completion)
    const completedTasksWithTimes = tasks?.filter(t => t.status === 'done' && t.updated_at) || []
    const averageCycleTime = completedTasksWithTimes.length > 0
      ? completedTasksWithTimes.reduce((sum, task) => {
          const created = new Date(task.created_at)
          const completed = new Date(task.updated_at!)
          const cycleTime = (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24) // days
          return sum + cycleTime
        }, 0) / completedTasksWithTimes.length
      : 0

    // Calculate health index (simplified algorithm)
    const healthIndex = this.calculateProjectHealthIndex(completionRate, overdueTasks, totalTasks)

    return {
      projectId,
      projectName: project.name,
      completionRate: Math.round(completionRate),
      totalTasks,
      completedTasks,
      overdueTasks,
      averageCycleTime: Math.round(averageCycleTime * 10) / 10, // Round to 1 decimal
      healthIndex
    }
  }

  // ===============================
  // TEAM METRICS
  // ===============================

  /**
   * Get productivity metrics for team members
   */
  static async getTeamMetrics(projectIds: string[], dateRange: { start: Date, end: Date }): Promise<TeamMetrics[]> {
    // Get all team members for the projects
    const { data: projectMembers, error: membersError } = await supabase
      .from('project_members')
      .select('user_id')
      .in('project_id', projectIds)

    if (membersError) throw membersError

    // Deduplicate users
    const userMap = new Map<string, string>()
    projectMembers?.forEach(member => {
      if (member.user_id && !userMap.has(member.user_id)) {
        userMap.set(member.user_id, 'Team Member') // Simplified for now
      }
    })

    // Calculate metrics for each user
    const teamMetrics: TeamMetrics[] = []
    for (const [userId, userName] of userMap) {
      const userMetrics = await this.getUserMetrics(userId, userName, projectIds, dateRange)
      teamMetrics.push(userMetrics)
    }

    return teamMetrics
  }

  /**
   * Get metrics for a specific team member
   */
  private static async getUserMetrics(
    userId: string,
    userName: string,
    projectIds: string[],
    dateRange: { start: Date, end: Date }
  ): Promise<TeamMetrics> {
    // Get tasks assigned to this user in the projects
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, status, created_at, updated_at, due_date')
      .eq('assignee_id', userId)
      .in('project_id', projectIds)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())

    if (tasksError) throw tasksError

    const tasksCompleted = tasks?.filter(t => t.status === 'done').length || 0

    // Calculate average cycle time
    const completedTasks = tasks?.filter(t => t.status === 'done' && t.updated_at) || []
    const averageCycleTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, task) => {
          const created = new Date(task.created_at)
          const completed = new Date(task.updated_at!)
          const cycleTime = (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
          return sum + cycleTime
        }, 0) / completedTasks.length
      : 0

    // Calculate overdue tasks
    const overdueTasks = tasks?.filter(t =>
      t.status !== 'done' &&
      t.due_date &&
      new Date(t.due_date) < new Date()
    ).length || 0

    // Calculate workload score (simplified - based on active tasks)
    const activeTasks = tasks?.filter(t => t.status !== 'done').length || 0
    const workloadScore = Math.min(activeTasks * 10, 100) // Max 100, 10 points per active task

    // Get active projects count for this user
    const activeProjects = projectIds.length // Simplified

    return {
      userId,
      userName,
      tasksCompleted,
      averageCycleTime: Math.round(averageCycleTime * 10) / 10,
      overdueTasks,
      workloadScore,
      activeProjects
    }
  }

  // ===============================
  // TIME SERIES DATA
  // ===============================

  /**
   * Get time series data for trends
   */
  static async getTimeSeriesData(projectIds: string[], dateRange: { start: Date, end: Date }): Promise<TimeSeriesDataPoint[]> {
    const timeSeriesData: TimeSeriesDataPoint[] = []

    // Generate daily completion rates for the last 30 days
    const days = Math.min(30, Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)))

    for (let i = 0; i < days; i++) {
      const date = new Date(dateRange.end)
      date.setDate(date.getDate() - (days - 1 - i))

      // Get completion rate for this day
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)

      const completionRate = await this.getCompletionRateForDate(projectIds, dayStart, dayEnd)

      timeSeriesData.push({
        date: date.toISOString().split('T')[0],
        metric: 'completion_rate',
        value: completionRate,
        projectId: projectIds[0] // Primary project for now
      })
    }

    return timeSeriesData
  }

  /**
   * Get trends data based on query parameters
   */
  static async getTrendsData(params: TrendsQueryParams): Promise<TimeSeriesDataPoint[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const projectIds = await this.getAccessibleProjectIds(user.id)

    const startDate = params.startDate ? new Date(params.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = params.endDate ? new Date(params.endDate) : new Date()

    const dateRange = { start: startDate, end: endDate }

    switch (params.metric) {
      case 'completion_rate':
        return this.getCompletionRateTrends(projectIds, dateRange)
      case 'task_velocity':
        return this.getTaskVelocityTrends(projectIds, dateRange)
      case 'cycle_time':
        return this.getCycleTimeTrends(projectIds, dateRange)
      case 'overdue_tasks':
        return this.getOverdueTasksTrends(projectIds, dateRange)
      default:
        return []
    }
  }

  // ===============================
  // EXPORT FUNCTIONALITY
  // ===============================

  /**
   * Export analytics data
   */
  static async exportAnalytics(
    timePeriod: TimePeriod,
    format: 'csv' | 'json' | 'pdf',
    includeTeamMetrics: boolean,
    projectIds?: string[]
  ): Promise<{ data: any, filename: string }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const accessibleProjectIds = projectIds || await this.getAccessibleProjectIds(user.id)
    const dateRange = this.calculateDateRange(timePeriod)

    // Get analytics data
    const analytics = await this.getDashboardAnalytics(timePeriod)

    // Filter by requested projects if specified
    if (projectIds) {
      analytics.projectMetrics = analytics.projectMetrics.filter(pm =>
        projectIds.includes(pm.projectId)
      )
      if (!includeTeamMetrics) {
        analytics.teamMetrics = []
      }
    }

    // Format data based on requested format
    switch (format) {
      case 'json':
        return {
          data: analytics,
          filename: `analytics-${timePeriod}-${new Date().toISOString().split('T')[0]}.json`
        }
      case 'csv':
        return {
          data: this.convertToCSV(analytics),
          filename: `analytics-${timePeriod}-${new Date().toISOString().split('T')[0]}.csv`
        }
      case 'pdf':
        // PDF generation would require additional library
        throw new Error('PDF export not yet implemented')
      default:
        throw new Error('Unsupported export format')
    }
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  /**
   * Get project IDs accessible to the current user
   */
  private static async getAccessibleProjectIds(userId: string, organizationId?: string): Promise<string[]> {
    let query = supabaseAdmin
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId)

    if (organizationId) {
      // Filter by organization
      query = query.eq('projects.organization_id', organizationId)
    }

    const { data, error } = await query
    if (error) throw error

    return data?.map(pm => pm.project_id) || []
  }

  /**
   * Calculate date range based on time period
   */
  private static calculateDateRange(timePeriod: TimePeriod): { start: Date, end: Date } {
    const end = new Date()
    const start = new Date()

    switch (timePeriod) {
      case '7d':
        start.setDate(end.getDate() - 7)
        break
      case '30d':
        start.setDate(end.getDate() - 30)
        break
      case '90d':
        start.setDate(end.getDate() - 90)
        break
      case '1y':
        start.setFullYear(end.getFullYear() - 1)
        break
    }

    return { start, end }
  }

  /**
   * Calculate project health index (0-100)
   */
  private static calculateProjectHealthIndex(completionRate: number, overdueTasks: number, totalTasks: number): number {
    // Simple algorithm: completion rate minus penalty for overdue tasks
    const overduePenalty = totalTasks > 0 ? (overdueTasks / totalTasks) * 50 : 0
    const healthIndex = Math.max(0, Math.min(100, completionRate - overduePenalty))

    return Math.round(healthIndex)
  }

  /**
   * Calculate completion rate for a specific date
   */
  private static async getCompletionRateForDate(projectIds: string[], start: Date, end: Date): Promise<number> {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('status')
      .in('project_id', projectIds)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    if (error) throw error

    const totalTasks = tasks?.length || 0
    const completedTasks = tasks?.filter(t => t.status === 'done').length || 0

    return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  }

  /**
   * Get empty dashboard analytics (for users with no projects)
   */
  private static getEmptyDashboardAnalytics(): DashboardAnalytics {
    return {
      projectMetrics: [],
      teamMetrics: [],
      timeSeriesData: [],
      summary: {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        averageCompletionRate: 0,
        totalTeamMembers: 0,
        averageWorkload: 0
      }
    }
  }

  /**
   * Calculate analytics summary from metrics
   */
  private static calculateAnalyticsSummary(projectMetrics: ProjectMetrics[], teamMetrics: TeamMetrics[]): AnalyticsSummary {
    const totalProjects = projectMetrics.length
    const activeProjects = projectMetrics.filter(pm => pm.completionRate < 100).length
    const completedProjects = totalProjects - activeProjects

    const totalTasks = projectMetrics.reduce((sum, pm) => sum + pm.totalTasks, 0)
    const completedTasks = projectMetrics.reduce((sum, pm) => sum + pm.completedTasks, 0)
    const averageCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    const totalTeamMembers = teamMetrics.length
    const averageWorkload = totalTeamMembers > 0
      ? teamMetrics.reduce((sum, tm) => sum + tm.workloadScore, 0) / totalTeamMembers
      : 0

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalTasks,
      completedTasks,
      averageCompletionRate: Math.round(averageCompletionRate),
      totalTeamMembers,
      averageWorkload: Math.round(averageWorkload)
    }
  }

  /**
   * Get completion rate trends
   */
  private static async getCompletionRateTrends(projectIds: string[], dateRange: { start: Date, end: Date }): Promise<TimeSeriesDataPoint[]> {
    // Simplified - return daily completion rates
    const trends: TimeSeriesDataPoint[] = []
    const days = 30

    for (let i = 0; i < days; i++) {
      const date = new Date(dateRange.end)
      date.setDate(date.getDate() - (days - 1 - i))

      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)

      const value = await this.getCompletionRateForDate(projectIds, dayStart, dayEnd)

      trends.push({
        date: date.toISOString().split('T')[0],
        metric: 'completion_rate',
        value: Math.round(value),
        projectId: projectIds[0]
      })
    }

    return trends
  }

  /**
   * Get task velocity trends (tasks completed per day)
   */
  private static async getTaskVelocityTrends(projectIds: string[], dateRange: { start: Date, end: Date }): Promise<TimeSeriesDataPoint[]> {
    // Simplified implementation
    const trends: TimeSeriesDataPoint[] = []
    const days = 30

    for (let i = 0; i < days; i++) {
      const date = new Date(dateRange.end)
      date.setDate(date.getDate() - (days - 1 - i))

      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .in('project_id', projectIds)
        .eq('status', 'done')
        .gte('updated_at', dayStart.toISOString())
        .lte('updated_at', dayEnd.toISOString())

      trends.push({
        date: date.toISOString().split('T')[0],
        metric: 'task_velocity',
        value: tasks?.length || 0,
        projectId: projectIds[0]
      })
    }

    return trends
  }

  /**
   * Get cycle time trends
   */
  private static async getCycleTimeTrends(projectIds: string[], dateRange: { start: Date, end: Date }): Promise<TimeSeriesDataPoint[]> {
    // Simplified - average cycle time over time
    const trends: TimeSeriesDataPoint[] = []
    const days = 30

    for (let i = 0; i < days; i++) {
      const date = new Date(dateRange.end)
      date.setDate(date.getDate() - (days - 1 - i))

      // Calculate average cycle time for tasks completed around this date
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - 3)
      const weekEnd = new Date(date)
      weekEnd.setDate(date.getDate() + 3)

      const { data: tasks } = await supabase
        .from('tasks')
        .select('created_at, updated_at')
        .in('project_id', projectIds)
        .eq('status', 'done')
        .gte('updated_at', weekStart.toISOString())
        .lte('updated_at', weekEnd.toISOString())

      const avgCycleTime = tasks && tasks.length > 0
        ? tasks.reduce((sum, task) => {
            const cycleTime = (new Date(task.updated_at).getTime() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24)
            return sum + cycleTime
          }, 0) / tasks.length
        : 0

      trends.push({
        date: date.toISOString().split('T')[0],
        metric: 'cycle_time',
        value: Math.round(avgCycleTime * 10) / 10,
        projectId: projectIds[0]
      })
    }

    return trends
  }

  /**
   * Get overdue tasks trends
   */
  private static async getOverdueTasksTrends(projectIds: string[], dateRange: { start: Date, end: Date }): Promise<TimeSeriesDataPoint[]> {
    const trends: TimeSeriesDataPoint[] = []
    const days = 30

    for (let i = 0; i < days; i++) {
      const date = new Date(dateRange.end)
      date.setDate(date.getDate() - (days - 1 - i))

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .in('project_id', projectIds)
        .not('status', 'eq', 'done')
        .not('due_date', 'is', null)
        .lt('due_date', date.toISOString())

      trends.push({
        date: date.toISOString().split('T')[0],
        metric: 'overdue_tasks',
        value: tasks?.length || 0,
        projectId: projectIds[0]
      })
    }

    return trends
  }

  /**
   * Convert analytics data to CSV format
   */
  private static convertToCSV(analytics: DashboardAnalytics): string {
    const lines: string[] = []

    // Add headers and project metrics
    lines.push('Project Metrics')
    lines.push('Project Name,Completion Rate,Total Tasks,Completed Tasks,Overdue Tasks,Avg Cycle Time,Health Index')
    analytics.projectMetrics.forEach(pm => {
      lines.push(`${pm.projectName},${pm.completionRate},${pm.totalTasks},${pm.completedTasks},${pm.overdueTasks},${pm.averageCycleTime},${pm.healthIndex}`)
    })

    lines.push('')
    lines.push('Team Metrics')
    lines.push('User Name,Tasks Completed,Avg Cycle Time,Overdue Tasks,Workload Score,Active Projects')
    analytics.teamMetrics.forEach(tm => {
      lines.push(`${tm.userName},${tm.tasksCompleted},${tm.averageCycleTime},${tm.overdueTasks},${tm.workloadScore},${tm.activeProjects}`)
    })

    return lines.join('\n')
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService
