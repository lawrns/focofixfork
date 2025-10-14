import { z } from 'zod'

/**
 * Schema for GET /api/projects/[id]/team
 */
export const GetProjectTeamSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for POST /api/projects/[id]/team
 */
export const AddTeamMemberSchema = z.object({
  body: z.object({
    userId: z.string().uuid(),
    role: z.enum(['owner', 'editor', 'viewer']).default('viewer')
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for DELETE /api/projects/[id]/team/[userId]
 */
export const RemoveTeamMemberSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for POST /api/projects/bulk
 */
export const BulkCreateProjectsSchema = z.object({
  body: z.object({
    items: z.array(z.object({
      name: z.string().min(1).max(255),
      description: z.string().max(2000).optional(),
      organizationId: z.string().uuid().optional()
    })).min(1).max(100)
  }).strict(),
  query: z.object({}).optional()
})
