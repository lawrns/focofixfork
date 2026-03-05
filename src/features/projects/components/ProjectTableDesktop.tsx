'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { QuickActions, createProjectActions } from '@/components/ui/quick-actions'
import { ProjectsEmpty } from '@/components/empty-states/projects-empty'
import styles from './ProjectTable.module.css'
import { ProjectWithOrg } from './ProjectTableTypes'
import { getStatusBadge, getPriorityBadge } from './ProjectTableBadges'
import { InlineEditableProjectName, InlineEditableDueDate } from './ProjectTableInlineEdits'
import { UpdateProject } from '@/lib/validation/schemas/project.schema'

interface ProjectTableDesktopProps {
  loading: boolean
  projects: ProjectWithOrg[]
  filteredProjects: ProjectWithOrg[]
  selectedProjects: Set<string>
  allSelected: boolean
  someSelected: boolean
  sortConditions: Array<{ field: string; direction: 'asc' | 'desc' }>
  showArchived: boolean
  onSelectProject: (id: string, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  onToggleSort: (field: string) => void
  onViewProject: (id: string) => void
  onEditProject: (id: string) => void
  onDuplicateProject: (id: string) => void
  onArchiveProject: (id: string) => void
  onDeleteProject: (id: string) => void
  onManageTeam: (id: string) => void
  onProjectSettings: (id: string) => void
  onUnarchiveProject: (id: string) => void
  onSaveProject: (id: string, data: UpdateProject) => Promise<void>
  onCreateProject?: () => void
  onImportProjects?: () => void
  onResetFilters: () => void
  searchTerm: string
  permissions: { canEdit: boolean; canDelete: boolean; canManageTeam: boolean; canView: boolean }
}

export function ProjectTableDesktop({
  loading,
  projects,
  filteredProjects,
  selectedProjects,
  allSelected,
  someSelected,
  sortConditions,
  showArchived,
  onSelectProject,
  onSelectAll,
  onToggleSort,
  onViewProject,
  onEditProject,
  onDuplicateProject,
  onArchiveProject,
  onDeleteProject,
  onManageTeam,
  onProjectSettings,
  onUnarchiveProject,
  onSaveProject,
  onCreateProject,
  onImportProjects,
  onResetFilters,
  searchTerm,
  permissions,
}: ProjectTableDesktopProps) {
  const sortIcon = (field: string) => {
    const existing = sortConditions.find((s) => s.field === field)
    if (!existing) return <ArrowUpDown className="h-3 w-3" />
    return existing.direction === 'asc' ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    )
  }

  return (
    <div className={`${styles.desktopTableView} w-full rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700`}>
      <div className="overflow-x-auto overflow-y-auto max-h-[60vh]" style={{ WebkitOverflowScrolling: 'touch' }}>
        <Table className={styles.projectTable}>
          <TableHeader className="sticky top-0 z-10 bg-muted/50">
            <TableRow>
              <TableHead style={{ width: '50px', display: 'table-cell !important' }} className="px-3 py-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onSelectAll}
                  aria-label="Select all projects"
                  className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                />
              </TableHead>
              <TableHead
                style={{ width: '25%', minWidth: '200px', display: 'table-cell !important' }}
                className="px-3 py-3 cursor-pointer select-none"
                onClick={() => onToggleSort('name')}
              >
                <div className="inline-flex items-center gap-1">Name {sortIcon('name')}</div>
              </TableHead>
              <TableHead
                style={{ width: '120px', display: 'table-cell !important' }}
                className="px-3 py-3 cursor-pointer select-none"
                onClick={() => onToggleSort('status')}
              >
                <div className="inline-flex items-center gap-1">Status {sortIcon('status')}</div>
              </TableHead>
              <TableHead
                style={{ width: '120px', display: 'table-cell !important' }}
                className="px-3 py-3 cursor-pointer select-none"
                onClick={() => onToggleSort('due_date')}
              >
                <div className="inline-flex items-center gap-1">Due Date {sortIcon('due_date')}</div>
              </TableHead>
              <TableHead
                style={{ width: '140px', display: 'table-cell !important' }}
                className="px-3 py-3 cursor-pointer select-none"
                onClick={() => onToggleSort('organizations.name')}
              >
                <div className="inline-flex items-center gap-1">Organization {sortIcon('organizations.name')}</div>
              </TableHead>
              <TableHead
                style={{ width: '100px', display: 'table-cell !important' }}
                className="px-3 py-3 cursor-pointer select-none"
                onClick={() => onToggleSort('priority')}
              >
                <div className="inline-flex items-center gap-1">Priority {sortIcon('priority')}</div>
              </TableHead>
              <TableHead
                style={{ width: '180px', display: 'table-cell !important' }}
                className="px-3 py-3 text-slate-500 dark:text-slate-400 hidden xl:table-cell"
              >
                Path
              </TableHead>
              <TableHead style={{ width: '90px', display: 'table-cell !important' }} className="px-3 py-3 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white dark:bg-slate-900">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i} className="animate-pulse">
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
                  <TableCell className="px-3 py-3 hidden xl:table-cell">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-36"></div>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-8 ml-auto"></div>
                  </TableCell>
                </TableRow>
              ))
            ) : projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="px-3 py-12">
                  <ProjectsEmpty
                    onCreateProject={onCreateProject || (() => {})}
                    onImportProjects={onImportProjects || (() => {})}
                    onResetFilters={onResetFilters}
                    isFiltered={searchTerm.length > 0}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((project) => (
                <TableRow
                  key={project.id}
                  className={`hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200 cursor-pointer border-l-4 ${
                    selectedProjects.has(project.id)
                      ? 'bg-gradient-to-r from-primary/10 to-transparent border-l-primary shadow-sm'
                      : 'border-l-transparent hover:border-l-primary/30'
                  }`}
                  onClick={() => onViewProject(project.id)}
                >
                  <TableCell style={{ width: '50px', display: 'table-cell !important' }} className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedProjects.has(project.id)}
                      onCheckedChange={(checked) => onSelectProject(project.id, checked as boolean)}
                      aria-label={`Select project ${project.name}`}
                    />
                  </TableCell>
                  <TableCell style={{ width: '25%', minWidth: '200px', display: 'table-cell !important' }} className="px-3 py-3">
                    <div className="flex flex-col w-full">
                      <InlineEditableProjectName
                        project={project}
                        onSave={onSaveProject}
                      />
                    </div>
                  </TableCell>
                  <TableCell style={{ width: '120px', display: 'table-cell !important' }} className="px-3 py-3">
                    {getStatusBadge(project.status)}
                  </TableCell>
                  <TableCell style={{ width: '120px', display: 'table-cell !important' }} className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
                    <InlineEditableDueDate
                      project={project}
                      onSave={onSaveProject}
                    />
                  </TableCell>
                  <TableCell style={{ width: '140px', display: 'table-cell !important' }} className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
                    <span className="block truncate">{project.organizations?.name || 'Personal'}</span>
                  </TableCell>
                  <TableCell style={{ width: '100px', display: 'table-cell !important' }} className="px-3 py-3">
                    {getPriorityBadge(project.priority)}
                  </TableCell>
                  <TableCell style={{ width: '180px', display: 'table-cell !important' }} className="px-3 py-3 hidden xl:table-cell" title={project.local_path ?? undefined}>
                    {project.local_path ? (
                      <span className="block truncate text-xs font-mono text-muted-foreground/70">
                        {project.local_path.replace(/^\/home\/[^/]+/, '~')}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell style={{ width: '90px', display: 'table-cell !important' }} className="px-3 py-3 text-right">
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
