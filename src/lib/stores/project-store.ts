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

  // Subscribe to project changes
  subscribe(listener: (projects: Project[]) => void): () => void {
    this.listeners.add(listener)
    // Send current state immediately
    listener([...this.projects])

    return () => {
      this.listeners.delete(listener)
    }
  }

  // Update projects and notify all listeners
  setProjects(projects: Project[]) {
    console.log('ProjectStore: updating projects to', projects.length, 'projects:', projects.map(p => ({ id: p.id, name: p.name })))
    const validProjects = projects.filter(p => p && p.id && p.name)
    if (validProjects.length !== projects.length) {
      console.warn('ProjectStore: filtered out invalid projects:', projects.length - validProjects.length)
    }
    this.projects = [...validProjects]
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
    this.projects = this.projects.filter(p => p.id !== projectId)
    this.listeners.forEach(listener => {
      try {
        listener([...this.projects])
      } catch (error) {
        console.error('ProjectStore: error notifying listener:', error)
      }
    })
  }

  // Update a project
  updateProject(projectId: string, updates: Partial<Project>) {
    console.log('ProjectStore: updating project', projectId, 'with updates:', updates)
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
