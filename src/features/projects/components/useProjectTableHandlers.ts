'use client'

import { Dispatch, SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import { projectStore } from '@/lib/stores/project-store'
import { toast } from '@/components/toast/toast'
import { UpdateProject } from '@/lib/validation/schemas/project.schema'
import { audioService } from '@/lib/audio/audio-service'
import { hapticService } from '@/lib/audio/haptic-service'
import { apiClient } from '@/lib/api-client'
import { ProjectWithOrg } from './ProjectTableTypes'

interface UseProjectTableHandlersParams {
  user: any
  projects: ProjectWithOrg[]
  selectedProject: ProjectWithOrg | null
  selectedProjects: Set<string>
  showArchived: boolean
  setSelectedProject: Dispatch<SetStateAction<ProjectWithOrg | null>>
  setEditDialogOpen: Dispatch<SetStateAction<boolean>>
  setDeleteDialogOpen: Dispatch<SetStateAction<boolean>>
  setTeamDialogOpen: Dispatch<SetStateAction<boolean>>
  setSettingsDialogOpen: Dispatch<SetStateAction<boolean>>
  setBulkDialogOpen: Dispatch<SetStateAction<boolean>>
  setBulkOperation: Dispatch<SetStateAction<'archive' | 'delete' | null>>
  setTeamMembers: Dispatch<SetStateAction<any[]>>
  setLoadingTeamMembers: Dispatch<SetStateAction<boolean>>
  setSelectedProjects: Dispatch<SetStateAction<Set<string>>>
  setShowBulkActions: Dispatch<SetStateAction<boolean>>
}

export function useProjectTableHandlers({
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
}: UseProjectTableHandlersParams) {
  const router = useRouter()

  const handleViewProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) router.push(`/projects/${project.slug}`)
  }

  const handleEditProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) { setSelectedProject(project); setEditDialogOpen(true) }
  }

  const handleDuplicateProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (!project || !user) return

    try {
      const response = await apiClient.post('/api/projects', {
        name: `${project.name} (Copy)`,
        status: 'planning',
        priority: project.priority,
        due_date: project.due_date,
        workspace_id: project.workspace_id,
      })

      if (!response.success || !response.data) {
        audioService.play('error'); hapticService.error()
        throw new Error(response.error || 'Failed to duplicate project')
      }

      audioService.play('complete'); hapticService.success()
      toast({
        variant: 'success',
        title: 'Success',
        description: response.data.queued ? 'Duplication queued for offline sync' : `Project "${project.name}" has been duplicated.`
      })

      if (!response.data.queued) projectStore.refreshProjects(showArchived)
    } catch (error) {
      console.error('Error duplicating project:', error)
      audioService.play('error'); hapticService.error()
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to duplicate project. Please try again.' })
    }
  }

  const handleArchiveProject = (projectId: string) => {
    setBulkOperation('archive')
    setSelectedProjects(new Set([projectId]))
    setBulkDialogOpen(true)
  }

  const handleUnarchiveProject = async (projectId: string) => {
    try {
      const response = await apiClient.patch(`/api/projects/${projectId}`, { archived_at: null })

      if (!response.success || !response.data) {
        audioService.play('error'); hapticService.error()
        throw new Error(response.error || 'Failed to unarchive project')
      }

      audioService.play('complete'); hapticService.success()
      toast({
        variant: 'success',
        title: 'Success',
        description: response.data.queued ? 'Restore queued for offline sync' : 'Project has been restored.'
      })

      if (!response.data.queued && showArchived) projectStore.refreshProjects(true)
    } catch (error) {
      console.error('Error unarchiving project:', error)
      audioService.play('error'); hapticService.error()
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to restore project. Please try again.' })
    }
  }

  const handleDeleteProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) { setSelectedProject(project); setDeleteDialogOpen(true) }
  }

  const fetchTeamMembers = async (projectId: string) => {
    setLoadingTeamMembers(true)
    try {
      const response = await apiClient.get(`/api/projects/${projectId}/team`)
      if (!response.success) throw new Error(response.error || 'Failed to fetch team members')
      setTeamMembers(response.data?.data || response.data || [])
    } catch (error) {
      console.error('Error fetching team members:', error)
      setTeamMembers([])
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load team members' })
    } finally {
      setLoadingTeamMembers(false)
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
    if (project) { setSelectedProject(project); setSettingsDialogOpen(true) }
  }

  const handleSaveProject = async (projectId: string, data: UpdateProject) => {
    try {
      projectStore.startOperation(projectId)
      const response = await apiClient.put(`/api/projects/${projectId}`, data)

      if (!response.success || !response.data) {
        projectStore.endOperation(projectId)
        audioService.play('error'); hapticService.error()
        throw new Error(response.error || 'Failed to update project')
      }

      const result = response
      projectStore.endOperation(projectId)
      audioService.play('complete'); hapticService.success()

      if (result.success && result.data && !result.data.queued) {
        console.log('ProjectTable: updating project in store after edit:', result.data.id, 'new name:', result.data.name, 'status:', result.data.status, 'priority:', result.data.priority)
        projectStore.updateProject(result.data.id, result.data)
        if (selectedProject && selectedProject.id === result.data.id) setSelectedProject(result.data)
        window.dispatchEvent(new CustomEvent('projectUpdated', { detail: { projectId: result.data.id, project: result.data } }))
      } else if (result.data?.queued) {
        toast({ title: 'Queued', description: 'Project update queued for offline sync' })
      }
    } catch (error) {
      projectStore.endOperation(projectId)
      audioService.play('error'); hapticService.error()
      throw error
    }
  }

  const handleDeleteProjectConfirm = async (projectId: string) => {
    try {
      projectStore.startOperation(projectId)
      const response = await apiClient.delete(`/api/projects/${projectId}`)

      if (!response.success) {
        projectStore.endOperation(projectId)
        audioService.play('error'); hapticService.error()

        if (response.status === 404) {
          console.log('Project was already deleted or not found, removing from store')
          projectStore.removeProject(projectId)
          return
        }
        throw new Error(response.error || 'Failed to delete project')
      }

      console.log('Project deleted successfully, removing from store:', projectId)
      if (!response.data?.queued) projectStore.removeProject(projectId)

      setSelectedProjects(prev => { const s = new Set(prev); s.delete(projectId); return s })
      if (selectedProject && selectedProject.id === projectId) setSelectedProject(null)

      audioService.play('error'); hapticService.heavy()
      window.dispatchEvent(new CustomEvent('projectDeleted', { detail: { projectId } }))
    } catch (error) {
      projectStore.endOperation(projectId)
      audioService.play('error'); hapticService.error()
      throw error
    }
  }

  const handleAddTeamMember = async (projectId: string, data: any) => {
    try {
      const response = await apiClient.post(`/api/projects/${projectId}/team`, data)
      if (!response.success) { audioService.play('error'); hapticService.error(); throw new Error(response.error || 'Failed to add team member') }
      audioService.play('complete'); hapticService.success()
      toast({ variant: 'success', title: 'Success', description: response.data?.queued ? 'Add member queued for offline sync' : 'Team member added successfully' })
    } catch (error: any) {
      audioService.play('error'); hapticService.error()
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to add team member' })
      throw error
    }
  }

  const handleRemoveTeamMember = async (projectId: string, userId: string) => {
    try {
      const response = await apiClient.delete(`/api/projects/${projectId}/team/${userId}`)
      if (!response.success) { audioService.play('error'); hapticService.error(); throw new Error(response.error || 'Failed to remove team member') }
      audioService.play('error'); hapticService.medium()
      toast({ variant: 'success', title: 'Success', description: response.data?.queued ? 'Removal queued for offline sync' : 'Team member removed successfully' })
    } catch (error: any) {
      audioService.play('error'); hapticService.error()
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to remove team member' })
      throw error
    }
  }

  const handleUpdateTeamRole = async (projectId: string, userId: string, role: string) => {
    try {
      const response = await apiClient.put(`/api/projects/${projectId}/team/${userId}`, { role })
      if (!response.success) { audioService.play('error'); hapticService.error(); throw new Error(response.error || 'Failed to update team member role') }
      audioService.play('complete'); hapticService.light()
      toast({ variant: 'success', title: 'Success', description: response.data?.queued ? 'Role update queued for offline sync' : 'Team member role updated successfully' })
    } catch (error: any) {
      audioService.play('error'); hapticService.error()
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to update team member role' })
      throw error
    }
  }

  const handleBulkOperation = async (operation: 'archive' | 'delete', projectIds: string[], force?: boolean) => {
    try {
      projectIds.forEach(id => projectStore.startOperation(id))

      const response = await apiClient.post('/api/projects/bulk', {
        operation,
        project_ids: projectIds,
        parameters: { force }
      })

      if (!response.success || !response.data) {
        audioService.play('error'); hapticService.error()
        throw new Error(response.error || 'Bulk operation failed')
      }

      const result = response.data

      if (result.successful) {
        result.successful.forEach((projectId: string) => {
          if (operation === 'delete' && !result.queued) {
            projectStore.removeProject(projectId)
            setSelectedProjects(prev => { const s = new Set(prev); s.delete(projectId); return s })
            if (selectedProject && selectedProject.id === projectId) setSelectedProject(null)
            window.dispatchEvent(new CustomEvent('projectDeleted', { detail: { projectId } }))
          }
        })
        result.successful.forEach((projectId: string) => {
          setTimeout(() => projectStore.endOperation(projectId), 100)
        })
      }

      if (result.failed) result.failed.forEach((failure: any) => projectStore.endOperation(failure.id))

      if (result.queued) { audioService.play('sync'); hapticService.light() }
      else { audioService.play('complete'); hapticService.success() }

      return { successful: result.successful || [], failed: result.failed || [] }
    } catch (error) {
      projectIds.forEach(id => projectStore.endOperation(id))
      audioService.play('error'); hapticService.error()
      throw error
    }
  }

  const handleSaveSettings = async (projectId: string, settings: any) => {
    try {
      const response = await apiClient.patch(`/api/projects/${projectId}/settings`, settings)
      if (!response.success) { audioService.play('error'); hapticService.error(); throw new Error(response.error || 'Failed to save project settings') }
      audioService.play('complete'); hapticService.success()
      toast({ variant: 'success', title: 'Success', description: response.data?.queued ? 'Settings queued for offline sync' : 'Project settings saved successfully' })
    } catch (error: any) {
      audioService.play('error'); hapticService.error()
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to save project settings' })
      throw error
    }
  }

  const handleSelectProject = (projectId: string, checked: boolean) => {
    const newSelected = new Set(selectedProjects)
    if (checked) newSelected.add(projectId)
    else newSelected.delete(projectId)
    setSelectedProjects(newSelected)
    setShowBulkActions(newSelected.size > 0)
  }

  const handleSelectAll = (checked: boolean, filteredProjects: ProjectWithOrg[]) => {
    if (checked) {
      const safeFiltered = Array.isArray(filteredProjects) ? filteredProjects : []
      setSelectedProjects(new Set(safeFiltered.map(p => p.id)))
    } else {
      setSelectedProjects(new Set())
    }
    setShowBulkActions(checked)
  }

  const handleBulkArchive = async () => {
    setBulkOperation('archive'); setBulkDialogOpen(true); setShowBulkActions(false)
  }

  const handleBulkDelete = async (filteredProjects: ProjectWithOrg[]) => {
    if (selectedProjects.size === 1) {
      const projectId = Array.from(selectedProjects)[0]
      const project = projects.find(p => p.id === projectId)
      if (project) { setSelectedProject(project); setDeleteDialogOpen(true); setShowBulkActions(false); return }
    }
    setBulkOperation('delete'); setBulkDialogOpen(true); setShowBulkActions(false)
  }

  const handleBulkManageTeam = async () => {
    if (selectedProjects.size === 0) {
      toast({ variant: 'warning', title: 'No Projects Selected', description: 'Please select at least one project to manage team members.' })
      return
    }
    if (selectedProjects.size === 1) {
      const projectId = Array.from(selectedProjects)[0]
      handleManageTeam(projectId)
      return
    }
    toast({ variant: 'info', title: 'Bulk Team Management', description: `Managing team for ${selectedProjects.size} projects. Opening team management interface...` })
    window.location.href = '/settings?tab=members'
  }

  return {
    handleViewProject,
    handleEditProject,
    handleDuplicateProject,
    handleArchiveProject,
    handleUnarchiveProject,
    handleDeleteProject,
    handleManageTeam,
    handleProjectSettings,
    handleSaveProject,
    handleDeleteProjectConfirm,
    handleAddTeamMember,
    handleRemoveTeamMember,
    handleUpdateTeamRole,
    handleBulkOperation,
    handleSaveSettings,
    handleSelectProject,
    handleSelectAll,
    handleBulkArchive,
    handleBulkDelete,
    handleBulkManageTeam,
  }
}
