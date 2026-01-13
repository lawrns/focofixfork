'use client'

import { useInlineEdit } from '@/lib/hooks/use-inline-edit'
import { DateInput } from '@/components/ui/date-input'
import { UpdateProject } from '@/lib/validation/schemas/project.schema'
import { ProjectWithOrg } from './project-table-utils'

interface InlineEditableProjectNameProps {
  project: ProjectWithOrg
  onSave: (projectId: string, data: UpdateProject) => Promise<void>
}

export function InlineEditableProjectName({ project, onSave }: InlineEditableProjectNameProps) {
  const inlineEdit = useInlineEdit({
    initialValue: project.name,
    onSave: async (newName) => {
      await onSave(project.id, { name: newName })
    },
    validate: (value) => {
      if (!value.trim()) return 'Project name is required'
      if (value.length > 100) return 'Project name must be less than 100 characters'
      return null
    }
  })

  if (inlineEdit.isEditing) {
    return (
      <input
        ref={inlineEdit.inputRef as React.RefObject<HTMLInputElement>}
        value={inlineEdit.value}
        onChange={inlineEdit.handleChange}
        onKeyDown={inlineEdit.handleKeyDown}
        onBlur={inlineEdit.handleBlur}
        className="text-sm font-semibold text-slate-900 dark:text-slate-100 bg-transparent border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        style={{ width: '100%' }}
      />
    )
  }

  return (
    <span
      className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 transition-colors"
      onClick={inlineEdit.startEditing}
      title="Click to edit project name"
    >
      {project.name}
    </span>
  )
}

interface InlineEditableDueDateProps {
  project: ProjectWithOrg
  onSave: (projectId: string, data: UpdateProject) => Promise<void>
}

export function InlineEditableDueDate({ project, onSave }: InlineEditableDueDateProps) {
  const handleDateChange = async (date: Date | null) => {
    await onSave(project.id, {
      due_date: date ? date.toISOString().split('T')[0] : null
    })
  }

  return (
    <div className="block">
      <DateInput
        value={project.due_date ? new Date(project.due_date) : null}
        onChange={handleDateChange}
        placeholder="Set due date..."
        className="text-xs"
        allowPast={false}
      />
    </div>
  )
}
