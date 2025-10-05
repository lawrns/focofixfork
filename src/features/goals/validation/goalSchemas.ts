import { z } from 'zod'

// Base goal schema
export const goalSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  type: z.enum(['project', 'milestone', 'task', 'organization', 'personal']),
  status: z.enum(['draft', 'active', 'completed', 'cancelled', 'on_hold']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  target_value: z.number().positive().optional(),
  current_value: z.number().min(0).optional(),
  unit: z.string().max(50).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  progress_percentage: z.number().min(0).max(100),
  owner_id: z.string(),
  organization_id: z.string().optional(),
  project_id: z.string().optional(),
  milestone_id: z.string().optional(),
  task_id: z.string().optional(),
  parent_goal_id: z.string().optional(),
  tags: z.array(z.string()).optional(),
  created_at: z.string(),
  updated_at: z.string()
})

// Form schema for creating/updating goals
export const goalFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  type: z.enum(['project', 'milestone', 'task', 'organization', 'personal']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  target_value: z.number().positive().optional(),
  unit: z.string().max(50).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  organization_id: z.string().optional(),
  project_id: z.string().optional(),
  tags: z.array(z.string()).optional()
})

// Goal progress schema
export const goalProgressSchema = z.object({
  id: z.string(),
  goal_id: z.string(),
  user_id: z.string(),
  value: z.number().min(0),
  note: z.string().max(500).optional(),
  created_at: z.string()
})

// Goal comment schema
export const goalCommentSchema = z.object({
  id: z.string(),
  goal_id: z.string(),
  user_id: z.string(),
  content: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment must be less than 1000 characters'),
  created_at: z.string()
})

// Validation for goal progress updates
export const updateGoalProgressSchema = z.object({
  value: z.number().min(0, 'Value must be positive'),
  note: z.string().max(500, 'Note must be less than 500 characters').optional()
})

// Validation for goal filters
export const goalFiltersSchema = z.object({
  organizationId: z.string().optional(),
  projectId: z.string().optional(),
  userId: z.string().optional(),
  status: goalSchema.shape.status.optional(),
  type: goalSchema.shape.type.optional(),
  priority: goalSchema.shape.priority.optional()
})

export type GoalFormData = z.infer<typeof goalFormSchema>
export type GoalFilters = z.infer<typeof goalFiltersSchema>
export type UpdateGoalProgressData = z.infer<typeof updateGoalProgressSchema>
