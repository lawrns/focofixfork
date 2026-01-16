import { z } from 'zod';

// Base validation schemas
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();
export const urlSchema = z.string().url().optional();
export const positiveNumberSchema = z.number().positive();
export const nonNegativeNumberSchema = z.number().min(0);

// Enum schemas
export const projectStatusSchema = z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']);
export const milestoneStatusSchema = z.enum(['planning', 'active', 'completed', 'cancelled']);
export const taskStatusSchema = z.enum(['backlog', 'next', 'in_progress', 'review', 'blocked', 'done']);
export const taskPrioritySchema = z.enum(['urgent', 'high', 'medium', 'low', 'none']);
export const userRoleSchema = z.enum(['director', 'lead', 'member', 'viewer']);
export const organizationRoleSchema = z.enum(['owner', 'admin', 'member', 'viewer']);
export const goalStatusSchema = z.enum(['draft', 'active', 'completed', 'cancelled', 'on_hold']);
export const goalTypeSchema = z.enum(['project', 'milestone', 'task', 'organization', 'personal']);
export const goalPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const timeEntryStatusSchema = z.enum(['active', 'paused', 'completed']);

// Organization validation
export const organizationSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  avatar_url: urlSchema,
  website_url: urlSchema,
  created_by: uuidSchema,
  settings: z.object({
    timezone: z.string().default('UTC'),
    working_hours_start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).default('09:00'),
    working_hours_end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).default('17:00'),
    working_days: z.array(z.number().min(0).max(6)).min(1).max(7).default([1, 2, 3, 4, 5]),
  }).optional(),
}).strict();

export const organizationMemberSchema = z.object({
  id: uuidSchema.optional(),
  organization_id: uuidSchema,
  user_id: uuidSchema,
  role: organizationRoleSchema,
  status: z.enum(['active', 'inactive', 'pending']).default('active'),
  invited_by: uuidSchema.optional(),
  invited_at: z.string().datetime().optional(),
  joined_at: z.string().datetime().optional(),
}).strict();

// Project validation
export const projectSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: projectStatusSchema,
  priority: taskPrioritySchema.optional(),
  organization_id: uuidSchema,
  created_by: uuidSchema,
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  budget: nonNegativeNumberSchema.optional(),
  progress_percentage: z.number().min(0).max(100).default(0),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  settings: z.object({
    is_public: z.boolean().default(false),
    allow_guest_comments: z.boolean().default(true),
    require_approval_for_changes: z.boolean().default(false),
    auto_archive_completed: z.boolean().default(false),
  }).optional(),
}).strict();

// Milestone validation
export const milestoneSchema = z.object({
  id: uuidSchema.optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  status: milestoneStatusSchema,
  priority: taskPrioritySchema.optional(),
  project_id: uuidSchema,
  organization_id: uuidSchema,
  created_by: uuidSchema,
  assigned_to: uuidSchema.optional(),
  start_date: z.string().datetime().optional(),
  due_date: z.string().datetime().optional(),
  progress_percentage: z.number().min(0).max(100).default(0),
  dependencies: z.array(uuidSchema).max(10).optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
}).strict();

// Task validation
export const taskSchema = z.object({
  id: uuidSchema.optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  milestone_id: uuidSchema.optional(),
  project_id: uuidSchema,
  organization_id: uuidSchema,
  created_by: uuidSchema,
  assigned_to: uuidSchema.optional(),
  start_date: z.string().datetime().optional(),
  due_date: z.string().datetime().optional(),
  estimated_hours: nonNegativeNumberSchema.optional(),
  actual_hours: nonNegativeNumberSchema.optional(),
  progress_percentage: z.number().min(0).max(100).default(0),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  dependencies: z.array(uuidSchema).max(5).optional(),
  custom_fields: z.record(z.any()).optional(),
}).strict();

// User profile validation
export const userProfileSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema,
  full_name: z.string().min(1).max(100),
  avatar_url: urlSchema,
  bio: z.string().max(500).optional(),
  job_title: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  timezone: z.string().default('UTC'),
  settings: z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    language: z.string().default('en'),
    email_notifications: z.boolean().default(true),
    push_notifications: z.boolean().default(false),
    weekly_digest: z.boolean().default(true),
    auto_start_timers: z.boolean().default(false),
  }).optional(),
}).strict();

// Goal validation
export const goalSchema = z.object({
  id: uuidSchema.optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: goalTypeSchema,
  status: goalStatusSchema,
  priority: goalPrioritySchema,
  target_value: positiveNumberSchema.optional(),
  current_value: nonNegativeNumberSchema.default(0),
  unit: z.string().max(20).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  progress_percentage: z.number().min(0).max(100).default(0),
  owner_id: uuidSchema,
  organization_id: uuidSchema.optional(),
  project_id: uuidSchema.optional(),
  milestone_id: uuidSchema.optional(),
  task_id: uuidSchema.optional(),
  parent_goal_id: uuidSchema.optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
}).strict();

// Time entry validation
export const timeEntrySchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema,
  organization_id: uuidSchema,
  project_id: uuidSchema.optional(),
  milestone_id: uuidSchema.optional(),
  task_id: uuidSchema.optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime().optional(),
  duration_hours: nonNegativeNumberSchema,
  description: z.string().max(500).optional(),
  status: timeEntryStatusSchema.default('completed'),
  billable: z.boolean().default(false),
  billable_rate: nonNegativeNumberSchema.optional(),
  tags: z.array(z.string().min(1).max(50)).max(5).optional(),
}).strict();

// Comment validation
export const commentSchema = z.object({
  id: uuidSchema.optional(),
  content: z.string().min(1).max(2000),
  author_id: uuidSchema,
  organization_id: uuidSchema,
  project_id: uuidSchema.optional(),
  milestone_id: uuidSchema.optional(),
  task_id: uuidSchema.optional(),
  goal_id: uuidSchema.optional(),
  parent_comment_id: uuidSchema.optional(),
  mentions: z.array(uuidSchema).max(20).optional(),
  attachments: z.array(z.object({
    name: z.string().min(1).max(255),
    url: urlSchema,
    size: positiveNumberSchema,
    type: z.string().max(100),
  })).max(5).optional(),
}).strict();

// File attachment validation
export const fileAttachmentSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().min(1).max(255),
  original_name: z.string().min(1).max(255),
  url: z.string().url(),
  size: positiveNumberSchema,
  type: z.string().max(100),
  uploaded_by: uuidSchema,
  organization_id: uuidSchema,
  project_id: uuidSchema.optional(),
  milestone_id: uuidSchema.optional(),
  task_id: uuidSchema.optional(),
  goal_id: uuidSchema.optional(),
  comment_id: uuidSchema.optional(),
  is_public: z.boolean().default(false),
  expires_at: z.string().datetime().optional(),
}).strict();

// Invitation validation
export const invitationSchema = z.object({
  id: uuidSchema.optional(),
  email: emailSchema,
  role: organizationRoleSchema,
  organization_id: uuidSchema,
  invited_by: uuidSchema,
  token: z.string().min(32).max(128),
  expires_at: z.string().datetime(),
  status: z.enum(['pending', 'accepted', 'expired', 'cancelled']).default('pending'),
  accepted_at: z.string().datetime().optional(),
  accepted_by: uuidSchema.optional(),
}).strict();

// API request validation
export const apiRequestSchema = z.object({
  endpoint: z.string().min(1).max(500),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  params: z.record(z.any()).optional(),
  body: z.any().optional(),
  headers: z.record(z.string()).optional(),
}).strict();

// Search and filter validation
export const searchFiltersSchema = z.object({
  query: z.string().max(500).optional(),
  status: z.array(z.string()).max(10).optional(),
  priority: z.array(z.string()).max(10).optional(),
  assigned_to: z.array(uuidSchema).max(20).optional(),
  created_by: z.array(uuidSchema).max(20).optional(),
  tags: z.array(z.string()).max(20).optional(),
  date_range: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
  project_id: uuidSchema.optional(),
  organization_id: uuidSchema.optional(),
}).strict();

// Export validation
export const exportOptionsSchema = z.object({
  format: z.enum(['csv', 'json', 'pdf']),
  include_attachments: z.boolean().default(false),
  include_comments: z.boolean().default(false),
  include_time_entries: z.boolean().default(false),
  date_range: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
  project_ids: z.array(uuidSchema).max(50).optional(),
  organization_id: uuidSchema.optional(),
}).strict();

// Settings validation
export const userSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.string().default('en'),
  timezone: z.string().default('UTC'),
  email_notifications: z.boolean().default(true),
  push_notifications: z.boolean().default(false),
  weekly_digest: z.boolean().default(true),
  auto_start_timers: z.boolean().default(false),
  keyboard_shortcuts: z.boolean().default(true),
  compact_view: z.boolean().default(false),
  items_per_page: z.number().min(10).max(100).default(25),
}).strict();

// Type exports
export type Organization = z.infer<typeof organizationSchema>;
export type OrganizationMember = z.infer<typeof organizationMemberSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Milestone = z.infer<typeof milestoneSchema>;
export type Task = z.infer<typeof taskSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type TimeEntry = z.infer<typeof timeEntrySchema>;
export type Comment = z.infer<typeof commentSchema>;
export type FileAttachment = z.infer<typeof fileAttachmentSchema>;
export type Invitation = z.infer<typeof invitationSchema>;
export type SearchFilters = z.infer<typeof searchFiltersSchema>;
export type ExportOptions = z.infer<typeof exportOptionsSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;

// Validation helper functions
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

export function sanitizeString(str: string): string {
  return str.trim().replace(/[<>]/g, '');
}

export function sanitizeHtml(str: string): string {
  // Basic HTML sanitization - remove script tags, etc.
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '');
}
