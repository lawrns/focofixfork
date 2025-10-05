// Tasks Feature Module Public API
// This file exports all public interfaces for the tasks feature

// Components
export { TaskForm } from './components/TaskForm'
export { TaskList } from './components/TaskList'
export { TaskCard } from './components/TaskCard'

// Hooks
export { useTasks } from './hooks/useTasks'
export { useTaskMutations } from './hooks/useTaskMutations'

// Services
export { taskService } from './services/taskService'

// Validation
export { taskSchema, taskFormSchema } from './validation/taskSchemas'

// Types
export type {
  Task,
  TaskStatus,
  TaskPriority,
  CreateTaskData,
  UpdateTaskData,
  TaskFilters
} from './types'
