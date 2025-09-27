import { z } from 'zod'

// Project status enum
export const ProjectStatusSchema = z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled'])

// Project priority enum
export const ProjectPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])

// Base project schema for reading/display
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).nullable(),
  status: ProjectStatusSchema,
  priority: ProjectPrioritySchema,
  organization_id: z.string().uuid().nullable(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

// Schema for creating new projects
export const CreateProjectSchema = z.object({
  name: z.string()
    .min(2, 'Project name must be at least 2 characters')
    .max(200, 'Project name must be less than 200 characters')
    .trim(),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .nullable(),
  organization_id: z.string().uuid().optional().nullable(),
})

// Schema for updating existing projects
export const UpdateProjectSchema = z.object({
  name: z.string()
    .min(2, 'Project name must be at least 2 characters')
    .max(200, 'Project name must be less than 200 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .nullable(),
  status: ProjectStatusSchema.optional(),
  priority: ProjectPrioritySchema.optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided for update'
)

// Type exports
export type Project = z.infer<typeof ProjectSchema>
export type CreateProject = z.infer<typeof CreateProjectSchema>
export type UpdateProject = z.infer<typeof UpdateProjectSchema>
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>
export type ProjectPriority = z.infer<typeof ProjectPrioritySchema>

// Validation helper functions
export const validateCreateProject = (data: unknown) => {
  return CreateProjectSchema.safeParse(data)
}

export const validateUpdateProject = (data: unknown) => {
  return UpdateProjectSchema.safeParse(data)
}

export const validateProject = (data: unknown) => {
  return ProjectSchema.safeParse(data)
}

