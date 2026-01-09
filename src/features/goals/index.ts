// Goals Feature Module Public API
// This file exports all public interfaces for the goals feature

// Components
export { GoalsDashboard } from './components/goals-dashboard'
export { CreateGoalDialog } from './components/create-goal-dialog'

// Hooks
export { useGoals, useGoal } from './hooks/useGoals'
export { useGoalMutations } from './hooks/useGoalMutations'

// Services
export { goalService } from './services/goalService'

// Types - Re-export from canonical schema
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

export type { GoalFilters } from './types'
