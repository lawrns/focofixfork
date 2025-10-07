// Tasks Feature Module Public API
// This file exports all public interfaces for the tasks feature

// Components
export { TaskForm } from './components/task-form'
export { TaskList } from './components/task-list'
export { TaskCard } from './components/task-card'

// Hooks
export { useTasks } from './hooks/useTasks'
export { useTaskMutations } from './hooks/useTaskMutations'

// Services
export { TasksService as taskService } from './services/taskService'

// Validation
export { taskSchema, taskFormSchema } from './validation/taskSchemas'

// Types
export type {
  Task,
  CreateTaskData,
  UpdateTaskData,
  TaskFilters
} from './types'
