import { z } from 'zod'

// Base project schema
export const projectSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Project name is required').max(200, 'Name must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  progress_percentage: z.number().min(0).max(100),
  created_by: z.string(),
  organization_id: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string()
})

// Form schema for creating/updating projects
export const projectFormSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200, 'Name must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).default('planning'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  organization_id: z.string().optional()
})

// Project filters schema
export const projectFiltersSchema = z.object({
  organization_id: z.string().optional(),
  status: projectSchema.shape.status.optional(),
  priority: projectSchema.shape.priority.optional(),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0)
})

// Project update schema (partial updates)
export const projectUpdateSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200, 'Name must be less than 200 characters').optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  progress_percentage: z.number().min(0).max(100).optional()
})

export type ProjectFormData = z.infer<typeof projectFormSchema>
export type ProjectFilters = z.infer<typeof projectFiltersSchema>
export type ProjectUpdateData = z.infer<typeof projectUpdateSchema>
