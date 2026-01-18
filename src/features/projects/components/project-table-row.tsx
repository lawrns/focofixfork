'use client'

import { TableRow, TableCell } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { QuickActions, createProjectActions } from '@/components/ui/quick-actions'
import { UpdateProject } from '@/lib/validation/schemas/project.schema'
import { ProjectWithOrg, getStatusBadgeStyles, getStatusLabel, getPriorityBadgeStyles, getPriorityLabel } from './project-table-utils'
import { InlineEditableProjectName, InlineEditableDueDate } from './project-table-inline-editors'

interface ProjectTableRowProps {
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
  onSave: (projectId: string, data: UpdateProject) => Promise<void>
  onUnarchive: (projectId: string) => void
  showArchived: boolean
  permissions: {
    canEdit: boolean
    canDelete: boolean
    canManageTeam: boolean
  }
}

export function ProjectTableRow({
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
  onSave,
  onUnarchive,
  showArchived,
  permissions
}: ProjectTableRowProps) {
  const isArchived = showArchived && project.archived_at !== null && project.archived_at !== undefined

  return (
    <TableRow
      className={`hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200 cursor-pointer border-l-4 ${
        isSelected
          ? 'bg-gradient-to-r from-primary/10 to-transparent border-l-primary shadow-sm'
          : 'border-l-transparent hover:border-l-primary/30'
      }`}
      onClick={() => onView(project.id)}
    >
      <TableCell style={{ width: '50px', display: 'table-cell !important' }} className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(project.id, checked as boolean)}
          aria-label={`Select project ${project.name}`}
        />
      </TableCell>
      <TableCell style={{ width: '25%', minWidth: '200px', display: 'table-cell !important' }} className="px-3 py-3">
        <div className="flex flex-col w-full">
          <InlineEditableProjectName
            project={project}
            onSave={onSave}
          />
        </div>
      </TableCell>
      <TableCell style={{ width: '120px', display: 'table-cell !important' }} className="px-3 py-3">
        <span style={getStatusBadgeStyles(project.status)}>
          {getStatusLabel(project.status)}
        </span>
      </TableCell>
      <TableCell style={{ width: '120px', display: 'table-cell !important' }} className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
        <InlineEditableDueDate
          project={project}
          onSave={onSave}
        />
      </TableCell>
      <TableCell style={{ width: '140px', display: 'table-cell !important' }} className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
        <span className="block truncate">{project.workspaces?.name || 'Personal'}</span>
      </TableCell>
      <TableCell style={{ width: '100px', display: 'table-cell !important' }} className="px-3 py-3">
        <span style={getPriorityBadgeStyles(project.priority)}>
          {getPriorityLabel(project.priority)}
        </span>
      </TableCell>
      <TableCell style={{ width: '90px', display: 'table-cell !important' }} className="px-3 py-3 text-right">
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
      </TableCell>
    </TableRow>
  )
}

// Loading skeleton row component
export function ProjectTableRowSkeleton() {
  return (
    <TableRow className="animate-pulse">
      <TableCell className="px-3 py-3">
        <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
      </TableCell>
      <TableCell className="px-3 py-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
      </TableCell>
      <TableCell className="px-3 py-3">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
      </TableCell>
      <TableCell className="px-3 py-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
      </TableCell>
      <TableCell className="px-3 py-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-28"></div>
      </TableCell>
      <TableCell className="px-3 py-3">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
      </TableCell>
      <TableCell className="px-3 py-3">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-8 ml-auto"></div>
      </TableCell>
    </TableRow>
  )
}
