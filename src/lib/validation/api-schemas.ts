import { z } from 'zod'

/**
 * Comprehensive Zod Validation Schemas for API Endpoints
 *
 * CRITICAL SECURITY: All API endpoints must validate input using these schemas
 * Prevents injection attacks, type confusion, and business logic bypass
 */

// ============================================================================
// COMMON VALIDATORS
// ============================================================================

export const uuidSchema = z.string().uuid({ message: 'Invalid UUID format' })

export const slugSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')

export const emailSchema = z
  .string()
  .email({ message: 'Invalid email address' })
  .max(255)

export const urlSchema = z
  .string()
  .url({ message: 'Invalid URL format' })
  .max(2048)

export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]{10,}$/, 'Invalid phone number format')
  .optional()

export const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color code')

export const dateStringSchema = z
  .string()
  .datetime({ message: 'Invalid ISO datetime string' })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'))

// ============================================================================
// WORKSPACE / ORGANIZATION SCHEMAS
// ============================================================================

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  slug: slugSchema.optional(),
  description: z.string().max(2000).optional().nullable(),
  settings: z.record(z.any()).optional().nullable(),
})

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  slug: slugSchema.optional(),
  description: z.string().max(2000).optional().nullable(),
  settings: z.record(z.any()).optional().nullable(),
})

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['owner', 'admin', 'member', 'guest']),
  message: z.string().max(500).optional().nullable(),
})

export const updateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'member', 'guest']),
})

// ============================================================================
// PROJECT SCHEMAS
// ============================================================================

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  slug: slugSchema.optional(),
  description: z.string().max(2000).optional().nullable(),
  brief: z.string().max(1000).optional().nullable(),
  color: colorSchema.optional(),
  icon: z.string().max(50).optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
  workspace_id: uuidSchema,
  start_date: dateStringSchema.optional().nullable(),
  end_date: dateStringSchema.optional().nullable(),
  budget: z.number().min(0).optional().nullable(),
  priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).optional(),
})

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  slug: slugSchema.optional(),
  description: z.string().max(2000).optional().nullable(),
  brief: z.string().max(1000).optional().nullable(),
  color: colorSchema.optional(),
  icon: z.string().max(50).optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
  start_date: dateStringSchema.optional().nullable(),
  end_date: dateStringSchema.optional().nullable(),
  budget: z.number().min(0).optional().nullable(),
  priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).optional(),
  archived_at: dateStringSchema.optional().nullable(),
})

// ============================================================================
// TASK / WORK ITEM SCHEMAS
// ============================================================================

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(10000).optional().nullable(),
  status: z.enum(['backlog', 'next', 'in_progress', 'review', 'blocked', 'done']).optional(),
  priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).optional(),
  project_id: uuidSchema,
  assignee_id: uuidSchema.optional().nullable(),
  reporter_id: uuidSchema.optional().nullable(),
  parent_id: uuidSchema.optional().nullable(),
  type: z.enum(['task', 'bug', 'feature', 'epic', 'story', 'subtask']).optional(),
  due_date: dateStringSchema.optional().nullable(),
  start_date: dateStringSchema.optional().nullable(),
  estimated_hours: z.number().min(0).max(1000).optional().nullable(),
  position: z.number().optional(),
  labels: z.array(z.string().max(50)).max(20).optional(),
  custom_fields: z.record(z.any()).optional().nullable(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(10000).optional().nullable(),
  status: z.enum(['backlog', 'next', 'in_progress', 'review', 'blocked', 'done']).optional(),
  priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).optional(),
  assignee_id: uuidSchema.optional().nullable(),
  parent_id: uuidSchema.optional().nullable(),
  type: z.enum(['task', 'bug', 'feature', 'epic', 'story', 'subtask']).optional(),
  due_date: dateStringSchema.optional().nullable(),
  start_date: dateStringSchema.optional().nullable(),
  estimated_hours: z.number().min(0).max(1000).optional().nullable(),
  actual_hours: z.number().min(0).max(1000).optional().nullable(),
  position: z.number().optional(),
  labels: z.array(z.string().max(50)).max(20).optional(),
  custom_fields: z.record(z.any()).optional().nullable(),
  completed_at: dateStringSchema.optional().nullable(),
})

export const batchUpdateTasksSchema = z.object({
  task_ids: z.array(uuidSchema).min(1).max(100),
  updates: z.object({
    status: z.enum(['backlog', 'next', 'in_progress', 'review', 'blocked', 'done']).optional(),
    priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).optional(),
    assignee_id: uuidSchema.optional().nullable(),
    project_id: uuidSchema.optional(),
    labels: z.array(z.string().max(50)).max(20).optional(),
  })
})

// ============================================================================
// TIME ENTRY SCHEMAS
// ============================================================================

export const createTimeEntrySchema = z.object({
  task_id: uuidSchema,
  start_time: dateStringSchema,
  end_time: dateStringSchema.optional().nullable(),
  duration_hours: z.number().min(0).max(24).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  billable: z.boolean().optional(),
})

export const updateTimeEntrySchema = z.object({
  start_time: dateStringSchema.optional(),
  end_time: dateStringSchema.optional().nullable(),
  duration_hours: z.number().min(0).max(24).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  billable: z.boolean().optional(),
})

// ============================================================================
// COMMENT SCHEMAS
// ============================================================================

export const createCommentSchema = z.object({
  content: z.string().min(1).max(2000).trim(),
  task_id: uuidSchema.optional(),
  project_id: uuidSchema.optional(),
  parent_id: uuidSchema.optional().nullable(),
  mentions: z.array(uuidSchema).max(20).optional(),
})

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000).trim(),
})

// ============================================================================
// TAG SCHEMAS
// ============================================================================

export const createTagSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  color: colorSchema.optional(),
  workspace_id: uuidSchema,
})

export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  color: colorSchema.optional(),
})

// ============================================================================
// FILTER SCHEMAS
// ============================================================================

export const createSavedFilterSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  workspace_id: uuidSchema,
  filters: z.record(z.any()),
  is_public: z.boolean().optional(),
})

export const updateSavedFilterSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  filters: z.record(z.any()).optional(),
  is_public: z.boolean().optional(),
})

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
  remember: z.boolean().optional(),
})

export const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number'),
  full_name: z.string().min(1).max(100).trim(),
  organization_name: z.string().min(1).max(200).trim().optional(),
})

export const resetPasswordSchema = z.object({
  email: emailSchema,
})

export const updatePasswordSchema = z.object({
  current_password: z.string().min(8).max(128),
  new_password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number'),
})

export const verify2FASchema = z.object({
  token: z.string().length(6).regex(/^\d{6}$/, 'Token must be 6 digits'),
})

// ============================================================================
// AI / CRICO SCHEMAS
// ============================================================================

export const voiceInputSchema = z.object({
  audio: z.string().max(10 * 1024 * 1024), // 10MB base64 limit
  format: z.enum(['webm', 'mp3', 'wav', 'ogg']).optional(),
  language: z.string().max(10).optional(),
})

export const aiSuggestionSchema = z.object({
  context: z.string().max(5000),
  type: z.enum(['task', 'project', 'priority', 'assignee', 'general']).optional(),
  workspace_id: uuidSchema,
})

export const alignmentCheckSchema = z.object({
  task_id: uuidSchema,
  project_id: uuidSchema,
  workspace_id: uuidSchema,
})

// ============================================================================
// EXPORT SCHEMAS
// ============================================================================

export const exportTasksSchema = z.object({
  project_id: uuidSchema.optional(),
  workspace_id: uuidSchema,
  format: z.enum(['csv', 'json', 'pdf', 'excel']),
  filters: z.record(z.any()).optional(),
  include_subtasks: z.boolean().optional(),
  include_comments: z.boolean().optional(),
  include_time_entries: z.boolean().optional(),
})

// ============================================================================
// FILE UPLOAD SCHEMAS
// ============================================================================

export const uploadFileSchema = z.object({
  file_name: z.string().min(1).max(255),
  file_size: z.number().min(1).max(50 * 1024 * 1024), // 50MB max
  mime_type: z.string().max(100),
  task_id: uuidSchema.optional(),
  project_id: uuidSchema.optional(),
  workspace_id: uuidSchema,
})

// ============================================================================
// QUERY PARAMETER SCHEMAS
// ============================================================================

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(1000).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  sort_by: z.string().max(50).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
})

export const taskQuerySchema = paginationSchema.extend({
  project_id: uuidSchema.optional(),
  workspace_id: uuidSchema.optional(),
  status: z.enum(['backlog', 'next', 'in_progress', 'review', 'blocked', 'done']).optional(),
  priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).optional(),
  assignee_id: uuidSchema.optional(),
  search: z.string().max(200).optional(),
  labels: z.string().max(500).optional(), // Comma-separated
  due_before: dateStringSchema.optional(),
  due_after: dateStringSchema.optional(),
})

export const projectQuerySchema = paginationSchema.extend({
  workspace_id: uuidSchema.optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
  archived: z.enum(['true', 'false']).optional(),
  search: z.string().max(200).optional(),
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate request body against schema
 * Returns typed data on success or throws validation error
 */
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  try {
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => {
        const path = err.path.join('.')
        return `${path}: ${err.message}`
      })
      throw new Error(`Validation failed: ${errorMessages.join(', ')}`)
    }
    throw error
  }
}

/**
 * Validate query parameters against schema
 * Returns typed data on success or throws validation error
 */
export function validateQuery<T>(schema: z.ZodSchema<T>, searchParams: URLSearchParams): T {
  try {
    const query = Object.fromEntries(searchParams.entries())
    return schema.parse(query)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => {
        const path = err.path.join('.')
        return `${path}: ${err.message}`
      })
      throw new Error(`Query validation failed: ${errorMessages.join(', ')}`)
    }
    throw error
  }
}

/**
 * Safe parse - returns result object instead of throwing
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors = result.error.errors.map(err => {
    const path = err.path.join('.')
    return `${path}: ${err.message}`
  })

  return { success: false, errors }
}

/**
 * Sanitize HTML content to prevent XSS
 * This is a basic implementation - consider using DOMPurify for production
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
}

/**
 * Sanitize plain text to prevent injection
 */
export function sanitizeText(text: string): string {
  return text
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, 10000) // Max length safeguard
}
