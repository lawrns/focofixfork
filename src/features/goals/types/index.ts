// Goals Feature Types
// These are re-exported from the canonical schema to maintain consistency

export type {
  Goal,
  CreateGoal,
  UpdateGoal,
  GoalMilestone,
  CreateMilestone,
  UpdateMilestone,
  GoalProjectLink,
  CreateGoalProjectLink,
  GoalWithDetails,
  GoalProgress
} from '@/lib/validation/schemas/goals'

export interface GoalFilters {
  organizationId?: string;
  projectId?: string;
  userId?: string;
}
