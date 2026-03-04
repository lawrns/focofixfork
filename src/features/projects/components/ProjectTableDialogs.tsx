'use client'

import ProjectEditDialog from '@/components/dialogs/project-edit-dialog'
import ProjectDeleteDialog from '@/components/dialogs/project-delete-dialog'
import TeamManagementDialog from '@/components/dialogs/team-management-dialog'
import BulkOperationsDialog from '@/components/dialogs/bulk-operations-dialog'
import ProjectSettingsDialog from '@/components/dialogs/project-settings-dialog'
import { ProjectWithOrg, UpdateProject } from './ProjectTableTypes'

interface ProjectTableDialogsProps {
  selectedProject: ProjectWithOrg | null
  editDialogOpen: boolean
  deleteDialogOpen: boolean
  teamDialogOpen: boolean
  settingsDialogOpen: boolean
  bulkDialogOpen: boolean
  bulkOperation: 'archive' | 'delete' | null
  selectedProjects: Set<string>
  filteredProjects: ProjectWithOrg[]
  teamMembers: any[]
  currentUserId: string
  onEditOpenChange: (open: boolean) => void
  onDeleteOpenChange: (open: boolean) => void
  onTeamOpenChange: (open: boolean) => void
  onSettingsOpenChange: (open: boolean) => void
  onBulkOpenChange: (open: boolean) => void
  onSaveProject: (id: string, data: UpdateProject) => Promise<void>
  onDeleteProject: (id: string) => Promise<void>
  onAddMember: (projectId: string, data: any) => Promise<void>
  onRemoveMember: (projectId: string, userId: string) => Promise<void>
  onUpdateRole: (projectId: string, userId: string, role: string) => Promise<void>
  onBulkOperation: (operation: 'archive' | 'delete', projectIds: string[], force?: boolean) => Promise<{ successful: string[]; failed: any[] }>
  onSaveSettings: (projectId: string, settings: any) => Promise<void>
}

export function ProjectTableDialogs({
  selectedProject,
  editDialogOpen,
  deleteDialogOpen,
  teamDialogOpen,
  settingsDialogOpen,
  bulkDialogOpen,
  bulkOperation,
  selectedProjects,
  filteredProjects,
  teamMembers,
  currentUserId,
  onEditOpenChange,
  onDeleteOpenChange,
  onTeamOpenChange,
  onSettingsOpenChange,
  onBulkOpenChange,
  onSaveProject,
  onDeleteProject,
  onAddMember,
  onRemoveMember,
  onUpdateRole,
  onBulkOperation,
  onSaveSettings,
}: ProjectTableDialogsProps) {
  return (
    <>
      {selectedProject && (
        <ProjectEditDialog
          project={selectedProject as any}
          open={editDialogOpen}
          onOpenChange={onEditOpenChange}
          onSave={onSaveProject}
        />
      )}

      {selectedProject && (
        <ProjectDeleteDialog
          project={selectedProject as any}
          open={deleteDialogOpen}
          onOpenChange={onDeleteOpenChange}
          onDelete={onDeleteProject}
        />
      )}

      {selectedProject && (
        <TeamManagementDialog
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          currentUserId={currentUserId}
          teamMembers={teamMembers}
          open={teamDialogOpen}
          onOpenChange={onTeamOpenChange}
          onAddMember={onAddMember}
          onRemoveMember={onRemoveMember}
          onUpdateRole={onUpdateRole}
        />
      )}

      {(selectedProjects.size > 0 || bulkDialogOpen) && (
        <BulkOperationsDialog
          selectedProjects={(Array.isArray(filteredProjects) ? filteredProjects : []).filter(p => selectedProjects.has(p.id)) as any}
          operation={bulkOperation}
          open={bulkDialogOpen}
          onOpenChange={onBulkOpenChange}
          onExecute={onBulkOperation}
        />
      )}

      {selectedProject && (
        <ProjectSettingsDialog
          project={selectedProject as any}
          open={settingsDialogOpen}
          onOpenChange={onSettingsOpenChange}
          onSave={onSaveSettings}
        />
      )}
    </>
  )
}
