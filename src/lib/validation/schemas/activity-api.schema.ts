import { z } from 'zod'

/**
 * Schema for GET /api/activities
 */
export const GetActivitiesSchema = z.object({
  query: z.object({
    project_id: z.string().uuid().optional(),
    workspace_id: z.string().uuid().optional(),
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
    offset: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0)).optional()
  }).optional(),
  body: z.object({}).optional()
})
