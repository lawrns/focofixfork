/**
 * Zod schemas for task dependency validation
 * Provides both client-side and API validation
 */

import { z } from 'zod'

/**
 * Schema for adding a single dependency
 */
export const addDependencySchema = z.object({
  work_item_id: z.string().uuid('Invalid task ID format'),
  depends_on_id: z.string().uuid('Invalid dependency task ID format'),
})

export type AddDependencyInput = z.infer<typeof addDependencySchema>

/**
 * Schema for removing a dependency
 */
export const removeDependencySchema = z.object({
  work_item_id: z.string().uuid('Invalid task ID format'),
  depends_on_id: z.string().uuid('Invalid dependency task ID format'),
})

export type RemoveDependencyInput = z.infer<typeof removeDependencySchema>

/**
 * Schema for API POST /api/tasks/:id/dependencies
 */
export const CreateDependencyAPISchema = z.object({
  body: addDependencySchema.extend({
    work_item_id: z.string().uuid().optional(), // Can be inferred from URL
  }),
  query: z.object({}).optional(),
})

export type CreateDependencyAPIInput = z.infer<typeof CreateDependencyAPISchema>

/**
 * Schema for API DELETE /api/tasks/:id/dependencies
 */
export const DeleteDependencyAPISchema = z.object({
  body: removeDependencySchema,
  query: z.object({}).optional(),
})

export type DeleteDependencyAPIInput = z.infer<typeof DeleteDependencyAPISchema>

/**
 * Schema for listing dependencies
 */
export const GetDependenciesSchema = z.object({
  query: z.object({
    work_item_id: z.string().uuid().optional(),
  }),
  body: z.object({}).optional(),
})

export type GetDependenciesInput = z.infer<typeof GetDependenciesSchema>

/**
 * Full dependency record from database
 */
export const dependencyRecordSchema = z.object({
  id: z.string().uuid(),
  work_item_id: z.string().uuid(),
  depends_on_id: z.string().uuid(),
  dependency_type: z.string().default('blocks'),
  created_at: z.string().datetime(),
})

export type DependencyRecord = z.infer<typeof dependencyRecordSchema>

/**
 * Dependency validation error response
 */
export const dependencyErrorSchema = z.object({
  success: z.boolean(),
  error: z.string(),
  code: z.enum(['SELF_DEPENDENCY', 'CIRCULAR_DEPENDENCY', 'DUPLICATE_DEPENDENCY', 'VALIDATION_ERROR']).optional(),
})

export type DependencyError = z.infer<typeof dependencyErrorSchema>
