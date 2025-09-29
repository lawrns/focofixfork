import { z } from 'zod'

// Comment type enum
export const CommentTypeSchema = z.enum(['comment', 'reply', 'system'])

// Base comment schema for reading/display
export const CommentSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1).max(2000),
  author_id: z.string().uuid(),
  milestone_id: z.string().uuid().nullable(),
  project_id: z.string().uuid().nullable(),
  parent_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

// Schema for creating new comments
export const CreateCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment content is required')
    .max(2000, 'Comment must be less than 2000 characters')
    .trim(),
  milestone_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
}).refine(
  (data) => data.milestone_id || data.project_id,
  'Comment must be associated with either a milestone or project'
).refine(
  (data) => !(data.milestone_id && data.project_id),
  'Comment cannot be associated with both milestone and project'
)

// Schema for updating existing comments
export const UpdateCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment content is required')
    .max(2000, 'Comment must be less than 2000 characters')
    .trim()
    .optional(),
  milestone_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided for update'
).refine(
  (data) => {
    if (data.milestone_id !== undefined && data.project_id !== undefined) {
      return !(data.milestone_id && data.project_id)
    }
    return true
  },
  'Comment cannot be associated with both milestone and project'
)

// Type exports
export type Comment = z.infer<typeof CommentSchema>
export type CreateComment = z.infer<typeof CreateCommentSchema>
export type UpdateComment = z.infer<typeof UpdateCommentSchema>
export type CommentType = z.infer<typeof CommentTypeSchema>

// Validation helper functions
export const validateCreateComment = (data: unknown) => {
  return CreateCommentSchema.safeParse(data)
}

export const validateUpdateComment = (data: unknown) => {
  return UpdateCommentSchema.safeParse(data)
}

export const validateComment = (data: unknown) => {
  return CommentSchema.safeParse(data)
}