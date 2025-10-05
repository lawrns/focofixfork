// Goals Feature Module Public API
// This file exports all public interfaces for the goals feature

// Components
export { GoalsDashboard } from './components/goals-dashboard'
export { CreateGoalDialog } from './components/create-goal-dialog'

// Hooks
export { useGoals } from './hooks/useGoals'
export { useGoalMutations } from './hooks/useGoalMutations'

// Services
export { goalService } from './services/goalService'

// Validation
export { goalSchema, goalFormSchema } from './validation/goalSchemas'

// Types
export type {
  Goal,
  GoalStatus,
  GoalType,
  GoalPriority,
  CreateGoalData,
  UpdateGoalData,
  GoalFilters,
  GoalProgress,
  GoalComment
} from './types'
