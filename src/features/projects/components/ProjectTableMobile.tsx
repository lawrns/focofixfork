'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { QuickActions, createProjectActions } from '@/components/ui/quick-actions'
import { ProjectsEmpty } from '@/components/empty-states/projects-empty'
import styles from './ProjectTable.module.css'
import { ProjectWithOrg } from './ProjectTableTypes'
import { getStatusBadge, getPriorityBadge } from './ProjectTableBadges'

interface ProjectTableMobileProps {
  loading: boolean
  projects: ProjectWithOrg[]
  filteredProjects: ProjectWithOrg[]
  selectedProjects: Set<string>
  showArchived: boolean
  onSelectProject: (id: string, checked: boolean) => void
  onViewProject: (id: string) => void
  onEditProject: (id: string) => void
  onDuplicateProject: (id: string) => void
  onArchiveProject: (id: string) => void
  onDeleteProject: (id: string) => void
  onManageTeam: (id: string) => void
  onProjectSettings: (id: string) => void
  onUnarchiveProject: (id: string) => void
  onCreateProject?: () => void
  onImportProjects?: () => void
  onResetFilters: () => void
  filterCount: number
  searchTerm: string
  permissions: { canEdit: boolean; canDelete: boolean; canManageTeam: boolean; canView: boolean }
}

export function ProjectTableMobile({
  loading,
  projects,
  filteredProjects,
  selectedProjects,
  showArchived,
  onSelectProject,
  onViewProject,
  onEditProject,
  onDuplicateProject,
  onArchiveProject,
  onDeleteProject,
  onManageTeam,
  onProjectSettings,
  onUnarchiveProject,
  onCreateProject,
  onImportProjects,
  onResetFilters,
  filterCount,
  searchTerm,
  permissions,
}: ProjectTableMobileProps) {
  return (
    <div className={`${styles.mobileCardView} space-y-4`}>
      {loading ? (
        [...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 animate-pulse">
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
          </div>
        ))
      ) : projects.length === 0 ? (
        <ProjectsEmpty
          onCreateProject={onCreateProject || (() => console.log('Create project clicked'))}
          onImportProjects={onImportProjects || (() => console.log('Import projects clicked'))}
          onResetFilters={onResetFilters}
          isFiltered={filterCount > 0 || searchTerm.length > 0}
        />
      ) : (
        filteredProjects.map((project) => (
          <div
            key={project.id}
            className={`bg-white dark:bg-slate-900 rounded-lg border-2 p-4 cursor-pointer transition-all ${
              selectedProjects.has(project.id)
                ? 'border-primary bg-primary/5'
                : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
            }`}
            onClick={() => onViewProject(project.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3 flex-1">
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedProjects.has(project.id)}
                    onCheckedChange={(checked) => onSelectProject(project.id, checked as boolean)}
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
                    onViewProject,
                    permissions.canEdit ? onEditProject : () => {
                      console.log('Permission Denied: edit projects')
                    },
                    onDuplicateProject,
                    permissions.canDelete ? onArchiveProject : () => {
                      console.log('Permission Denied: archive projects')
                    },
                    permissions.canDelete ? onDeleteProject : () => {
                      console.log('Permission Denied: delete projects')
                    },
                    permissions.canManageTeam ? onManageTeam : () => {
                      console.log('Permission Denied: manage teams')
                    },
                    permissions.canManageTeam ? onProjectSettings : () => {
                      console.log('Permission Denied: change settings')
                    },
                    showArchived && project.archived_at !== null && project.archived_at !== undefined,
                    onUnarchiveProject
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
  )
}
