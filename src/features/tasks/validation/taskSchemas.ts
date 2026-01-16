import { z } from 'zod'

// Base task schema
export const taskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required').max(500, 'Title must be less than 500 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  project_id: z.string().min(1, 'Project is required'),
  milestone_id: z.string().optional(),
  status: z.enum(['backlog', 'next', 'in_progress', 'review', 'blocked', 'done']),
  priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']),
  assignee_id: z.string().optional(),
  estimated_hours: z.number().min(0).max(1000).optional(),
  actual_hours: z.number().min(0).max(1000).optional(),
  due_date: z.string().optional(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string()
})

// Form schema for creating/updating tasks
export const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title must be less than 500 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  project_id: z.string().min(1, 'Project is required'),
  milestone_id: z.string().optional(),
  status: z.enum(['backlog', 'next', 'in_progress', 'review', 'blocked', 'done']).default('backlog'),
  priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).default('none'),
  assignee_id: z.string().optional(),
  estimated_hours: z.number().min(0).max(1000).optional(),
  actual_hours: z.number().min(0).max(1000).optional(),
  due_date: z.string().optional()
})

// Task filters schema
export const taskFiltersSchema = z.object({
  project_id: z.string().optional(),
  milestone_id: z.string().optional(),
  status: taskSchema.shape.status.optional(),
  priority: taskSchema.shape.priority.optional(),
  assignee_id: z.string().optional(),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0)
})

// Task update schema (partial updates)
export const taskUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title must be less than 500 characters').optional(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  status: z.enum(['backlog', 'next', 'in_progress', 'review', 'blocked', 'done']).optional(),
  priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).optional(),
  assignee_id: z.string().optional(),
  estimated_hours: z.number().min(0).max(1000).optional(),
  actual_hours: z.number().min(0).max(1000).optional(),
  due_date: z.string().optional()
})

export type TaskFormData = z.infer<typeof taskFormSchema>
export type TaskFilters = z.infer<typeof taskFiltersSchema>
export type TaskUpdateData = z.infer<typeof taskUpdateSchema>
