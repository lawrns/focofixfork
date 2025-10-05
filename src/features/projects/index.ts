// Project Feature Module Public API
// This file exports all public interfaces for the projects feature

// Components
export { default as ProjectForm } from './components/ProjectForm'
export { default as ProjectList } from './components/ProjectList'
export { default as ProjectTable } from './components/ProjectTable'
export { default as ProjectCard } from './components/ProjectCard'
export { default as ProjectKanban } from './components/ProjectKanban'

// Hooks
export { useProjects } from './hooks/useProjects'
export { useProjectMutations } from './hooks/useProjectMutations'

// Services
export { projectService } from './services/projectService'

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
