import { z } from 'zod'

// Time Period Enum for filtering
export const TimePeriodSchema = z.enum(['7d', '30d', '90d', '1y'])
export type TimePeriod = z.infer<typeof TimePeriodSchema>

// Project Metrics Schema
export const ProjectMetricsSchema = z.object({
  projectId: z.string().uuid(),
  projectName: z.string(),
  completionRate: z.number().min(0).max(100),
  totalTasks: z.number().min(0),
  completedTasks: z.number().min(0),
  overdueTasks: z.number().min(0),
  averageCycleTime: z.number().min(0), // in days
  healthIndex: z.number().min(0).max(100),
})

// Detailed Project Metrics (includes breakdowns)
export const ProjectMetricsDetailedSchema = ProjectMetricsSchema.extend({
  taskBreakdown: z.object({
    todo: z.number().min(0),
    in_progress: z.number().min(0),
    review: z.number().min(0),
    done: z.number().min(0),
  }),
  milestoneProgress: z.array(z.object({
    milestoneId: z.string().uuid(),
    milestoneName: z.string(),
    progress: z.number().min(0).max(100),
    dueDate: z.string().optional(), // ISO date string
    isOverdue: z.boolean(),
  })),
  recentActivity: z.array(z.object({
    date: z.string(), // ISO date string
    tasksCompleted: z.number().min(0),
    newTasks: z.number().min(0),
  })),
})

// Team Metrics Schema
export const TeamMetricsSchema = z.object({
  userId: z.string().uuid(),
  userName: z.string(),
  tasksCompleted: z.number().min(0),
  averageCycleTime: z.number().min(0), // in days
  overdueTasks: z.number().min(0),
  workloadScore: z.number().min(0).max(100),
  activeProjects: z.number().min(0),
})

// Time Series Data Point
export const TimeSeriesDataPointSchema = z.object({
  date: z.string(), // ISO date string
  metric: z.enum(['completion_rate', 'task_velocity', 'cycle_time', 'overdue_tasks']),
  value: z.number(),
  projectId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
})

// Dashboard Analytics Summary
export const AnalyticsSummarySchema = z.object({
  totalProjects: z.number().min(0),
  activeProjects: z.number().min(0),
  completedProjects: z.number().min(0),
  totalTasks: z.number().min(0),
  completedTasks: z.number().min(0),
  overdueTasks: z.number().min(0),
  averageCompletionRate: z.number().min(0).max(100),
  totalTeamMembers: z.number().min(0),
  averageWorkload: z.number().min(0).max(100),
  averageCompletionTime: z.number().min(0),
})

// Complete Dashboard Analytics
export const DashboardAnalyticsSchema = z.object({
  projectMetrics: z.array(ProjectMetricsSchema),
  teamMetrics: z.array(TeamMetricsSchema),
  timeSeriesData: z.array(TimeSeriesDataPointSchema),
  summary: AnalyticsSummarySchema,
})

// Analytics Query Parameters
export const AnalyticsQueryParamsSchema = z.object({
  timePeriod: TimePeriodSchema.default('30d'),
  organizationId: z.string().uuid().optional(),
  projectIds: z.array(z.string().uuid()).optional(),
  userIds: z.array(z.string().uuid()).optional(),
})

// Trends Query Parameters
export const TrendsQueryParamsSchema = z.object({
  metric: z.enum(['completion_rate', 'task_velocity', 'cycle_time', 'overdue_tasks']),
  startDate: z.string().optional(), // ISO date string
  endDate: z.string().optional(), // ISO date string
  projectId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
})

// Export Request Schema
export const AnalyticsExportRequestSchema = z.object({
  format: z.enum(['csv', 'json', 'pdf']).default('csv'),
  timePeriod: TimePeriodSchema.default('30d'),
  projectIds: z.array(z.string().uuid()).optional(),
  includeTeamMetrics: z.boolean().default(true),
})

// Export Response Schema
export const AnalyticsExportResponseSchema = z.object({
  exportId: z.string().uuid(),
  status: z.enum(['processing', 'completed', 'failed']),
  downloadUrl: z.string().url().optional(),
  expiresAt: z.string().datetime().optional(),
})

// Analytics Filter State
export const AnalyticsFiltersSchema = z.object({
  timePeriod: TimePeriodSchema,
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional(),
  selectedProjects: z.array(z.string().uuid()),
  selectedUsers: z.array(z.string().uuid()),
  groupBy: z.enum(['day', 'week', 'month']).default('week'),
})

// Analytics Chart Data
export const ChartDataPointSchema = z.object({
  label: z.string(),
  value: z.number(),
  color: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export const ChartDatasetSchema = z.object({
  label: z.string(),
  data: z.array(ChartDataPointSchema),
  borderColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  fill: z.boolean().optional(),
})

export const ChartConfigSchema = z.object({
  type: z.enum(['line', 'bar', 'pie', 'doughnut']),
  title: z.string(),
  datasets: z.array(ChartDatasetSchema),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
})

// Type exports
export type ProjectMetrics = z.infer<typeof ProjectMetricsSchema>
export type ProjectMetricsDetailed = z.infer<typeof ProjectMetricsDetailedSchema>
export type TeamMetrics = z.infer<typeof TeamMetricsSchema>
export type TimeSeriesDataPoint = z.infer<typeof TimeSeriesDataPointSchema>
export type AnalyticsSummary = z.infer<typeof AnalyticsSummarySchema>
export type DashboardAnalytics = z.infer<typeof DashboardAnalyticsSchema>
export type AnalyticsQueryParams = z.infer<typeof AnalyticsQueryParamsSchema>
export type TrendsQueryParams = z.infer<typeof TrendsQueryParamsSchema>
export type AnalyticsExportRequest = z.infer<typeof AnalyticsExportRequestSchema>
export type AnalyticsExportResponse = z.infer<typeof AnalyticsExportResponseSchema>
export type AnalyticsFilters = z.infer<typeof AnalyticsFiltersSchema>
export type ChartDataPoint = z.infer<typeof ChartDataPointSchema>
export type ChartDataset = z.infer<typeof ChartDatasetSchema>
export type ChartConfig = z.infer<typeof ChartConfigSchema>

