// Project Feature Module Public API
// This file exports all public interfaces for the projects feature

// Components
export { ProjectForm } from './components/project-form'
export { ProjectList } from './components/project-list'
export { default as ProjectTable } from './components/ProjectTable'
export { ProjectCard } from './components/project-card'
export { KanbanBoard } from './components/kanban-board'
export { default as ViewTabs } from './components/ViewTabs'

// Hooks
export { useProjects } from './hooks/useProjects'
export { useProjectMutations } from './hooks/useProjects'

// Services
// Server-side only - DO NOT import in client components
// export { ProjectsService as projectService } from './services/projectService'

// Client-side service - USE THIS in components
export { ProjectClientService } from './services/projectClientService'
export { ProjectClientService as projectService } from './services/projectClientService' // Alias for compatibility

// Validation
export { projectSchema, projectFormSchema } from './validation/projectSchemas'

// Types
export type {
  Project,
  CreateProjectData,
  UpdateProjectData,
  ProjectFilters
} from './types'
