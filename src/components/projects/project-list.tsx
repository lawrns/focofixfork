'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProjectCard } from './project-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Search, Filter } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { projectStore } from '@/lib/stores/project-store'

interface Project {
  id: string
  name: string
  description: string | null
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  progress_percentage: number
  start_date: string | null
  due_date: string | null
  created_at: string
  organization_id: string
}

interface ProjectListProps {
  organizationId?: string
  showCreateButton?: boolean
  onCreateProject?: () => void
  onEditProject?: (projectId: string) => void
  onDeleteProject?: (projectId: string) => void
  initialStatus?: string
  initialPriority?: string
}

export function ProjectList({
  organizationId,
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

  const fetchProjects = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Build query parameters
      const params = new URLSearchParams()
      if (organizationId) params.append('organization_id', organizationId)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (priorityFilter !== 'all') params.append('priority', priorityFilter)

      const response = await fetch(`/api/projects?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }

      const data = await response.json()
      console.log('ProjectList: fetched projects from API:', data.data?.length || 0)
      projectStore.setProjects(data.data || [])
      setProjects(data.data || [])
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
    organizationId ? { organizationId } : { enabled: false },
    (payload) => {
      if (payload.table === 'projects') {
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
        <span className="ml-2 text-muted-foreground">Loading projects...</span>
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
            <Plus className="mr-2 h-4 w-4" />
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
              <Plus className="mr-2 h-4 w-4" />
              Create First Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={onEditProject}
              onDelete={handleDeleteProject}
            />
          ))}
        </div>
      )}
    </div>
  )
}


