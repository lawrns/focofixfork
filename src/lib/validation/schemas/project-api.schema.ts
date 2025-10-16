import { z } from 'zod'

/**
 * Schema for GET /api/projects - List projects
 */
export const GetProjectsSchema = z.object({
  query: z.object({
    organization_id: z.string().uuid().optional(),
    status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
    offset: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0)).optional()
  }).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for POST /api/projects - Create project
 */
export const CreateProjectApiSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Project name is required').max(500, 'Name must be less than 500 characters'),
    description: z.string().max(2000, 'Description must be less than 2000 characters').nullable().optional(),
    organization_id: z.string().nullable().optional(),
    status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    start_date: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    progress_percentage: z.number().min(0).max(100).optional()
  }).strict().refine(
    (data) => {
      // If both dates are provided, ensure due_date >= start_date
      if (data.start_date && data.due_date) {
        const start = new Date(data.start_date)
        const due = new Date(data.due_date)
        return due >= start
      }
      return true
    },
    {
      message: 'Due date must be on or after the start date',
      path: ['due_date']
    }
  ),
  query: z.object({}).optional()
})

/**
 * Schema for GET /api/projects/[id]
 */
export const GetProjectSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for PUT /api/projects/[id]
 */
export const UpdateProjectApiSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).nullable().optional(),
    status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    start_date: z.string().datetime().nullable().optional(),
    due_date: z.string().datetime().nullable().optional(),
    progress_percentage: z.number().min(0).max(100).optional(),
    organization_id: z.string().uuid().nullable().optional()
  }).strict().refine(
    (data) => {
      // If both dates are provided, ensure due_date >= start_date
      if (data.start_date && data.due_date) {
        const start = new Date(data.start_date)
        const due = new Date(data.due_date)
        return due >= start
      }
      return true
    },
    {
      message: 'Due date must be on or after the start date',
      path: ['due_date']
    }
  ),
  query: z.object({}).optional()
})

/**
 * Schema for DELETE /api/projects/[id]
 */
export const DeleteProjectSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional()
})
