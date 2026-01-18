'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProjectCard } from './project-card'
import { ProjectForm } from './project-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Loader2, Plus, Search, Filter } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { projectStore } from '@/lib/stores/project-store'

interface Project {
  id: string
  name: string
  slug?: string
  description: string | null
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  progress_percentage: number
  start_date: string | null
  due_date: string | null
  created_at: string
  workspace_id: string
}

interface Organization {
  id: string
  name: string
}

interface ProjectListProps {
  workspaceId?: string
  showCreateButton?: boolean
  onCreateProject?: () => void
  onEditProject?: (projectId: string) => void
  onDeleteProject?: (projectId: string) => void
  initialStatus?: string
  initialPriority?: string
}

export function ProjectList({
  workspaceId,
  showCreateButton = true,
  onCreateProject,
  onEditProject,
  onDeleteProject,
  initialStatus,
  initialPriority,
}: ProjectListProps) {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState(initialStatus || 'all')
  const [priorityFilter, setPriorityFilter] = useState(initialPriority || 'all')

  // Edit modal states
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])

  // Fetch organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!user) return
      try {
        const { apiClient } = await import('@/lib/api-client')
        const response = await apiClient.get('/api/organizations')
        const orgsData = response.data || response
        setOrganizations(Array.isArray(orgsData) ? orgsData : [])
      } catch (err) {
        console.error('Error fetching organizations:', err)
      }
    }
    fetchOrganizations()
  }, [user])

  const fetchProjects = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Build query parameters
      const params = new URLSearchParams()
      if (workspaceId) params.append('workspace_id', workspaceId)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (priorityFilter !== 'all') params.append('priority', priorityFilter)

      const { apiClient } = await import('@/lib/api-client')
      const data = await apiClient.get(`/api/projects?${params}`)

      // Handle wrapped response: {success: true, data: {data: [...], pagination: {}}}
      let projectsData: any[] = []
      if (data.success && data.data) {
        if (Array.isArray(data.data.data)) {
          projectsData = data.data.data
        } else if (Array.isArray(data.data)) {
          projectsData = data.data
        }
      } else if (Array.isArray(data.data)) {
        projectsData = data.data
      } else if (Array.isArray(data)) {
        projectsData = data
      }

      console.log('ProjectList: fetched projects from API:', projectsData.length)
      projectStore.setProjects(projectsData)
      setProjects(projectsData)
    } catch (err) {
      console.error('Error fetching projects:', err)
      setError('Failed to load projects. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user, organizationId, statusFilter, priorityFilter])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Subscribe to global project store
  useEffect(() => {
    console.log('ProjectList: subscribing to project store')
    const unsubscribe = projectStore.subscribe((storeProjects) => {
      console.log('ProjectList: received projects from store:', storeProjects.length)
      setProjects(storeProjects as Project[])
    })

    return unsubscribe
  }, [])

  // Real-time updates for projects
  useRealtime(
    workspaceId ? { organizationId: workspaceId } : { enabled: false },
    (payload) => {
      if (payload.table === 'foco_projects') {
        if (payload.eventType === 'INSERT') {
          projectStore.addProject(payload.new)
        } else if (payload.eventType === 'UPDATE') {
          projectStore.updateProject(payload.new.id, payload.new, true) // isFromRealtime = true
        } else if (payload.eventType === 'DELETE') {
          projectStore.removeProject(payload.old?.id)
        }
      }
    }
  )

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesSearch
  })

  const handleEditProject = useCallback((projectId: string) => {
    const projectToEdit = projects.find((p) => p.id === projectId)
    if (projectToEdit) {
      setEditingProject(projectToEdit)
      setEditDialogOpen(true)
    }
  }, [projects])

  const handleEditSuccess = () => {
    setEditDialogOpen(false)
    setEditingProject(null)
    // Refresh projects list
    fetchProjects()
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!user) return

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete project')
      }

      // Remove from ProjectStore (this will update all subscribers)
      projectStore.removeProject(projectId)

      // Force sidebar and all components to refresh from API
      window.dispatchEvent(new CustomEvent('projectDeleted', { detail: { projectId, forceRefresh: true } }))

      // Additional safeguard: Force refresh after a short delay
      setTimeout(() => {
        console.log('ProjectList: Force refreshing all project data after delete')
        // This will trigger sidebar and other components to fetch fresh data
        window.dispatchEvent(new CustomEvent('forceProjectRefresh'))
      }, 500)

      // Call optional callback
      onDeleteProject?.(projectId)
    } catch (err) {
      console.error('Error deleting project:', err)
      throw err // Re-throw to let ProjectCard handle the error
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-muted-foreground">Loading projects...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <Button onClick={fetchProjects} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Projects</h2>
          <p className="text-muted-foreground">
            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
          </p>
        </div>

        {showCreateButton && onCreateProject && (
          <Button onClick={onCreateProject}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Project Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12 px-3">
          <div className="text-muted-foreground mb-4 max-w-full overflow-hidden">
            {projects.length === 0 ? (
              <>
                <p className="text-base sm:text-lg mb-2 break-words">No projects found</p>
                <p className="text-sm sm:text-base break-words px-2">Get started by creating your first project</p>
              </>
            ) : (
              <>
                <p className="text-base sm:text-lg mb-2 break-words">No projects match your filters</p>
                <p className="text-sm sm:text-base break-words px-2">Try adjusting your search or filters</p>
              </>
            )}
          </div>

          {showCreateButton && onCreateProject && projects.length === 0 && (
            <Button onClick={onCreateProject}>
              <Plus className="h-4 w-4" />
              Create First Project
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    aria-label="Select all projects"
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium text-sm">NAME</th>
                <th className="text-left px-4 py-3 font-medium text-sm hidden md:table-cell">STATUS</th>
                <th className="text-left px-4 py-3 font-medium text-sm hidden lg:table-cell">PRIORITY</th>
                <th className="text-left px-4 py-3 font-medium text-sm hidden xl:table-cell">PROGRESS</th>
                <th className="text-left px-4 py-3 font-medium text-sm hidden xl:table-cell">DUE DATE</th>
                <th className="text-right px-4 py-3 font-medium text-sm">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      aria-label={`Select ${project.name}`}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-medium text-sm">{project.name}</div>
                      {project.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {project.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      project.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                      project.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                      project.status === 'on_hold' ? 'bg-amber-100 text-amber-800' :
                      project.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      project.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      project.priority === 'high' ? 'bg-amber-100 text-amber-800' :
                      project.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {project.priority}
                    </span>
                  </td>
                  <td className="px-4 py-4 hidden xl:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${project.progress_percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground min-w-[3ch]">
                        {project.progress_percentage}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden xl:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {project.due_date
                        ? new Date(project.due_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : '—'
                      }
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditProject(project.id)}
                        className="p-2 hover:bg-muted rounded-md transition-colors"
                        aria-label="Edit project"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="p-2 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
                        aria-label="Delete project"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <button className="p-2 hover:bg-muted rounded-md transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


