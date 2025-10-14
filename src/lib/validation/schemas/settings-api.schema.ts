import { z } from 'zod'

/**
 * Schema for GET /api/settings/notifications
 */
export const GetNotificationSettingsSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for PUT /api/settings/notifications
 */
export const UpdateNotificationSettingsSchema = z.object({
  body: z.object({
    email_notifications: z.boolean().optional(),
    push_notifications: z.boolean().optional(),
    task_updates: z.boolean().optional(),
    project_updates: z.boolean().optional(),
    milestone_updates: z.boolean().optional(),
    team_mentions: z.boolean().optional(),
    daily_digest: z.boolean().optional(),
    weekly_summary: z.boolean().optional()
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for GET /api/settings/profile
 */
export const GetProfileSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for PUT /api/settings/profile
 */
export const UpdateProfileSchema = z.object({
  body: z.object({
    full_name: z.string().min(1).max(255).optional(),
    avatar_url: z.string().url().nullable().optional(),
    timezone: z.string().optional(),
    language: z.string().optional(),
    bio: z.string().max(2000).nullable().optional()
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for GET /api/settings/organization
 */
export const GetOrganizationSettingsSchema = z.object({
  query: z.object({
    organizationId: z.string().uuid().optional()
  }).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for PUT /api/settings/organization
 */
export const UpdateOrganizationSettingsSchema = z.object({
  body: z.object({
    organizationId: z.string().uuid(),
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).nullable().optional(),
    slug: z.string().min(1).max(100).optional(),
    logo_url: z.string().url().nullable().optional(),
    website: z.string().url().nullable().optional()
  }).strict(),
  query: z.object({}).optional()
})
