import { z } from 'zod'

/**
 * Schema for GET /api/milestones
 */
export const GetMilestonesSchema = z.object({
  query: z.object({
    project_id: z.string().uuid().optional(),
    status: z.enum(['green', 'yellow', 'red']).optional(),
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
    offset: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0)).optional(),
    with_task_counts: z.string().transform(val => val === 'true').optional()
  }).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for POST /api/milestones
 */
export const CreateMilestoneSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Milestone name is required').max(500, 'Name must be less than 500 characters'),
    description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
    project_id: z.string().min(1, 'Project is required'),
    status: z.enum(['green', 'yellow', 'red']).default('green'),
    progress_percentage: z.number().min(0).max(100).default(0),
    deadline: z.string().min(1, 'Deadline is required'),
    due_date: z.string().optional(),
    completion_date: z.string().optional()
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for GET /api/milestones/[id]
 */
export const GetMilestoneSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for PUT /api/milestones/[id]
 */
export const UpdateMilestoneSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(500).optional(),
    description: z.string().max(2000).optional(),
    status: z.enum(['green', 'yellow', 'red']).optional(),
    progress_percentage: z.number().min(0).max(100).optional(),
    deadline: z.string().optional(),
    due_date: z.string().optional(),
    completion_date: z.string().optional()
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for DELETE /api/milestones/[id]
 */
export const DeleteMilestoneSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional()
})
