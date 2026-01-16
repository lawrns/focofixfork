import { z } from 'zod'

/**
 * Schema for GET /api/tasks
 */
export const GetTasksSchema = z.object({
  query: z.object({
    project_id: z.string().uuid().optional(),
    milestone_id: z.string().uuid().optional(),
    status: z.enum(['backlog', 'next', 'in_progress', 'review', 'blocked', 'done']).optional(),
    priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).optional(),
    assignee_id: z.string().uuid().optional(),
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
    offset: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0)).optional()
  }).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for POST /api/tasks
 */
export const CreateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Task title is required').max(500, 'Title must be less than 500 characters'),
    description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
    project_id: z.string().min(1, 'Project is required'),
    milestone_id: z.string().nullable().optional(),
    status: z.enum(['backlog', 'next', 'in_progress', 'review', 'blocked', 'done']).default('backlog'),
    priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).default('none'),
    assignee_id: z.string().nullable().optional(),
    estimated_hours: z.preprocess(
      (val) => val === '' || val === null || val === undefined || Number.isNaN(val) ? null : Number(val),
      z.number().min(0).max(1000).nullable().optional()
    ),
    actual_hours: z.preprocess(
      (val) => val === '' || val === null || val === undefined || Number.isNaN(val) ? null : Number(val),
      z.number().min(0).max(1000).nullable().optional()
    ),
    due_date: z.string().nullable().optional()
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for GET /api/tasks/[id]
 */
export const GetTaskSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for PUT /api/tasks/[id]
 */
export const UpdateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Task title is required').max(500, 'Title must be less than 500 characters').optional(),
    description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
    project_id: z.string().min(1, 'Project is required').optional(),
    milestone_id: z.string().nullable().optional(),
    status: z.enum(['backlog', 'next', 'in_progress', 'review', 'blocked', 'done']).optional(),
    priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).optional(),
    assignee_id: z.string().nullable().optional(),
    estimated_hours: z.preprocess(
      (val) => val === '' || val === null || val === undefined || Number.isNaN(val) ? null : Number(val),
      z.number().min(0).max(1000).nullable().optional()
    ),
    actual_hours: z.preprocess(
      (val) => val === '' || val === null || val === undefined || Number.isNaN(val) ? null : Number(val),
      z.number().min(0).max(1000).nullable().optional()
    ),
    due_date: z.string().nullable().optional()
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for PATCH /api/tasks/[id]
 */
export const PatchTaskSchema = z.object({
  body: z.object({
    status: z.enum(['backlog', 'next', 'in_progress', 'review', 'blocked', 'done']).optional(),
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(2000).optional(),
    project_id: z.string().min(1).optional(),
    milestone_id: z.string().nullable().optional(),
    priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).optional(),
    assignee_id: z.string().nullable().optional(),
    estimated_hours: z.preprocess(
      (val) => val === '' || val === null || val === undefined || Number.isNaN(val) ? null : Number(val),
      z.number().min(0).max(1000).nullable().optional()
    ),
    actual_hours: z.preprocess(
      (val) => val === '' || val === null || val === undefined || Number.isNaN(val) ? null : Number(val),
      z.number().min(0).max(1000).nullable().optional()
    ),
    due_date: z.string().nullable().optional()
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for DELETE /api/tasks/[id]
 */
export const DeleteTaskSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional()
})
