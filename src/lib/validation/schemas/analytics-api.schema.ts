import { z } from 'zod'

/**
 * Schema for GET /api/analytics/dashboard
 */
export const GetDashboardAnalyticsSchema = z.object({
  query: z.object({
    timePeriod: z.string().optional(),
    organizationId: z.string().uuid().optional()
  }).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for GET /api/analytics/trends
 */
export const GetTrendsAnalyticsSchema = z.object({
  query: z.object({
    metric: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    projectId: z.string().uuid().optional(),
    userId: z.string().uuid().optional()
  }).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for GET /api/analytics/team
 */
export const GetTeamAnalyticsSchema = z.object({
  query: z.object({
    timePeriod: z.string().optional(),
    organizationId: z.string().uuid().optional()
  }).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for GET /api/analytics/projects
 */
export const GetProjectsAnalyticsSchema = z.object({
  query: z.object({
    timePeriod: z.string().optional(),
    organizationId: z.string().uuid().optional()
  }).optional(),
  body: z.object({}).optional()
})
