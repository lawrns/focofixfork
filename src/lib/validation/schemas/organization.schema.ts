import { z } from 'zod'

// Organization role enum
export const OrganizationRoleSchema = z.enum(['admin', 'member', 'guest'])

// Base organization schema for reading/display
export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  description: z.string().max(500).nullable(),
  owner_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

// Schema for creating new organizations
export const CreateOrganizationSchema = z.object({
  name: z.string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters')
    .trim(),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .nullable(),
})

// Schema for updating existing organizations
export const UpdateOrganizationSchema = z.object({
  name: z.string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .nullable(),
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided for update'
)

// Type exports
export type Organization = z.infer<typeof OrganizationSchema>
export type CreateOrganization = z.infer<typeof CreateOrganizationSchema>
export type UpdateOrganization = z.infer<typeof UpdateOrganizationSchema>
export type OrganizationRole = z.infer<typeof OrganizationRoleSchema>

// Validation helper functions
export const validateCreateOrganization = (data: unknown) => {
  return CreateOrganizationSchema.safeParse(data)
}

export const validateUpdateOrganization = (data: unknown) => {
  return UpdateOrganizationSchema.safeParse(data)
}

export const validateOrganization = (data: unknown) => {
  return OrganizationSchema.safeParse(data)
}

