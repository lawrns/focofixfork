import { z } from 'zod'

/**
 * Schema for GET /api/comments
 */
export const GetCommentsSchema = z.object({
  query: z.object({
    project_id: z.string().uuid().optional(),
    task_id: z.string().uuid().optional(),
    parent_id: z.string().uuid().optional(),
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
    offset: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0)).optional()
  }).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for POST /api/comments
 */
export const CreateCommentApiSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Comment content is required').max(10000, 'Content must be less than 10000 characters'),
    task_id: z.string().uuid().nullable().optional(),
    project_id: z.string().uuid().nullable().optional(),
    parent_id: z.string().uuid().nullable().optional(),
    type: z.enum(['comment', 'reply', 'system']).default('comment')
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for GET /api/comments/[id]
 */
export const GetCommentSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for PUT /api/comments/[id]
 */
export const UpdateCommentApiSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(10000).optional()
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for DELETE /api/comments/[id]
 */
export const DeleteCommentSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional()
})
