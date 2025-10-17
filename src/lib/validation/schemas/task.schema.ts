import { z } from 'zod'

// Task status enum
export const TaskStatusSchema = z.enum(['todo', 'in_progress', 'review', 'done', 'blocked', 'completed', 'cancelled'])

// Task priority enum (shared with projects)
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])

// Base task schema for reading/display
export const TaskSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).nullable(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  project_id: z.string().uuid(),
  assignee_id: z.string().uuid().nullable(),
  created_by: z.string().uuid(),
  due_date: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

// Schema for creating new tasks
export const CreateTaskSchema = z.object({
  name: z.string()
    .min(2, 'Task name must be at least 2 characters')
    .max(200, 'Task name must be less than 200 characters')
    .trim(),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .nullable(),
  priority: TaskPrioritySchema.default('medium'),
  project_id: z.string().uuid(),
  assignee_id: z.string().uuid().optional().nullable(),
  due_date: z.string().datetime()
    .refine((date) => {
      if (!date) return true // Optional field
      return new Date(date) > new Date()
    }, 'Due date must be in the future')
    .optional()
    .nullable(),
})

// Schema for updating existing tasks
export const UpdateTaskSchema = z.object({
  name: z.string()
    .min(2, 'Task name must be at least 2 characters')
    .max(200, 'Task name must be less than 200 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .nullable(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  assignee_id: z.string().uuid().optional().nullable(),
  due_date: z.string().datetime()
    .refine((date) => {
      if (!date) return true // Optional field
      return new Date(date) > new Date()
    }, 'Due date must be in the future')
    .optional()
    .nullable(),
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided for update'
)

// Type exports
export type Task = z.infer<typeof TaskSchema>
export type CreateTask = z.infer<typeof CreateTaskSchema>
export type UpdateTask = z.infer<typeof UpdateTaskSchema>
export type TaskStatus = z.infer<typeof TaskStatusSchema>
export type TaskPriority = z.infer<typeof TaskPrioritySchema>

// Validation helper functions
export const validateCreateTask = (data: unknown) => {
  return CreateTaskSchema.safeParse(data)
}

export const validateUpdateTask = (data: unknown) => {
  return UpdateTaskSchema.safeParse(data)
}

export const validateTask = (data: unknown) => {
  return TaskSchema.safeParse(data)
}

