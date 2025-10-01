// Simple global project store for cross-component synchronization
interface Project {
  id: string
  name: string
  description: string | null
  status: string
  priority: string
  organization_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  color?: string
  is_active?: boolean
  start_date?: string | null
  due_date?: string | null
  progress_percentage?: number
}

class ProjectStore {
  private listeners: Set<(projects: Project[]) => void> = new Set()
  private projects: Project[] = []
  private operationInProgress: Set<string> = new Set() // Track operations to prevent race conditions

  // Subscribe to project changes
  subscribe(listener: (projects: Project[]) => void): () => void {
    this.listeners.add(listener)
    // Send current state immediately
    listener([...this.projects])

    return () => {
      this.listeners.delete(listener)
    }
  }

  // Check if operation is in progress
  isOperationInProgress(projectId: string): boolean {
    return this.operationInProgress.has(projectId)
  }

  // Mark operation as in progress
  startOperation(projectId: string) {
    console.log('ProjectStore: Starting operation for project:', projectId)
    this.operationInProgress.add(projectId)
  }

  // Mark operation as complete
  endOperation(projectId: string) {
    console.log('ProjectStore: Ending operation for project:', projectId)
    this.operationInProgress.delete(projectId)
  }

  // Update projects and notify all listeners
  setProjects(projects: Project[]) {
    console.log('ProjectStore: updating projects to', projects.length, 'projects:', projects.map(p => ({ id: p.id, name: p.name })))
    const validProjects = projects.filter(p => p && p.id && p.name)
    if (validProjects.length !== projects.length) {
      console.warn('ProjectStore: filtered out invalid projects:', projects.length - validProjects.length)
    }

    // Remove any projects that are currently being operated on to prevent conflicts
    const filteredProjects = validProjects.filter(p => !this.operationInProgress.has(p.id))

    this.projects = [...filteredProjects]
    this.listeners.forEach(listener => {
      try {
        listener([...this.projects])
      } catch (error) {
        console.error('ProjectStore: error notifying listener:', error)
      }
    })
  }

  // Add a project
  addProject(project: Project) {
    console.log('ProjectStore: adding project', project.id)

    // Check if operation is in progress for this project
    if (this.operationInProgress.has(project.id)) {
      console.log('ProjectStore: Operation in progress for project, skipping add:', project.id)
      return
    }

    // Check if project already exists
    const existingIndex = this.projects.findIndex(p => p.id === project.id)
    if (existingIndex !== -1) {
      console.log('ProjectStore: Project already exists, updating instead:', project.id)
      this.updateProject(project.id, project)
      return
    }

    this.projects = [...this.projects, project]
    this.listeners.forEach(listener => {
      try {
        listener([...this.projects])
      } catch (error) {
        console.error('ProjectStore: error notifying listener:', error)
      }
    })
  }

  // Remove a project
  removeProject(projectId: string) {
    console.log('ProjectStore: removing project', projectId)

    // Start operation tracking
    this.startOperation(projectId)

    const projectExists = this.projects.some(p => p.id === projectId)
    if (!projectExists) {
      console.log('ProjectStore: Project not found for removal:', projectId)
      this.endOperation(projectId)
      return
    }

    this.projects = this.projects.filter(p => p.id !== projectId)

    this.listeners.forEach(listener => {
      try {
        listener([...this.projects])
      } catch (error) {
        console.error('ProjectStore: error notifying listener:', error)
      }
    })

    // End operation tracking after a short delay to prevent race conditions
    setTimeout(() => {
      this.endOperation(projectId)
    }, 100)
  }

  // Update a project
  updateProject(projectId: string, updates: Partial<Project>) {
    console.log('ProjectStore: updating project', projectId, 'with updates:', updates)

    // Check if operation is in progress for this project
    if (this.operationInProgress.has(projectId)) {
      console.log('ProjectStore: Operation in progress for project, skipping update:', projectId)
      return
    }

    const projectIndex = this.projects.findIndex(p => p.id === projectId)
    if (projectIndex === -1) {
      console.warn('ProjectStore: project not found for update:', projectId, 'available projects:', this.projects.map(p => p.id))
      return
    }

    const oldProject = this.projects[projectIndex]
    const updatedProject = { ...oldProject, ...updates }

    // Validate that the updated project still has required fields
    if (!updatedProject.id || !updatedProject.name) {
      console.error('ProjectStore: update would result in invalid project, aborting:', updatedProject)
      return
    }

    this.projects[projectIndex] = updatedProject

    console.log('ProjectStore: project updated successfully from:', oldProject, 'to:', updatedProject)
    console.log('ProjectStore: total projects after update:', this.projects.length)

    this.listeners.forEach(listener => {
      try {
        listener([...this.projects])
      } catch (error) {
        console.error('ProjectStore: error notifying listener:', error)
      }
    })
  }

  // Get current projects
  getProjects(): Project[] {
    return [...this.projects]
  }
}

// Global singleton instance
export const projectStore = new ProjectStore()
