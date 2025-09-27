import { z } from 'zod'

// Base Goal Schema
export const GoalSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  targetDate: z.string().optional(), // ISO date string
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// Goal Creation Schema (without server-generated fields)
export const CreateGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required').max(100, 'Goal name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  targetDate: z.string().optional(), // ISO date string
})

// Goal Update Schema (all fields optional for partial updates)
export const UpdateGoalSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  targetDate: z.string().optional(),
}).partial()

// Goal Milestone Schema
export const GoalMilestoneSchema = z.object({
  id: z.string().uuid(),
  goalId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  dueDate: z.string().optional(), // ISO date string
  weight: z.number().min(0.1).max(10.0).default(1.0),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// Milestone Creation Schema
export const CreateMilestoneSchema = z.object({
  name: z.string().min(1, 'Milestone name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  dueDate: z.string().optional(),
  weight: z.number().min(0.1).max(10.0).default(1.0),
})

// Milestone Update Schema
export const UpdateMilestoneSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  dueDate: z.string().optional(),
  weight: z.number().min(0.1).max(10.0).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
})

// Goal-Project Link Schema
export const GoalProjectLinkSchema = z.object({
  goalId: z.string().uuid(),
  projectId: z.string().uuid(),
  createdAt: z.string().datetime(),
})

// Link Creation Schema
export const CreateGoalProjectLinkSchema = z.object({
  projectId: z.string().uuid(),
})

// Goal with Details (includes milestones and linked projects)
export const GoalWithDetailsSchema = GoalSchema.extend({
  milestones: z.array(GoalMilestoneSchema),
  linkedProjects: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().optional(),
    status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']),
  })),
  progress: z.number().min(0).max(100),
  isOverdue: z.boolean(),
})

// Goal Progress Calculation Schema
export const GoalProgressSchema = z.object({
  goalId: z.string().uuid(),
  completedMilestones: z.number().min(0),
  totalMilestones: z.number().min(0),
  totalWeight: z.number().min(0),
  completedWeight: z.number().min(0),
  progressPercentage: z.number().min(0).max(100),
  isOverdue: z.boolean(),
})

// Type exports
export type Goal = z.infer<typeof GoalSchema>
export type CreateGoal = z.infer<typeof CreateGoalSchema>
export type UpdateGoal = z.infer<typeof UpdateGoalSchema>
export type GoalMilestone = z.infer<typeof GoalMilestoneSchema>
export type CreateMilestone = z.infer<typeof CreateMilestoneSchema>
export type UpdateMilestone = z.infer<typeof UpdateMilestoneSchema>
export type GoalProjectLink = z.infer<typeof GoalProjectLinkSchema>
export type CreateGoalProjectLink = z.infer<typeof CreateGoalProjectLinkSchema>
export type GoalWithDetails = z.infer<typeof GoalWithDetailsSchema>
export type GoalProgress = z.infer<typeof GoalProgressSchema>

