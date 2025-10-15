'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { ProjectClientService } from '../services/projectClientService'
import { useOrganizationRealtime } from '@/lib/hooks/useRealtime'
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
import styles from './ProjectTable.module.css'

interface Project {
  id: string
  name: string
  description?: string | null
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
    const backgroundColors = {
      'planning': '#f1f5f9',
      'active': '#dbeafe',
      'on_hold': '#fed7aa',
      'completed': '#bbf7d0',
      'cancelled': '#fecaca'
    }

    const textColors = {
      'planning': '#475569',
      'active': '#1e40af',
      'on_hold': '#c2410c',
      'completed': '#14532d',
      'cancelled': '#991b1b'
    }

    const borderColors = {
      'planning': '#cbd5e1',
      'active': '#93c5fd',
      'on_hold': '#fb923c',
      'completed': '#86efac',
      'cancelled': '#fca5a5'
    }

    const labels = {
      'planning': 'Planning',
      'active': 'Active',
      'on_hold': 'On Hold',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 12px',
          minWidth: '85px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '600',
          letterSpacing: '0.025em',
          textTransform: 'uppercase',
          backgroundColor: backgroundColors[status] || backgroundColors.planning,
          color: textColors[status] || textColors.planning,
          border: `1px solid ${borderColors[status] || borderColors.planning}`
        }}
      >
        {labels[status] || status}
      </span>
    )
  }

  const getPriorityBadge = (priority: Project['priority']) => {
    const backgroundColors = {
      'low': '#e2e8f0',
      'medium': '#3b82f6',
      'high': '#f97316',
      'urgent': '#dc2626'
    }

    const textColors = {
      'low': '#475569',
      'medium': '#ffffff',
      'high': '#ffffff',
      'urgent': '#ffffff'
    }

    const labels = {
      'low': 'Low',
      'medium': 'Medium',
      'high': 'High',
      'urgent': 'Urgent'
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 12px',
          minWidth: '70px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '600',
          letterSpacing: '0.025em',
          textTransform: 'uppercase',
          backgroundColor: backgroundColors[priority] || backgroundColors.medium,
          color: textColors[priority] || textColors.medium,
          border: priority === 'low' ? '1px solid #cbd5e1' : 'none'
        }}
      >
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

  const handleDuplicateProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (!project || !user) return

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',        },
        body: JSON.stringify({
          name: `${project.name} (Copy)`,
          status: 'planning',
          priority: project.priority,
          due_date: project.due_date,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate project')
      }

      const result = await response.json()
      toast({
        title: 'Success',
        description: `Project "${project.name}" has been duplicated.`,
      })

      // Refresh projects list
      fetchProjects()
    } catch (error) {
      console.error('Error duplicating project:', error)
      toast({
        title: 'Error',
        description: 'Failed to duplicate project. Please try again.',
        variant: 'destructive',
      })
    }
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
          'Content-Type': 'application/json',        },
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
          'Content-Type': 'application/json',        },
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
          'Content-Type': 'application/json',        },
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

      const result = await ProjectClientService.bulkOperation(operation, projectIds, { force })

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Bulk operation failed')
      }

      // Update store with successful operations
      if (result.data.successful) {
        result.data.successful.forEach((projectId: string) => {
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
      if (result.data.successful) {
        result.data.successful.forEach((projectId: string) => {
          setTimeout(() => {
            projectStore.endOperation(projectId)
          }, 100)
        })
      }

      // End operation tracking for failed operations
      if (result.data.failed) {
        result.data.failed.forEach((failure) => {
          projectStore.endOperation(failure.id)
        })
      }

      return {
        successful: result.data.successful || [],
        failed: result.data.failed || []
      }
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
          'Content-Type': 'application/json',        },
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
      const safeFiltered = Array.isArray(filteredProjects) ? filteredProjects : []
      setSelectedProjects(new Set(safeFiltered.map(p => p.id)))
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
    if (selectedProjects.size === 0) {
      toast({
        title: 'No Projects Selected',
        description: 'Please select at least one project to manage team members.',
        variant: 'destructive',
      })
      return
    }

    if (selectedProjects.size === 1) {
      // If only one project selected, open the team dialog for that project
      const projectId = Array.from(selectedProjects)[0]
      handleManageTeam(projectId)
      return
    }

    // For multiple projects, show a dialog to manage team across all selected projects
    toast({
      title: 'Bulk Team Management',
      description: `Managing team for ${selectedProjects.size} projects. Opening team management interface...`,
    })

    // Navigate to a bulk team management page or show a modal
    // For now, we'll just open settings with members tab
    window.location.href = '/dashboard/settings?tab=members'
  }

  const allSelected = projects.length > 0 && selectedProjects.size === projects.length
  const someSelected = selectedProjects.size > 0 && selectedProjects.size < projects.length

  // Fetch projects function
  const fetchProjects = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch('/api/projects', {
              })

      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }

      const data = await response.json()

      // Handle wrapped response: {success: true, data: {data: [...], pagination: {}}}
      let projectsData: ProjectWithOrg[] = []
      if (data.success && data.data) {
        // wrapRoute wraps the response
        if (Array.isArray(data.data.data)) {
          // {success: true, data: {data: [...], pagination: {}}}
          projectsData = data.data.data
        } else if (Array.isArray(data.data)) {
          // {success: true, data: [...]}
          projectsData = data.data
        }
      } else if (Array.isArray(data.data)) {
        // {data: [...]}
        projectsData = data.data
      } else if (Array.isArray(data)) {
        // Direct array
        projectsData = data
      }

      console.log('ProjectTable: fetched projects from API:', projectsData.length)
      projectStore.setProjects(projectsData)
      setProjects(projectsData)
    } catch (err) {
      console.error('Error fetching projects:', err)
      setError('Failed to load projects. Please try again.')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [user])

  // Initial fetch
  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Apply filtering and sorting
  useEffect(() => {
    // Ensure projects is always an array before filtering
    const safeProjects = Array.isArray(projects) ? projects : []

    // Apply search term filter first
    let searchFiltered = safeProjects
    if (searchTerm && searchTerm.trim()) {
      searchFiltered = safeProjects.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (project.organizations?.name && project.organizations.name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      console.log('ProjectTable: search applied:', { searchTerm, resultsCount: searchFiltered.length })
    }

    // Then apply advanced filters and sorting
    const result = FilteringService.filterAndSort(searchFiltered, filters, sortConditions)
    setFilteredProjects(result.items)
  }, [projects, filters, sortConditions, searchTerm])

  // Real-time updates for projects in table (updates store)
  // Use a single organization subscription if user has organizations, otherwise use global
  const [userOrganizations, setUserOrganizations] = useState<string[]>([])

  // Fetch user organizations for real-time subscriptions
  useEffect(() => {
    const fetchUserOrganizations = async () => {
      if (!user) return

      try {
        const response = await fetch('/api/organizations', {
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

  // Use organization-specific realtime subscription
  // This handles all project updates within the user's organization
  useOrganizationRealtime(primaryOrgId || '', (payload: any) => {
    if (primaryOrgId) {
      handleRealtimeEvent(payload, 'organization')
    }
  })

  // Note: Removed global realtime subscription to prevent "realtime:global" errors
  // The organization-specific subscription above handles all necessary updates
  // Personal projects without organization_id will still sync via the project store

  if (error) {
    return (
      <div className="mt-6 rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
        <p className="text-destructive font-medium">Error loading projects</p>
        <p className="text-muted-foreground text-sm mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className={`w-full space-y-4 relative ${selectedProjects.size > 0 ? 'pb-20' : ''}`}>

      {/* Advanced Filtering */}
      <div className="mb-4 flex items-center justify-between px-4">
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

      {/* Mobile Card View - Only on small screens */}
      <div className={`${styles.mobileCardView} space-y-4`}>
        {loading ? (
          // Loading cards for mobile
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 animate-pulse">
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
          ))
        ) : projects.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
            <p className="text-lg font-medium text-slate-900 dark:text-slate-100">No projects yet</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create your first project to get started</p>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <div
              key={project.id}
              className={`bg-white dark:bg-slate-900 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                selectedProjects.has(project.id)
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
              }`}
              onClick={() => handleViewProject(project.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedProjects.has(project.id)}
                      onCheckedChange={(checked) => handleSelectProject(project.id, checked as boolean)}
                      aria-label={`Select project ${project.name}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{project.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {project.organizations?.name || 'Personal'}
                    </p>
                  </div>
                </div>
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
              </div>
              <div className="flex flex-wrap gap-2">
                {getStatusBadge(project.status)}
                {getPriorityBadge(project.priority)}
                {project.due_date && (
                  <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(project.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View - Hidden on mobile, visible on sm and up */}
      <div className={`${styles.desktopTableView} w-full rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700`}>
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className={`${styles.projectTable} w-full min-w-[900px]`} style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800 dark:to-slate-800/50">
              <tr>
                <th scope="col" style={{ width: '50px', display: 'table-cell !important' }} className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all projects"
                    className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                  />
                </th>
                <th scope="col" style={{ width: '25%', minWidth: '200px', display: 'table-cell !important' }} className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Name
                </th>
                <th scope="col" style={{ width: '120px', display: 'table-cell !important' }} className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Status
                </th>
                <th scope="col" style={{ width: '120px', display: 'table-cell !important' }} className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Due Date
                </th>
                <th scope="col" style={{ width: '140px', display: 'table-cell !important' }} className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Organization
                </th>
                <th scope="col" style={{ width: '100px', display: 'table-cell !important' }} className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Priority
                </th>
                <th scope="col" style={{ width: '90px', display: 'table-cell !important' }} className="px-3 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
              {loading ? (
                // Loading skeleton
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-3 py-4">
                      <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-28"></div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-8 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="space-y-2 max-w-full overflow-hidden">
                      <p className="text-base sm:text-lg font-medium break-words px-2">No projects yet</p>
                      <p className="text-xs sm:text-sm break-words px-2">Create your first project to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    className={`hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200 cursor-pointer border-l-4 ${
                      selectedProjects.has(project.id)
                        ? 'bg-gradient-to-r from-primary/10 to-transparent border-l-primary shadow-sm'
                        : 'border-l-transparent hover:border-l-primary/30'
                    }`}
                    onClick={() => handleViewProject(project.id)}
                  >
                    <td style={{ width: '50px', display: 'table-cell !important' }} className="px-3 py-5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedProjects.has(project.id)}
                        onCheckedChange={(checked) => handleSelectProject(project.id, checked as boolean)}
                        aria-label={`Select project ${project.name}`}
                      />
                    </td>
                    <td style={{ width: '25%', minWidth: '200px', display: 'table-cell !important' }} className="px-3 py-5">
                      <div className="flex flex-col w-full">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{project.name}</span>
                      </div>
                    </td>
                    <td style={{ width: '120px', display: 'table-cell !important' }} className="px-3 py-5">
                      {getStatusBadge(project.status)}
                    </td>
                    <td style={{ width: '120px', display: 'table-cell !important' }} className="px-3 py-5 text-sm text-slate-600 dark:text-slate-400 font-medium">
                      <span className="block">{project.due_date ? new Date(project.due_date).toLocaleDateString() : '-'}</span>
                    </td>
                    <td style={{ width: '140px', display: 'table-cell !important' }} className="px-3 py-5 text-sm text-slate-600 dark:text-slate-400 font-medium">
                      <span className="block truncate">{project.organizations?.name || 'Personal'}</span>
                    </td>
                    <td style={{ width: '100px', display: 'table-cell !important' }} className="px-3 py-5">
                      {getPriorityBadge(project.priority)}
                    </td>
                    <td style={{ width: '90px', display: 'table-cell !important' }} className="px-3 py-5 text-right">
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
          selectedProjects={(Array.isArray(filteredProjects) ? filteredProjects : []).filter(p => selectedProjects.has(p.id)) as any}
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
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-50 dark:bg-blue-950 backdrop-blur-sm border-2 border-blue-400 dark:border-blue-600 p-3 pb-4 shadow-lg rounded-lg max-w-xl w-full mx-4">
          <div className="flex flex-row items-center justify-between gap-4">
            <div className="flex items-center flex-1 min-w-0">
              <span className="text-sm font-medium !text-blue-900 dark:!text-blue-100 whitespace-nowrap">
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