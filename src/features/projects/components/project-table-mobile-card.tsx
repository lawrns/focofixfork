'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { QuickActions, createProjectActions } from '@/components/ui/quick-actions'
import { ProjectWithOrg, getStatusBadgeStyles, getStatusLabel, getPriorityBadgeStyles, getPriorityLabel } from './project-table-utils'

interface ProjectMobileCardProps {
  project: ProjectWithOrg
  isSelected: boolean
  onSelect: (projectId: string, checked: boolean) => void
  onView: (projectId: string) => void
  onEdit: (projectId: string) => void
  onDuplicate: (projectId: string) => void
  onArchive: (projectId: string) => void
  onDelete: (projectId: string) => void
  onManageTeam: (projectId: string) => void
  onSettings: (projectId: string) => void
  onUnarchive: (projectId: string) => void
  showArchived: boolean
  permissions: {
    canEdit: boolean
    canDelete: boolean
    canManageTeam: boolean
  }
}

export function ProjectMobileCard({
  project,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onManageTeam,
  onSettings,
  onUnarchive,
  showArchived,
  permissions
}: ProjectMobileCardProps) {
  const isArchived = showArchived && project.archived_at !== null && project.archived_at !== undefined

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-lg border-2 p-4 cursor-pointer transition-all ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
      }`}
      onClick={() => onView(project.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(project.id, checked as boolean)}
              aria-label={`Select project ${project.name}`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{project.name}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {project.workspaces?.name || 'Personal'}
            </p>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <QuickActions
            actions={createProjectActions(
              project.id,
              onView,
              permissions.canEdit ? onEdit : () => {
                console.log('Permission Denied: edit projects')
              },
              onDuplicate,
              permissions.canDelete ? onArchive : () => {
                console.log('Permission Denied: archive projects')
              },
              permissions.canDelete ? onDelete : () => {
                console.log('Permission Denied: delete projects')
              },
              permissions.canManageTeam ? onManageTeam : () => {
                console.log('Permission Denied: manage teams')
              },
              permissions.canManageTeam ? onSettings : () => {
                console.log('Permission Denied: change settings')
              },
              isArchived,
              onUnarchive
            )}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <span style={getStatusBadgeStyles(project.status)}>
          {getStatusLabel(project.status)}
        </span>
        <span style={getPriorityBadgeStyles(project.priority)}>
          {getPriorityLabel(project.priority)}
        </span>
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
  )
}

// Loading skeleton for mobile cards
export function ProjectMobileCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 animate-pulse">
      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
    </div>
  )
}
