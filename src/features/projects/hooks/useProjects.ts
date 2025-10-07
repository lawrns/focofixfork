import { useState, useEffect, useCallback } from 'react'
import { ProjectsService } from '../services/projectService'
import type { Project, CreateProjectData, UpdateProjectData } from '../types/index'

export function useProjects(organizationId?: string) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await ProjectsService.getUserProjects('current-user', { organization_id: organizationId })
      if (result.success && result.data) {
        setProjects(result.data)
      } else {
        setError(result.error || 'Failed to fetch projects')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects')
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const createProject = useCallback(async (projectData: CreateProjectData) => {
    try {
      const result = await ProjectsService.createProject('current-user', projectData)
      if (result.success && result.data) {
        setProjects(prev => [result.data!, ...prev])
        return { success: true }
      }
      return { success: false, error: result.error }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create project'
      setError(error)
      return { success: false, error }
    }
  }, [])

  const updateProject = useCallback(async (id: string, updates: UpdateProjectData) => {
    try {
      const result = await ProjectsService.updateProject('current-user', id, updates)
      if (result.success && result.data) {
        setProjects(prev => prev.map(project => project.id === id ? result.data! : project))
        return { success: true }
      }
      return { success: false, error: result.error }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update project'
      setError(error)
      return { success: false, error }
    }
  }, [])

  const deleteProject = useCallback(async (id: string) => {
    try {
      const result = await ProjectsService.deleteProject('current-user', id)
      if (result.success) {
        setProjects(prev => prev.filter(project => project.id !== id))
        return { success: true }
      }
      return { success: false, error: result.error }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete project'
      setError(error)
      return { success: false, error }
    }
  }, [])

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects,
    createProject,
    updateProject,
    deleteProject
  }
}

export function useProject(id: string) {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProject = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await ProjectsService.getProjectById('current-user', id)
      if (result.success && result.data) {
        setProject(result.data)
      } else {
        setError(result.error || 'Project not found')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      fetchProject()
    }
  }, [id, fetchProject])

  const updateProject = useCallback(async (updates: UpdateProjectData) => {
    try {
      const result = await ProjectsService.updateProject('current-user', id, updates)
      if (result.success && result.data) {
        setProject(result.data)
        return { success: true }
      }
      return { success: false, error: result.error }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update project'
      setError(error)
      return { success: false, error }
    }
  }, [id])

  return {
    project,
    loading,
    error,
    refetch: fetchProject,
    updateProject
  }
}

export function useProjectMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createProject = async (projectData: CreateProjectData) => {
    try {
      setLoading(true)
      setError(null)
      const result = await ProjectsService.createProject('current-user', projectData)
      return result
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create project'
      setError(error)
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  const updateProject = async (id: string, updates: UpdateProjectData) => {
    try {
      setLoading(true)
      setError(null)
      const result = await ProjectsService.updateProject('current-user', id, updates)
      return result
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update project'
      setError(error)
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  const deleteProject = async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      const result = await ProjectsService.deleteProject('current-user', id)
      return result
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete project'
      setError(error)
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    createProject,
    updateProject,
    deleteProject
  }
}
