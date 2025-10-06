// Project Feature Module Public API
// This file exports all public interfaces for the projects feature

// Components
export { ProjectForm } from './components/project-form'
export { ProjectList } from './components/project-list'
export { default as ProjectTable } from './components/ProjectTable'
export { ProjectCard } from './components/project-card'
export { KanbanBoard } from './components/kanban-board'
export { ViewTabs } from './components/ViewTabs'

// Hooks
export { useProjects } from './hooks/useProjects'
export { useProjectMutations } from './hooks/useProjects'

// Services
export { ProjectsService as projectService } from './services/projectService'

// Validation
export { projectSchema, projectFormSchema } from './validation/projectSchemas'

// Types
export type {
  Project,
  ProjectStatus,
  ProjectPriority,
  CreateProjectData,
  UpdateProjectData,
  ProjectFilters
} from './types'
