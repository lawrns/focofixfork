'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useOrganizationRealtime } from '@/lib/hooks/useRealtime'
import { projectStore } from '@/lib/stores/project-store'
import { FilteringService, FilterCondition, SortCondition } from '@/lib/services/filtering'
import { useToast } from '@/components/toast/toast'
import { Badge } from '@/components/ui/badge'
import { Archive, X } from 'lucide-react'
import { ProjectWithOrg, ProjectTableProps } from './ProjectTableTypes'
import { ProjectTableDesktop } from './ProjectTableDesktop'
import { ProjectTableMobile } from './ProjectTableMobile'
import { ProjectTableDialogs } from './ProjectTableDialogs'
import { ProjectTableBulkBar } from './ProjectTableBulkBar'
import { useProjectTableHandlers } from './useProjectTableHandlers'

export default function ProjectTable({
  searchTerm = '',
  onCreateProject,
  onTakeTour,
  onImportProjects
}: ProjectTableProps) {
  const { user } = useAuth()
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
  const [showArchived, setShowArchived] = useState(false)
  const { toast: toastNotification } = useToast()

  const handlers = useProjectTableHandlers({
    user,
    projects,
    selectedProject,
    selectedProjects,
    showArchived,
    setSelectedProject,
    setEditDialogOpen,
    setDeleteDialogOpen,
    setTeamDialogOpen,
    setSettingsDialogOpen,
    setBulkDialogOpen,
    setBulkOperation,
    setTeamMembers,
    setLoadingTeamMembers,
    setSelectedProjects,
    setShowBulkActions,
  })

  // Subscribe to global project store - SINGLE SOURCE OF TRUTH for data fetching
  useEffect(() => {
    console.log('ProjectTable: subscribing to project store, showArchived:', showArchived)
    const unsubscribe = projectStore.subscribe((storeProjects) => {
      console.log('ProjectTable: received projects from store:', storeProjects.length)
      if (storeProjects.length > 0) {
        console.log('ProjectTable: project IDs from store:', storeProjects.map((p: any) => p.id))
      }
      setProjects(storeProjects as ProjectWithOrg[])
      setLoading(false)
    })

    console.log('ProjectTable: refreshing via store with archived:', showArchived)
    projectStore.refreshProjects(showArchived).then(() => setLoading(false))

    return unsubscribe
  }, [showArchived])

  // Listen for force refresh events
  useEffect(() => {
    const handleForceRefresh = () => {
      console.log('ProjectTable: Force refresh requested, reloading from store')
      setProjects(projectStore.getProjects() as ProjectWithOrg[])
    }
    window.addEventListener('forceProjectRefresh', handleForceRefresh)
    return () => { window.removeEventListener('forceProjectRefresh', handleForceRefresh) }
  }, [])

  const permissions = useMemo(() => ({
    canEdit: true,
    canDelete: true,
    canManageTeam: true,
    canView: true,
  }), [])

  // Fetch projects function (kept for backward compat with fetchProjectsRef)
  const fetchProjectsRef = useRef<((archived?: boolean) => Promise<void>) | null>(null)

  const fetchProjects = useCallback(async (archived: boolean = false) => {
    if (!user?.id) return
    try {
      setLoading(true)
      const { apiClient } = await import('@/lib/api-client')
      const url = archived ? '/api/projects?archived=true' : '/api/projects'
      const data = await apiClient.get(url)

      let projectsData: ProjectWithOrg[] = []
      if (data.success && data.data) {
        if (Array.isArray(data.data.data)) projectsData = data.data.data
        else if (Array.isArray(data.data)) projectsData = data.data
      } else if (Array.isArray(data.data)) {
        projectsData = data.data
      } else if (Array.isArray(data)) {
        projectsData = data
      }

      console.log('ProjectTable: fetched projects from API:', projectsData.length)
      if (!archived) projectStore.setProjects(projectsData)
      setProjects(projectsData)
    } catch (err) {
      console.error('Error fetching projects:', err)
      setError('Failed to load projects. Please try again.')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { fetchProjectsRef.current = fetchProjects }, [fetchProjects])

  // Apply filtering and sorting
  useEffect(() => {
    const safeProjects = Array.isArray(projects) ? projects : []

    let searchFiltered = safeProjects
    if (searchTerm && searchTerm.trim()) {
      searchFiltered = safeProjects.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (project.organizations?.name && project.organizations.name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      console.log('ProjectTable: search applied:', { searchTerm, resultsCount: searchFiltered.length })
    }

    const result = FilteringService.filterAndSort(searchFiltered, filters, sortConditions)
    setFilteredProjects(result.items)
  }, [projects, filters, sortConditions, searchTerm])

  const toggleSort = (field: string) => {
    const existing = sortConditions.find((s) => s.field === field)
    if (!existing) setSortConditions([{ field, direction: 'asc' }])
    else if (existing.direction === 'asc') setSortConditions([{ field, direction: 'desc' }])
    else setSortConditions([])
  }

  const [userOrganizations, setUserOrganizations] = useState<string[]>([])

  useEffect(() => {
    const fetchUserOrganizations = async () => {
      if (!user) return
      try {
        const response = await fetch('/api/organizations', {})
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) setUserOrganizations(data.data.map((org: any) => org.id))
        }
      } catch (error) {
        console.error('Error fetching user organizations for real-time:', error)
      }
    }
    fetchUserOrganizations()
  }, [user])

  const handleRealtimeEvent = useCallback((payload: any, source: string) => {
    console.log(`ProjectTable: ${source} real-time event received:`, {
      eventType: payload.eventType,
      table: payload.table,
      projectId: payload.new?.id || payload.old?.id,
      newData: payload.new,
      oldData: payload.old
    })

    if (payload.table === 'foco_projects') {
      const projectId = payload.new?.id || payload.old?.id

      if (projectId && projectStore.isOperationInProgress(projectId)) {
        console.log(`ProjectTable: Skipping ${source} real-time event for project ${projectId} - operation in progress`)
        return
      }

      if (payload.eventType === 'INSERT') {
        console.log(`ProjectTable: Adding project via ${source} real-time:`, payload.new?.id)
        if (payload.new?.id && payload.new?.name) projectStore.addProject(payload.new)
        else console.warn('ProjectTable: Invalid INSERT payload, missing id or name:', payload.new)
      } else if (payload.eventType === 'UPDATE') {
        console.log(`ProjectTable: Updating project via ${source} real-time:`, payload.new?.id, 'with data:', payload.new)
        if (payload.new?.id && payload.new?.name) projectStore.updateProject(payload.new.id, payload.new, true)
        else console.warn('ProjectTable: Invalid UPDATE payload, missing id or name:', payload.new)
      } else if (payload.eventType === 'DELETE') {
        const deletedProjectId = payload.old?.id
        console.log(`ProjectTable: Removing project via ${source} real-time:`, deletedProjectId)
        if (deletedProjectId) {
          projectStore.removeProject(deletedProjectId, true)
          setSelectedProjects(prev => { const s = new Set(prev); s.delete(deletedProjectId); return s })
          if (selectedProject && selectedProject.id === deletedProjectId) setSelectedProject(null)
        }
      }
    }
  }, [selectedProject])

  const primaryOrgId = userOrganizations.length > 0 ? userOrganizations[0] : null

  useOrganizationRealtime(primaryOrgId || '', (payload: any) => {
    if (primaryOrgId) handleRealtimeEvent(payload, 'organization')
  })

  const allSelected = projects.length > 0 && selectedProjects.size === projects.length
  const someSelected = selectedProjects.size > 0 && selectedProjects.size < projects.length

  if (error) {
    return (
      <div className="mt-6 rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
        <p className="text-destructive font-medium">Error loading projects</p>
        <p className="text-muted-foreground text-sm mt-1">{error}</p>
      </div>
    )
  }

  const sharedActionProps = {
    onViewProject: handlers.handleViewProject,
    onEditProject: handlers.handleEditProject,
    onDuplicateProject: handlers.handleDuplicateProject,
    onArchiveProject: handlers.handleArchiveProject,
    onDeleteProject: handlers.handleDeleteProject,
    onManageTeam: handlers.handleManageTeam,
    onProjectSettings: handlers.handleProjectSettings,
    onUnarchiveProject: handlers.handleUnarchiveProject,
    onCreateProject,
    onImportProjects,
    onResetFilters: () => { setFilters([]); setSortConditions([]) },
    permissions,
    showArchived,
    searchTerm,
  }

  return (
    <div className={`w-full space-y-4 relative ${selectedProjects.size > 0 ? 'pb-20' : ''}`}>

      {/* Filtering Controls */}
      <div className="mb-4 flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${
              showArchived
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
            }`}
            aria-pressed={showArchived}
          >
            <Archive className="h-3.5 w-3.5" />
            <span>{showArchived ? 'Archived' : 'Archived'}</span>
          </button>

          {(filters.length > 0 || sortConditions.length > 0) && (
            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
              {filteredProjects.length} of {projects.length}
            </span>
          )}
        </div>

        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.map((f, idx) => (
              <Badge key={idx} variant="outline" className="gap-1 text-xs">
                <span className="capitalize">{f.field}</span>
                <span>:</span>
                <span className="truncate max-w-[8ch] sm:max-w-[12ch]">{String(f.value)}</span>
                <button
                  onClick={() => setFilters(filters.filter((_, i) => i !== idx))}
                  className="inline-flex items-center justify-center rounded-full hover:bg-muted ml-1"
                  aria-label="Remove filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <ProjectTableMobile
        loading={loading}
        projects={projects}
        filteredProjects={filteredProjects}
        selectedProjects={selectedProjects}
        onSelectProject={handlers.handleSelectProject}
        filterCount={filters.length}
        {...sharedActionProps}
      />

      <ProjectTableDesktop
        loading={loading}
        projects={projects}
        filteredProjects={filteredProjects}
        selectedProjects={selectedProjects}
        allSelected={allSelected}
        someSelected={someSelected}
        sortConditions={sortConditions}
        onSelectProject={handlers.handleSelectProject}
        onSelectAll={(checked) => handlers.handleSelectAll(checked, filteredProjects)}
        onToggleSort={toggleSort}
        onSaveProject={handlers.handleSaveProject}
        {...sharedActionProps}
      />

      <ProjectTableDialogs
        selectedProject={selectedProject}
        editDialogOpen={editDialogOpen}
        deleteDialogOpen={deleteDialogOpen}
        teamDialogOpen={teamDialogOpen}
        settingsDialogOpen={settingsDialogOpen}
        bulkDialogOpen={bulkDialogOpen}
        bulkOperation={bulkOperation}
        selectedProjects={selectedProjects}
        filteredProjects={filteredProjects}
        teamMembers={teamMembers}
        currentUserId={user?.id || ''}
        onEditOpenChange={setEditDialogOpen}
        onDeleteOpenChange={setDeleteDialogOpen}
        onTeamOpenChange={setTeamDialogOpen}
        onSettingsOpenChange={setSettingsDialogOpen}
        onBulkOpenChange={setBulkDialogOpen}
        onSaveProject={handlers.handleSaveProject}
        onDeleteProject={handlers.handleDeleteProjectConfirm}
        onAddMember={handlers.handleAddTeamMember}
        onRemoveMember={handlers.handleRemoveTeamMember}
        onUpdateRole={handlers.handleUpdateTeamRole}
        onBulkOperation={handlers.handleBulkOperation}
        onSaveSettings={handlers.handleSaveSettings}
      />

      <ProjectTableBulkBar
        selectedCount={selectedProjects.size}
        onManageTeam={handlers.handleBulkManageTeam}
        onArchive={handlers.handleBulkArchive}
        onDelete={() => handlers.handleBulkDelete(filteredProjects)}
        onCancel={() => { setSelectedProjects(new Set()); setShowBulkActions(false) }}
      />
    </div>
  )
}
