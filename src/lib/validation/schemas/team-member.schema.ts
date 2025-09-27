import { z } from 'zod'

// Team member role enum (shared with organization roles)
export const TeamMemberRoleSchema = z.enum(['owner', 'admin', 'member', 'guest'])

// Base team member schema for reading/display
export const TeamMemberSchema = z.object({
  user_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  project_id: z.string().uuid().nullable(),
  role: TeamMemberRoleSchema,
  added_by: z.string().uuid(),
  added_at: z.string().datetime(),
})

// Schema for adding team members
export const AddTeamMemberSchema = z.object({
  user_id: z.string().uuid(),
  role: TeamMemberRoleSchema,
  project_id: z.string().uuid().optional().nullable(),
})

// Schema for updating team member roles
export const UpdateTeamMemberSchema = z.object({
  role: TeamMemberRoleSchema,
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided for update'
)

// Bulk team member operations
export const BulkTeamOperationSchema = z.object({
  operation: z.enum(['add', 'remove', 'update_role']),
  user_ids: z.array(z.string().uuid()).min(1).max(50),
  role: TeamMemberRoleSchema.optional(),
  project_id: z.string().uuid().optional().nullable(),
})

// Type exports
export type TeamMember = z.infer<typeof TeamMemberSchema>
export type AddTeamMember = z.infer<typeof AddTeamMemberSchema>
export type UpdateTeamMember = z.infer<typeof UpdateTeamMemberSchema>
export type BulkTeamOperation = z.infer<typeof BulkTeamOperationSchema>
export type TeamMemberRole = z.infer<typeof TeamMemberRoleSchema>

// Validation helper functions
export const validateAddTeamMember = (data: unknown) => {
  return AddTeamMemberSchema.safeParse(data)
}

export const validateUpdateTeamMember = (data: unknown) => {
  return UpdateTeamMemberSchema.safeParse(data)
}

export const validateTeamMember = (data: unknown) => {
  return TeamMemberSchema.safeParse(data)
}

export const validateBulkTeamOperation = (data: unknown) => {
  return BulkTeamOperationSchema.safeParse(data)
}
