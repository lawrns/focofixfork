import { z } from 'zod'

// User Profile Schema
export const UserProfileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(100, 'Name too long'),
  bio: z.string().max(500, 'Bio too long').optional(),
  avatarUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
})

// User Preferences Schema
export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.string().min(2).max(5).default('en'), // ISO language codes
  timezone: z.string().default('UTC'),
  defaultTimePeriod: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
})

// Notification Preferences Schema
export const NotificationPreferencesSchema = z.object({
  milestoneDue: z.boolean().default(true),
  overdueTask: z.boolean().default(true),
  projectHealthChanges: z.boolean().default(true),
  mentionsAssignments: z.boolean().default(true),
  channels: z.array(z.enum(['in_app', 'email', 'slack'])).min(1, 'At least one channel required').default(['in_app']),
})

// Complete User Settings Schema
export const UserSettingsSchema = z.object({
  profile: UserProfileSchema,
  preferences: UserPreferencesSchema,
  notifications: NotificationPreferencesSchema,
})

// User Settings Update Schema (partial updates allowed)
export const UserSettingsUpdateSchema = z.object({
  profile: UserProfileSchema.partial().optional(),
  preferences: UserPreferencesSchema.partial().optional(),
  notifications: NotificationPreferencesSchema.partial().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one settings section must be provided'
)

// Organization Security Settings
export const OrganizationSecuritySchema = z.object({
  enforceTwoFactor: z.boolean().default(false),
  passwordPolicy: z.enum(['basic', 'strong', 'enterprise']).default('basic'),
  sessionTimeout: z.number().min(15).max(480).default(60), // minutes
})

// Organization Features Settings
export const OrganizationFeaturesSchema = z.object({
  analyticsEnabled: z.boolean().default(true),
  notificationsEnabled: z.boolean().default(true),
  exportEnabled: z.boolean().default(true),
})

// Organization Limits Settings
export const OrganizationLimitsSchema = z.object({
  maxProjects: z.number().min(1).max(1000).default(100),
  maxUsers: z.number().min(1).max(10000).default(1000),
  storageLimit: z.number().min(1).max(1000).default(100), // GB
})

// Complete Organization Settings Schema
export const OrganizationSettingsSchema = z.object({
  security: OrganizationSecuritySchema,
  features: OrganizationFeaturesSchema,
  limits: OrganizationLimitsSchema,
})

// Organization Settings Update Schema
export const OrganizationSettingsUpdateSchema = OrganizationSettingsSchema.partial()

// Project Visibility Enum
export const ProjectVisibilitySchema = z.enum(['public', 'organization', 'private'])

// Project Permissions Schema
export const ProjectPermissionsSchema = z.object({
  allowGuestComments: z.boolean().default(false),
  requireApprovalForChanges: z.boolean().default(false),
})

// Project Workflow Schema
export const ProjectWorkflowSchema = z.object({
  defaultTaskTemplate: z.string().optional(),
  customFields: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(50),
    type: z.enum(['text', 'number', 'date', 'select', 'multiselect']),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(), // for select/multiselect
  })).default([]),
})

// Complete Project Settings Schema
export const ProjectSettingsSchema = z.object({
  visibility: ProjectVisibilitySchema.default('organization'),
  permissions: ProjectPermissionsSchema,
  workflow: ProjectWorkflowSchema,
})

// Project Settings Update Schema
export const ProjectSettingsUpdateSchema = ProjectSettingsSchema.partial()

// Generic Settings Key-Value Schema (for flexible settings storage)
export const SettingValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.any()),
  z.record(z.any()),
])

// Audit Log Entry Schema
export const AuditLogEntrySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  action: z.enum([
    'create', 'update', 'delete', 'login', 'settings_change',
    'goal_created', 'goal_updated', 'goal_deleted',
    'project_access', 'organization_change'
  ]),
  resourceType: z.enum([
    'goal', 'project', 'task', 'milestone', 'organization',
    'user_settings', 'organization_settings', 'project_settings'
  ]),
  resourceId: z.string().uuid(),
  details: z.record(z.any()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  timestamp: z.string().datetime(),
})

// Data Export Request Schema
export const DataExportRequestSchema = z.object({
  format: z.enum(['csv', 'json', 'pdf']).default('json'),
  includeProjects: z.boolean().default(true),
  includeTasks: z.boolean().default(true),
  includeSettings: z.boolean().default(true),
  dateRange: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).optional(),
})

// Data Export Response Schema
export const DataExportResponseSchema = z.object({
  exportId: z.string().uuid(),
  status: z.enum(['processing', 'completed', 'failed']),
  downloadUrl: z.string().url().optional(),
  expiresAt: z.string().datetime().optional(),
  fileSize: z.number().optional(), // bytes
  recordCount: z.number().optional(),
})

// Settings Validation Error Schema
export const SettingsValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string().optional(),
})

// Bulk Settings Update Schema (for organization/project admins)
export const BulkSettingsUpdateSchema = z.object({
  settings: z.record(z.string(), SettingValueSchema),
  targetType: z.enum(['organization', 'project']),
  targetId: z.string().uuid(),
  applyToChildren: z.boolean().default(false), // for cascading org settings to projects
})

// Type exports
export type UserProfile = z.infer<typeof UserProfileSchema>
export type UserPreferences = z.infer<typeof UserPreferencesSchema>
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>
export type UserSettings = z.infer<typeof UserSettingsSchema>
export type UserSettingsUpdate = z.infer<typeof UserSettingsUpdateSchema>

export type OrganizationSecurity = z.infer<typeof OrganizationSecuritySchema>
export type OrganizationFeatures = z.infer<typeof OrganizationFeaturesSchema>
export type OrganizationLimits = z.infer<typeof OrganizationLimitsSchema>
export type OrganizationSettings = z.infer<typeof OrganizationSettingsSchema>
export type OrganizationSettingsUpdate = z.infer<typeof OrganizationSettingsUpdateSchema>

export type ProjectVisibility = z.infer<typeof ProjectVisibilitySchema>
export type ProjectPermissions = z.infer<typeof ProjectPermissionsSchema>
export type ProjectWorkflow = z.infer<typeof ProjectWorkflowSchema>
export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>
export type ProjectSettingsUpdate = z.infer<typeof ProjectSettingsUpdateSchema>

export type SettingValue = z.infer<typeof SettingValueSchema>
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>
export type DataExportRequest = z.infer<typeof DataExportRequestSchema>
export type DataExportResponse = z.infer<typeof DataExportResponseSchema>
export type SettingsValidationError = z.infer<typeof SettingsValidationErrorSchema>
export type BulkSettingsUpdate = z.infer<typeof BulkSettingsUpdateSchema>

