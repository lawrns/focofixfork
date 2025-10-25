import { z } from 'zod'

/**
 * Schema for GET /api/goals
 */
export const GetGoalsSchema = z.object({
  query: z.object({
    limit: z.string().transform(val => Math.min(parseInt(val, 10), 100)).optional(),
    offset: z.string().transform(val => Math.max(parseInt(val, 10), 0)).optional()
  }).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for POST /api/goals
 */
export const CreateGoalApiSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    type: z.enum(['project', 'milestone', 'task', 'organization', 'personal']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    status: z.enum(['draft', 'active', 'completed', 'cancelled', 'on_hold']).optional(),
    target_value: z.number().positive().optional(),
    unit: z.string().max(50).optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    organization_id: z.string().optional(),
    project_id: z.string().optional(),
    tags: z.array(z.string()).optional()
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for GET /api/goals/[id]
 */
export const GetGoalSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for PUT /api/goals/[id]
 */
export const UpdateGoalSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    type: z.enum(['project', 'milestone', 'task', 'organization', 'personal']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    status: z.enum(['draft', 'active', 'completed', 'cancelled', 'on_hold']).optional(),
    target_value: z.number().positive().optional(),
    unit: z.string().max(50).optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    tags: z.array(z.string()).optional()
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for DELETE /api/goals/[id]
 */
export const DeleteGoalSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for GET /api/goals/[id]/milestones
 */
export const GetGoalMilestonesSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for POST /api/goals/[id]/milestones
 */
export const CreateGoalMilestoneSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(2000).optional(),
    due_date: z.string().optional(),
    status: z.enum(['planned', 'active', 'completed', 'cancelled']).optional()
  }).strict(),
  query: z.object({}).optional()
})
