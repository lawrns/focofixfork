import { z } from 'zod'

// Milestone status enum
export const MilestoneStatusSchema = z.enum(['planning', 'active', 'completed', 'cancelled'])

// Base milestone schema for reading/display
export const MilestoneSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).nullable(),
  status: MilestoneStatusSchema,
  project_id: z.string().uuid(),
  start_date: z.string().datetime().nullable(),
  due_date: z.string().datetime().nullable(),
  progress_percentage: z.number().min(0).max(100),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

// Schema for creating new milestones
export const CreateMilestoneSchema = z.object({
  name: z.string()
    .min(2, 'Milestone name must be at least 2 characters')
    .max(200, 'Milestone name must be less than 200 characters')
    .trim(),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .nullable(),
  project_id: z.string().uuid(),
  start_date: z.string().datetime().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  progress_percentage: z.number().min(0).max(100).default(0),
}).refine(
  (data) => {
    // If both dates are provided, start_date must be before due_date
    if (data.start_date && data.due_date) {
      return new Date(data.start_date) < new Date(data.due_date)
    }
    return true
  },
  'Start date must be before due date'
)

// Schema for updating existing milestones
export const UpdateMilestoneSchema = z.object({
  name: z.string()
    .min(2, 'Milestone name must be at least 2 characters')
    .max(200, 'Milestone name must be less than 200 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .nullable(),
  status: MilestoneStatusSchema.optional(),
  start_date: z.string().datetime().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  progress_percentage: z.number().min(0).max(100).optional(),
}).refine(
  (data) => {
    // If both dates are provided in update, validate they make sense
    if (data.start_date && data.due_date) {
      return new Date(data.start_date) < new Date(data.due_date)
    }
    return true
  },
  'Start date must be before due date'
).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided for update'
)

// Type exports
export type Milestone = z.infer<typeof MilestoneSchema>
export type CreateMilestone = z.infer<typeof CreateMilestoneSchema>
export type UpdateMilestone = z.infer<typeof UpdateMilestoneSchema>
export type MilestoneStatus = z.infer<typeof MilestoneStatusSchema>

// Validation helper functions
export const validateCreateMilestone = (data: unknown) => {
  return CreateMilestoneSchema.safeParse(data)
}

export const validateUpdateMilestone = (data: unknown) => {
  return UpdateMilestoneSchema.safeParse(data)
}

export const validateMilestone = (data: unknown) => {
  return MilestoneSchema.safeParse(data)
}

