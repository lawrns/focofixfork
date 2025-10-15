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
  organizations?: {
    name: string
  }
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

  // Refresh projects from API
  async refreshProjects(): Promise<void> {
    try {
      console.log('ProjectStore: Refreshing projects from API')
      const response = await fetch('/api/projects', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      })

      if (response.ok) {
        const result = await response.json()

        // Handle both direct array and wrapped response formats
        let projectsData: Project[] = []
        if (Array.isArray(result)) {
          // Direct array response
          projectsData = result
        } else if (result.success && Array.isArray(result.data)) {
          // Success wrapper with data array
          projectsData = result.data
        } else if (result.data && Array.isArray(result.data)) {
          // Data wrapper without success field
          projectsData = result.data
        } else {
          console.error('ProjectStore: Unexpected API response format:', result)
          return
        }

        this.setProjects(projectsData)
        console.log('ProjectStore: Refreshed projects from API:', projectsData.length)
      } else {
        console.error('ProjectStore: Failed to refresh projects from API, status:', response.status)
      }
    } catch (error) {
      console.error('ProjectStore: Error refreshing projects:', error)
    }
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
  setProjects(projects: Project[] | any) {
    // Handle case where projects is not an array (API response wrapped in object)
    if (!Array.isArray(projects)) {
      console.error('ProjectStore: setProjects called with non-array:', typeof projects, projects)
      return
    }

    console.log('ProjectStore: updating projects to', projects.length, 'projects:', projects.map(p => ({ id: p.id, name: p.name })))
    const validProjects = projects.filter(p => p && p.id && p.name)
    if (validProjects.length !== projects.length) {
      console.warn('ProjectStore: filtered out invalid projects:', projects.length - validProjects.length)
    }

    // Keep all valid projects - operation tracking should not affect visibility
    // Operations are tracked separately to prevent race conditions in updates
    const filteredProjects = validProjects

    this.projects = [...filteredProjects]
    // Force a new array reference to ensure React detects the change
    const updatedProjects = [...this.projects]

    this.listeners.forEach(listener => {
      try {
        listener(updatedProjects)
      } catch (error) {
        console.error('ProjectStore: error notifying listener:', error)
      }
    })
  }

  // Add a project
  addProject(project: Project) {
    console.log('ProjectStore: adding project', project.id)

    // Check if project already exists
    const existingIndex = this.projects.findIndex(p => p.id === project.id)
    if (existingIndex !== -1) {
      console.log('ProjectStore: Project already exists, updating instead:', project.id)
      this.updateProject(project.id, project)
      return
    }

    this.projects = [...this.projects, project]
    // Force a new array reference to ensure React detects the change
    const updatedProjects = [...this.projects]

    this.listeners.forEach(listener => {
      try {
        listener(updatedProjects)
      } catch (error) {
        console.error('ProjectStore: error notifying listener:', error)
      }
    })
  }

  // Remove a project
  removeProject(projectId: string, isFromRealtime: boolean = false) {
    console.log('ProjectStore: removing project', projectId, isFromRealtime ? '(from real-time)' : '(from local operation)')

    // Only start operation tracking if this is not from a real-time event
    // Real-time events should not start new operations, they should respect existing ones
    if (!isFromRealtime) {
      this.startOperation(projectId)
    }

    const projectExists = this.projects.some(p => p.id === projectId)
    if (!projectExists) {
      console.log('ProjectStore: Project not found for removal:', projectId)
      if (!isFromRealtime) {
        this.endOperation(projectId)
      }
      return
    }

    this.projects = this.projects.filter(p => p.id !== projectId)

    // Force a new array reference to ensure React detects the change
    const updatedProjects = [...this.projects]

    this.listeners.forEach(listener => {
      try {
        listener(updatedProjects)
      } catch (error) {
        console.error('ProjectStore: error notifying listener:', error)
      }
    })

    // End operation tracking immediately
    // Operation tracking prevents race conditions but doesn't hide projects
    if (!isFromRealtime) {
      this.endOperation(projectId)
    }
  }

  // Update a project
  updateProject(projectId: string, updates: Partial<Project>, isFromRealtime: boolean = false) {
    console.log('ProjectStore: updating project', projectId, 'with updates:', updates, isFromRealtime ? '(from real-time)' : '(from local operation)')

    if (updates.name) {
      console.log('ProjectStore: updating project name to:', updates.name)
    }
    if (updates.status) {
      console.log('ProjectStore: updating project status to:', updates.status)
    }
    if (updates.priority) {
      console.log('ProjectStore: updating project priority to:', updates.priority)
    }

    // Check if operation is in progress for this project (skip for real-time updates)
    if (!isFromRealtime && this.operationInProgress.has(projectId)) {
      console.log('ProjectStore: Operation in progress for project, skipping update:', projectId)
      return
    }

    const projectIndex = this.projects.findIndex(p => p.id === projectId)
    if (projectIndex === -1) {
      console.warn('ProjectStore: project not found for update:', projectId, 'available projects:', this.projects.map(p => p.id))
      return
    }

    const oldProject = this.projects[projectIndex]
    const updatedProject = { ...oldProject, ...updates, _updated: Date.now() } // Force object reference change

    // Validate that the updated project still has required fields
    if (!updatedProject.id || !updatedProject.name) {
      console.error('ProjectStore: update would result in invalid project, aborting:', updatedProject)
      return
    }

    this.projects[projectIndex] = updatedProject

    console.log('ProjectStore: project updated successfully from:', oldProject.name, 'to:', updatedProject.name)
    console.log('ProjectStore: total projects after update:', this.projects.length)

    // Force a new array reference to ensure React detects the change
    const updatedProjects = [...this.projects]

    this.listeners.forEach(listener => {
      try {
        listener(updatedProjects)
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
