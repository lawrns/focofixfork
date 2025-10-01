'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { useGlobalRealtime, useOrganizationRealtime } from '@/lib/hooks/useRealtime'
import { projectStore } from '@/lib/stores/project-store'
import { QuickActions, createProjectActions } from '@/components/ui/quick-actions'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Archive, Trash2, Users } from 'lucide-react'
import AdvancedFilterBuilder from '@/components/filters/advanced-filter-builder'
import { FilteringService, FilterCondition, SortCondition } from '@/lib/services/filtering'
import ProjectEditDialog from '@/components/dialogs/project-edit-dialog'
import ProjectDeleteDialog from '@/components/dialogs/project-delete-dialog'
import TeamManagementDialog from '@/components/dialogs/team-management-dialog'
import BulkOperationsDialog from '@/components/dialogs/bulk-operations-dialog'
import ProjectSettingsDialog from '@/components/dialogs/project-settings-dialog'
import { useToast } from '@/components/toast/toast'
import { UpdateProject } from '@/lib/validation/schemas/project.schema'
import { usePermissions } from '@/hooks/usePermissions'

interface Project {
  id: string
  name: string
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  due_date?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  progress_percentage?: number
  created_at: string
  organization_id?: string
}

interface ProjectWithOrg extends Project {
  organizations?: {
    name: string
  }
}

interface ProjectTableProps {
  searchTerm?: string
}

export default function ProjectTable({ searchTerm = '' }: ProjectTableProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectWithOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false)

  // Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<ProjectWithOrg | null>(null)
  const [bulkOperation, setBulkOperation] = useState<'archive' | 'delete' | null>(null)

  // Filtering and sorting state
  const [filters, setFilters] = useState<FilterCondition[]>([])
  const [sortConditions, setSortConditions] = useState<SortCondition[]>([])
  const [filteredProjects, setFilteredProjects] = useState<ProjectWithOrg[]>([])
  const { toast } = useToast()

  // Subscribe to global project store
  useEffect(() => {
    console.log('ProjectTable: subscribing to project store')
    const unsubscribe = projectStore.subscribe((storeProjects) => {
      console.log('ProjectTable: received projects from store:', storeProjects.length)
      if (storeProjects.length > 0) {
        console.log('ProjectTable: project IDs from store:', storeProjects.map((p: any) => p.id))
      }
      setProjects(storeProjects as ProjectWithOrg[])
    })

    // If store is empty on mount, trigger a fetch
    const currentProjects = projectStore.getProjects()
    if (currentProjects.length === 0) {
      console.log('ProjectTable: store is empty on mount, triggering sidebar refresh')
      // Trigger sidebar to fetch data
      window.dispatchEvent(new CustomEvent('forceProjectRefresh'))
    }

    return unsubscribe
  }, [])

  // Listen for force refresh events
  useEffect(() => {
    const handleForceRefresh = () => {
      console.log('ProjectTable: Force refresh requested, reloading from store')
      const latestProjects = projectStore.getProjects()
      setProjects(latestProjects as ProjectWithOrg[])
    }

    window.addEventListener('forceProjectRefresh', handleForceRefresh)

    return () => {
      window.removeEventListener('forceProjectRefresh', handleForceRefresh)
    }
  }, [])

  // Permissions - for demo purposes, assume admin permissions
  // In real app, this would be based on actual user roles
  const permissions = useMemo(() => ({
    canEdit: true,
    canDelete: true,
    canManageTeam: true,
    canView: true,
  }), [])

  // Helper functions
  const getStatusBadge = (status: Project['status']) => {
    const styles = {
      'planning': 'bg-muted text-muted-foreground',
      'active': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
      'on_hold': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
      'completed': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
      'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
    }

    const labels = {
      'planning': 'Planning',
      'active': 'Active',
      'on_hold': 'On Hold',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    }

    return (
      <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles.planning}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getPriorityBadge = (priority: Project['priority']) => {
    const styles = {
      'low': 'bg-muted text-muted-foreground',
      'medium': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
      'high': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
      'urgent': 'bg-destructive/10 text-destructive'
    }

    const labels = {
      'low': 'Low',
      'medium': 'Medium',
      'high': 'High',
      'urgent': 'Urgent'
    }

    return (
      <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium ${styles[priority] || styles.medium}`}>
        {labels[priority] || priority}
      </span>
    )
  }

  // Action handlers
  const handleViewProject = (projectId: string) => {
    router.push(`/projects/${projectId}`)
  }

  const handleEditProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setSelectedProject(project)
      setEditDialogOpen(true)
    }
  }

  const handleDuplicateProject = (projectId: string) => {
    toast({
      title: 'Feature Coming Soon',
      description: 'Project duplication will be available in a future update.',
    })
  }

  const handleArchiveProject = (projectId: string) => {
    setBulkOperation('archive')
    setSelectedProjects(new Set([projectId]))
    setBulkDialogOpen(true)
  }

  const handleDeleteProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setSelectedProject(project)
      setDeleteDialogOpen(true)
    }
  }

  const handleManageTeam = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setSelectedProject(project)
      await fetchTeamMembers(projectId)
      setTeamDialogOpen(true)
    }
  }

  const handleProjectSettings = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setSelectedProject(project)
      setSettingsDialogOpen(true)
    }
  }

  // Fetch team members for a project
  const fetchTeamMembers = async (projectId: string) => {
    setLoadingTeamMembers(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/team`, {
        headers: {
          'x-user-id': user?.id || '',
        },
      })
      if (!response.ok) {
        throw new Error('Failed to fetch team members')
      }
      const result = await response.json()
      setTeamMembers(result.data || [])
    } catch (error) {
      console.error('Error fetching team members:', error)
      setTeamMembers([])
      toast({
        title: 'Error',
        description: 'Failed to load team members',
        variant: 'destructive',
      })
    } finally {
      setLoadingTeamMembers(false)
    }
  }

  // Dialog action handlers
  const handleSaveProject = async (projectId: string, data: UpdateProject) => {
    try {
      // Start operation tracking to prevent race conditions with real-time updates
      projectStore.startOperation(projectId)

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        // End operation tracking on error
        projectStore.endOperation(projectId)
        throw new Error('Failed to update project')
      }

      // Get the updated project data from response
      const result = await response.json()

      // End operation tracking first, then update the store
      projectStore.endOperation(projectId)

      // Immediately update the store with the new data for instant UI feedback
      if (result.success && result.data) {
        console.log('ProjectTable: updating project in store after edit:', result.data.id, 'new name:', result.data.name, 'status:', result.data.status, 'priority:', result.data.priority)
        console.log('ProjectTable: full result.data:', result.data)
        projectStore.updateProject(result.data.id, result.data)

        // Update selectedProject state if it's the same project
        if (selectedProject && selectedProject.id === result.data.id) {
          console.log('ProjectTable: updating selectedProject from:', selectedProject.name, 'to:', result.data.name)
          setSelectedProject(result.data)
        }

        // Notify other components that a project was updated
        window.dispatchEvent(new CustomEvent('projectUpdated', {
          detail: { projectId: result.data.id, project: result.data }
        }))
      }
    } catch (error) {
      // Ensure operation tracking is ended on error
      projectStore.endOperation(projectId)
      throw error
    }
  }

  const handleDeleteProjectConfirm = async (projectId: string) => {
    try {
      // Start operation tracking to prevent race conditions
      projectStore.startOperation(projectId)

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user?.id || '',
        },
      })

      if (!response.ok) {
        // End operation tracking on error
        projectStore.endOperation(projectId)

        // If project is already deleted (404), consider it a success
        if (response.status === 404) {
          console.log('Project was already deleted or not found, removing from store')
          // Immediately remove from global store
          projectStore.removeProject(projectId)
          return
        }
        throw new Error('Failed to delete project')
      }

      // Immediately remove from global store for instant UI feedback across all components
      console.log('Project deleted successfully, removing from store:', projectId)
      projectStore.removeProject(projectId)

      // Clear the deleted project from selection state
      setSelectedProjects(prev => {
        const newSelected = new Set(prev)
        newSelected.delete(projectId)
        return newSelected
      })

      // Clear selectedProject state if it matches the deleted project
      if (selectedProject && selectedProject.id === projectId) {
        setSelectedProject(null)
      }

      // Notify other components that a project was deleted
      window.dispatchEvent(new CustomEvent('projectDeleted', {
        detail: { projectId }
      }))
    } catch (error) {
      // Ensure operation tracking is ended on error
      projectStore.endOperation(projectId)
      throw error
    }
  }

  const handleAddTeamMember = async (projectId: string, data: any) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add team member')
      }

      const result = await response.json()

      toast({
        title: 'Success',
        description: 'Team member added successfully',
      })

      // Refresh team members if dialog is open
      if (teamDialogOpen && selectedProject) {
        // This would trigger a refresh of the team dialog
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add team member',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleRemoveTeamMember = async (projectId: string, userId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/team/${userId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user?.id || '',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove team member')
      }

      toast({
        title: 'Success',
        description: 'Team member removed successfully',
      })

      // Refresh team members if dialog is open
      if (teamDialogOpen && selectedProject) {
        // This would trigger a refresh of the team dialog
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove team member',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleUpdateTeamRole = async (projectId: string, userId: string, role: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/team/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({ role }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update team member role')
      }

      toast({
        title: 'Success',
        description: 'Team member role updated successfully',
      })

      // Refresh team members if dialog is open
      if (teamDialogOpen && selectedProject) {
        // This would trigger a refresh of the team dialog
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update team member role',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleBulkOperation = async (operation: 'archive' | 'delete', projectIds: string[], force?: boolean) => {
    try {
      // Start operation tracking for all projects
      projectIds.forEach(projectId => {
        projectStore.startOperation(projectId)
      })

      const response = await fetch('/api/projects/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({
          operation,
          project_ids: projectIds,
          ...(force !== undefined && { parameters: { force } }),
        }),
      })

      if (!response.ok) {
        // End operation tracking on error
        projectIds.forEach(projectId => {
          projectStore.endOperation(projectId)
        })
        throw new Error('Bulk operation failed')
      }

      const result = await response.json()

      // Update store with successful operations
      if (result.successful) {
        result.successful.forEach((projectId: string) => {
          if (operation === 'delete') {
            projectStore.removeProject(projectId)

            // Clear the deleted project from selection state
            setSelectedProjects(prev => {
              const newSelected = new Set(prev)
              newSelected.delete(projectId)
              return newSelected
            })

            // Clear selectedProject state if it matches the deleted project
            if (selectedProject && selectedProject.id === projectId) {
              setSelectedProject(null)
            }

            // Notify other components that a project was deleted
            console.log('ProjectTable: Dispatching projectDeleted event for projectId:', projectId)
            window.dispatchEvent(new CustomEvent('projectDeleted', {
              detail: { projectId }
            }))
          }
        })
      }

      // End operation tracking for successful operations
      if (result.successful) {
        result.successful.forEach((projectId: string) => {
          setTimeout(() => {
            projectStore.endOperation(projectId)
          }, 100)
        })
      }

      // End operation tracking for failed operations
      if (result.failed) {
        result.failed.forEach((projectId: string) => {
          projectStore.endOperation(projectId)
        })
      }

      return result
    } catch (error) {
      // Ensure operation tracking is ended on error
      projectIds.forEach(projectId => {
        projectStore.endOperation(projectId)
      })
      throw error
    }
  }

  const handleSaveSettings = async (projectId: string, settings: any) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save project settings')
      }

      toast({
        title: 'Success',
        description: 'Project settings saved successfully',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save project settings',
        variant: 'destructive',
      })
      throw error
    }
  }

  // Selection handlers
  const handleSelectProject = (projectId: string, checked: boolean) => {
    const newSelected = new Set(selectedProjects)
    if (checked) {
      newSelected.add(projectId)
    } else {
      newSelected.delete(projectId)
    }
    setSelectedProjects(newSelected)
    setShowBulkActions(newSelected.size > 0)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProjects(new Set(filteredProjects.map(p => p.id)))
    } else {
      setSelectedProjects(new Set())
    }
    setShowBulkActions(checked)
  }

  // Bulk action handlers
  const handleBulkArchive = async () => {
    setBulkOperation('archive')
    setBulkDialogOpen(true)
    setShowBulkActions(false)
  }

  const handleBulkDelete = async () => {
    // If only one project is selected, use the individual delete dialog for consistency
    if (selectedProjects.size === 1) {
      const projectId = Array.from(selectedProjects)[0]
      const project = projects.find(p => p.id === projectId)
      if (project) {
        setSelectedProject(project)
        setDeleteDialogOpen(true)
        setShowBulkActions(false)
        return
      }
    }

    // For multiple projects, use the bulk dialog
    setBulkOperation('delete')
    setBulkDialogOpen(true)
    setShowBulkActions(false)
  }

  const handleBulkManageTeam = async () => {
    toast({
      title: 'Feature Coming Soon',
      description: 'Bulk team management will be available in a future update.',
    })
  }

  const allSelected = projects.length > 0 && selectedProjects.size === projects.length
  const someSelected = selectedProjects.size > 0 && selectedProjects.size < projects.length

  // Fetch projects function
  const fetchProjects = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch('/api/projects', {
        headers: {
          'x-user-id': user.id,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }

      const data = await response.json()
      if (data.success && data.data) {
        console.log('ProjectTable: fetched projects from API:', data.data.length)
        projectStore.setProjects(data.data)
        setProjects(data.data)
      } else {
        console.log('ProjectTable: no projects from API')
        projectStore.setProjects([])
        setProjects([])
      }
    } catch (err) {
      console.error('Error fetching projects:', err)
      setError('Failed to load projects. Please try again.')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchProjects()
  }, [user])

  // Apply filtering and sorting
  useEffect(() => {
    const result = FilteringService.filterAndSort(projects, filters, sortConditions)
    setFilteredProjects(result.items)
  }, [projects, filters, sortConditions])

  // Real-time updates for projects in table (updates store)
  // Use a single organization subscription if user has organizations, otherwise use global
  const [userOrganizations, setUserOrganizations] = useState<string[]>([])

  // Fetch user organizations for real-time subscriptions
  useEffect(() => {
    const fetchUserOrganizations = async () => {
      if (!user) return

      try {
        const response = await fetch('/api/organizations', {
          headers: {
            'x-user-id': user.id,
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            const orgIds = data.data.map((org: any) => org.id)
            setUserOrganizations(orgIds)
          }
        }
      } catch (error) {
        console.error('Error fetching user organizations for real-time:', error)
      }
    }

    fetchUserOrganizations()
  }, [user])

  // Real-time updates with operation tracking to prevent race conditions
  const handleRealtimeEvent = useCallback((payload: any, source: string) => {
    console.log(`ProjectTable: ${source} real-time event received:`, {
      eventType: payload.eventType,
      table: payload.table,
      projectId: payload.new?.id || payload.old?.id,
      newData: payload.new,
      oldData: payload.old
    })

    if (payload.table === 'projects') {
      const projectId = payload.new?.id || payload.old?.id

      // Skip real-time events if a local operation is in progress for this project
      // This prevents race conditions between optimistic UI updates and real-time events
      if (projectId && projectStore.isOperationInProgress(projectId)) {
        console.log(`ProjectTable: Skipping ${source} real-time event for project ${projectId} - operation in progress`)
        return
      }

      if (payload.eventType === 'INSERT') {
        console.log(`ProjectTable: Adding project via ${source} real-time:`, payload.new?.id)
        if (payload.new?.id && payload.new?.name) {
          projectStore.addProject(payload.new)
        } else {
          console.warn('ProjectTable: Invalid INSERT payload, missing id or name:', payload.new)
        }
      } else if (payload.eventType === 'UPDATE') {
        console.log(`ProjectTable: Updating project via ${source} real-time:`, payload.new?.id, 'with data:', payload.new)
        if (payload.new?.id && payload.new?.name) {
          projectStore.updateProject(payload.new.id, payload.new, true) // Mark as from real-time
        } else {
          console.warn('ProjectTable: Invalid UPDATE payload, missing id or name:', payload.new)
        }
      } else if (payload.eventType === 'DELETE') {
        const deletedProjectId = payload.old?.id
        console.log(`ProjectTable: Removing project via ${source} real-time:`, deletedProjectId)
        if (deletedProjectId) {
          projectStore.removeProject(deletedProjectId, true) // Mark as from real-time

          // Clear the deleted project from selection state
          setSelectedProjects(prev => {
            const newSelected = new Set(prev)
            newSelected.delete(deletedProjectId)
            return newSelected
          })

          // Clear selectedProject state if it matches the deleted project
          if (selectedProject && selectedProject.id === deletedProjectId) {
            setSelectedProject(null)
          }
        }
      }
    }
  }, [selectedProject])

  // Use organization-specific real-time subscription for the first organization
  // This avoids calling hooks in a loop while still providing real-time updates
  const primaryOrgId = userOrganizations.length > 0 ? userOrganizations[0] : null

  // Always call the hook, but conditionally handle the events
  useOrganizationRealtime(primaryOrgId || '', (payload: any) => {
    if (primaryOrgId) {
      handleRealtimeEvent(payload, 'organization')
    }
  })

  // Fallback: Also listen for projects created by the user directly
  useGlobalRealtime((payload) => {
    // Only process events for projects created by the user directly (not through organizations)
    const project = payload.new || payload.old
    if (project && (project.created_by === user?.id || !project.organization_id)) {
      handleRealtimeEvent(payload, 'global')
    }
  })

  if (error) {
    return (
      <div className="mt-6 rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
        <p className="text-destructive font-medium">Error loading projects</p>
        <p className="text-muted-foreground text-sm mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className={`mt-6 space-y-4 relative ${selectedProjects.size > 0 ? 'pb-20' : ''}`}>

      {/* Advanced Filtering */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <AdvancedFilterBuilder
            fields={[
              { key: 'name', label: 'Name', type: 'string' },
              { key: 'status', label: 'Status', type: 'string', options: ['planning', 'active', 'on_hold', 'completed', 'cancelled'] },
              { key: 'priority', label: 'Priority', type: 'string', options: ['low', 'medium', 'high', 'urgent'] },
              { key: 'progress_percentage', label: 'Progress', type: 'number' },
              { key: 'due_date', label: 'Due Date', type: 'date' },
              { key: 'created_at', label: 'Created', type: 'date' },
              { key: 'organizations.name', label: 'Organization', type: 'string' }
            ]}
            currentFilters={filters}
            currentSort={sortConditions}
            onFiltersChange={setFilters}
            onSortChange={setSortConditions}
          />
          {(filters.length > 0 || sortConditions.length > 0) && (
            <span className="text-sm text-muted-foreground">
              {filteredProjects.length} of {projects.length} projects
            </span>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground sm:px-6" scope="col">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all projects"
                    className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground sm:px-6" scope="col">
                  Name
                </th>
                <th className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground sm:table-cell sm:px-6" scope="col">
                  Status
                </th>
                <th className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground md:table-cell md:px-6" scope="col">
                  Due Date
                </th>
                <th className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground lg:table-cell lg:px-6" scope="col">
                  Organization
                </th>
                <th className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground xl:table-cell xl:px-6" scope="col">
                  Priority
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground sm:px-6" scope="col">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                // Loading skeleton
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-3 py-4 sm:px-6">
                      <div className="h-4 w-4 bg-muted rounded"></div>
                    </td>
                    <td className="px-3 py-4 sm:px-6">
                      <div className="h-4 bg-muted rounded w-32"></div>
                    </td>
                    <td className="hidden px-3 py-4 sm:table-cell sm:px-6">
                      <div className="h-6 bg-muted rounded w-20"></div>
                    </td>
                    <td className="hidden px-3 py-4 md:table-cell md:px-6">
                      <div className="h-4 bg-muted rounded w-24"></div>
                    </td>
                    <td className="hidden px-3 py-4 lg:table-cell lg:px-6">
                      <div className="h-4 bg-muted rounded w-28"></div>
                    </td>
                    <td className="hidden px-3 py-4 xl:table-cell xl:px-6">
                      <div className="h-6 bg-muted rounded w-16"></div>
                    </td>
                    <td className="px-3 py-4 sm:px-6">
                      <div className="h-8 bg-muted rounded w-8"></div>
                    </td>
                  </tr>
                ))
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="space-y-2">
                      <p className="text-lg font-medium">No projects yet</p>
                      <p className="text-sm">Create your first project to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    className={`hover:bg-muted/50 transition-colors cursor-pointer ${
                      selectedProjects.has(project.id) ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => handleSelectProject(project.id, !selectedProjects.has(project.id))}
                  >
                    <td className={`px-3 py-4 sm:px-6 ${selectedProjects.has(project.id) ? 'border-l-4 border-l-primary' : ''}`}>
                      <Checkbox
                        checked={selectedProjects.has(project.id)}
                        onCheckedChange={(checked) => handleSelectProject(project.id, checked as boolean)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select project ${project.name}`}
                      />
                    </td>
                    <td className="px-3 py-4 sm:px-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-card-foreground">{project.name}</span>
                        {/* Mobile-only additional info */}
                        <div className="flex items-center space-x-2 sm:hidden mt-1">
                          {getStatusBadge(project.status)}
                          {getPriorityBadge(project.priority)}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-3 py-4 sm:table-cell sm:px-6">
                      {getStatusBadge(project.status)}
                    </td>
                    <td className="hidden px-3 py-4 text-sm text-muted-foreground md:table-cell md:px-6">
                      {project.due_date ? new Date(project.due_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="hidden px-3 py-4 text-sm text-muted-foreground lg:table-cell lg:px-6">
                      {project.organizations?.name || 'Personal'}
                    </td>
                    <td className="hidden px-3 py-4 xl:table-cell xl:px-6">
                      {getPriorityBadge(project.priority)}
                    </td>
                    <td className="px-3 py-4 text-right sm:px-6">
                      <div onClick={(e) => e.stopPropagation()}>
                      <QuickActions
                        actions={createProjectActions(
                          project.id,
                          handleViewProject,
                          permissions.canEdit ? handleEditProject : () => {
                            toast({
                              title: 'Permission Denied',
                              description: 'You do not have permission to edit projects',
                              variant: 'destructive',
                            })
                          },
                          handleDuplicateProject,
                          permissions.canDelete ? handleArchiveProject : () => {
                            toast({
                              title: 'Permission Denied',
                              description: 'You do not have permission to archive projects',
                              variant: 'destructive',
                            })
                          },
                          permissions.canDelete ? handleDeleteProject : () => {
                            toast({
                              title: 'Permission Denied',
                              description: 'You do not have permission to delete projects',
                              variant: 'destructive',
                            })
                          },
                          permissions.canManageTeam ? handleManageTeam : () => {
                            toast({
                              title: 'Permission Denied',
                              description: 'You do not have permission to manage teams',
                              variant: 'destructive',
                            })
                          },
                          permissions.canManageTeam ? handleProjectSettings : () => {
                            toast({
                              title: 'Permission Denied',
                              description: 'You do not have permission to change settings',
                              variant: 'destructive',
                            })
                          }
                        )}
                      />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog Components - Only render when we have valid data */}
      {selectedProject && (
        <ProjectEditDialog
          project={selectedProject as any}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleSaveProject}
        />
      )}

      {selectedProject && (
        <ProjectDeleteDialog
          project={selectedProject as any}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onDelete={handleDeleteProjectConfirm}
        />
      )}

      {selectedProject && (
        <TeamManagementDialog
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          currentUserId={user?.id || ''}
          teamMembers={teamMembers}
          open={teamDialogOpen}
          onOpenChange={setTeamDialogOpen}
          onAddMember={handleAddTeamMember}
          onRemoveMember={handleRemoveTeamMember}
          onUpdateRole={handleUpdateTeamRole}
        />
      )}

      {(selectedProjects.size > 0 || bulkDialogOpen) && (
        <BulkOperationsDialog
          selectedProjects={filteredProjects.filter(p => selectedProjects.has(p.id)) as any}
          operation={bulkOperation}
          open={bulkDialogOpen}
          onOpenChange={setBulkDialogOpen}
          onExecute={handleBulkOperation}
        />
      )}

      {selectedProject && (
        <ProjectSettingsDialog
          project={selectedProject as any}
          open={settingsDialogOpen}
          onOpenChange={setSettingsDialogOpen}
          onSave={handleSaveSettings}
        />
      )}

      {/* Sticky Bottom Selection Display */}
      {selectedProjects.size > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-100 dark:bg-blue-900/40 backdrop-blur-sm border border-blue-200 dark:border-blue-800 p-3 pb-4 shadow-lg rounded-lg max-w-xl w-full mx-4">
          <div className="flex flex-row items-center justify-between gap-4">
            <div className="flex items-center flex-1 min-w-0">
              <span className="text-sm font-medium !text-blue-800 dark:!text-blue-300 whitespace-nowrap">
                {selectedProjects.size} project{selectedProjects.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkManageTeam}
                className="flex items-center space-x-1 sm:space-x-2"
              >
                <Users className="h-4 w-4" />
                <span className="hidden xs:inline">Manage Team</span>
                <span className="xs:hidden">Team</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkArchive}
                className="flex items-center space-x-1 sm:space-x-2"
              >
                <Archive className="h-4 w-4" />
                <span>Archive</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                className="flex items-center space-x-1 sm:space-x-2 text-destructive hover:text-destructive border-destructive"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedProjects(new Set())
                  setShowBulkActions(false)
                }}
                className=""
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}