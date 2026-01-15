// Simple global project store for cross-component synchronization
interface Project {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
  priority: string
  organization_id: string | null
  workspace_id: string | null
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
  private fetchInProgress: boolean = false // Track if fetch is in progress
  private lastFetchTime: number = 0 // Track when last fetch completed

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

  // Check if fetch is needed (debounce logic)
  shouldFetch(): boolean {
    if (this.fetchInProgress) {
      return false
    }

    const now = Date.now()
    const timeSinceLastFetch = now - this.lastFetchTime

    // Debounce: don't fetch if last fetch was within 1 second
    if (timeSinceLastFetch < 1000) {
      return false
    }

    return true
  }

  // Refresh projects from API
  async refreshProjects(archived: boolean = false): Promise<void> {
    if (!this.shouldFetch()) {
      return
    }

    try {
      this.fetchInProgress = true
      const url = archived ? '/api/projects?archived=true' : '/api/projects'
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      })

      if (response.ok) {
        const result = await response.json()

        // Handle different API response formats
        let projectsData: Project[] = []
        if (Array.isArray(result)) {
          projectsData = result
        } else if (result.success && Array.isArray(result.data)) {
          projectsData = result.data
        } else if (result.success && result.data && Array.isArray(result.data.data)) {
          projectsData = result.data.data
        } else if (Array.isArray(result.data)) {
          projectsData = result.data
        } else {
          return
        }

        this.setProjects(projectsData)
        this.lastFetchTime = Date.now()
      }
    } catch (error) {
      // Silently handle errors
    } finally {
      this.fetchInProgress = false
    }
  }

  // Mark operation as in progress
  startOperation(projectId: string) {
    this.operationInProgress.add(projectId)
  }

  // Mark operation as complete
  endOperation(projectId: string) {
    this.operationInProgress.delete(projectId)
  }

  // Update projects and notify all listeners
  setProjects(projects: Project[] | any) {
    // Handle case where projects is not an array (API response wrapped in object)
    if (!Array.isArray(projects)) {
      return
    }

    const validProjects = projects.filter(p => p && p.id && p.name)
    const filteredProjects = validProjects

    this.projects = [...filteredProjects]
    // Force a new array reference to ensure React detects the change
    const updatedProjects = [...this.projects]

    this.listeners.forEach(listener => {
      try {
        listener(updatedProjects)
      } catch (error) {
        // Silently handle listener errors
      }
    })
  }

  // Add a project
  addProject(project: Project) {
    // Check if project already exists
    const existingIndex = this.projects.findIndex(p => p.id === project.id)
    if (existingIndex !== -1) {
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
        // Silently handle listener errors
      }
    })
  }

  // Remove a project
  removeProject(projectId: string, isFromRealtime: boolean = false) {
    // Only start operation tracking if this is not from a real-time event
    if (!isFromRealtime) {
      this.startOperation(projectId)
    }

    const projectExists = this.projects.some(p => p.id === projectId)
    if (!projectExists) {
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
        // Silently handle listener errors
      }
    })

    // End operation tracking immediately
    if (!isFromRealtime) {
      this.endOperation(projectId)
    }
  }

  // Update a project
  updateProject(projectId: string, updates: Partial<Project>, isFromRealtime: boolean = false) {
    // Check if operation is in progress for this project (skip for real-time updates)
    if (!isFromRealtime && this.operationInProgress.has(projectId)) {
      return
    }

    const projectIndex = this.projects.findIndex(p => p.id === projectId)
    if (projectIndex === -1) {
      return
    }

    const oldProject = this.projects[projectIndex]
    const updatedProject = { ...oldProject, ...updates, _updated: Date.now() } // Force object reference change

    // Validate that the updated project still has required fields
    if (!updatedProject.id || !updatedProject.name) {
      return
    }

    this.projects[projectIndex] = updatedProject

    // Force a new array reference to ensure React detects the change
    const updatedProjects = [...this.projects]

    this.listeners.forEach(listener => {
      try {
        listener(updatedProjects)
      } catch (error) {
        // Silently handle listener errors
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
